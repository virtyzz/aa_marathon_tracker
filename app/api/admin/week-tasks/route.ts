import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({ weekId: z.string().cuid(), taskId: z.string().cuid(), position: z.number().int().min(0).optional() });
const reorderSchema = z.object({ id: z.string().cuid(), position: z.number().int().min(0), published: z.boolean().optional() });

async function normalizePositions(tx: Prisma.TransactionClient, weekId: string) {
  const items = await tx.weekTask.findMany({ where: { weekId }, orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true } });
  for (const [position, item] of items.entries()) await tx.weekTask.update({ where: { id: item.id }, data: { position } });
}

async function moveToPosition(tx: Prisma.TransactionClient, id: string, position: number) {
  const item = await tx.weekTask.findUnique({ where: { id }, select: { weekId: true } });
  if (!item) throw new Error("NOT_FOUND");
  const items = await tx.weekTask.findMany({ where: { weekId: item.weekId }, orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true } });
  const ordered = items.map(entry => entry.id).filter(entryId => entryId !== id);
  ordered.splice(Math.min(position, ordered.length), 0, id);
  for (const [nextPosition, entryId] of ordered.entries()) await tx.weekTask.update({ where: { id: entryId }, data: { position: nextPosition } });
  return item;
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const weekId = new URL(request.url).searchParams.get("weekId");
    if (!weekId) return NextResponse.json({ error: "Укажите weekId" }, { status: 400 });
    return NextResponse.json(await prisma.weekTask.findMany({ where: { weekId }, orderBy: [{ position: "asc" }, { id: "asc" }] }));
  } catch { return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 }); }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(), data = schema.parse(await request.json());
    const [task, week] = await Promise.all([prisma.task.findUnique({ where: { id: data.taskId } }), prisma.marathonWeek.findUnique({ where: { id: data.weekId } })]);
    if (!task || !week) return NextResponse.json({ error: "Неделя или задание не найдены" }, { status: 404 });
    const item = await prisma.$transaction(async tx => {
      const last = await tx.weekTask.aggregate({ where: { weekId: week.id }, _max: { position: true } });
      const created = await tx.weekTask.create({ data: { weekId: week.id, taskId: task.id, titleSnapshot: task.title, descriptionSnapshot: task.description, locationSnapshot: task.location, xpSnapshot: task.xp, allowedDaysSnapshot: (task.allowedDays ?? []) as Prisma.InputJsonValue, maxCompletionsSnapshot: task.maxCompletions, position: (last._max.position ?? -1) + 1 } });
      await moveToPosition(tx, created.id, data.position ?? Number.MAX_SAFE_INTEGER);
      return created;
    });
    await prisma.adminAuditLog.create({ data: { actorId: admin.id, action: "ASSIGN", entityType: "WeekTask", entityId: item.id, details: { weekId: week.id, taskId: task.id } } });
    return NextResponse.json(item, { status: 201 });
  } catch { return NextResponse.json({ error: "Не удалось назначить задание" }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin(), id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Укажите id" }, { status: 400 });
    if (await prisma.characterTaskProgress.count({ where: { weekTaskId: id } })) return NextResponse.json({ error: "Нельзя убрать задание с прогрессом игроков" }, { status: 409 });
    await prisma.$transaction(async tx => {
      const item = await tx.weekTask.delete({ where: { id }, select: { weekId: true } });
      await normalizePositions(tx, item.weekId);
    });
    await prisma.adminAuditLog.create({ data: { actorId: admin.id, action: "UNASSIGN", entityType: "WeekTask", entityId: id } });
    return new NextResponse(null, { status: 204 });
  } catch { return NextResponse.json({ error: "Не удалось убрать задание с недели" }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(), data = reorderSchema.parse(await request.json());
    const item = await prisma.$transaction(async tx => {
      await moveToPosition(tx, data.id, data.position);
      return tx.weekTask.update({ where: { id: data.id }, data: data.published === undefined ? {} : { published: data.published } });
    });
    await prisma.adminAuditLog.create({ data: { actorId: admin.id, action: "UPDATE", entityType: "WeekTask", entityId: item.id, details: data } });
    return NextResponse.json(item);
  } catch { return NextResponse.json({ error: "Не удалось изменить назначение" }, { status: 400 }); }
}

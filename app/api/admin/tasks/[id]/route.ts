import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

const schema = z.object({ title: z.string().trim().min(2).max(150).optional(), description: z.string().max(2000).optional(), location: z.string().max(300).nullable().optional(), xp: z.number().int().min(1).max(100).optional(), allowedDays: z.array(z.number().int().min(0).max(6)).optional(), maxCompletions: z.number().int().min(1).max(7).optional(), archived: z.boolean().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(), { id } = await params, data = schema.parse(await request.json());
    const task = await prisma.$transaction(async tx => {
      const updated = await tx.task.update({ where: { id }, data });
      await tx.weekTask.updateMany({
        where: { taskId: id, week: { isActive: true, archived: false } },
        data: { titleSnapshot: updated.title, descriptionSnapshot: updated.description, locationSnapshot: updated.location, xpSnapshot: updated.xp, allowedDaysSnapshot: (updated.allowedDays ?? []) as Prisma.InputJsonValue, maxCompletionsSnapshot: updated.maxCompletions },
      });
      return updated;
    });
    await prisma.adminAuditLog.create({ data: { actorId: admin.id, action: "UPDATE", entityType: "Task", entityId: id, details: data } });
    return NextResponse.json(task);
  } catch { return NextResponse.json({ error: "Не удалось обновить задание" }, { status: 400 }); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(), { id } = await params;
    if (await prisma.weekTask.count({ where: { taskId: id } })) return NextResponse.json({ error: "Задание уже назначено неделе; архивируйте его." }, { status: 409 });
    await prisma.task.delete({ where: { id } });
    await prisma.adminAuditLog.create({ data: { actorId: admin.id, action: "DELETE", entityType: "Task", entityId: id } });
    return new NextResponse(null, { status: 204 });
  } catch { return NextResponse.json({ error: "Не удалось удалить задание" }, { status: 400 }); }
}

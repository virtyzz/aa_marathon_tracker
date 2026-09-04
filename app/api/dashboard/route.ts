import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
export async function GET(request: Request) {
  try {
    const user = await requireUser(); const url = new URL(request.url);
    const week = await prisma.marathonWeek.findFirst({ where: url.searchParams.get("weekId") ? { id: url.searchParams.get("weekId")! } : { isActive: true }, include: { weekTasks: { orderBy: { id: "asc" } } } });
    if (!week) return NextResponse.json({ error: "Активная неделя не создана" }, { status: 404 });
    const characters = await prisma.character.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }); const characterId = url.searchParams.get("characterId") ?? characters[0]?.id;
    const [progresses, notes, weeks] = await Promise.all([characterId ? prisma.characterTaskProgress.findMany({ where: { characterId, weekTask: { weekId: week.id } } }) : [], characterId ? prisma.characterTaskNote.findMany({ where: { characterId, weekTask: { weekId: week.id } } }) : [], prisma.marathonWeek.findMany({ select: { id: true, title: true, startsAt: true, endsAt: true, isActive: true }, orderBy: { startsAt: "desc" } })]);
    return NextResponse.json({ week, weeks, characters, selectedCharacterId: characterId, progresses, notes });
  } catch { return NextResponse.json({ error: "Необходим вход" }, { status: 401 }); }
}

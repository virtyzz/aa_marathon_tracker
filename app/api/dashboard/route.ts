import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { displayXp, formatDayMonth, formatWeekRange, totalXp, weekDates } from "@/lib/marathon";
import { presentWeekTask } from "@/lib/task-presentation";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    const week = await prisma.marathonWeek.findFirst({
      where: params.get("weekId") ? { id: params.get("weekId")! } : { isActive: true, archived: false },
      include: { weekTasks: {
        where: { published: true }, orderBy: [{ position: "asc" }, { id: "asc" }],
        include: { task: { select: { description: true, location: true } } },
      } },
    });
    if (!week) return NextResponse.json({ error: "Активная неделя не создана" }, { status: 404 });
    const gameAccounts = await prisma.gameAccount.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    const account = gameAccounts.find(a => a.id === params.get("accountId")) ?? gameAccounts[0];
    // An empty account list is intentional, including after deleting the last account.
    const characters = account ? await prisma.character.findMany({ where: { gameAccountId: account.id, userId: user.id }, orderBy: { createdAt: "asc" } }) : [];
    const characterId = characters.find(c => c.id === params.get("characterId"))?.id ?? characters[0]?.id;
    const [progresses, notes, weeks, all] = await Promise.all([
      characterId ? prisma.characterTaskProgress.findMany({ where: { characterId, weekTask: { weekId: week.id } }, include: { weekTask: { select: { xpSnapshot: true } } } }) : [],
      characterId ? prisma.characterTaskNote.findMany({ where: { characterId, weekTask: { weekId: week.id } } }) : [],
      prisma.marathonWeek.findMany({ select: { id: true, title: true, startsAt: true, endsAt: true, isActive: true }, orderBy: { startsAt: "desc" } }),
      account ? prisma.characterTaskProgress.findMany({ where: { character: { gameAccountId: account.id }, weekTask: { weekId: week.id } }, include: { weekTask: { select: { xpSnapshot: true } } } }) : [],
    ]);
    const today = Math.max(0, Math.min(6, Math.floor((Date.now() - week.startsAt.getTime()) / 86400000)));
    return NextResponse.json({
      week: { ...week, weekTasks: week.weekTasks.map(t => presentWeekTask(t, week)), dateRange: formatWeekRange(week.startsAt, week.endsAt), dayDates: weekDates(week.startsAt).map(formatDayMonth) },
      weeks: weeks.map(w => ({ ...w, dateRange: formatWeekRange(w.startsAt, w.endsAt) })), gameAccounts, selectedAccountId: account?.id ?? "", characters, selectedCharacterId: characterId,
      progresses, notes,
      stats: { xp: displayXp(totalXp(all)), selectedXp: displayXp(totalXp(progresses)), todayXp: displayXp(totalXp(all.filter(p => p.dayIndex === today))), completions: all.length },
      characterXp: Object.fromEntries(characters.map(c => [c.id, displayXp(totalXp(all.filter(p => p.characterId === c.id)))])),
      user: { name: user.name, discordId: user.discordId, isAdmin: !!user.discordId && (process.env.ADMIN_DISCORD_IDS ?? "").split(",").map(x => x.trim()).includes(user.discordId) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Необходим вход" }, { status: 401 });
    console.error("dashboard.load failed");
    return NextResponse.json({ error: "Не удалось загрузить трекер. Попробуйте ещё раз." }, { status: 500 });
  }
}

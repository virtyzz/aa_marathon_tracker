import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { formatWeekRange } from "@/lib/marathon";
export async function GET(request: Request) {
  try {
    const user = await requireUser(); const url = new URL(request.url);
    const requestedWeekId = url.searchParams.get("weekId");
    const week = await prisma.marathonWeek.findFirst({ where: requestedWeekId ? { id: requestedWeekId } : { isActive: true, archived: false }, include: { weekTasks: { where:{published:true}, orderBy: [{ position: "asc" }, { id: "asc" }] } } });
    if (!week) return NextResponse.json({ error: "Активная неделя не создана" }, { status: 404 });
    const characters = await prisma.character.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }); const requestedCharacterId = url.searchParams.get("characterId"); const characterId = characters.some(c=>c.id===requestedCharacterId) ? requestedCharacterId! : characters[0]?.id;
    const [progresses, notes, weeks,allProgresses] = await Promise.all([characterId ? prisma.characterTaskProgress.findMany({ where: { characterId, weekTask: { weekId: week.id } },include:{weekTask:{select:{xpSnapshot:true}}} }) : [], characterId ? prisma.characterTaskNote.findMany({ where: { characterId, weekTask: { weekId: week.id } } }) : [], prisma.marathonWeek.findMany({ select: { id: true, title: true, startsAt: true, endsAt: true, isActive: true }, orderBy: { startsAt: "desc" } }), prisma.characterTaskProgress.findMany({where:{character:{userId:user.id},weekTask:{weekId:week.id}},include:{weekTask:{select:{xpSnapshot:true}}}})]);
    const characterXp=Object.fromEntries(characters.map(c=>[c.id,allProgresses.filter(p=>p.characterId===c.id).reduce((sum,p)=>sum+p.weekTask.xpSnapshot,0)]));const accountXp=allProgresses.reduce((sum,p)=>sum+p.weekTask.xpSnapshot,0);const stats={xp:accountXp,selectedXp:progresses.reduce((sum,p)=>sum+p.weekTask.xpSnapshot,0),todayXp:allProgresses.filter(p=>p.dayIndex===Math.max(0,Math.min(6,Math.floor((Date.now()-week.startsAt.getTime())/86400000)))).reduce((sum,p)=>sum+p.weekTask.xpSnapshot,0),completions:allProgresses.length};
    return NextResponse.json({ week: { ...week, dateRange: formatWeekRange(week.startsAt, week.endsAt) }, weeks, characters, selectedCharacterId: characterId, progresses, notes, stats,characterXp, user: { name:user.name, image:user.image, discordId:user.discordId, isAdmin:(process.env.ADMIN_DISCORD_IDS??"").split(",").map(x=>x.trim()).includes(user.discordId??"") } });
  } catch { return NextResponse.json({ error: "Необходим вход" }, { status: 401 }); }
}

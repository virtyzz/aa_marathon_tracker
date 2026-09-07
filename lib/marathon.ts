export const WEEK_LIMIT = 100;
export function totalXp(progresses: { dayIndex:number; weekTask:{xpSnapshot:number} }[]) { return progresses.reduce((total,p)=>total+p.weekTask.xpSnapshot,0); }
/** Cap only the displayed score; keep every completion and its original XP. */
export function displayXp(xp: number) { return Math.min(xp, WEEK_LIMIT); }
export function weekDates(startsAt: Date) { return Array.from({length:7},(_,index)=>new Date(startsAt.getTime()+index*86400000)); }
/** Game weeks are Thursday 00:00 through Wednesday 23:59:59 in the server timezone. */
export function currentWeekRange(now = new Date()) {
 const start = new Date(now); start.setHours(0,0,0,0);
 const offset = (start.getDay() + 3) % 7; start.setDate(start.getDate() - offset);
 const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23,59,59,999);
 return { startsAt:start, endsAt:end };
}
export function formatWeekRange(startsAt: Date, endsAt: Date) {
 return `${formatDayMonth(startsAt)} - ${formatDayMonth(endsAt)}`;
}
export function formatDayMonth(date: Date) {
 return new Intl.DateTimeFormat("ru-RU", { day:"2-digit", month:"2-digit" }).format(date);
}
export function allowedOnDay(days: unknown, dayIndex:number) { return !Array.isArray(days) || days.length === 0 || days.includes(dayIndex); }
export function underTaskLimit(completions:number, maximum:number) { return completions < maximum; }

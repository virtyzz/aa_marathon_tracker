export const WEEK_LIMIT = 100;
export function totalXp(progresses: { dayIndex:number; weekTask:{xpSnapshot:number} }[]) { return progresses.reduce((total,p)=>total+p.weekTask.xpSnapshot,0); }
export function canAddXp(current: number, xp: number) { return current + xp <= WEEK_LIMIT; }
export function weekDates(startsAt: Date) { return Array.from({length:7},(_,index)=>new Date(startsAt.getTime()+index*86400000)); }

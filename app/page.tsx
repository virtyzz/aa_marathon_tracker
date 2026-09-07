"use client";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { TrackerManagement } from "./components/tracker-management";

const days = ["ЧТ", "ПТ", "СБ", "ВС", "ПН", "ВТ", "СР"];
type Task = { id: string; titleSnapshot: string; descriptionSnapshot: string; locationSnapshot?: string | null; xpSnapshot: number; allowedDaysSnapshot?: number[]; maxCompletionsSnapshot: number };
type Dashboard = {
  week: { id: string; title: string; dateRange: string; weekTasks: Task[] };
  weeks: { id: string; title: string; isActive: boolean }[];
  gameAccounts: { id: string; name: string }[]; selectedAccountId: string;
  characters: { id: string; name: string; server?: string | null }[]; selectedCharacterId?: string;
  progresses: { weekTaskId: string; dayIndex: number }[]; notes: { weekTaskId: string; text: string }[];
  characterXp: Record<string, number>; stats: { xp: number; selectedXp: number };
  user: { name?: string; discordId?: string; isAdmin: boolean };
};

export default function Home() {
  const [data, setData] = useState<Dashboard>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [task, setTask] = useState<Task>();
  const [note, setNote] = useState("");
  const requestSequence = useRef(0);
  const mutationPending = useRef(false);
  const noteDialog = useRef<HTMLDialogElement>(null);
  const accountId = data?.selectedAccountId ?? "";
  const characterId = data?.selectedCharacterId ?? "";
  const weekId = data?.week.id ?? "";
  const checks = new Set(data?.progresses.map(p => `${p.weekTaskId}:${p.dayIndex}`));

  const load = async (week = weekId, character = characterId, account = accountId) => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (week) params.set("weekId", week);
      if (character) params.set("characterId", character);
      if (account) params.set("accountId", account);
      const response = await fetch(`/api/dashboard?${params}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Ошибка загрузки");
      if (sequence === requestSequence.current) { setData(payload); setMessage(""); }
    } catch (error) {
      if (sequence === requestSequence.current) setMessage(error instanceof Error ? error.message : "Ошибка сети. Повторите загрузку.");
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (task && !noteDialog.current?.open) noteDialog.current?.showModal(); }, [task]);

  const toggle = async (item: Task, dayIndex: number) => {
    if (!characterId || mutationPending.current || busy || loading) return;
    mutationPending.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, weekTaskId: item.id, dayIndex, completed: !checks.has(`${item.id}:${dayIndex}`) }) });
      if (!response.ok) throw new Error((await response.json()).error ?? "Не удалось сохранить отметку");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ошибка сети. Отметка не сохранена."); }
    finally { mutationPending.current = false; setBusy(false); }
  };
  const saveNote = async () => {
    if (!task || !characterId || mutationPending.current) return;
    mutationPending.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/notes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, weekTaskId: task.id, text: note }) });
      if (!response.ok) throw new Error((await response.json()).error ?? "Не удалось сохранить примечание");
      setTask(undefined);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ошибка сети"); }
    finally { mutationPending.current = false; setBusy(false); }
  };

  return <main>
    <header><div className="brand"><b>ArcheAge Marathon Tracker</b></div><nav><a className="nav active" href="/">Трекер</a>{data?.user.isAdmin && <a className="nav" href="/admin">Управление</a>}<button className="nav" onClick={() => signOut({ callbackUrl: "/" })}>Выйти</button></nav><div className="profile"><b>{data?.user.name ?? "Discord"}</b><small>{data?.user.discordId}</small></div></header>
    <section className="shell">
      <h1>{data?.week.title}</h1><p>{data?.week.dateRange}</p>
      {loading && <p role="status">Загрузка…</p>}
      <TrackerManagement accounts={data?.gameAccounts ?? []} characters={data?.characters ?? []} accountId={accountId} characterId={characterId} xp={data?.stats.xp ?? 0} characterXp={data?.characterXp ?? {}} busy={busy || loading} onBusyChange={setBusy} onSelect={(account, character) => load(weekId, character, account)} />
      <section className="week"><select aria-label="Неделя марафона" value={weekId} disabled={busy || loading} onChange={e => void load(e.target.value, characterId, accountId)}>{data?.weeks.map(week => <option key={week.id} value={week.id}>{week.isActive ? "● Активна · " : ""}{week.title}</option>)}</select><span>Выбранный: {data?.stats.selectedXp ?? 0}/100</span></section>
      <section className="table-card"><div className="scroll"><table><thead><tr><th>Задание</th><th>XP</th><th>Описание / локация</th><th>Примечание</th>{days.map(day => <th key={day}>{day}</th>)}<th>За нед.</th></tr></thead>
        <tbody>{data?.week.weekTasks.map(item => {
          const count = data.progresses.filter(p => p.weekTaskId === item.id).length;
          const text = data.notes.find(n => n.weekTaskId === item.id)?.text;
          return <tr key={item.id}>
            <td className="quest">{item.titleSnapshot}</td><td>+{item.xpSnapshot}</td>
            <td className="where">{item.descriptionSnapshot}{item.locationSnapshot && <>{item.descriptionSnapshot && <br />}{item.locationSnapshot}</>}</td>
            <td><button className="note" disabled={!characterId || busy || loading} title={text || "Добавить примечание"} onClick={() => { setTask(item); setNote(text ?? ""); }}>{text || "Добавить…"}</button></td>
            {days.map((day, index) => {
              const checked = checks.has(`${item.id}:${index}`);
              return <td className="check-cell" key={day}><button className={checked ? "box checked" : "box"} aria-label={`${item.titleSnapshot}, ${day}`} aria-pressed={checked} disabled={!characterId || busy || loading || !!item.allowedDaysSnapshot?.length && !item.allowedDaysSnapshot.includes(index) || !checked && count >= item.maxCompletionsSnapshot} onClick={() => void toggle(item, index)}>{checked ? "✓" : ""}</button></td>;
            })}<td><span className="count">{count}/{item.maxCompletionsSnapshot}</span></td>
          </tr>;
        })}</tbody></table></div></section>
    </section>
    {message && <div className="toast" role="alert">{message}<button disabled={busy || loading} onClick={() => void load()}>Обновить</button><button aria-label="Закрыть сообщение" onClick={() => setMessage("")}>×</button></div>}
    {task && <dialog ref={noteDialog} className="management-dialog" aria-labelledby="note-title" onCancel={e => { if (busy) e.preventDefault(); else setTask(undefined); }}>
      <form onSubmit={e => { e.preventDefault(); void saveNote(); }}><h2 id="note-title">Примечание</h2><p>{task.titleSnapshot}</p><label>Текст примечания<textarea autoFocus maxLength={2000} value={note} disabled={busy} onChange={e => setNote(e.target.value)} /></label>{message && <p role="alert">{message}</p>}<div className="tracker-actions dialog-actions"><button type="button" disabled={busy} onClick={() => setTask(undefined)}>Отмена</button><button type="submit" className="primary" disabled={busy}>{busy ? "Сохранение…" : "Сохранить"}</button></div></form>
    </dialog>}
  </main>;
}

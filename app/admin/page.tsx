"use client";

import { useEffect, useState } from "react";

type Week = { id: string; title: string; startsAt: string; endsAt: string; isActive: boolean; archived: boolean; _count: { weekTasks: number } };
type Task = { id: string; title: string; description: string; location?: string; xp: number; allowedDays: number[]; maxCompletions: number; archived: boolean };
type WeekTask = { id: string; titleSnapshot: string; xpSnapshot: number; position: number; published: boolean };
type Dialog = { kind: "edit-week"; week: Week; value: string } | { kind: "edit-task"; task: Task; value: string } | { kind: "confirm"; title: string; text: string; confirm: string; action: () => Promise<void>; danger?: boolean };

const days = ["ЧТ", "ПТ", "СБ", "ВС", "ПН", "ВТ", "СР"];

export default function AdminPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assigned, setAssigned] = useState<WeekTask[]>([]);
  const [weekId, setWeekId] = useState("");
  const [message, setMessage] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [week, setWeek] = useState({ title: "Игровая неделя (чт — ср)", startsAt: "", endsAt: "" });
  const [task, setTask] = useState({ title: "", description: "", location: "", xp: 1, allowedDays: [] as number[], maxCompletions: 7 });
  const [json, setJson] = useState("");

  const call = async (url: string, method = "GET", body?: unknown) => {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(payload?.error ?? "Ошибка операции"); }
    return response.json().catch(() => null);
  };

  const load = async (id = weekId) => {
    try {
      const [loadedWeeks, loadedTasks] = await Promise.all([call("/api/admin/weeks"), call("/api/admin/tasks")]);
      setWeeks(loadedWeeks); setTasks(loadedTasks);
      const selected = id || loadedWeeks.find((item: Week) => item.isActive)?.id || loadedWeeks[0]?.id || "";
      setWeekId(selected); setAssigned(selected ? await call(`/api/admin/week-tasks?weekId=${selected}`) : []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Нет доступа администратора"); }
  };
  useEffect(() => { void load(); }, []);

  const perform = async (action: () => Promise<void>, success?: string) => {
    try { await action(); if (success) setMessage(success); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Ошибка операции"); }
  };
  const ask = (title: string, text: string, action: () => Promise<void>, danger = false, confirm = "Подтвердить") => setDialog({ kind: "confirm", title, text, action, danger, confirm });
  const createWeek = () => void perform(async () => { await call("/api/admin/weeks", "POST", { ...week, startsAt: new Date(week.startsAt), endsAt: new Date(week.endsAt), isActive: weeks.length === 0 }); setWeek({ title: "Игровая неделя (чт — ср)", startsAt: "", endsAt: "" }); }, "Неделя создана");
  const createTask = () => void perform(async () => { await call("/api/admin/tasks", "POST", task); setTask({ title: "", description: "", location: "", xp: 1, allowedDays: [], maxCompletions: 7 }); }, "Задание добавлено");
  const importTasks = () => void perform(async () => { const payload = JSON.parse(json); await call("/api/admin/import", "POST", { weekId, tasks: Array.isArray(payload) ? payload : payload.tasks }); setJson(""); }, "Импорт завершён");
  const submitDialog = async () => {
    if (!dialog) return; setDialogBusy(true);
    try {
      if (dialog.kind === "edit-week") { const title = dialog.value.trim(); if (!title) throw new Error("Укажите название недели"); await call(`/api/admin/weeks/${dialog.week.id}`, "PATCH", { title }); setMessage("Название недели обновлено"); }
      else if (dialog.kind === "edit-task") { const title = dialog.value.trim(); if (!title) throw new Error("Укажите название задания"); await call(`/api/admin/tasks/${dialog.task.id}`, "PATCH", { title }); setMessage("Название задания обновлено"); }
      else { await dialog.action(); setMessage("Изменения сохранены"); }
      setDialog(null); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ошибка операции"); } finally { setDialogBusy(false); }
  };

  return <main className="admin">
    <header><b>ArcheAge · Управление</b><a href="/">← Трекер</a></header>
    <section>
      <h1>Недели и задания</h1>{message && <p className="admin-message" role="status">{message}</p>}
      <div className="admin-grid">
        <div className="admin-card"><h2>Новая неделя</h2><input aria-label="Название недели" value={week.title} onChange={(event) => setWeek({ ...week, title: event.target.value })} /><input aria-label="Начало недели" type="datetime-local" value={week.startsAt} onChange={(event) => setWeek({ ...week, startsAt: event.target.value })} /><input aria-label="Конец недели" type="datetime-local" value={week.endsAt} onChange={(event) => setWeek({ ...week, endsAt: event.target.value })} /><button onClick={createWeek}>Создать</button></div>
        <div className="admin-card"><h2>Каталог: задание</h2><input placeholder="Название" value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} /><input placeholder="Описание" value={task.description} onChange={(event) => setTask({ ...task, description: event.target.value })} /><input placeholder="NPC / локация" value={task.location} onChange={(event) => setTask({ ...task, location: event.target.value })} /><input aria-label="Опыт" type="number" min="1" max="100" value={task.xp} onChange={(event) => setTask({ ...task, xp: Number(event.target.value) })} /><input aria-label="Лимит выполнений" type="number" min="1" max="7" value={task.maxCompletions} onChange={(event) => setTask({ ...task, maxCompletions: Number(event.target.value) })} /><div className="day-picker">{days.map((day, index) => <label key={day}><input type="checkbox" checked={task.allowedDays.includes(index)} onChange={() => setTask({ ...task, allowedDays: task.allowedDays.includes(index) ? task.allowedDays.filter((item) => item !== index) : [...task.allowedDays, index] })} />{day}</label>)}</div><button onClick={createTask}>Добавить</button></div>
      </div>
      <div className="admin-card"><h2>Недели</h2>{weeks.map((item) => <div className="week-row" key={item.id}><b>{item.title}</b><span>{new Date(item.startsAt).toLocaleString("ru-RU")}</span><em>{item.isActive ? "активна" : item.archived ? "архив" : "неактивна"}</em><div className="admin-actions"><button onClick={() => setDialog({ kind: "edit-week", week: item, value: item.title })}>Изменить</button><button disabled={item.isActive} onClick={() => ask("Активировать неделю", `Сделать «${item.title}» текущей игровой неделей?`, () => call(`/api/admin/weeks/${item.id}`, "PATCH", { isActive: true, archived: false }), false, "Активировать")}>Активировать</button><button onClick={() => ask(item.archived ? "Вернуть неделю" : "Архивировать неделю", item.archived ? `Вернуть «${item.title}» из архива?` : `Архивировать «${item.title}»?`, () => call(`/api/admin/weeks/${item.id}`, "PATCH", { archived: !item.archived, isActive: false }), !item.archived, item.archived ? "Вернуть" : "Архивировать")}>{item.archived ? "Вернуть" : "Архив"}</button><button className="danger" onClick={() => ask("Удалить неделю", `Удалить «${item.title}»? Удаляются только пустые недели.`, () => call(`/api/admin/weeks/${item.id}`, "DELETE"), true, "Удалить")}>Удалить</button></div></div>)}</div>
      <div className="admin-card"><h2>Назначение заданий</h2><select value={weekId} onChange={(event) => void load(event.target.value)}>{weeks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>{tasks.map((item) => <div className="week-row" key={item.id}><b>{item.title}</b><span>+{item.xp} XP</span><em>{item.archived ? "архив" : "в каталоге"}</em><div className="admin-actions"><button onClick={() => setDialog({ kind: "edit-task", task: item, value: item.title })}>Изменить</button><button onClick={() => ask(item.archived ? "Восстановить задание" : "Архивировать задание", item.archived ? `Вернуть «${item.title}» в каталог?` : `Архивировать «${item.title}»?`, () => call(`/api/admin/tasks/${item.id}`, "PATCH", { archived: !item.archived }), !item.archived, item.archived ? "Восстановить" : "Архивировать")}>{item.archived ? "Восстановить" : "Архив"}</button><button className="danger" onClick={() => ask("Удалить задание", `Удалить «${item.title}»? Удаляются только неназначенные задания.`, () => call(`/api/admin/tasks/${item.id}`, "DELETE"), true, "Удалить")}>Удалить</button>{!item.archived && <button onClick={() => ask("Назначить задание", `Добавить «${item.title}» в выбранную неделю?`, () => call("/api/admin/week-tasks", "POST", { weekId, taskId: item.id }), false, "Назначить")}>Назначить</button>}</div></div>)}<h3>Список недели</h3>{assigned.map((item) => <div className="week-row" key={item.id}><b>{item.position + 1}. {item.titleSnapshot}</b><span>+{item.xpSnapshot} XP</span><em>{item.published ? "опубликовано" : "черновик"}</em><div className="admin-actions"><button className="danger" onClick={() => ask("Убрать из недели", `Убрать «${item.titleSnapshot}» из выбранной недели?`, () => call(`/api/admin/week-tasks?id=${item.id}`, "DELETE"), true, "Убрать")}>Убрать</button></div></div>)}</div>
      <div className="admin-grid"><div className="admin-card"><h2>Импорт JSON</h2><textarea value={json} onChange={(event) => setJson(event.target.value)} placeholder='[{"title":"...","description":"","xp":1}]' /><button onClick={importTasks}>Импорт</button></div><div className="admin-card"><h2>Экспорт</h2><div className="admin-actions"><button onClick={() => window.open(`/api/admin/export?weekId=${weekId}`, "_blank", "noopener,noreferrer")}>JSON</button><button onClick={() => window.open(`/api/admin/export?weekId=${weekId}&format=csv`, "_blank", "noopener,noreferrer")}>CSV</button></div></div></div>
    </section>
    {dialog && <div className="modal-bg" role="presentation" onMouseDown={() => !dialogBusy && setDialog(null)}><div className="modal tracker-modal admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="admin-dialog-title">{dialog.kind === "confirm" ? dialog.title : dialog.kind === "edit-week" ? "Изменить неделю" : "Изменить задание"}</h2>{dialog.kind === "confirm" ? <p>{dialog.text}</p> : <input autoFocus aria-label="Новое название" value={dialog.value} onChange={(event) => setDialog({ ...dialog, value: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") void submitDialog(); }} />}<div className="modal-actions"><button disabled={dialogBusy} onClick={() => setDialog(null)}>Отмена</button><button className={dialog.kind === "confirm" && dialog.danger ? "danger" : ""} disabled={dialogBusy} onClick={() => void submitDialog()}>{dialogBusy ? "Сохранение…" : dialog.kind === "confirm" ? dialog.confirm : "Сохранить"}</button></div></div></div>}
  </main>;
}

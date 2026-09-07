"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Account = { id: string; name: string };
type Character = { id: string; name: string; server?: string | null };
type EditDialog = { kind: "account" | "character"; id?: string; name: string; server: string; accountId: string };
type DeleteDialog = { kind: "delete-account" | "delete-character"; id: string; name: string; accountId: string };
type Dialog = EditDialog | DeleteDialog;

export function TrackerManagement(props: {
  accounts: Account[]; characters: Character[]; accountId: string; characterId: string;
  xp: number; characterXp: Record<string, number>; busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onSelect: (accountId: string, characterId: string) => Promise<void>;
}) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const account = props.accounts.find(a => a.id === props.accountId);
  useEffect(() => {
    if (dialog && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [dialog]);
  const open = (value: Dialog) => { setError(""); setDialog(value); };
  const close = () => { if (!props.busy) setDialog(null); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dialog || submitting.current) return;
    submitting.current = true;
    props.onBusyChange(true);
    setError("");
    const deleting = dialog.kind === "delete-account" || dialog.kind === "delete-character";
    const isAccount = dialog.kind === "account" || dialog.kind === "delete-account";
    const base = isAccount ? "/api/game-accounts" : "/api/characters";
    try {
      const response = await fetch(base + (dialog.id ? `/${dialog.id}` : ""), {
        method: deleting ? "DELETE" : dialog.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: deleting ? undefined : JSON.stringify({
          name: dialog.name.trim(),
          ...(dialog.kind === "character" ? { server: dialog.server.trim() || null, ...(!dialog.id ? { gameAccountId: dialog.accountId } : {}) } : {}),
        }),
      });
      const payload = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Не удалось сохранить изменения");
      const nextAccount = isAccount ? (deleting ? "" : payload.id) : dialog.accountId;
      const nextCharacter = isAccount ? (deleting || !dialog.id ? "" : props.characterId) : (deleting ? "" : payload.id);
      setDialog(null);
      await props.onSelect(nextAccount, nextCharacter);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сети. Попробуйте ещё раз.");
    } finally {
      submitting.current = false;
      props.onBusyChange(false);
    }
  };

  return <>
    <section className="account-bar">
      <label className="account-select">ИГРОВОЙ АККАУНТ
        <select aria-label="Игровой аккаунт" value={props.accountId} disabled={props.busy || !props.accounts.length} onChange={e => void props.onSelect(e.target.value, "")}>
          {!props.accounts.length && <option value="">Нет игровых аккаунтов</option>}
          {props.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <b>{props.xp}/100 XP</b>
      <div className="tracker-actions">
        <button disabled={props.busy} onClick={() => open({ kind: "account", name: "", server: "", accountId: "" })}>+ Аккаунт</button>
        <button disabled={props.busy || !account} onClick={() => account && open({ kind: "account", id: account.id, name: account.name, server: "", accountId: account.id })}>Изменить аккаунт</button>
        <button className="danger" disabled={props.busy || !account} onClick={() => account && open({ kind: "delete-account", id: account.id, name: account.name, accountId: account.id })}>Удалить аккаунт</button>
      </div>
    </section>
    <section className="characters">
      <div className="character-heading"><b>Персонажи аккаунта:</b><button className="add" disabled={props.busy || !account} onClick={() => open({ kind: "character", name: "", server: "", accountId: props.accountId })}>+ Добавить персонажа</button></div>
      {!account ? <p>Добавьте игровой аккаунт, затем создайте в нём персонажей.</p> : !props.characters.length ? <p>В этом аккаунте пока нет персонажей.</p> : null}
      <div className="character-list">
        {props.characters.map(character => <div className="character-entry" key={character.id}>
          <button className={character.id === props.characterId ? "char chosen" : "char"} disabled={props.busy} onClick={() => void props.onSelect(props.accountId, character.id)}>
            <span>{character.name}<small>{character.server || "Сервер не указан"}</small></span><em>{props.characterXp[character.id] ?? 0}/100</em>
          </button>
          <div className="tracker-actions">
            <button disabled={props.busy} aria-label={`Изменить персонажа ${character.name}`} onClick={() => open({ kind: "character", id: character.id, name: character.name, server: character.server ?? "", accountId: props.accountId })}>Изменить</button>
            <button className="danger" disabled={props.busy} aria-label={`Удалить персонажа ${character.name}`} onClick={() => open({ kind: "delete-character", id: character.id, name: character.name, accountId: props.accountId })}>Удалить</button>
          </div>
        </div>)}
      </div>
    </section>
    {!dialog && error && <p role="alert">{error}</p>}
    {dialog && <dialog ref={dialogRef} className="management-dialog" aria-labelledby="management-title" onCancel={e => { if (props.busy) e.preventDefault(); else setDialog(null); }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()}>
        <h2 id="management-title">{dialog.kind === "delete-account" ? "Удалить игровой аккаунт?" : dialog.kind === "delete-character" ? "Удалить персонажа?" : `${dialog.id ? "Изменить" : "Добавить"} ${dialog.kind === "account" ? "игровой аккаунт" : "персонажа"}`}</h2>
        {dialog.kind === "delete-account" ? <p>Будет удалён аккаунт «{dialog.name}», все его персонажи, отметки и заметки за все недели. Это действие нельзя отменить.</p>
          : dialog.kind === "delete-character" ? <p>Будет удалён персонаж «{dialog.name}» вместе с его отметками и заметками за все недели. Это действие нельзя отменить.</p>
          : <>
            <label>{dialog.kind === "account" ? "Название аккаунта" : "Имя персонажа"}<input autoFocus required maxLength={dialog.kind === "account" ? 60 : 40} value={dialog.name} disabled={props.busy} onChange={e => setDialog({ ...dialog, name: e.target.value })} /></label>
            {dialog.kind === "character" && <label>Сервер (необязательно)<input maxLength={50} value={dialog.server} disabled={props.busy} onChange={e => setDialog({ ...dialog, server: e.target.value })} /></label>}
          </>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="tracker-actions dialog-actions">
          <button type="button" autoFocus={dialog.kind.startsWith("delete-")} disabled={props.busy} onClick={close}>Отмена</button>
          <button type="submit" className={dialog.kind.startsWith("delete-") ? "danger" : "primary"} disabled={props.busy || !dialog.name.trim()}>{props.busy ? "Сохранение…" : dialog.kind.startsWith("delete-") ? "Удалить" : "Сохранить"}</button>
        </div>
      </form>
    </dialog>}
  </>;
}

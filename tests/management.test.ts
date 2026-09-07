import { beforeEach, describe, expect, it, vi } from "vitest";
import { presentWeekTask } from "../lib/task-presentation";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  character: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  gameAccount: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  marathonWeek: { findFirst: vi.fn(), findMany: vi.fn() },
  characterTaskProgress: { findMany: vi.fn() }, characterTaskNote: { findMany: vi.fn() },
}));
vi.mock("@/lib/permissions", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks }));
vi.mock("@/lib/game-account", async () => await import("../lib/game-account"));
vi.mock("@/lib/api-error", async () => await import("../lib/api-error"));
vi.mock("@/lib/marathon", async () => await import("../lib/marathon"));
vi.mock("@/lib/task-presentation", async () => await import("../lib/task-presentation"));
import { POST as createCharacter } from "../app/api/characters/route";
import { PATCH as editCharacter, DELETE as deleteCharacter } from "../app/api/characters/[id]/route";
import { POST as createAccount } from "../app/api/game-accounts/route";
import { PATCH as editAccount, DELETE as deleteAccount } from "../app/api/game-accounts/[id]/route";
import { GET as dashboard } from "../app/api/dashboard/route";

const legacyAccount = "0123456789abcdef0123456789abcdef";
const cuidAccount = "cm00000000000000000000001";
const request = (body: unknown) => new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "owner" });
  mocks.gameAccount.findFirst.mockResolvedValue({ id: legacyAccount, userId: "owner" });
  mocks.character.findFirst.mockResolvedValue({ id: "character", userId: "owner" });
  for (const model of [mocks.character, mocks.gameAccount]) {
    model.create.mockImplementation(async ({ data }) => ({ id: "created", ...data }));
    model.update.mockImplementation(async ({ where, data }) => ({ id: where.id, ...data }));
    model.delete.mockResolvedValue({});
  }
});

describe("character and account mutations", () => {
  it.each([legacyAccount, cuidAccount])("creates characters in an owned account with ID %s", async accountId => {
    mocks.gameAccount.findFirst.mockResolvedValue({ id: accountId });
    const response = await createCharacter(request({ name: "Second character", server: null, gameAccountId: accountId }));
    expect(response.status).toBe(201);
    expect(mocks.gameAccount.findFirst).toHaveBeenCalledWith({ where: { id: accountId, userId: "owner" } });
    expect(mocks.character.create).toHaveBeenCalledWith({ data: { name: "Second character", server: null, gameAccountId: accountId, userId: "owner" } });
  });
  it("does not create characters in another user's account", async () => {
    mocks.gameAccount.findFirst.mockResolvedValue(null);
    expect((await createCharacter(request({ name: "Test", gameAccountId: legacyAccount }))).status).toBe(400);
    expect(mocks.character.create).not.toHaveBeenCalled();
  });
  it("renames a character and clears its server without replacing its ID or deleting progress", async () => {
    expect((await editCharacter(request({ name: "Renamed", server: null }), params("character"))).status).toBe(200);
    expect(mocks.character.update).toHaveBeenCalledWith({ where: { id: "character" }, data: { name: "Renamed", server: null } });
    expect(mocks.character.delete).not.toHaveBeenCalled();
  });
  it.each([editCharacter, deleteCharacter])("denies changing another user's character", async handler => {
    mocks.character.findFirst.mockResolvedValue(null);
    expect((await handler(request({ name: "Test" }), params("foreign"))).status).toBe(404);
    expect(mocks.character.findFirst).toHaveBeenCalledWith({ where: { id: "foreign", userId: "owner" } });
    expect(mocks.character.update).not.toHaveBeenCalled();
    expect(mocks.character.delete).not.toHaveBeenCalled();
  });
  it("deletes only the owned character requested", async () => {
    expect((await deleteCharacter(request({}), params("character"))).status).toBe(204);
    expect(mocks.character.delete).toHaveBeenCalledWith({ where: { id: "character" } });
  });
  it("creates and renames game accounts", async () => {
    expect((await createAccount(request({ name: "Second account" }))).status).toBe(201);
    expect(mocks.gameAccount.create).toHaveBeenCalledWith({ data: { name: "Second account", userId: "owner" } });
    expect((await editAccount(request({ name: "Renamed" }), params(legacyAccount))).status).toBe(200);
    expect(mocks.gameAccount.update).toHaveBeenCalledWith({ where: { id: legacyAccount }, data: { name: "Renamed" } });
  });
  it.each([editAccount, deleteAccount])("denies changing another user's game account", async handler => {
    mocks.gameAccount.findFirst.mockResolvedValue(null);
    expect((await handler(request({ name: "Test" }), params("foreign"))).status).toBe(404);
    expect(mocks.gameAccount.findFirst).toHaveBeenCalledWith({ where: { id: "foreign", userId: "owner" } });
    expect(mocks.gameAccount.update).not.toHaveBeenCalled();
    expect(mocks.gameAccount.delete).not.toHaveBeenCalled();
  });
  it("deletes the owned game account requested", async () => {
    expect((await deleteAccount(request({}), params(legacyAccount))).status).toBe(204);
    expect(mocks.gameAccount.delete).toHaveBeenCalledWith({ where: { id: legacyAccount } });
  });
  it("reports duplicate character and account names as conflicts", async () => {
    mocks.character.create.mockRejectedValue({ code: "P2002" });
    mocks.gameAccount.create.mockRejectedValue({ code: "P2002" });
    expect((await createCharacter(request({ name: "Test", gameAccountId: legacyAccount }))).status).toBe(409);
    expect((await createAccount(request({ name: "Test" }))).status).toBe(409);
  });
});

describe("current task text and empty accounts", () => {
  const item = { id: "week-task", descriptionSnapshot: "Old description", locationSnapshot: "Old NPC", xpSnapshot: 4, task: { description: "", location: null } };
  it("shows cleared current text without changing XP or the snapshot object", () => {
    const result = presentWeekTask(item, { isActive: true, archived: false });
    expect(result).toEqual({ id: "week-task", descriptionSnapshot: "", locationSnapshot: null, xpSnapshot: 4 });
    expect(item.descriptionSnapshot).toBe("Old description");
  });
  it.each([{ isActive: false, archived: false }, { isActive: false, archived: true }, { isActive: true, archived: true }])("retains historical text for %j", week => {
    expect(presentWeekTask(item, week).descriptionSnapshot).toBe("Old description");
  });
  it("does not recreate an account after deleting the last one", async () => {
    mocks.gameAccount.findMany.mockResolvedValue([]);
    mocks.marathonWeek.findFirst.mockResolvedValue({ id: "week", isActive: true, archived: false, startsAt: new Date("2026-09-03"), endsAt: new Date("2026-09-09"), weekTasks: [item] });
    mocks.marathonWeek.findMany.mockResolvedValue([]);
    const response = await dashboard(new Request("http://localhost/api/dashboard"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.gameAccounts).toEqual([]);
    expect(data.characters).toEqual([]);
    expect(data.selectedAccountId).toBe("");
    expect(data.stats.xp).toBe(0);
    expect(data.week.weekTasks[0].descriptionSnapshot).toBe("");
    expect(mocks.gameAccount.create).not.toHaveBeenCalled();
  });
});

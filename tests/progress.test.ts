import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const progress = {
    findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), deleteMany: vi.fn(),
    findMany: vi.fn(() => { throw new Error("Account XP must not gate completion"); }),
  };
  const tx = { weekTask: { findUnique: vi.fn() }, characterTaskProgress: progress };
  return { tx, progress, user: vi.fn(), character: vi.fn() };
});
vi.mock("@/lib/permissions", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  character: { findFirst: mocks.character },
  $transaction: (fn: (tx: typeof mocks.tx) => unknown) => fn(mocks.tx),
} }));
vi.mock("@/lib/marathon", async () => await import("../lib/marathon"));
import { POST } from "../app/api/progress/route";

const characterId = "cm00000000000000000000001";
const weekTaskId = "cm00000000000000000000002";
const request = (completed = true) => new Request("http://localhost/api/progress", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ characterId, weekTaskId, dayIndex: 1, completed }),
});
describe("progress with a soft XP cap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.mockResolvedValue({ id: "user" });
    mocks.character.mockResolvedValue({ id: characterId, gameAccountId: "account" });
    mocks.tx.weekTask.findUnique.mockResolvedValue({ id: weekTaskId, xpSnapshot: 100, allowedDaysSnapshot: [], maxCompletionsSnapshot: 7 });
    mocks.progress.findUnique.mockResolvedValue(null);
    mocks.progress.count.mockResolvedValue(2);
    mocks.progress.create.mockImplementation(async ({ data }) => data);
    mocks.progress.deleteMany.mockResolvedValue({ count: 1 });
  });
  it("adds a third 100 XP completion without reading or rewriting previous progress", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.progress.create).toHaveBeenCalledWith({ data: { characterId, weekTaskId, dayIndex: 1 } });
    expect(mocks.progress.findMany).not.toHaveBeenCalled();
    expect(mocks.progress.deleteMany).not.toHaveBeenCalled();
  });
  it("still enforces the individual task completion limit", async () => {
    mocks.progress.count.mockResolvedValue(7);
    expect((await POST(request())).status).toBe(409);
    expect(mocks.progress.create).not.toHaveBeenCalled();
  });
  it("removes only the requested completion", async () => {
    expect((await POST(request(false))).status).toBe(200);
    expect(mocks.progress.deleteMany).toHaveBeenCalledWith({ where: { characterId, weekTaskId, dayIndex: 1 } });
  });
});

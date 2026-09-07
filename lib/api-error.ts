import { NextResponse } from "next/server";
import { z } from "zod";

export function mutationError(error: unknown, operation: string, duplicate: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Проверьте введённые данные" }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Необходим вход" }, { status: 401 });
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  if (code === "P2002") return NextResponse.json({ error: duplicate }, { status: 409 });
  if (code === "P2025") return NextResponse.json({ error: "Запись уже удалена. Обновите страницу." }, { status: 404 });
  // Log diagnostic codes, never request bodies, notes, or credentials.
  console.error(operation, { code: typeof code === "string" ? code : "UNKNOWN" });
  return NextResponse.json({ error: "Не удалось сохранить изменения. Попробуйте ещё раз." }, { status: 500 });
}

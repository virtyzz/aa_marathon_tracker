ALTER TABLE "MarathonWeek" ADD COLUMN "characterXpResetAt" TIMESTAMP(3);

CREATE TABLE "CharacterXpResetExclusion" (
  "characterId" TEXT NOT NULL,
  "weekTaskId" TEXT NOT NULL,
  "dayIndex" INTEGER NOT NULL,
  PRIMARY KEY ("characterId", "weekTaskId", "dayIndex")
);

-- One-time reset: 7 September 2026, 15:00 Moscow = 12:00 UTC.
UPDATE "MarathonWeek"
SET "characterXpResetAt" = TIMESTAMP '2026-09-07 12:00:00'
WHERE "isActive" = true AND "archived" = false
  AND "startsAt" <= TIMESTAMP '2026-09-07 12:00:00'
  AND "endsAt" >= TIMESTAMP '2026-09-07 12:00:00';

INSERT INTO "CharacterXpResetExclusion" ("characterId", "weekTaskId", "dayIndex")
SELECT p."characterId", p."weekTaskId", p."dayIndex"
FROM "CharacterTaskProgress" p
JOIN "WeekTask" t ON t.id = p."weekTaskId"
JOIN "MarathonWeek" w ON w.id = t."weekId"
WHERE p."completedAt" < w."characterXpResetAt";

ALTER TABLE "MarathonWeek" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WeekTask" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "WeekTask_weekId_position_idx" ON "WeekTask"("weekId", "position");

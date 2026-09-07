type TaskText = { description: string; location: string | null };

export function presentWeekTask<T extends { descriptionSnapshot: string; locationSnapshot: string | null; task: TaskText }>(
  item: T, week: { isActive: boolean; archived: boolean },
) {
  const { task, ...snapshot } = item;
  return week.isActive && !week.archived
    ? { ...snapshot, descriptionSnapshot: task.description, locationSnapshot: task.location }
    : snapshot;
}

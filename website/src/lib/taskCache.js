// Task cache invalidation — shared between TaskManager, TodoList, and any
// other surface that reads or writes the `tasks` table. Each surface uses
// its own React Query key (`['tasks', propertyId]`, `['todo-tasks', …]`,
// `['tasks-dashboard', …]`, `['todo-drafts']`), so a single mutation has
// to fan out to all of them or the views drift.
const TASK_QUERY_ROOTS = new Set([
  'tasks',
  'todo-tasks',
  'todo-drafts',
  'tasks-dashboard',
])

export function invalidateTaskQueries(queryClient) {
  return queryClient.invalidateQueries({
    predicate: (q) => TASK_QUERY_ROOTS.has(q.queryKey?.[0]),
  })
}

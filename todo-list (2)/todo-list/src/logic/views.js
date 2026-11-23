import { CATEGORIES, PRIORITIES, STATUSES, STATUS_LABELS } from "./todo.js";

/**
 * Pure functions that decide WHICH todos to show and in what order.
 * No DOM: the board just draws whatever these return.
 */

export const TABS = [
  { id: "all", label: "All tasks" },
  { id: "high", label: "High priority" },
  { id: "attention", label: "Needs attention" },
];

export const SORTS = [
  { id: "due", label: "Due date" },
  { id: "priority", label: "Priority" },
  { id: "newest", label: "Newest first" },
  { id: "title", label: "Title A–Z" },
];

const RANK = { high: 0, medium: 1, low: 2 };
const dueKey = (todo) => todo.dueDate || "9999-99-99"; // no date sorts last

export function matchesTab(todo, tab) {
  if (tab === "high") return todo.priority === "high";
  if (tab === "attention") return !todo.completed && (todo.isOverdue || todo.isDueToday);
  return true;
}

export function tabCounts(todos) {
  return Object.fromEntries(
    TABS.map(({ id }) => [id, todos.filter((todo) => matchesTab(todo, id)).length]),
  );
}

export function filterTodos(
  todos,
  { tab = "all", query = "", priority = "all", category = "all" } = {},
) {
  const q = query.trim().toLowerCase();
  return todos.filter(
    (todo) =>
      matchesTab(todo, tab) &&
      (priority === "all" || todo.priority === priority) &&
      (category === "all" || todo.category === category) &&
      (!q ||
        [todo.title, todo.description, todo.notes, todo.category].some((f) =>
          f.toLowerCase().includes(q),
        )),
  );
}

export function sortTodos(todos, sortBy = "due") {
  const comparers = {
    due: (a, b) => dueKey(a).localeCompare(dueKey(b)) || RANK[a.priority] - RANK[b.priority],
    priority: (a, b) => RANK[a.priority] - RANK[b.priority] || dueKey(a).localeCompare(dueKey(b)),
    newest: (a, b) => b.createdAt - a.createdAt,
    title: (a, b) => a.title.localeCompare(b.title),
  };
  return [...todos].sort(comparers[sortBy] ?? comparers.due);
}

export function groupByStatus(todos) {
  const groups = Object.fromEntries(STATUSES.map((status) => [status, []]));
  todos.forEach((todo) => groups[todo.status].push(todo));
  return groups;
}

export function projectProgress(project) {
  const todos = project.getTodos();
  const done = todos.filter((todo) => todo.completed).length;
  return {
    total: todos.length,
    done,
    percent: todos.length ? Math.round((done / todos.length) * 100) : 0,
  };
}

/** Plain-text copy of a project, used by the Share button. */
export function projectSummary(project) {
  const groups = groupByStatus(project.getTodos());
  const lines = [project.name];
  for (const status of STATUSES) {
    lines.push("", `${STATUS_LABELS[status]} (${groups[status].length})`);
    groups[status].forEach((todo) =>
      lines.push(`- ${todo.title}${todo.dueDate ? ` (due ${todo.dueDate})` : ""}`),
    );
  }
  return lines.join("\n");
}

/**
 * Turn a saved view (from localStorage) into a safe one: anything that is missing, old or
 * no longer valid (for example a project that was deleted) falls back to the default.
 */
export function normalizeView(saved = {}, { projectIds, defaultProjectId }) {
  const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
  return {
    activeId: pick(saved.activeId, projectIds, defaultProjectId),
    tab: pick(
      saved.tab,
      TABS.map((t) => t.id),
      "all",
    ),
    sort: pick(
      saved.sort,
      SORTS.map((s) => s.id),
      "due",
    ),
    priority: pick(saved.priority, ["all", ...PRIORITIES], "all"),
    category: pick(saved.category, ["all", ...CATEGORIES], "all"),
    query: typeof saved.query === "string" ? saved.query : "",
    projectDraft: typeof saved.projectDraft === "string" ? saved.projectDraft : "",
  };
}

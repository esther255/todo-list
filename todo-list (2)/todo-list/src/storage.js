import ProjectManager from "./logic/projectManager.js";

const KEY = "todo-app";
const DRAFT_KEY = "todo-draft";
const VIEW_KEY = "todo-view";

/** Save every project and todo. `store` is injectable so tests can pass a fake. */
export function saveApp(manager, store = localStorage) {
  try {
    store.setItem(KEY, JSON.stringify(manager));
  } catch {
    /* storage full or blocked: the app keeps working in memory */
  }
}

/**
 * Returns a fully rebuilt ProjectManager (real Todo/Project objects with their
 * methods), or null when nothing usable is stored, so the app never crashes.
 */
export function loadApp(store = localStorage) {
  try {
    const raw = store.getItem(KEY);
    return raw ? ProjectManager.fromJSON(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/* ---------- Unfinished form (draft) ---------- */

const DRAFT_FIELDS = [
  "title",
  "description",
  "status",
  "category",
  "priority",
  "dueDate",
  "projectId",
  "assignees",
  "notes",
  "newSubtask",
];

function cleanDraft(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.mode !== "new" && raw.mode !== "edit") return null;

  const values = {};
  for (const field of DRAFT_FIELDS) {
    if (typeof raw.values?.[field] === "string") values[field] = raw.values[field];
  }
  const checklist = (Array.isArray(raw.checklist) ? raw.checklist : [])
    .filter((item) => typeof item?.text === "string")
    .map((item) => ({ text: item.text, done: Boolean(item.done) }));

  return {
    mode: raw.mode,
    todoId: typeof raw.todoId === "string" ? raw.todoId : null,
    status: typeof raw.status === "string" ? raw.status : "todo",
    values,
    checklist,
  };
}

/** Remember a half-filled task form so a reload doesn't lose it. */
export function saveDraft(draft, store = localStorage) {
  try {
    store.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function loadDraft(store = localStorage) {
  try {
    const raw = store.getItem(DRAFT_KEY);
    return raw ? cleanDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function clearDraft(store = localStorage) {
  try {
    store.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/* ---------- Where you were: project, tab, sort, filters, search text ---------- */

const VIEW_FIELDS = ["activeId", "tab", "sort", "priority", "category", "query", "projectDraft"];

export function saveView(view, store = localStorage) {
  try {
    store.setItem(VIEW_KEY, JSON.stringify(view));
  } catch {
    /* ignore */
  }
}

/** Only known text fields come back; the caller checks the values are still valid. */
export function loadView(store = localStorage) {
  try {
    const raw = JSON.parse(store.getItem(VIEW_KEY));
    const view = {};
    for (const field of VIEW_FIELDS) {
      if (typeof raw?.[field] === "string") view[field] = raw[field];
    }
    return view;
  } catch {
    return {};
  }
}

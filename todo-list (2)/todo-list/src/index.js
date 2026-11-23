import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "./styles.css";

import { addDays, format } from "date-fns";
import ProjectManager from "./logic/projectManager.js";
import {
  filterTodos,
  groupByStatus,
  normalizeView,
  projectProgress,
  projectSummary,
  sortTodos,
  tabCounts,
} from "./logic/views.js";
import { STATUSES } from "./logic/todo.js";
import {
  clearDraft,
  loadApp,
  loadDraft,
  loadView,
  saveApp,
  saveDraft,
  saveView,
} from "./storage.js";
import { renderNavbar } from "./dom/navbar.js";
import { renderHeader } from "./dom/header.js";
import { renderBoard } from "./dom/board.js";
import { openTaskDialog } from "./dom/taskDialog.js";
import { showToast } from "./dom/toast.js";

// index.js is the only place that connects the logic modules to the DOM modules.

const day = (offset) => format(addDays(new Date(), offset), "yyyy-MM-dd");
const daysAgo = (n) => Date.now() - n * 86_400_000;

function createFirstTimeApp() {
  const manager = new ProjectManager();
  const id = manager.defaultProject.id;
  const add = (data) => manager.addTodo(id, data);

  add({
    title: "Login page",
    category: "General",
    priority: "medium",
    status: "todo",
    dueDate: day(1),
    assignees: ["JD", "TG"],
    description:
      "For this we will create frontend and integrate backend to login page to work well.",
  });
  add({
    title: "Design landing page layout",
    category: "Design",
    priority: "high",
    status: "todo",
    dueDate: day(2),
    assignees: ["JD", "MC"],
    description: "Create a clean, welcoming landing page experience.",
    checklist: [
      { text: "Moodboard", done: true },
      { text: "Wireframe", done: true },
      { text: "Hero section", done: false },
      { text: "Mobile layout", done: false },
    ],
  });
  add({
    title: "Interview five users",
    category: "Research",
    priority: "low",
    status: "todo",
    dueDate: day(6),
    assignees: ["SR"],
    description: "Find out what people need from the first screen.",
  });
  add({
    title: "Working on Frontend",
    category: "General",
    priority: "medium",
    status: "in-progress",
    dueDate: day(3),
    assignees: ["AM", "SR", "TG"],
    description: "This is client side",
  });
  add({
    title: "Build authentication flow",
    category: "Development",
    priority: "high",
    status: "in-progress",
    dueDate: day(-1),
    assignees: ["JD", "AM"],
    description: "Implement sign in, sign up, and password reset.",
    checklist: [
      { text: "Sign in", done: true },
      { text: "Sign up", done: true },
      { text: "Password reset", done: true },
      { text: "Email templates", done: false },
      { text: "Tests", done: false },
    ],
  });
  add({
    title: "Write onboarding guide",
    category: "Content",
    priority: "low",
    status: "in-progress",
    dueDate: day(5),
    assignees: ["MC"],
  });
  add({
    title: "Set up project repository",
    category: "Development",
    priority: "medium",
    status: "done",
    completedAt: daysAgo(7),
    assignees: ["JD", "SR"],
  });
  add({
    title: "Create initial wireframes",
    category: "Design",
    priority: "medium",
    status: "done",
    completedAt: daysAgo(8),
    assignees: ["MC"],
  });
  return manager;
}

const manager = loadApp() ?? createFirstTimeApp();

// Where you were last time (project, tab, sort, filters, search text, project-name draft).
const state = normalizeView(loadView(), {
  projectIds: manager.getProjects().map((p) => p.id),
  defaultProjectId: manager.defaultProject.id,
});

const headerEl = document.getElementById("header");
const boardEl = document.getElementById("board");

function render() {
  const project = manager.getProject(state.activeId);
  const todos = project.getTodos();
  const groups = groupByStatus(filterTodos(todos, state));
  const columns = STATUSES.map((status) => ({
    status,
    todos: sortTodos(groups[status], state.sort),
  }));

  renderHeader(headerEl, {
    manager,
    project,
    state,
    counts: tabCounts(todos),
    progress: projectProgress(project),
    inProgress: todos.filter((t) => t.status === "in-progress").length,
    assignees: [...new Set(todos.flatMap((t) => t.assignees))],
    actions,
  });
  renderBoard(boardEl, columns, actions);
  saveView(state);
}

// Save after every change, then redraw.
function commit() {
  saveApp(manager);
  render();
}

const actions = {
  // view controls
  setTab(tab) {
    state.tab = tab;
    render();
  },
  setSort(sort) {
    state.sort = sort;
    render();
  },
  setFilter(change) {
    Object.assign(state, change);
    render();
  },
  search(query) {
    state.query = query;
    render();
  },
  async share() {
    try {
      await navigator.clipboard.writeText(projectSummary(manager.getProject(state.activeId)));
      showToast("Project summary copied to clipboard");
    } catch {
      showToast("Couldn't copy to the clipboard");
    }
  },

  // projects
  selectProject(id) {
    state.activeId = id;
    render();
  },
  setProjectDraft(text) {
    state.projectDraft = text; // what you have typed in "New project name" so far
    saveView(state);
  },
  createProject(name) {
    state.activeId = manager.createProject(name).id;
    state.projectDraft = "";
    commit();
  },
  deleteProject(id) {
    const project = manager.getProject(id);
    if (!confirm(`Delete "${project.name}" and its ${project.size} task(s)?`)) return;
    manager.removeProject(id);
    if (state.activeId === id) state.activeId = manager.defaultProject.id;
    commit();
  },

  // tasks (the form keeps an unfinished draft in localStorage until it is saved or cancelled)
  newTask(status = "todo", draft = null) {
    openTaskDialog({
      status,
      draft,
      projects: manager.getProjects(),
      projectId: state.activeId,
      onDraft: (snapshot) =>
        snapshot ? saveDraft({ mode: "new", todoId: null, status, ...snapshot }) : clearDraft(),
      onSubmit(data, projectId) {
        manager.addTodo(projectId, data);
        state.activeId = projectId;
        commit();
      },
    });
  },
  editTask(todo, draft = null) {
    openTaskDialog({
      todo,
      draft,
      projects: manager.getProjects(),
      projectId: state.activeId,
      onDraft: (snapshot) =>
        snapshot
          ? saveDraft({ mode: "edit", todoId: todo.id, status: todo.status, ...snapshot })
          : clearDraft(),
      onSubmit(data, projectId) {
        todo.update(data);
        manager.moveTodo(todo.id, state.activeId, projectId);
        state.activeId = projectId;
        commit();
      },
      onDelete() {
        manager.removeTodo(state.activeId, todo.id);
        commit();
      },
    });
  },
  moveTask(id, status) {
    const todo = manager.getProject(state.activeId).getTodo(id);
    if (todo.status === status) return;
    todo.setStatus(status);
    commit();
  },
  clearCompleted() {
    const project = manager.getProject(state.activeId);
    if (project.getTodos().every((t) => !t.completed)) return;
    if (!confirm("Remove all completed tasks from this project?")) return;
    project.clearCompleted();
    commit();
  },
};

// After a reload: bring back whatever was half-finished.
function restoreUnfinishedWork() {
  const draft = loadDraft();
  if (draft?.mode === "edit") {
    const found = manager.findTodo(draft.todoId);
    if (!found) {
      clearDraft(); // the task was deleted in the meantime
    } else {
      state.activeId = found.project.id;
      render();
      actions.editTask(found.todo, draft);
      return;
    }
  } else if (draft) {
    actions.newTask(draft.status, draft);
    return;
  }
  // No task form was open, but a project name may have been half typed.
  if (state.projectDraft) headerEl.querySelector(".title-btn")?.click();
}

renderNavbar(document.getElementById("navbar"), {
  query: state.query,
  onSearch: actions.search,
  onNewTask: actions.newTask,
});
render();
restoreUnfinishedWork();

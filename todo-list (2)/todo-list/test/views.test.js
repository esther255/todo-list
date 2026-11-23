import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, format } from "date-fns";
import ProjectManager from "../src/logic/projectManager.js";
import {
  filterTodos,
  groupByStatus,
  normalizeView,
  projectProgress,
  projectSummary,
  sortTodos,
  tabCounts,
} from "../src/logic/views.js";

const day = (n) => format(addDays(new Date(), n), "yyyy-MM-dd");

function board() {
  const manager = new ProjectManager();
  const add = (data) => manager.addTodo(undefined, data);
  add({
    title: "Late design",
    category: "Design",
    priority: "high",
    status: "in-progress",
    dueDate: day(-2),
  });
  add({
    title: "Today thing",
    priority: "medium",
    dueDate: day(0),
    description: "Contains banana",
  });
  add({ title: "Someday", priority: "low" });
  add({ title: "Shipped", status: "done", priority: "high", dueDate: day(-5) });
  return manager.defaultProject;
}

test("groupByStatus splits todos into the three columns", () => {
  const groups = groupByStatus(board().getTodos());
  assert.equal(groups.todo.length, 2);
  assert.equal(groups["in-progress"].length, 1);
  assert.equal(groups.done.length, 1);
});

test("Tabs count high priority and tasks needing attention", () => {
  const counts = tabCounts(board().getTodos());
  assert.equal(counts.all, 4);
  assert.equal(counts.high, 2);
  assert.equal(counts.attention, 2); // overdue + due today; the finished one doesn't count
});

test("filterTodos by tab, priority, category and search", () => {
  const todos = board().getTodos();
  assert.equal(filterTodos(todos, { tab: "attention" }).length, 2);
  assert.equal(filterTodos(todos, { priority: "low" }).length, 1);
  assert.equal(filterTodos(todos, { category: "Design" }).length, 1);
  assert.equal(filterTodos(todos, { query: "BANANA" }).map((t) => t.title)[0], "Today thing");
  assert.equal(filterTodos(todos, { query: "zzz" }).length, 0);
});

test("sortTodos by due date puts undated last; by title is alphabetical", () => {
  const todos = board().getTodos();
  assert.equal(sortTodos(todos, "due").at(-1).title, "Someday");
  assert.equal(sortTodos(todos, "due")[0].title, "Shipped");
  assert.deepEqual(
    sortTodos(todos, "title").map((t) => t.title),
    ["Late design", "Shipped", "Someday", "Today thing"],
  );
  assert.equal(sortTodos(todos, "priority")[0].priority, "high");
});

test("sortTodos does not change the original array", () => {
  const todos = board().getTodos();
  const before = todos.map((t) => t.id);
  sortTodos(todos, "title");
  assert.deepEqual(
    todos.map((t) => t.id),
    before,
  );
});

test("projectProgress and clearCompleted", () => {
  const project = board();
  assert.deepEqual(projectProgress(project), { total: 4, done: 1, percent: 25 });
  assert.equal(project.clearCompleted(), 1);
  assert.equal(project.size, 3);
  assert.equal(projectProgress(project).percent, 0);
});

test("projectSummary lists every column", () => {
  const summary = projectSummary(board());
  assert.match(summary, /^My project/);
  assert.match(summary, /To do \(2\)/);
  assert.match(summary, /In progress \(1\)/);
  assert.match(summary, /Completed \(1\)/);
  assert.match(summary, /- Shipped/);
});

test("normalizeView keeps valid saved values", () => {
  const view = normalizeView(
    {
      activeId: "b",
      tab: "high",
      sort: "title",
      priority: "low",
      category: "Design",
      query: "hi",
      projectDraft: "Gy",
    },
    { projectIds: ["a", "b"], defaultProjectId: "a" },
  );
  assert.deepEqual(view, {
    activeId: "b",
    tab: "high",
    sort: "title",
    priority: "low",
    category: "Design",
    query: "hi",
    projectDraft: "Gy",
  });
});

test("normalizeView falls back when something is missing or no longer valid", () => {
  const view = normalizeView(
    {
      activeId: "deleted",
      tab: "nope",
      sort: 3,
      priority: "urgent",
      category: "Cooking",
      query: 9,
    },
    { projectIds: ["a"], defaultProjectId: "a" },
  );
  assert.deepEqual(view, {
    activeId: "a",
    tab: "all",
    sort: "due",
    priority: "all",
    category: "all",
    query: "",
    projectDraft: "",
  });
  assert.equal(
    normalizeView(undefined, { projectIds: ["a"], defaultProjectId: "a" }).activeId,
    "a",
  );
});

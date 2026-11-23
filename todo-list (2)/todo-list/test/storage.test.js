import { test } from "node:test";
import assert from "node:assert/strict";
import Todo from "../src/logic/todo.js";
import Project from "../src/logic/project.js";
import ProjectManager from "../src/logic/projectManager.js";
import {
  clearDraft,
  loadApp,
  loadDraft,
  loadView,
  saveApp,
  saveDraft,
  saveView,
} from "../src/storage.js";

const fakeStore = (initial = {}) => ({
  data: { ...initial },
  getItem(key) {
    return this.data[key] ?? null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
});

function sampleManager() {
  const manager = new ProjectManager();
  const school = manager.createProject("School");
  const todo = manager.addTodo(school.id, {
    title: "Essay",
    description: "Write it",
    dueDate: "2026-12-01",
    priority: "high",
    notes: "Use sources",
    checklist: [{ text: "Outline", done: true }],
  });
  todo.toggle();
  return { manager, school, todo };
}

test("Everything survives a save and load", () => {
  const store = fakeStore();
  const { manager, school, todo } = sampleManager();
  saveApp(manager, store);

  const loaded = loadApp(store);
  assert.equal(loaded.getProjects().length, 2);
  const restored = loaded.getProject(school.id).getTodo(todo.id);
  assert.equal(restored.title, "Essay");
  assert.equal(restored.dueDate, "2026-12-01");
  assert.equal(restored.priority, "high");
  assert.equal(restored.notes, "Use sources");
  assert.equal(restored.completed, true);
  assert.deepEqual(restored.checklist, [{ text: "Outline", done: true }]);
});

test("Loaded objects are real classes with their methods back", () => {
  const store = fakeStore();
  saveApp(sampleManager().manager, store);
  const loaded = loadApp(store);

  assert.ok(loaded instanceof ProjectManager);
  const project = loaded.getProjects()[1];
  assert.ok(project instanceof Project);
  const todo = project.getTodos()[0];
  assert.ok(todo instanceof Todo);
  todo.toggle(); // methods work again
  assert.equal(todo.completed, false);
  todo.addChecklistItem("New step");
  assert.equal(todo.checklist.length, 2);
});

test("The default project stays first and protected after loading", () => {
  const store = fakeStore();
  saveApp(sampleManager().manager, store);
  const loaded = loadApp(store);
  assert.equal(loaded.defaultProject.name, "My project");
  assert.throws(() => loaded.removeProject(loaded.defaultProject.id), /default/);
});

test("Missing, corrupt or odd data never crashes the app", () => {
  assert.equal(loadApp(fakeStore()), null);
  assert.equal(loadApp(fakeStore({ "todo-app": "{not json" })), null);
  assert.equal(loadApp(fakeStore({ "todo-app": "null" })).getProjects().length, 1);
  assert.equal(loadApp(fakeStore({ "todo-app": '{"oops":true}' })).getProjects().length, 1);
  assert.equal(
    loadApp({
      getItem() {
        throw new Error("blocked");
      },
    }),
    null,
  );
});

test("A damaged todo is skipped, the rest is kept", () => {
  const bad = JSON.stringify([
    {
      id: "p1",
      name: "My project",
      todos: [
        { id: "t1", title: "Good" },
        { id: "t2", title: "" },
        { id: "t3", title: "Bad", priority: "nope" },
      ],
    },
  ]);
  const loaded = loadApp(fakeStore({ "todo-app": bad }));
  assert.deepEqual(
    loaded.defaultProject.getTodos().map((t) => t.title),
    ["Good"],
  );
});

test("saveApp does not throw if storage is blocked", () => {
  const blocked = {
    setItem() {
      throw new Error("quota");
    },
  };
  assert.doesNotThrow(() => saveApp(new ProjectManager(), blocked));
});

test("Status, category and assignees survive a save and load", () => {
  const store = fakeStore();
  const manager = new ProjectManager();
  const todo = manager.addTodo(undefined, {
    title: "Board",
    status: "in-progress",
    category: "Design",
    assignees: ["JD", "MC"],
  });
  saveApp(manager, store);
  const restored = loadApp(store).defaultProject.getTodo(todo.id);
  assert.equal(restored.status, "in-progress");
  assert.equal(restored.category, "Design");
  assert.deepEqual(restored.assignees, ["JD", "MC"]);
});

test("Data saved by the earlier version (completed: true, no status) still loads", () => {
  const old = JSON.stringify([
    {
      id: "p1",
      name: "Inbox",
      todos: [
        { id: "t1", title: "Old done", completed: true },
        { id: "t2", title: "Old open", completed: false },
      ],
    },
  ]);
  const todos = loadApp(fakeStore({ "todo-app": old })).defaultProject.getTodos();
  assert.deepEqual(
    todos.map((t) => t.status),
    ["done", "todo"],
  );
});

/* ---------- unfinished form (draft) and view ---------- */

const sampleDraft = () => ({
  mode: "new",
  todoId: null,
  status: "in-progress",
  values: { title: "Half written", description: "Not fini", priority: "high", newSubtask: "Buy" },
  checklist: [{ text: "First step", done: true }],
});

test("A half-filled form can be saved and loaded back", () => {
  const store = fakeStore();
  saveDraft(sampleDraft(), store);
  const draft = loadDraft(store);
  assert.equal(draft.mode, "new");
  assert.equal(draft.status, "in-progress");
  assert.equal(draft.values.title, "Half written");
  assert.equal(draft.values.newSubtask, "Buy");
  assert.deepEqual(draft.checklist, [{ text: "First step", done: true }]);
});

test("clearDraft forgets it, and no draft means null", () => {
  const store = fakeStore();
  assert.equal(loadDraft(store), null);
  saveDraft(sampleDraft(), store);
  clearDraft({ ...store, removeItem: (key) => delete store.data[key] });
  assert.equal(loadDraft(store), null);
});

test("Broken or strange draft data is ignored, never a crash", () => {
  assert.equal(loadDraft(fakeStore({ "todo-draft": "{nope" })), null);
  assert.equal(loadDraft(fakeStore({ "todo-draft": "42" })), null);
  assert.equal(loadDraft(fakeStore({ "todo-draft": '{"mode":"weird"}' })), null);
  const odd = JSON.stringify({
    mode: "edit",
    todoId: 7,
    values: { title: 5, notes: "ok", evil: "x" },
    checklist: [1, { text: "ok" }],
  });
  const draft = loadDraft(fakeStore({ "todo-draft": odd }));
  assert.equal(draft.todoId, null);
  assert.deepEqual(draft.values, { notes: "ok" }); // wrong types and unknown fields are dropped
  assert.deepEqual(draft.checklist, [{ text: "ok", done: false }]);
});

test("Saving a draft does not throw if storage is blocked", () => {
  const blocked = {
    setItem() {
      throw new Error("quota");
    },
  };
  assert.doesNotThrow(() => saveDraft(sampleDraft(), blocked));
  assert.doesNotThrow(() => saveView({ query: "x" }, blocked));
  assert.equal(
    loadDraft({
      getItem() {
        throw new Error("blocked");
      },
    }),
    null,
  );
});

test("The view (project, tab, search text...) is saved and loaded", () => {
  const store = fakeStore();
  saveView(
    { activeId: "p1", tab: "high", query: "design", projectDraft: "Gym", junk: "x", sort: 5 },
    store,
  );
  assert.deepEqual(loadView(store), {
    activeId: "p1",
    tab: "high",
    query: "design",
    projectDraft: "Gym",
  });
  assert.deepEqual(loadView(fakeStore()), {});
  assert.deepEqual(loadView(fakeStore({ "todo-view": "{bad" })), {});
});

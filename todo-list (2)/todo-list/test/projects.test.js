import { test } from "node:test";
import assert from "node:assert/strict";
import Project from "../src/logic/project.js";
import ProjectManager from "../src/logic/projectManager.js";

test("Project adds, finds and removes todos", () => {
  const project = new Project("Work");
  const a = project.addTodo({ title: "A" });
  project.addTodo({ title: "B" });
  assert.equal(project.size, 2);
  assert.equal(project.getTodo(a.id).title, "A");
  project.removeTodo(a.id);
  assert.equal(project.size, 1);
  assert.throws(() => project.getTodo(a.id), /No todo found/);
});

test("Project protects its internal list and validates its name", () => {
  const project = new Project("Home");
  project.addTodo({ title: "A" });
  project.getTodos().pop();
  assert.equal(project.size, 1);
  assert.throws(() => new Project("  "), /name/);
});

test("A new app starts with a default project", () => {
  const manager = new ProjectManager();
  assert.equal(manager.getProjects().length, 1);
  assert.equal(manager.defaultProject.name, "My project");
});

test("Todos go to the default project unless another is chosen", () => {
  const manager = new ProjectManager();
  const school = manager.createProject("School");
  manager.addTodo(undefined, { title: "Goes to default" });
  manager.addTodo(school.id, { title: "Goes to school" });
  assert.equal(manager.defaultProject.size, 1);
  assert.equal(school.size, 1);
});

test("createProject rejects empty and duplicate names", () => {
  const manager = new ProjectManager();
  manager.createProject("Gym");
  assert.throws(() => manager.createProject(" "), /name/);
  assert.throws(() => manager.createProject("gym"), /already exists/);
});

test("removeProject works but never for the default project", () => {
  const manager = new ProjectManager();
  const p = manager.createProject("Temp");
  manager.removeProject(p.id);
  assert.equal(manager.getProjects().length, 1);
  assert.throws(() => manager.removeProject(manager.defaultProject.id), /default/);
});

test("moveTodo moves a todo between projects", () => {
  const manager = new ProjectManager();
  const other = manager.createProject("Other");
  const todo = manager.addTodo(undefined, { title: "Mover" });
  manager.moveTodo(todo.id, manager.defaultProject.id, other.id);
  assert.equal(manager.defaultProject.size, 0);
  assert.equal(other.getTodo(todo.id), todo);
});

test("moveTodo to an unknown project loses nothing", () => {
  const manager = new ProjectManager();
  const todo = manager.addTodo(undefined, { title: "Safe" });
  assert.throws(() => manager.moveTodo(todo.id, manager.defaultProject.id, "nope"));
  assert.equal(manager.defaultProject.size, 1);
});

test("removeTodo deletes from the right project", () => {
  const manager = new ProjectManager();
  const todo = manager.addTodo(undefined, { title: "Delete me" });
  manager.removeTodo(manager.defaultProject.id, todo.id);
  assert.equal(manager.defaultProject.size, 0);
});

test("findTodo finds a todo in any project, or returns null", () => {
  const manager = new ProjectManager();
  const other = manager.createProject("Other");
  const todo = manager.addTodo(other.id, { title: "Hiding" });
  const found = manager.findTodo(todo.id);
  assert.equal(found.todo, todo);
  assert.equal(found.project, other);
  assert.equal(manager.findTodo("missing"), null);
});

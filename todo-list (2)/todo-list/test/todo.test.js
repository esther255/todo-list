import { test } from "node:test";
import assert from "node:assert/strict";
import { format, subDays } from "date-fns";
import Todo from "../src/logic/todo.js";

test("Todo has sensible defaults and trims text", () => {
  const todo = new Todo({ title: "  Buy milk  " });
  assert.equal(todo.title, "Buy milk");
  assert.equal(todo.description, "");
  assert.equal(todo.dueDate, "");
  assert.equal(todo.priority, "medium");
  assert.equal(todo.completed, false);
  assert.deepEqual(todo.checklist, []);
});

test("Todo stores all the properties from the assignment", () => {
  const todo = new Todo({
    title: "Ship",
    description: "Finish the project",
    dueDate: "2026-12-01",
    priority: "high",
    notes: "Deploy on Friday",
    checklist: [{ text: "Tests", done: true }],
  });
  assert.equal(todo.description, "Finish the project");
  assert.equal(todo.dueDate, "2026-12-01");
  assert.equal(todo.priority, "high");
  assert.equal(todo.notes, "Deploy on Friday");
  assert.deepEqual(todo.checklist, [{ text: "Tests", done: true }]);
});

test("Todo validates title, date and priority", () => {
  assert.throws(() => new Todo({ title: "   " }), /title/);
  assert.throws(() => new Todo({}), /title/);
  assert.throws(() => new Todo({ title: "x", dueDate: "not-a-date" }), /due date/);
  assert.throws(() => new Todo({ title: "x", priority: "urgent" }), /Priority/);
});

test("Todo state is encapsulated", () => {
  const todo = new Todo({ title: "Read" });
  assert.throws(() => {
    todo.title = "hacked";
  }, TypeError);
  todo.checklist.push({ text: "sneaky", done: false });
  assert.deepEqual(todo.checklist, []);
});

test("A failed update changes nothing (all-or-nothing)", () => {
  const todo = new Todo({ title: "Keep", priority: "low" });
  assert.throws(() => todo.update({ title: "Changed", priority: "bogus" }));
  assert.equal(todo.title, "Keep");
  assert.equal(todo.priority, "low");
});

test("update changes details, toggle completes, setPriority works", () => {
  const todo = new Todo({ title: "Task" });
  todo.update({ title: "Task 2", description: "More", dueDate: "2026-11-30" });
  todo.setPriority("high");
  todo.toggle();
  assert.equal(todo.title, "Task 2");
  assert.equal(todo.description, "More");
  assert.equal(todo.priority, "high");
  assert.equal(todo.completed, true);
  todo.toggle();
  assert.equal(todo.completed, false);
});

test("Checklist add, toggle and remove", () => {
  const todo = new Todo({ title: "Trip" });
  todo.addChecklistItem("Passport");
  todo.addChecklistItem("Tickets");
  todo.toggleChecklistItem(0);
  assert.equal(todo.checklist[0].done, true);
  todo.removeChecklistItem(1);
  assert.deepEqual(todo.checklist, [{ text: "Passport", done: true }]);
  todo.addChecklistItem("   "); // blank items are ignored
  assert.equal(todo.checklist.length, 1);
});

test("isOverdue uses the due date and completion", () => {
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const todo = new Todo({ title: "Late", dueDate: yesterday });
  assert.equal(todo.isOverdue, true);
  todo.toggle();
  assert.equal(todo.isOverdue, false);
  assert.equal(new Todo({ title: "No date" }).isOverdue, false);
});

test("Todo has a status, category and assignees with defaults", () => {
  const todo = new Todo({ title: "Board" });
  assert.equal(todo.status, "todo");
  assert.equal(todo.category, "General");
  assert.deepEqual(todo.assignees, []);
  assert.equal(todo.completedAt, null);
});

test("Moving a todo to done records when, and moving it back clears it", () => {
  const todo = new Todo({ title: "Ship" });
  todo.setStatus("in-progress");
  assert.equal(todo.completed, false);
  todo.setStatus("done");
  assert.equal(todo.completed, true);
  assert.ok(todo.completedAt > 0);
  todo.setStatus("todo");
  assert.equal(todo.completedAt, null);
});

test("Status and category are validated", () => {
  assert.throws(() => new Todo({ title: "x", status: "blocked" }), /Status/);
  assert.throws(() => new Todo({ title: "x", category: "Cooking" }), /Category/);
});

test("Assignees are tidied: uppercase, max 3 letters, unique, max 4", () => {
  const todo = new Todo({
    title: "Team",
    assignees: ["jd", " mc ", "JD", "", "abcdef", "b", "c", "d"],
  });
  assert.deepEqual(todo.assignees, ["JD", "MC", "ABC", "B"]);
});

test("Old saved data with completed: true still loads as done", () => {
  const todo = Todo.fromJSON({ id: "a", title: "Legacy", completed: true });
  assert.equal(todo.status, "done");
  assert.equal(todo.completed, true);
});

test("completedAt from saved data is kept", () => {
  const todo = Todo.fromJSON({
    title: "Done long ago",
    status: "done",
    completedAt: 1700000000000,
  });
  assert.equal(todo.completedAt, 1700000000000);
});

test("isDueToday is true only for today", () => {
  const today = format(new Date(), "yyyy-MM-dd");
  assert.equal(new Todo({ title: "Now", dueDate: today }).isDueToday, true);
  assert.equal(
    new Todo({ title: "Later", dueDate: format(subDays(new Date(), 3), "yyyy-MM-dd") }).isDueToday,
    false,
  );
});

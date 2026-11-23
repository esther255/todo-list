import { isBefore, isToday, isValid, parseISO, startOfToday } from "date-fns";

export const PRIORITIES = ["low", "medium", "high"];
export const STATUSES = ["todo", "in-progress", "done"];
export const STATUS_LABELS = { todo: "To do", "in-progress": "In progress", done: "Completed" };
export const CATEGORIES = ["General", "Design", "Development", "Research", "Content"];

const text = (value) => String(value ?? "").trim();

/**
 * One todo item. Pure application logic: no DOM, no storage.
 *
 * Encapsulation: every field is private. Values can only change through
 * update() / toggle() / the checklist methods, which validate everything
 * BEFORE assigning, so a Todo is never left half-updated or invalid.
 */
export default class Todo {
  #id;
  #createdAt;
  #title = "";
  #description = "";
  #dueDate = ""; // "yyyy-MM-dd" or ""
  #priority = "medium";
  #notes = "";
  #checklist = []; // [{ text, done }]
  #status = "todo";
  #category = "General";
  #assignees = []; // initials, e.g. ["JD", "MC"]
  #completedAt = null;

  constructor({
    id = crypto.randomUUID(),
    createdAt = Date.now(),
    completed,
    completedAt = null,
    status,
    ...fields
  } = {}) {
    this.#id = id;
    this.#createdAt = createdAt;
    // `title: undefined` first, so a missing title is rejected by the same validation.
    // `completed` is the old boolean format, still understood so saved data keeps working.
    this.update({ title: undefined, status: status ?? (completed ? "done" : "todo"), ...fields });
    if (this.#status === "done" && completedAt) this.#completedAt = completedAt;
  }

  static #checkTitle(value) {
    const title = text(value);
    if (!title) throw new Error("A task needs a title.");
    return title;
  }

  static #checkDate(value) {
    const date = text(value);
    if (date && !isValid(parseISO(date))) throw new Error("That due date is not valid.");
    return date;
  }

  static #checkOneOf(value, allowed, label) {
    if (!allowed.includes(value))
      throw new Error(`${label} must be one of: ${allowed.join(", ")}.`);
    return value;
  }

  static #checkChecklist(value) {
    if (!Array.isArray(value)) throw new Error("Checklist must be a list.");
    return value
      .map((item) => ({ text: text(item?.text), done: Boolean(item?.done) }))
      .filter((item) => item.text);
  }

  static #checkAssignees(value) {
    if (!Array.isArray(value)) throw new Error("Assignees must be a list.");
    const initials = value.map((v) => text(v).toUpperCase().slice(0, 3)).filter(Boolean);
    return [...new Set(initials)].slice(0, 4);
  }

  get id() {
    return this.#id;
  }
  get createdAt() {
    return this.#createdAt;
  }
  get title() {
    return this.#title;
  }
  get description() {
    return this.#description;
  }
  get dueDate() {
    return this.#dueDate;
  }
  get priority() {
    return this.#priority;
  }
  get notes() {
    return this.#notes;
  }
  get status() {
    return this.#status;
  }
  get category() {
    return this.#category;
  }
  get completedAt() {
    return this.#completedAt;
  }
  get completed() {
    return this.#status === "done";
  }

  // Copies, so callers can't edit these behind the Todo's back.
  get checklist() {
    return this.#checklist.map((item) => ({ ...item }));
  }
  get assignees() {
    return [...this.#assignees];
  }

  get isOverdue() {
    return (
      Boolean(this.#dueDate) && !this.completed && isBefore(parseISO(this.#dueDate), startOfToday())
    );
  }

  get isDueToday() {
    return Boolean(this.#dueDate) && isToday(parseISO(this.#dueDate));
  }

  /** Change any of title, description, dueDate, priority, notes, checklist, status, category, assignees. */
  update(changes = {}) {
    const next = {};
    if ("title" in changes) next.title = Todo.#checkTitle(changes.title);
    if ("description" in changes) next.description = text(changes.description);
    if ("dueDate" in changes) next.dueDate = Todo.#checkDate(changes.dueDate);
    if ("priority" in changes)
      next.priority = Todo.#checkOneOf(changes.priority, PRIORITIES, "Priority");
    if ("notes" in changes) next.notes = text(changes.notes);
    if ("checklist" in changes) next.checklist = Todo.#checkChecklist(changes.checklist);
    if ("status" in changes) next.status = Todo.#checkOneOf(changes.status, STATUSES, "Status");
    if ("category" in changes)
      next.category = Todo.#checkOneOf(changes.category, CATEGORIES, "Category");
    if ("assignees" in changes) next.assignees = Todo.#checkAssignees(changes.assignees);

    // Everything is valid, so it's safe to apply.
    if ("title" in next) this.#title = next.title;
    if ("description" in next) this.#description = next.description;
    if ("dueDate" in next) this.#dueDate = next.dueDate;
    if ("priority" in next) this.#priority = next.priority;
    if ("notes" in next) this.#notes = next.notes;
    if ("checklist" in next) this.#checklist = next.checklist;
    if ("category" in next) this.#category = next.category;
    if ("assignees" in next) this.#assignees = next.assignees;
    if ("status" in next && next.status !== this.#status) {
      this.#status = next.status;
      this.#completedAt = next.status === "done" ? Date.now() : null;
    }
  }

  setPriority(priority) {
    this.update({ priority });
  }

  setStatus(status) {
    this.update({ status });
  }

  /** Done <-> not done. */
  toggle() {
    this.setStatus(this.completed ? "todo" : "done");
  }

  addChecklistItem(itemText) {
    this.update({ checklist: [...this.#checklist, { text: itemText, done: false }] });
  }

  toggleChecklistItem(index) {
    const item = this.#checklist[index];
    if (item) item.done = !item.done;
  }

  removeChecklistItem(index) {
    this.#checklist = this.#checklist.filter((_, i) => i !== index);
  }

  // JSON can't hold methods or private fields, so spell the data out...
  toJSON() {
    return {
      id: this.#id,
      createdAt: this.#createdAt,
      title: this.#title,
      description: this.#description,
      dueDate: this.#dueDate,
      priority: this.#priority,
      notes: this.#notes,
      checklist: this.checklist,
      status: this.#status,
      category: this.#category,
      assignees: this.assignees,
      completedAt: this.#completedAt,
    };
  }

  // ...and rebuild a real Todo (with all its methods) when loading.
  static fromJSON(data) {
    return new Todo(data);
  }
}

import Todo from "./todo.js";

/** A named list of todos. */
export default class Project {
  #id;
  #name;
  #todos = [];

  constructor(name, { id = crypto.randomUUID(), todos = [] } = {}) {
    this.#id = id;
    this.#name = Project.#checkName(name);
    this.#todos = [...todos];
  }

  static #checkName(value) {
    const name = String(value ?? "").trim();
    if (!name) throw new Error("A project needs a name.");
    return name;
  }

  get id() {
    return this.#id;
  }
  get name() {
    return this.#name;
  }
  get size() {
    return this.#todos.length;
  }

  rename(name) {
    this.#name = Project.#checkName(name);
  }

  addTodo(data) {
    const todo = new Todo(data);
    this.#todos.push(todo);
    return todo;
  }

  /** Put an existing Todo in this project (used when moving between projects). */
  receive(todo) {
    this.#todos.push(todo);
  }

  getTodo(id) {
    const todo = this.#todos.find((t) => t.id === id);
    if (!todo) throw new Error(`No todo found with id "${id}".`);
    return todo;
  }

  removeTodo(id) {
    const todo = this.getTodo(id);
    this.#todos = this.#todos.filter((t) => t.id !== id);
    return todo;
  }

  getTodos() {
    return [...this.#todos];
  }

  /** Remove every finished todo. Returns how many were removed. */
  clearCompleted() {
    const before = this.#todos.length;
    this.#todos = this.#todos.filter((t) => !t.completed);
    return before - this.#todos.length;
  }

  toJSON() {
    return { id: this.#id, name: this.#name, todos: this.#todos.map((t) => t.toJSON()) };
  }

  static fromJSON({ name, id, todos = [] }) {
    const restored = (Array.isArray(todos) ? todos : []).flatMap((data) => {
      try {
        return [Todo.fromJSON(data)];
      } catch {
        return []; // skip a damaged todo instead of losing the whole project
      }
    });
    return new Project(name, { id, todos: restored });
  }
}

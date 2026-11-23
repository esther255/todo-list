import { el } from "./el.js";
import { icon } from "./icons.js";
import { avatarStack } from "./avatars.js";
import { createMenu, menuItem } from "./menu.js";
import { formatDone, formatShort } from "./dates.js";
import { STATUS_LABELS } from "../logic/todo.js";

const slug = (text) => text.toLowerCase();

function dueLabel(todo) {
  if (todo.completed) {
    return todo.completedAt
      ? el("span", { class: "due done" }, icon("check", 12), formatDone(todo.completedAt))
      : null;
  }
  if (!todo.dueDate) return null;
  return el(
    "span",
    { class: `due${todo.isOverdue ? " overdue" : ""}` },
    icon("clock", 12),
    formatShort(todo.dueDate),
  );
}

function card(todo, actions) {
  const subtasks = todo.checklist;
  const doneCount = subtasks.filter((item) => item.done).length;

  return el(
    "article",
    {
      class: `card${todo.completed ? " is-done" : ""}`,
      draggable: true,
      tabindex: 0,
      role: "button",
      "aria-label": `Open task: ${todo.title}`,
      onClick: () => actions.editTask(todo),
      onKeydown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          actions.editTask(todo);
        }
      },
      onDragstart: (event) => {
        event.dataTransfer.setData("text/plain", todo.id);
        event.dataTransfer.effectAllowed = "move";
        event.currentTarget.classList.add("dragging");
      },
      onDragend: (event) => event.currentTarget.classList.remove("dragging"),
    },
    el(
      "div",
      { class: "card-top" },
      el("span", { class: `pill cat-${slug(todo.category)}` }, todo.category),
      el(
        "span",
        { class: `priority p-${todo.priority}`, title: `${todo.priority} priority` },
        todo.priority,
      ),
    ),
    el("h4", { class: "card-title" }, todo.title),
    todo.description && el("p", { class: "card-desc" }, todo.description),
    subtasks.length > 0 &&
      el(
        "p",
        { class: "subtasks-line" },
        icon("subtask", 14),
        `${doneCount}/${subtasks.length} subtasks`,
      ),
    el("div", { class: "card-foot" }, avatarStack(todo.assignees) ?? el("span"), dueLabel(todo)),
  );
}

function column({ status, todos }, actions) {
  const more = createMenu({
    trigger: el(
      "button",
      { type: "button", class: "icon-btn", "aria-label": `${STATUS_LABELS[status]} options` },
      icon("more", 18),
    ),
    align: "right",
    content: (closeMenu) =>
      el(
        "div",
        {},
        menuItem({
          label: "Add task",
          onSelect: () => {
            closeMenu();
            actions.newTask(status);
          },
        }),
        status === "done" &&
          menuItem({
            label: "Clear completed",
            danger: true,
            onSelect: () => {
              closeMenu();
              actions.clearCompleted();
            },
          }),
      ),
  });

  const col = el(
    "section",
    {
      class: `column col-${status}`,
      "aria-label": STATUS_LABELS[status],
      onDragover: (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        col.classList.add("drag-over");
      },
      onDragleave: (event) => {
        if (!col.contains(event.relatedTarget)) col.classList.remove("drag-over");
      },
      onDrop: (event) => {
        event.preventDefault();
        col.classList.remove("drag-over");
        const id = event.dataTransfer.getData("text/plain");
        if (id) actions.moveTask(id, status);
      },
    },
    el(
      "header",
      { class: "col-head" },
      el("span", { class: "status-dot" }),
      el("h3", {}, STATUS_LABELS[status]),
      el("span", { class: "col-count" }, todos.length),
      more,
    ),
    ...todos.map((todo) => card(todo, actions)),
    el(
      "button",
      { type: "button", class: "add-task", onClick: () => actions.newTask(status) },
      icon("plus", 14),
      "Add a task",
    ),
  );
  return col;
}

/** The three-column board. Cards can be dragged between columns. */
export function renderBoard(container, columns, actions) {
  container.replaceChildren(...columns.map((c) => column(c, actions)));
}

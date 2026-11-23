import { format } from "date-fns";
import { el } from "./el.js";
import { checkControl, showFeedback } from "./validation.js";
import { CATEGORIES, PRIORITIES, STATUSES, STATUS_LABELS } from "../logic/todo.js";
import {
  assigneesProblem,
  descriptionProblem,
  notesProblem,
  subtaskProblem,
  titleProblem,
} from "../logic/validation.js";

const capitalise = (s) => s[0].toUpperCase() + s.slice(1);

function select(options, value) {
  const node = el(
    "select",
    {},
    ...options.map(([val, label]) => el("option", { value: val }, label)),
  );
  node.value = value;
  return node;
}

function setSelect(node, value) {
  if (value !== undefined && [...node.options].some((option) => option.value === value)) {
    node.value = value;
  }
}

/** A label, a control and an empty line where its error message will appear. */
function field(label, name, control, { required = false } = {}) {
  control.id = `field-${name}`;
  control.name = name;
  const error = el("p", { class: "field-error", id: `error-${name}`, "aria-live": "polite" });
  control.setAttribute("aria-describedby", error.id);
  const node = el(
    "div",
    { class: "field" },
    el("label", { htmlFor: control.id }, label, required && el("span", { class: "req" }, " *")),
    control,
    error,
  );
  return { node, error };
}

/**
 * Modal to create a task (todo = null) or view/edit/delete one.
 *
 * - Every field is validated live (as you type and when you leave it).
 * - Whatever you type is reported through onDraft(snapshot) on every change, so the caller can
 *   keep it in localStorage. onDraft(null) is called when the dialog is closed on purpose.
 * - draft restores a snapshot saved before a reload.
 * - onSubmit(data, projectId) may throw; the message is shown in the form.
 */
export function openTaskDialog({
  todo = null,
  status = "todo",
  projects,
  projectId,
  draft = null,
  onDraft,
  onSubmit,
  onDelete,
}) {
  const dialog = el("dialog", { class: "task-dialog" });
  const formError = el("p", { class: "error", role: "alert" });

  const title = el("input", {
    type: "text",
    required: true,
    value: todo?.title ?? "",
    autocomplete: "off",
  });
  const description = el("textarea", { rows: 3, value: todo?.description ?? "" });
  const statusSelect = select(
    STATUSES.map((s) => [s, STATUS_LABELS[s]]),
    todo?.status ?? status,
  );
  const category = select(
    CATEGORIES.map((c) => [c, c]),
    todo?.category ?? "General",
  );
  const priority = select(
    PRIORITIES.map((p) => [p, capitalise(p)]),
    todo?.priority ?? "medium",
  );
  const dueDate = el("input", { type: "date", value: todo?.dueDate ?? "", max: "2100-12-31" });
  if (!todo) dueDate.min = format(new Date(), "yyyy-MM-dd"); // new tasks can't start in the past
  const project = select(
    projects.map((p) => [p.id, p.name]),
    projectId,
  );
  const assignees = el("input", {
    type: "text",
    value: todo?.assignees.join(", ") ?? "",
    placeholder: "e.g. JD, MC",
    autocomplete: "off",
  });
  const notes = el("textarea", { rows: 2, value: todo?.notes ?? "" });

  // Subtasks are edited on a local copy and only saved when the form is saved.
  const items = todo ? todo.checklist : [];
  const list = el("ul", { class: "subtasks" });
  const addInput = el("input", {
    type: "text",
    placeholder: "Add a subtask",
    "aria-label": "New subtask",
    autocomplete: "off",
    "aria-describedby": "error-subtask",
    onKeydown: (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addItem();
      }
    },
  });
  const subtaskError = el("p", {
    class: "field-error",
    id: "error-subtask",
    "aria-live": "polite",
  });

  const titleField = field("Title", "title", title, { required: true });
  const descriptionField = field("Description", "description", description);
  const statusField = field("Status", "status", statusSelect);
  const categoryField = field("Category", "category", category);
  const priorityField = field("Priority", "priority", priority);
  const dueDateField = field("Due date", "dueDate", dueDate);
  const projectField = field("Project", "project", project);
  const assigneesField = field("Assignees", "assignees", assignees);
  const notesField = field("Notes", "notes", notes);

  /* ---------- Live validation (Constraint Validation API) ---------- */

  const rules = [
    {
      control: title,
      error: titleField.error,
      custom: titleProblem,
      messages: { valueMissing: "Give your task a title." },
    },
    { control: description, error: descriptionField.error, custom: descriptionProblem },
    {
      control: dueDate,
      error: dueDateField.error,
      messages: {
        rangeUnderflow: "Pick today or a later date.",
        rangeOverflow: "That date is too far away.",
        badInput: "That isn't a real date.",
      },
    },
    { control: assignees, error: assigneesField.error, custom: assigneesProblem },
    { control: notes, error: notesField.error, custom: notesProblem },
    { control: addInput, error: subtaskError, custom: subtaskProblem },
  ];
  const ruleFor = new Map(rules.map((rule) => [rule.control, rule]));
  const touched = new Set(); // a field only turns red or green after you've used it

  function check(rule, { markTouched = false } = {}) {
    if (markTouched) touched.add(rule.control);
    const message = checkControl(rule.control, rule);
    showFeedback(rule.control, rule.error, message, touched.has(rule.control));
    return message;
  }

  /* ---------- Keeping an unfinished form across reloads ---------- */

  const snapshot = () => ({
    values: {
      title: title.value,
      description: description.value,
      status: statusSelect.value,
      category: category.value,
      priority: priority.value,
      dueDate: dueDate.value,
      projectId: project.value,
      assignees: assignees.value,
      notes: notes.value,
      newSubtask: addInput.value,
    },
    checklist: items.map((item) => ({ ...item })),
  });
  const saveDraft = () => onDraft?.(snapshot());

  /* ---------- Subtasks ---------- */

  function drawItems() {
    list.replaceChildren(
      ...items.map((item, index) =>
        el(
          "li",
          {},
          el("input", {
            type: "checkbox",
            checked: item.done,
            "aria-label": item.text,
            onChange: (event) => {
              item.done = event.target.checked;
              drawItems();
            },
          }),
          el("span", { class: item.done ? "done" : "" }, item.text),
          el(
            "button",
            {
              type: "button",
              class: "icon-btn",
              "aria-label": `Remove ${item.text}`,
              onClick: () => {
                items.splice(index, 1);
                drawItems();
                saveDraft();
              },
            },
            "×",
          ),
        ),
      ),
    );
  }

  function pushSubtask() {
    const text = addInput.value.trim();
    if (!text) return;
    items.push({ text, done: false });
    addInput.value = "";
    drawItems();
  }

  function addItem() {
    const rule = ruleFor.get(addInput);
    if (check(rule, { markTouched: true })) return;
    pushSubtask();
    check(rule, { markTouched: true }); // field is empty again, so this clears the feedback
    saveDraft();
  }

  /* ---------- Put back what was typed before a reload ---------- */

  if (draft) {
    const { values, checklist } = draft;
    for (const [control, key] of [
      [title, "title"],
      [description, "description"],
      [dueDate, "dueDate"],
      [assignees, "assignees"],
      [notes, "notes"],
      [addInput, "newSubtask"],
    ]) {
      if (values[key] !== undefined) control.value = values[key];
    }
    setSelect(statusSelect, values.status);
    setSelect(category, values.category);
    setSelect(priority, values.priority);
    setSelect(project, values.projectId);
    items.splice(0, items.length, ...checklist);
  }
  drawItems();
  if (draft) {
    // Show feedback for anything that was already filled in.
    for (const rule of rules) if (rule.control.value !== "") check(rule, { markTouched: true });
  }

  /* ---------- The form ---------- */

  const form = el(
    "form",
    {
      noValidate: true, // all validation is done in JavaScript
      onSubmit: (event) => {
        event.preventDefault();

        let firstInvalid = null;
        for (const rule of rules) {
          const message = check(rule, { markTouched: true });
          if (message && !firstInvalid) firstInvalid = rule.control;
        }
        if (firstInvalid) {
          formError.textContent = "Please fix the highlighted fields before saving.";
          firstInvalid.focus();
          return;
        }

        pushSubtask(); // keep a subtask that was typed but not added yet
        try {
          onSubmit(
            {
              title: title.value,
              description: description.value,
              status: statusSelect.value,
              category: category.value,
              priority: priority.value,
              dueDate: dueDate.value,
              assignees: assignees.value.split(/[,\s]+/).filter(Boolean),
              notes: notes.value,
              checklist: items,
            },
            project.value,
          );
          dialog.close();
        } catch (e) {
          formError.textContent = e.message;
        }
      },
    },
    el("h3", {}, todo ? "Task details" : "New task"),
    titleField.node,
    descriptionField.node,
    el("div", { class: "field-row" }, statusField.node, categoryField.node, priorityField.node),
    el("div", { class: "field-row" }, dueDateField.node, projectField.node, assigneesField.node),
    notesField.node,
    el("div", { class: "field" }, el("label", {}, "Subtasks"), list, addInput, subtaskError),
    formError,
    el(
      "div",
      { class: "dialog-actions" },
      todo &&
        el(
          "button",
          {
            type: "button",
            class: "danger-btn",
            onClick: () => {
              if (confirm("Delete this task?")) {
                onDelete();
                dialog.close();
              }
            },
          },
          "Delete",
        ),
      el("span", { class: "spacer" }),
      el("button", { type: "button", class: "secondary", onClick: () => dialog.close() }, "Cancel"),
      el("button", { type: "submit", class: "primary" }, todo ? "Save changes" : "Add task"),
    ),
  );

  // Live feedback while typing, and when you leave a field.
  form.addEventListener("input", (event) => {
    const rule = ruleFor.get(event.target);
    if (rule) check(rule, { markTouched: true });
    formError.textContent = "";
    saveDraft();
  });
  form.addEventListener("focusout", (event) => {
    const rule = ruleFor.get(event.target);
    if (rule) check(rule, { markTouched: true });
  });
  form.addEventListener("change", saveDraft); // selects and the date picker

  dialog.append(form);
  // Closing on purpose (Save, Cancel, Delete, Escape) forgets the draft. A reload does not.
  dialog.addEventListener("close", () => {
    onDraft?.(null);
    dialog.remove();
  });
  document.body.append(dialog);
  dialog.showModal();
  title.focus();
}

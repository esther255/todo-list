import { el } from "./el.js";
import { icon } from "./icons.js";
import { avatarStack } from "./avatars.js";
import { createMenu, menuItem } from "./menu.js";
import { CATEGORIES, PRIORITIES } from "../logic/todo.js";
import { SORTS, TABS } from "../logic/views.js";
import { projectNameProblem } from "../logic/validation.js";
import { checkControl, showFeedback } from "./validation.js";

const capitalise = (s) => s[0].toUpperCase() + s.slice(1);

function projectMenu(manager, project, state, actions) {
  const trigger = el(
    "button",
    { type: "button", class: "title-btn" },
    project.name,
    icon("chevron", 18),
  );

  return createMenu({
    trigger,
    content: (closeMenu) => {
      const error = el("p", { class: "error", id: "project-name-error", role: "alert" });
      const input = el("input", {
        type: "text",
        required: true,
        autocomplete: "off",
        placeholder: "New project name",
        "aria-label": "New project name",
        "aria-describedby": "project-name-error",
        value: state.projectDraft ?? "", // what you had typed before a reload
      });

      // Live validation: runs as you type, using the Constraint Validation API.
      const existingNames = manager.getProjects().map((p) => p.name);
      const validate = (touched) => {
        const message = checkControl(input, {
          custom: (value) => projectNameProblem(value, existingNames),
          messages: { valueMissing: "Type a name for the new project." },
        });
        showFeedback(input, error, message, touched);
        return message;
      };
      input.addEventListener("input", () => {
        actions.setProjectDraft(input.value);
        validate(true);
      });
      input.addEventListener("blur", () => input.value !== "" && validate(true));
      if (input.value) validate(true);

      const rows = manager.getProjects().map((p) => {
        const open = p.getTodos().filter((t) => !t.completed).length;
        return el(
          "div",
          { class: "menu-row" },
          el(
            "button",
            {
              type: "button",
              class: `menu-item${p === project ? " active" : ""}`,
              role: "menuitem",
              onClick: () => {
                closeMenu();
                actions.selectProject(p.id);
              },
            },
            el("span", {}, p.name),
            el("span", { class: "muted-count" }, open),
          ),
          p !== manager.defaultProject &&
            el(
              "button",
              {
                type: "button",
                class: "icon-btn",
                "aria-label": `Delete project ${p.name}`,
                onClick: () => actions.deleteProject(p.id),
              },
              "×",
            ),
        );
      });

      const form = el(
        "form",
        {
          class: "menu-form",
          noValidate: true,
          onSubmit: (event) => {
            event.preventDefault();
            if (validate(true)) {
              input.focus();
              return;
            }
            try {
              actions.createProject(input.value);
            } catch (e) {
              error.textContent = e.message;
            }
          },
        },
        input,
        el("button", { type: "submit", class: "primary small" }, "Add"),
      );

      return el(
        "div",
        {},
        el("p", { class: "menu-label" }, "Projects"),
        ...rows,
        el("hr"),
        form,
        error,
      );
    },
  });
}

function filterMenu(state, actions) {
  const activeCount = [state.priority, state.category].filter((v) => v !== "all").length;
  const trigger = el(
    "button",
    { type: "button", class: "ghost-btn" },
    icon("filter", 14),
    "Filter",
    activeCount > 0 && el("span", { class: "pill-count" }, activeCount),
  );

  const section = (label, key, values, closeMenu) => [
    el("p", { class: "menu-label" }, label),
    ...["all", ...values].map((value) =>
      menuItem({
        label: value === "all" ? "All" : capitalise(value),
        active: state[key] === value,
        onSelect: () => {
          closeMenu();
          actions.setFilter({ [key]: value });
        },
      }),
    ),
  ];

  return createMenu({
    trigger,
    align: "right",
    content: (closeMenu) =>
      el(
        "div",
        {},
        ...section("Priority", "priority", PRIORITIES, closeMenu),
        el("hr"),
        ...section("Category", "category", CATEGORIES, closeMenu),
      ),
  });
}

function sortMenu(state, actions) {
  return createMenu({
    trigger: el("button", { type: "button", class: "ghost-btn" }, icon("sort", 14), "Sort"),
    align: "right",
    content: (closeMenu) =>
      el(
        "div",
        {},
        el("p", { class: "menu-label" }, "Sort tasks by"),
        ...SORTS.map(({ id, label }) =>
          menuItem({
            label,
            active: state.sort === id,
            onSelect: () => {
              closeMenu();
              actions.setSort(id);
            },
          }),
        ),
      ),
  });
}

/** Breadcrumb, project title, filter/sort/share, and the tab row. */
export function renderHeader(
  container,
  { manager, project, state, counts, progress, inProgress, assignees, actions },
) {
  const position = manager.getProjects().indexOf(project) + 1;
  const badge =
    progress.total === 0
      ? el("span", { class: "badge neutral" }, "No tasks yet")
      : el("span", { class: "badge success" }, `${progress.percent}% complete`);

  const tabs = TABS.map(({ id, label }) =>
    el(
      "button",
      {
        type: "button",
        role: "tab",
        class: `tab${state.tab === id ? " active" : ""}`,
        "aria-selected": String(state.tab === id),
        onClick: () => actions.setTab(id),
      },
      label,
      el("span", { class: `tab-count tab-${id}` }, counts[id]),
    ),
  );

  container.replaceChildren(
    el(
      "div",
      { class: "page-head" },
      el(
        "div",
        { class: "head-left" },
        el(
          "p",
          { class: "crumb" },
          icon("spark", 12),
          `WORKSPACE / PROJECT ${position} OF ${manager.getProjects().length}`,
        ),
        el(
          "div",
          { class: "title-row" },
          el("h1", {}, projectMenu(manager, project, state, actions)),
          badge,
        ),
        el("p", { class: "tagline" }, "A little progress each day adds up to big results."),
      ),
      el(
        "div",
        { class: "head-actions" },
        filterMenu(state, actions),
        sortMenu(state, actions),
        el(
          "button",
          { type: "button", class: "ghost-btn", onClick: actions.share },
          icon("share", 14),
          "Share",
        ),
      ),
    ),
    el(
      "div",
      { class: "tabs-row" },
      el("div", { class: "tabs", role: "tablist" }, ...tabs),
      el(
        "div",
        { class: "tabs-meta" },
        el("span", {}, `${inProgress} ${inProgress === 1 ? "task" : "tasks"} in progress`),
        avatarStack(assignees),
      ),
    ),
  );
}

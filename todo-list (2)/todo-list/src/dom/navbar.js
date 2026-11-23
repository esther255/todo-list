import { el } from "./el.js";
import { icon } from "./icons.js";

function navTab(iconName, label, active = false) {
  return el(
    "button",
    {
      type: "button",
      class: `nav-tab${active ? " active" : ""}`,
      disabled: !active,
      title: active ? "" : "Coming soon",
      "aria-current": active ? "page" : "false",
    },
    icon(iconName),
    label,
  );
}

/** Top bar. Rendered once, so the search box keeps focus while you type. */
export function renderNavbar(container, { query = "", onSearch, onNewTask }) {
  const search = el("input", {
    type: "search",
    placeholder: "Search tasks...",
    "aria-label": "Search tasks",
    value: query, // restored after a reload
    onInput: (event) => onSearch(event.target.value),
  });

  container.replaceChildren(
    el(
      "div",
      { class: "nav-inner" },
      el(
        "div",
        { class: "brand" },
        el("span", { class: "brand-mark" }, icon("check", 20)),
        el("span", { class: "brand-name" }, "taskboard", el("span", { class: "brand-dot" }, ".")),
      ),
      el(
        "nav",
        { class: "nav-tabs", "aria-label": "Views" },
        navTab("grid", "Board", true),
        navTab("calendar", "Calendar"),
        navTab("timeline", "Timeline"),
        navTab("members", "Members"),
      ),
      el("label", { class: "search" }, icon("search"), search),
      el(
        "button",
        { type: "button", class: "primary", onClick: () => onNewTask("todo") },
        icon("plus"),
        "New task",
      ),
      el("span", { class: "avatar me", title: "You" }, "ME"),
    ),
  );
}

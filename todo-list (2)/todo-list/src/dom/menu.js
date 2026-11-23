import { el } from "./el.js";

function close(wrap) {
  wrap.classList.remove("open");
  wrap.querySelector("[aria-expanded]")?.setAttribute("aria-expanded", "false");
}

const closeAll = () => document.querySelectorAll(".menu-wrap.open").forEach(close);

// One pair of listeners closes any open menu on outside click or Escape.
document.addEventListener("click", (event) => {
  document.querySelectorAll(".menu-wrap.open").forEach((wrap) => {
    if (!wrap.contains(event.target)) close(wrap);
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAll();
});

/**
 * A button that opens a small popover.
 * content(closeMenu) is called each time it opens, so it always shows fresh data.
 */
export function createMenu({ trigger, content, align = "left" }) {
  const popover = el("div", { class: `popover align-${align}`, role: "menu" });
  const wrap = el("div", { class: "menu-wrap" }, trigger, popover);
  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-expanded", "false");

  trigger.addEventListener("click", () => {
    const opening = !wrap.classList.contains("open");
    closeAll();
    if (opening) {
      popover.replaceChildren(content(() => close(wrap)));
      wrap.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
    }
  });
  return wrap;
}

export function menuItem({ label, active = false, danger = false, onSelect }) {
  const classes = ["menu-item", active && "active", danger && "danger"].filter(Boolean).join(" ");
  return el(
    "button",
    { type: "button", class: classes, role: "menuitem", onClick: onSelect },
    label,
  );
}

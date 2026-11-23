import { el } from "./el.js";

export function showToast(message) {
  const toast = el("div", { class: "toast", role: "status" }, message);
  document.body.append(toast);
  setTimeout(() => toast.remove(), 2200);
}

import { el } from "./el.js";

const COLORS = ["#7c5cf0", "#f08a4b", "#2fa66a", "#d9548f", "#4f7cf0", "#d99a1b"];

// Same initials always get the same colour.
function colorFor(initials) {
  let hash = 0;
  for (const char of initials) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

export function avatar(initials) {
  return el(
    "span",
    { class: "avatar", title: initials, style: `background:${colorFor(initials)}` },
    initials,
  );
}

export function avatarStack(list, max = 3) {
  if (list.length === 0) return null;
  const shown = list.slice(0, max).map(avatar);
  const extra = list.length - max;
  return el(
    "span",
    { class: "avatar-stack" },
    ...shown,
    extra > 0 && el("span", { class: "avatar more" }, `+${extra}`),
  );
}

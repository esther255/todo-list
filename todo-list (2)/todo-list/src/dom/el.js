/**
 * Tiny element builder: el("button", { class: "x", onClick: fn }, "Label").
 * Uses textContent/append (never innerHTML), so user text can't inject HTML.
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(
    ...children.flat().filter((child) => child !== null && child !== undefined && child !== false),
  );
  return node;
}

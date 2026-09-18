const viewer = document.getElementById("viewer");
const MAX_PREVIEW_ITEMS = 5;

// ---------- Helpers ----------
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// typeof null === "object" and typeof [] === "object", so handle both first
function getType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value; // "string" | "number" | "boolean" | "object"
}

function isContainer(type) {
  return type === "object" || type === "array";
}

function isEmpty(value) {
  return Object.keys(value).length === 0;
}

function formatPrimitive(value, type) {
  return type === "string" ? `"${value}"` : String(value);
}

// ---------- Header preview (Chrome-style summary) ----------
// Nested containers are shortened: Array(2), {…}, [], {}
function previewValue(value) {
  const type = getType(value);
  if (type === "string") return `'${value}'`;
  if (type === "array") return value.length ? `Array(${value.length})` : "[]";
  if (type === "object") return isEmpty(value) ? "{}" : "{…}";
  return String(value);
}

function buildPreview(value, type) {
  const entries = Object.entries(value);
  const shown = entries.slice(0, MAX_PREVIEW_ITEMS);
  const more = entries.length > MAX_PREVIEW_ITEMS ? ", …" : "";

  if (type === "array") {
    return `[${shown.map(([, v]) => previewValue(v)).join(", ")}${more}]`;
  }
  return `{${shown.map(([k, v]) => `${k}: ${previewValue(v)}`).join(", ")}${more}}`;
}

// ---------- Builders ----------
function appendKey(parent, key) {
  if (key === null) return; // root has no key
  parent.append(el("span", "key", key), ": ");
}

function createLeaf(key, value, type) {
  const li = el("li", "leaf");
  appendKey(li, key);

  if (isContainer(type)) {
    // empty {} or []
    li.append(el("span", "value empty", type === "array" ? "[]" : "{}"));
  } else {
    li.append(el("span", `value ${type}`, formatPrimitive(value, type)));
  }
  return li;
}

function createNode(key, value, type) {
  const li = el("li", "node expanded"); // everything starts expanded

  const header = el("div", "node-header");
  header.append(el("span", "toggle", "▶"));
  appendKey(header, key);
  if (type === "array")
    header.append(el("span", "length", `(${value.length})`), " ");
  header.append(el("span", "preview", buildPreview(value, type)));

  const children = el("ul");
  for (const [childKey, childValue] of Object.entries(value)) {
    children.append(renderEntry(childKey, childValue)); // recursion
  }

  li.append(header, children);
  return li;
}

// The recursive entry point: decides leaf vs node
function renderEntry(key, value) {
  const type = getType(value);
  if (isContainer(type) && !isEmpty(value)) {
    return createNode(key, value, type);
  }
  return createLeaf(key, value, type);
}

// ---------- Render ----------
function render(data) {
  const root = el("ul");
  root.append(renderEntry(null, data));
  viewer.replaceChildren(root);
}

// ---------- Fetch & render ----------
async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}`,
    );
  }
  return response.json(); // already parsed into a JS object
}

async function init() {
  viewer.replaceChildren(el("div", "loading", "Loading…"));
  try {
    const data = await fetchData("https://dummyjson.com/products/1");
    render(data);
  } catch (err) {
    viewer.replaceChildren(
      el("div", "error", `Failed to load: ${err.message}`),
    );
  }
}

init();

// ---------- Collapse / expand via event delegation ----------
viewer.addEventListener("click", (event) => {
  const header = event.target.closest(".node-header");
  if (!header || !viewer.contains(header)) return; // clicked a leaf or outside
  header.parentElement.classList.toggle("expanded");
});

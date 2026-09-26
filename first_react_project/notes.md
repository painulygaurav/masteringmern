# Notes: Actual React Project vs Manual React (Fiber demo)

If you compare a real Vite + React project to our manual "mini react" implementation, the pieces map almost one-to-one — because a real React project is just a much more complete, production-grade version of the same ideas.

## 1. `index.html` — the root container

Same idea as our manual project: a single empty container element that React (or our manual `render()`) mounts into.

```html
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
```

One Vite-specific detail: unlike a typical static site, this `index.html` is **not just a static file** — Vite treats it as the entry point of the whole app. The `<script type="module" src="/src/main.jsx">` tag is what kicks off the JS/JSX bundle, and Vite serves/transforms everything downstream from there.

## 2. `main.jsx` — where rendering actually starts

This is the equivalent of our `renderApp()` function — the place that grabs the root DOM node and hands off the top-level component to be rendered.

```jsx
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
```

`createRoot(...)` is React's real entry point into the fiber/reconciliation machinery we built manually — it's what internally creates the `currentRoot`/`wipRoot` fiber trees, schedules work, diffs, and commits, all of which we implemented a toy version of by hand. `.render(<App />)` is the real-world equivalent of our `render(App(), container)` call.

(You may also see this wrapped in `<StrictMode>` in the default template — that's a dev-only wrapper that helps surface bugs by intentionally double-invoking some functions; it has no effect in production.)

## 3. `App.jsx` — the component

One correction here: `App()` doesn't return "the DOM" — it returns **JSX**, which is _not_ HTML. JSX is syntax sugar that gets compiled (by Vite, using esbuild/Babel under the hood) into plain `React.createElement(...)` calls — exactly the same shape of object our own `createElement()` function produced manually.

```jsx
function App() {
  return <h1>Hello</h1>;
}
// compiles down to roughly:
function App() {
  return React.createElement("h1", null, "Hello");
}
```

So the real pipeline is: **JSX → `createElement` calls → React elements (plain JS objects) → fiber tree → real DOM**, which is precisely the pipeline we hand-built, just with a compiler step added at the front.

## 4. Why `export default App`

Every JS module can have only **one** default export, but many named exports. Since a component file's whole purpose is "here is the one main thing this file provides," a default export is the natural fit — it lets `main.jsx` import it under any name without needing to match an exact exported identifier:

```jsx
export default App; // in App.jsx
import App from "./App"; // in main.jsx — the name "App" here is just convention, not required
```

If it were a **named** export instead (`export function App() {}`), the import would have to match exactly: `import { App } from './App'` (or use `as` to alias it).

## 5. Why React feels fast — two different things get conflated here

This is worth separating into two _unrelated_ mechanisms, because "HMR" and "React is fast" are answering different questions:

- **Runtime rendering speed (React itself)** comes from the **Fiber architecture and reconciliation** — the diffing process we built by hand earlier: React only updates the DOM nodes that actually changed (`UPDATE`/`PLACEMENT`/`DELETION` effect tags), rather than re-rendering the whole page, and can pause/resume work to avoid blocking the browser.

- **Fast _development_ feedback loop** comes from **HMR — Hot Module Replacement**, which is a feature of **Vite** (the build tool), not React itself:
  - When you save a file, Vite pushes just the changed module to the browser over a WebSocket connection already open with the dev server.
  - The browser swaps that one module in place, **without a full page reload** — so component state (e.g. form input, a counter mid-count) is often preserved across the edit.
  - This is a dev-only feature — it doesn't exist in your production build; production just ships the final optimized bundle.

So: **Fiber/reconciliation** = why the app runs efficiently once it's live. **HMR** = why _editing_ the app during development feels instant. Different tools, different problems, both contribute to "React feels fast" but for different reasons.

# ESLint — Incremental Notes (Deeper Dive into `eslint.config.js`)

## Anatomy of the Flat Config File

`eslint.config.js` exports an **array of configuration objects**. ESLint reads them in order and merges them; later objects can override rules set by earlier ones for the same files.

```javascript
export default [
  { ignores: ['dist'] },              // object 1: what to skip entirely
  js.configs.recommended,              // object 2: a pre-built rule set (spread in)
  {
    files: ['**/*.{js,jsx}'],          // object 3: applies only to these files
    languageOptions: { ... },
    plugins: { ... },
    rules: { ... },
  },
]
```

Each object can target different files via a `files` key — this is how a real project can, for example, apply stricter rules to `src/` but looser ones to config files.

## Rule Severity Levels

Every rule in the `rules` object is set to one of three levels:

```javascript
rules: {
  'no-unused-vars': 'off',    // 0 — rule is disabled
  'no-console': 'warn',        // 1 — reported, but doesn't fail lint
  'no-undef': 'error',         // 2 — reported as a failure (matters for CI gating)
}
```

Numbers (`0`/`1`/`2`) and strings (`'off'`/`'warn'`/`'error'`) are interchangeable — the string form is just more readable.

## `languageOptions` — telling ESLint how to parse your code

This section tells ESLint what JS syntax to expect, so it doesn't flag valid modern syntax as an error:

```javascript
languageOptions: {
  ecmaVersion: 2020,           // understand modern JS syntax (optional chaining, etc.)
  globals: globals.browser,    // recognizes browser globals like `window`, `document`
  parserOptions: {
    ecmaFeatures: { jsx: true } // understand JSX syntax specifically
  }
}
```

Without `globals: globals.browser`, ESLint would flag `window` or `document` as "undefined variable" — it doesn't know about the browser runtime by default.

## Plugins vs Rules

A **plugin** is a package that _adds_ new rules ESLint doesn't ship with by default. The Vite React template includes `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`:

```javascript
import reactHooks from 'eslint-plugin-react-hooks';

plugins: {
  'react-hooks': reactHooks,
},
rules: {
  'react-hooks/rules-of-hooks': 'error',        // hooks called correctly (not conditionally, etc.)
  'react-hooks/exhaustive-deps': 'warn',        // useEffect/useMemo dependency arrays are complete
}
```

Note the rule name prefix (`react-hooks/...`) — it tells ESLint which plugin the rule comes from, since core rules (like `no-unused-vars`) have no prefix.

## `extends` / Recommended Configs

Rather than hand-picking every rule, most configs start from a pre-built recommended set and layer customizations on top:

```javascript
import js from "@eslint/js";

export default [
  js.configs.recommended, // a curated bundle of sensible defaults
  {
    rules: {
      "no-unused-vars": "off", // override just one rule from the bundle above
    },
  },
];
```

## Running It

```bash
npm run lint          # reports every violation across the project, doesn't fix anything
npx eslint . --fix     # auto-fixes what it safely can (spacing, quote style, etc.)
```

`--fix` only resolves mechanical, unambiguous issues (formatting-type rules) — it can't fix logic issues like a missing `useEffect` dependency; those need a manual code change.

## `ignores` — excluding files entirely

```javascript
{
  ignores: ["dist", "build", "node_modules"];
}
```

These paths are skipped completely — no rules apply to them at all, not even at `'off'` severity. Useful for build output you don't want flagged since you never hand-write it.

# Notes: How the Browser "Understands" `.jsx`

## The short answer

The browser never actually sees a `.jsx` file. Vite transforms it into plain JavaScript before it reaches the browser at all — JSX has never been, and still isn't, part of the JavaScript or HTML spec. Some build tool always has to convert it to plain `createElement`-style calls before it can run anywhere.

## In Development (`npm run dev`)

1. Your browser requests a module — e.g. `/src/App.jsx`, referenced via an `import` in `main.jsx`.
2. Vite's dev server **intercepts that request** rather than serving the raw file.
3. It runs the file through **esbuild** (an extremely fast Go-based compiler) on the fly, converting JSX syntax like `<h1>Hello</h1>` into plain JS — either `React.createElement("h1", null, "Hello")` or the newer automatic-runtime equivalent, depending on config.
4. The **transformed plain JavaScript** — not the original JSX — is what's actually sent over HTTP to the browser. The browser just executes ordinary JS; JSX never enters the picture on its end.
5. This transform happens **per-file, on-demand**, only for files actually requested by the running app — this lazy, on-request compilation (rather than bundling the whole app upfront) is a big part of why Vite's dev server starts almost instantly, even on large projects.

## In Production (`npm run build`)

Production is architecturally different from dev — there's no live server transforming files per-request at all.

1. **Bundling, not serving.** Vite switches to **Rollup** under the hood for production builds. Rollup statically analyzes your entire import graph starting from `index.html`/`main.jsx`, transforms every `.jsx`/`.js` file it finds (JSX → `createElement` calls, same idea as dev but done once, ahead of time), and combines everything into a small number of static output files.

2. **Optimizations that only happen at build time** (not in dev, since dev prioritizes speed over final output size):
   - **Minification** — variable names shortened, whitespace/comments stripped, dead code removed.
   - **Tree-shaking** — unused exports/code paths across your dependencies are detected and dropped, so you're not shipping code nobody calls.
   - **Code-splitting** — large apps get split into multiple chunks (e.g. a separate chunk per route), so the browser only downloads what's needed for the current page instead of the entire app upfront.
   - **Asset hashing** — output filenames get content hashes (e.g. `index-a1b2c3.js`), so browsers can cache them aggressively and safely bust that cache only when content actually changes.

3. **Output.** All of this lands in a `dist/` folder containing plain, already-compiled `.js`, `.css`, and asset files, plus a rewritten `index.html` pointing to them. Nothing labeled `.jsx` exists anywhere in this output — by the time a real user's browser loads your deployed app, it's downloading pure, pre-optimized JavaScript, with zero build-tooling involved at request time.

4. **Why this two-mode split exists:** dev mode optimizes for _your_ iteration speed (fast startup, instant per-file transforms, HMR), while production mode optimizes for the _end user's_ experience (smallest possible download, fastest parse/execution, best caching) — the trade-offs are opposite, so Vite deliberately uses different tools/strategies for each.

## Does Rollup Run Automatically, or Do You Have to Trigger It?

Rollup only runs when you explicitly request a production build — it never fires on its own during normal development.

**What triggers it:**

```bash
npm run build
```

This script is added to `package.json` by Vite's template, and maps to `vite build` under the hood. That single command is what invokes Rollup — you never call or configure Rollup directly; Vite orchestrates it for you.

```json
// package.json (Vite template default)
"scripts": {
  "dev": "vite",           // dev server, esbuild-based, no Rollup involved
  "build": "vite build",   // this is what triggers Rollup
  "preview": "vite preview"
}
```

**What happens afterward:**

- `npm run build` produces the `dist/` folder — minified, bundled, tree-shaken, hashed files, as described above.
- Nothing continues running automatically after that. Rollup doesn't watch files or rebuild on save — that's what `npm run dev` (esbuild + HMR) is for instead.
- To actually see the production build _running_ (not just generated as files), you run `npm run preview` — this spins up a small static server pointing at `dist/`, simulating what a real deployed site would look and behave like.

**When this actually gets run in practice:**

- Manually, right before deploying somewhere (Vercel, Netlify, a custom server).
- Or as an automated step in a CI/CD pipeline — e.g. a GitHub Actions workflow runs `npm run build` on every push to `main`, then deploys the resulting `dist/` folder. Even in automation, something (a config file, a pipeline step) explicitly calls it — it never self-triggers.

# Notes: What is a React Component?

A React component is a JavaScript function (or, in older code, a class) that returns JSX describing a piece of UI. It's the fundamental building block React apps are made of — every button, form, card, or entire page you see is a component, and components combine to build a full app.

## The simplest possible example

```jsx
function Welcome() {
  return <h1>Hello!</h1>;
}
```

That's it — a function that returns JSX. React calls this function and uses whatever it returns to figure out what to put on the screen.

## Key characteristics

- **Function name must start with a capital letter** (`Welcome`, not `welcome`). This isn't just style — React uses the capitalization to distinguish a custom component (`<Welcome />`) from a regular HTML tag (`<h1>`). Lowercase tags are always treated as built-in DOM elements.

- **Takes "props" as input, returns JSX as output.** Props are how a parent passes data down to a component — similar to function arguments:

```jsx
function Welcome(props) {
  return <h1>Hello, {props.name}!</h1>;
}

// used like:
<Welcome name="Gaurav" />;
```

- **Composable** — components render other components, forming a tree. This is exactly the "element tree" you saw in our manual fiber implementation: `App` returning `Welcome()` alongside other elements is components nesting inside components.

- **Can hold its own state** via hooks (`useState`, `useEffect`, etc.) — this is what lets a component "remember" things between renders (like our `count` variable), rather than being purely a static function of its inputs.

## Connecting it back to what you've already built

In our manual fiber demo, `App()` and `Welcome()` are components in this exact sense — plain functions returning element trees (`createElement(...)` calls). Real React components do the same thing, just with JSX instead of hand-written `createElement`, and with the ability to hold internal state via hooks, which our manual version didn't implement.

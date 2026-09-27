# Notes: Event Handling & Synthetic Events in React

## The Problem: Why Direct DOM Access Fails

```jsx
const btn = document.getElementById("btn");
btn.addEventListener("click", () => alert("clicked"));
```

Running this directly inside a component body throws:

> TypeError: Cannot read properties of null (reading 'addEventListener')

**Why:** a component function's body runs _before_ React has committed anything to the actual DOM (recall the render phase vs commit phase split from the fiber notes — the JSX returned by `App()` is just describing what _should_ exist; it hasn't been created yet at the point the function body executes). So `document.getElementById("btn")` runs too early and finds nothing — the button doesn't exist in the DOM yet.

## Why `useEffect` Solves the Timing Problem

```jsx
useEffect(() => {
  const btn = document.getElementById("btn");
  btn.addEventListener("click", () => alert("clicked"));
}, []);
```

`useEffect` schedules its callback to run **after the DOM has been committed/painted** for that render — not "asynchronously batched," but specifically _deferred until after commit_. By the time the effect callback runs, `btn` is guaranteed to exist in the real DOM, so `getElementById` succeeds.

The empty dependency array `[]` means: run this effect once, after the first commit only — not on every re-render.

This approach works, but it's not the idiomatic React way — it means directly touching the DOM manually (an "escape hatch"), sidestepping how React normally wants you to manage the UI.

## The Idiomatic React Way: Synthetic Events

Instead of imperatively attaching a listener to a specific DOM node, you declare the handler directly on the JSX element, and React wires it up for you:

```jsx
const handleClick = (event) => {
  console.log("event type:", event.type);
  console.log("event.target:", event.target);
  console.log("event.currentTarget:", event.currentTarget);
};

<button onClick={handleClick}>Click me</button>;
```

No `getElementById`, no `addEventListener`, no `useEffect` needed — you're describing _what should happen_, and React handles _when/how_ to actually bind it, as part of the same render/commit process that creates the button in the first place.

### What "Synthetic Event" Actually Means

The `event` object your handler receives (e.g. in `handleClick(event)`) is not the raw browser `Event` object — it's a **`SyntheticEvent`**, a wrapper object React creates around the native event.

Key implementation detail: React doesn't attach a separate native listener to every single element with an `onClick`. Instead, it attaches **one listener at the root of the app** (historically at `document`, now at the root container in modern React) and uses **event delegation** — when a click happens anywhere in the app, that single root listener catches it, figures out which element it originated from and which React component's handler should run, wraps the native event in a `SyntheticEvent`, and calls your handler with it.

### Synthetic Events vs Native DOM Events

|                                         | Native DOM event (`addEventListener`)       | React `SyntheticEvent`                                                                                                                                                                           |
| --------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Listener attached                       | Directly on that specific DOM node          | One delegated listener at the app root                                                                                                                                                           |
| Cross-browser normalization             | None — raw browser differences leak through | Normalized — consistent property names/behavior across browsers                                                                                                                                  |
| Pooling (older React)                   | N/A                                         | In React ≤16, event objects were reused/nulled out after the handler ran (for performance) — accessing `event` async required `event.persist()`. This pooling behavior was removed in React 17+. |
| `event.target` vs `event.currentTarget` | Same distinction applies                    | `target` = the actual element that triggered the event (e.g. could be a child); `currentTarget` = the element the handler is actually attached to (the `<button>` itself here)                   |

### Passing Extra Arguments to a Handler

```jsx
const handleGreet = (name) => {
  console.log("name=" + name);
};

<button onClick={() => handleGreet("Gaurav")}>Click me</button>;
```

Here, `onClick` is given an **inline arrow function** rather than `handleGreet` directly — this is necessary because `onClick={handleGreet("Gaurav")}` would call `handleGreet` immediately during render (its return value, not the function itself, would become the handler). Wrapping it in `() => handleGreet("Gaurav")` defers the call until the actual click happens, and lets you pass whatever arguments you want alongside the event.

If you need both the extra argument _and_ the event object:

```jsx
const handleGreet = (name, event) => {
  console.log(name, event.type);
};

<button onClick={(event) => handleGreet("Gaurav", event)}>Click me</button>;
```

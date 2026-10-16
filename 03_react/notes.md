# How Hooks Are Stored in a Fiber (Slots)

## 1. The big idea

A function component has **no instance** to hold state, since the function re-runs from scratch on every render. React stores hook data **on the component's fiber**, in a **singly linked list** where each hook call gets one **slot** (a hook node).

- `fiber.memoizedState` points to the **first hook** in the list.
- Each hook node has a `next` pointer to the hook declared after it.
- A hook is identified by its **position (call order)**, never by its name or variable.

```
fiber (App)
  └─ memoizedState ──► [ Hook 1 ] ──next──► [ Hook 2 ] ──next──► [ Hook 3 ] ──► null
```

This connects directly to the Rules of Hooks: call order must be identical on every render, or React reads the wrong slot.

---

## 2. Shape of a hook node

```js
hook = {
  memoizedState: ...,  // the hook's stored value (meaning depends on hook type)
  baseState:     ...,  // base for state updates (used by useState/useReducer)
  baseQueue:     ...,  // updates skipped/rebased during concurrent rendering
  queue:         ...,  // pending updates + dispatch (useState/useReducer only)
  next:          ...,  // pointer to the next hook, or null
};
```

What `memoizedState` holds, per hook:

| Hook          | `hook.memoizedState`                                | Has `queue`?                       |
| ------------- | --------------------------------------------------- | ---------------------------------- |
| `useState`    | the current state value, e.g. `0`                   | Yes (pending updates + `dispatch`) |
| `useMemo`     | `[cachedValue, deps]`                               | No                                 |
| `useCallback` | `[cachedFunction, deps]`                            | No                                 |
| `useRef`      | `{ current: ... }`                                  | No                                 |
| `useEffect`   | an effect object (`{ create, destroy, deps, ... }`) | No                                 |

**Do not confuse the two `memoizedState`s:**

- `fiber.memoizedState` is the **head of the hook list**.
- `hook.memoizedState` is **one hook's value**.

---

## 3. Worked example: 3 hooks

```jsx
const App = () => {
  const [count, setCount] = useState(0);                 // Slot 1
  const result = useMemo(() => calculate(), []);         // Slot 2
  const sayHi1 = useCallback(() => sayHi(), []);         // Slot 3
  return (/* ... */);
};
```

### Layout after the first render

```
fiber(App).memoizedState
   │
   ▼
┌───────────────────────────┐   ┌─────────────────────────────┐   ┌─────────────────────────────┐
│ Hook 1: useState          │   │ Hook 2: useMemo             │   │ Hook 3: useCallback         │
│ memoizedState: 0          │   │ memoizedState:              │   │ memoizedState:              │
│ queue: {                  │   │   [500000000500000000, []]  │   │   [ƒ sayHi1, []]            │
│   pending: null,          │   │ next ───────────────────────┼─► │ next: null                  │
│   dispatch: setCount      │   │                             │   │                             │
│ }                         │   │                             │   │                             │
│ next ─────────────────────┼─► │                             │   │                             │
└───────────────────────────┘   └─────────────────────────────┘   └─────────────────────────────┘
```

---

## 4. Mount vs. update: the dispatcher swap

React swaps which implementation `useState`, `useMemo`, etc. point to, depending on the phase. This is the **dispatcher**.

| Phase                    | Dispatcher                   | What each hook call does                                   |
| ------------------------ | ---------------------------- | ---------------------------------------------------------- |
| **Mount** (first render) | `HooksDispatcherOnMount`     | **Creates** a new hook node and **appends** it to the list |
| **Update** (re-render)   | `HooksDispatcherOnUpdate`    | **Walks** the existing list, reading the next slot         |
| **Outside a component**  | an error-throwing dispatcher | Throws "Invalid hook call"                                 |

### Mount (internals)

Each hook call runs `mountWorkInProgressHook()`:

1. Create a blank hook node.
2. If this is the first hook, set `fiber.memoizedState = hook`. Otherwise set `previousHook.next = hook`.
3. Move a module-level cursor (`workInProgressHook`) to this new node.

Then the hook-specific logic fills the slot:

- `useState(0)`: `hook.memoizedState = 0`, create `queue`, and create `dispatch` by binding `dispatchSetState` to this fiber and queue.
- `useMemo(fn, [])`: run `fn()`, store `[value, []]`.
- `useCallback(fn, [])`: store `[fn, []]`.

### Update (internals)

React uses **double buffering**: two fiber copies, `current` (on screen) and `workInProgress` (being built). Each has its own hook list.

Each hook call runs `updateWorkInProgressHook()`:

1. Advance a `currentHook` cursor to the **next hook in the current fiber's list**.
2. **Clone** that hook node into the work-in-progress list.
3. Hand it to the hook-specific update logic.

Then, per hook:

- `useState`: process `queue.pending`, compute the new state, store it.
- `useMemo`: compare new `deps` against `hook.memoizedState[1]` with `Object.is`. If equal, return the stored value; otherwise recompute and store `[newValue, newDeps]`.
- `useCallback`: same comparison, returning the stored function or the new one.

**Key point:** on update, React never asks "which hook is this?" It only asks "what is the next slot?" The call order must therefore line up with the slot order.

---

## 5. Step-by-step: clicking "Counter"

```
setCount(c => c + 1)
  └─ dispatchSetState(fiber, queue, action)   ← bound at mount, so it knows its slot's queue
       ├─ push update onto Hook 1's queue.pending
       └─ schedule a re-render of fiber(App)

Re-render of App (update phase):
  useState     → cursor on Slot 1 → apply queued update → memoizedState: 0 → 1
  useMemo      → cursor on Slot 2 → deps [] vs [] equal → return cached sum   (loop skipped)
  useCallback  → cursor on Slot 3 → deps [] vs [] equal → return same ƒ        (same reference)
```

Why `sayHi1` keeps its identity: Slot 3 still holds the first `ƒ`, so `memo(Child)` sees an identical `sayHi` prop and skips the child.

---

## 6. Why hooks can't be conditional

```jsx
const App = ({ show }) => {
  if (show) {
    const [a, setA] = useState(0); // sometimes Slot 1, sometimes absent
  }
  const result = useMemo(() => calculate(), []); // Slot 1 or Slot 2?
  const sayHi1 = useCallback(() => sayHi(), []); // Slot 2 or Slot 3?
};
```

If `show` is `true` on mount and `false` on update:

```
Mount slots:    [useState] → [useMemo] → [useCallback]
Update calls:   useMemo reads Slot 1 (a useState hook!) → wrong data
                useCallback reads Slot 2 (the useMemo hook!) → wrong data
                ...and one slot is left unvisited
```

React detects the mismatch and throws: "Rendered fewer hooks than expected" or "Rendered more hooks than during the previous render."

**Same reason for the rule on loops, early returns before hooks, and nested functions:** anything that changes the number or order of hook calls corrupts slot alignment.

---

## 7. Connecting to earlier concepts

| Concept                       | Link to the slot model                                                                                                                                                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Closures**                  | `dispatch` is bound to its fiber and queue at mount, so `setCount` works from anywhere and keeps a **stable identity** (no need to list it in deps). `useCallback` stores a closure that captured the render's variables, which is why stale values appear if deps are incomplete. |
| **`useMemo` / `useCallback`** | Both are just slots holding `[value, deps]`. Memoization is a **comparison between the slot's stored deps and the new deps**.                                                                                                                                                      |
| **`memo`**                    | Compares **props** on the fiber (`memoizedProps`), separate from the hook list.                                                                                                                                                                                                    |
| **Reconciliation**            | The hook list belongs to the fiber, so state survives as long as reconciliation **keeps the same fiber** (same type and position). If the component unmounts or its `key` changes, the fiber is discarded and **all its slots are lost**, which resets the state.                  |

---

## 8. Interview Q&A

**Q: Where does React store state for a function component?**
On the component's fiber: `fiber.memoizedState` is the head of a linked list of hook nodes, one per hook call.

**Q: How does React know which `useState` call is which?**
By **call order**. Each call reads the next slot in the list. There are no names or keys.

**Q: What does `useMemo` store in its slot?**
`[cachedValue, deps]`. On update, it compares `deps` shallowly with `Object.is`; if all are equal it returns the cached value.

**Q: What is the difference between `fiber.memoizedState` and `hook.memoizedState`?**
The fiber's is the **first hook in the list**. A hook's is **that hook's own value**.

**Q: Why is `setState` identity stable across renders?**
`dispatch` is created once at mount, bound to the fiber and the queue, and stored on the slot's `queue`. Later renders return the same function.

**Q: Why does changing a component's `key` reset its state?**
A new key makes reconciliation create a **new fiber** with a **fresh hook list**. The old fiber and its slots are discarded.

**Q: What is the dispatcher?**
An object holding the implementations of all hooks. React swaps it between mount (create slots), update (walk slots), and invalid contexts (throw errors).

---

## 9. Quick reference

```
fiber.memoizedState ──► Hook1 ──► Hook2 ──► Hook3 ──► null

Mount:   create node → append to list → fill slot
Update:  advance cursor → clone node → compare deps / process queue

useState     slot = value + queue(dispatch)
useMemo      slot = [value, deps]
useCallback  slot = [fn, deps]

Rule: same hooks, same order, every render.
```

# Hook Order: Correct vs. Incorrect

## 1. The rule

On every render, a component must call **the same hooks, in the same order, the same number of times**. React matches hooks to slots by **position only**, so any change in the sequence misaligns the slots.

---

## 2. Correct order

```jsx
const App = ({ show }) => {
  const [count, setCount] = useState(0); // Slot 1
  const result = useMemo(() => calculate(), []); // Slot 2
  const sayHi1 = useCallback(() => sayHi(), []); // Slot 3

  return <div>{show && <p>Count: {count}</p>}</div>; // condition goes in the JSX, not around the hook
};
```

Every render calls `useState`, then `useMemo`, then `useCallback`:

```
Mount:    [useState] → [useMemo] → [useCallback]
Update 1: Slot 1 ✅    Slot 2 ✅    Slot 3 ✅
Update 2: Slot 1 ✅    Slot 2 ✅    Slot 3 ✅
```

**Conditions belong inside hooks or in the JSX, never around the hook call.**

---

## 3. Incorrect order

### Example A: hook inside a condition

```jsx
const App = ({ show }) => {
  if (show) {
    const [count, setCount] = useState(0); // ❌ conditional hook
  }
  const result = useMemo(() => calculate(), []);
  const sayHi1 = useCallback(() => sayHi(), []);
};
```

Mount with `show = true`, then update with `show = false`:

```
Mount (show = true):
  Slots:  [ Slot 1: useState ] → [ Slot 2: useMemo ] → [ Slot 3: useCallback ]

Update (show = false):
  useMemo     → reads Slot 1 → finds a useState hook   ❌ wrong type
  useCallback → reads Slot 2 → finds a useMemo hook    ❌ wrong type
  Slot 3 never visited                                 ❌ fewer hooks than before
```

React throws: **"Rendered fewer hooks than expected."**

### Example B: hook after an early return

```jsx
const App = ({ user }) => {
  const [count, setCount] = useState(0); // Slot 1

  if (!user) return null; // ❌ early return

  const result = useMemo(() => calculate(), []); // Slot 2 (only sometimes)
  const sayHi1 = useCallback(() => sayHi(), []); // Slot 3 (only sometimes)
};
```

When `user` goes from truthy to falsy, only Slot 1 is visited and Slots 2 and 3 are skipped.
React throws: **"Rendered fewer hooks than expected."**
The reverse (falsy to truthy) throws: **"Rendered more hooks than during the previous render."**

### Example C: hook inside a loop

```jsx
const App = ({ items }) => {
  for (const item of items) {
    const [value, setValue] = useState(item); // ❌ number of slots depends on items.length
  }
  const sayHi1 = useCallback(() => sayHi(), []);
};
```

If `items` has 3 elements on mount and 2 on update, the slot count changes and `useCallback` reads the wrong slot.

### Example D: hooks in different order between renders

```jsx
const App = ({ flip }) => {
  if (flip) {
    const result = useMemo(() => calculate(), []);
    const [count, setCount] = useState(0);
  } else {
    const [count, setCount] = useState(0);
    const result = useMemo(() => calculate(), []); // ❌ same hooks, different order
  }
};
```

Even with the same hooks and count, the order differs, so Slot 1 flips between a `useMemo` slot and a `useState` slot. React reads `[value, deps]` where it expects `{ queue, dispatch }` (or vice versa), and you get wrong data or a crash.

---

## 4. How to fix each case

| Problem                 | Fix                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Conditional hook        | Always call the hook; put the condition **inside** the hook or in the JSX                       |
| Hook after early return | Move **all hooks above** the early return                                                       |
| Hook in a loop          | Hold the collection in **one** `useState` (array/object), or extract a child component per item |
| Different order         | Use one fixed order for every render                                                            |

### Fixed versions

```jsx
// A: condition moves into the JSX
const App = ({ show }) => {
  const [count, setCount] = useState(0);
  const result = useMemo(() => calculate(), []);
  const sayHi1 = useCallback(() => sayHi(), []);
  return show ? <p>Count: {count}</p> : null;
};

// B: early return goes after all hooks
const App = ({ user }) => {
  const [count, setCount] = useState(0);
  const result = useMemo(() => calculate(), []);
  const sayHi1 = useCallback(() => sayHi(), []);
  if (!user) return null;
  return <div>{count}</div>;
};

// C: one hook holding the whole collection
const App = ({ items }) => {
  const [values, setValues] = useState(items);
  const sayHi1 = useCallback(() => sayHi(), []);
};

// Condition inside a hook is fine (e.g. effect)
useEffect(() => {
  if (show) doSomething();
}, [show]);
```

---

## 5. Side-by-side summary

|                       | Correct                        | Incorrect                        |
| --------------------- | ------------------------------ | -------------------------------- |
| Hook calls per render | Always the same count          | Count changes between renders    |
| Order per render      | Always the same                | Changes between renders          |
| Where conditions go   | Inside hooks or in the JSX     | Wrapping the hook call           |
| Slot alignment        | Slot N is always the same hook | Slot N may hold a different hook |
| Result                | State and caches stay intact   | Wrong data, or a thrown error    |

---

## 6. Why the linter catches it

The `react-hooks/rules-of-hooks` ESLint rule statically flags hooks inside conditions, loops, nested functions, and after early returns. Keep it enabled, because it catches these bugs before runtime.

---

## 7. Interview Q&A

**Q: What error do you get when hook order changes?**
"Rendered fewer hooks than expected" or "Rendered more hooks than during the previous render," because the slot count no longer matches the previous render.

**Q: Why not just identify hooks by name?**
Hooks are plain function calls with no identity, and React gets no variable names. Position in the call sequence is the only identifier, which keeps the API simple.

**Q: Can I use a condition with a hook at all?**
Yes, but **inside** the hook (e.g. `if (show)` within a `useEffect` callback) or in the JSX. Never around the hook call itself.

**Q: Is it OK to call hooks inside a custom hook?**
Yes. A custom hook's hooks simply become more slots in the calling component's list, as long as the custom hook is itself called unconditionally and in a stable order.

# Why Hooks Were Designed This Way (Call-Order Slots)

## 1. The problem hooks solved

Before React 16.8 (2019), stateful logic required **class components**. They had real pain points:

| Pain point in classes                   | What it looked like                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Logic reuse was awkward**             | HOCs and render props wrapped components in layers ("wrapper hell"), making the tree deep and hard to trace       |
| **Related logic was split apart**       | One concern (e.g. a subscription) spread across `componentDidMount`, `componentDidUpdate`, `componentWillUnmount` |
| **Unrelated logic was lumped together** | One lifecycle method mixed several unrelated concerns                                                             |
| **`this` confusion**                    | Binding handlers, mutable `this.props` / `this.state` read at the wrong time                                      |
| **Hard for tooling**                    | Classes minify poorly, make hot reloading flaky, and are hard to compile and optimize ahead of time               |

**Goal:** give function components state and effects, and let developers **extract and reuse stateful logic** by composing plain functions (custom hooks).

---

## 2. The core constraint: functions have no instance

A class instance is a persistent object, so `this.state` lives on it. A function component is **re-run from scratch every render**, and its local variables vanish after each call.

State has to live **somewhere outside the function**, and React must connect each hook call in a given render to the right stored value. This is where the fiber and slots come in:

```
const [a] = useState(0);     ← which stored value is mine?
const [b] = useState(0);     ← and this one?
```

Both lines are identical function calls with no identity. React needs a way to tell them apart.

---

## 3. The alternatives considered

### Option A: explicit keys (names)

```jsx
const [count, setCount] = useState("count", 0);
const [name, setName] = useState("name", "");
```

Problems:

- **Name collisions in composition.** Two custom hooks that each use `"value"` would overwrite each other's state.
- The **diamond problem**: custom hooks `useA` and `useB` both call `useWindowWidth()`, which uses key `"width"`, and they would share one slot by accident.
- Every hook author would need globally unique keys, which breaks the "just compose functions" goal.

### Option B: one object per component (like `this.state`)

```jsx
const [state, setState] = useComponentState({ count: 0, name: "" });
```

Problems:

- It brings back the class model: one shared bag with merge semantics.
- **Reusable logic can't own private state**, so custom hooks can't hide their internals.

### Option C: Symbols or factory-generated keys

```jsx
const countKey = createKey();
const [count] = useState(countKey, 0);
```

Problems:

- Extra boilerplate and ceremony on every hook.
- Hooks can't be freely copy-pasted or renamed without managing key creation.

### Option D (chosen): **position in the call order**

```jsx
const [count, setCount] = useState(0); // Slot 1
const [name, setName] = useState(""); // Slot 2
```

---

## 4. Why call order wins

| Property                              | Why it matters                                                                                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No naming or collisions**           | A custom hook's internal hooks just become more slots in the caller's list. Two uses of the same custom hook get **independent** state automatically. |
| **Composition is free**               | `useA` calling `useB` calling `useC` is just a flat sequence of slots. No hierarchy to manage.                                                        |
| **Minimal API**                       | `useState(0)` is the whole call. No boilerplate.                                                                                                      |
| **Cheap runtime**                     | A linked list walk with a cursor. No hash maps or key lookups per render.                                                                             |
| **Easy to copy, rename, and extract** | Moving code into a custom hook doesn't change anything about how state is identified.                                                                 |

### Diamond problem solved

```jsx
function useWindowWidth() {
  const [w, setW] = useState(0);
  /* ... */ return w;
}

function useA() {
  return useWindowWidth();
}
function useB() {
  return useWindowWidth();
}

function App() {
  const a = useA(); // slots 1 (useState inside useWindowWidth)
  const b = useB(); // slot 2 (a separate, independent useState)
}
```

Each call produces its own slot, so there is no accidental sharing.

---

## 5. The trade-off: the Rules of Hooks

Position-based identity has a cost: **order must be stable**.

- No hooks in conditions, loops, nested functions, or after early returns.
- Enforced by the `react-hooks/rules-of-hooks` ESLint rule.
- Violations throw "Rendered fewer/more hooks than expected."

React's team judged this **a better trade than the alternatives**: a lint-checkable rule versus a permanent tax of naming, collisions, and broken composition.

---

## 6. The re-run model: UI = f(state)

Hooks lean into the idea that a **component is a function from state and props to UI**, and each render is a **snapshot**.

- Every render re-runs the function. Variables, handlers, and effects are **closures over that render's values**.
- This keeps rendering **predictable and easy to reason about**: the output depends only on the inputs of that render.
- It also makes **concurrent rendering** possible. React can start a render, pause or discard it, and restart, because render is a pure calculation over the slots.

### The cost of this model

| Consequence                                     | Why it happens                                                 |
| ----------------------------------------------- | -------------------------------------------------------------- |
| **Stale closures**                              | A callback captures values from the render it was created in   |
| **Need for `useMemo` / `useCallback` / `memo`** | Re-running everything creates new identities and repeats work  |
| **Dependency arrays**                           | You tell React which values a cached slot or effect depends on |

This ties back to the earlier notes: `useMemo` and `useCallback` exist **because** re-running the function body is the default.

---

## 7. How other frameworks differ

| Framework                 | Model                                                                      | State identity                         |
| ------------------------- | -------------------------------------------------------------------------- | -------------------------------------- |
| **React (hooks)**         | Component function **re-runs every render**                                | Call-order slots on the fiber          |
| **Vue (Composition API)** | `setup()` runs **once**; reactive proxies track dependencies               | Refs and reactive objects created once |
| **Solid / Svelte**        | Component runs **once**; fine-grained reactivity updates only what changed | Signals and compiled updates           |

**Takeaway:** React re-running everything is what **requires** slot ordering and memoization. Frameworks that run setup once don't need order rules or dependency arrays, but they track reactivity differently.

---

## 8. Where this is heading

- **React Compiler** auto-inserts memoization at build time, reducing the need for manual `useMemo` / `useCallback` / `memo`.
- The **slot and call-order model stays**, since it is fundamental to how hooks and fibers work.

---

## 9. Interview Q&A

**Q: Why were hooks introduced?**
To give function components state and effects, and to enable **reusing stateful logic** by composing plain functions, without HOCs, render props, or scattered lifecycle methods.

**Q: Why do hooks depend on call order instead of names?**
Names or keys collide in composed custom hooks (the diamond problem) and add boilerplate. Position gives every call an independent slot with zero extra API.

**Q: What is the downside of call-order identity?**
The Rules of Hooks: hooks must be called unconditionally and in the same order every render. It is enforced by lint and by runtime errors.

**Q: Why does React re-run the whole function on every render?**
It keeps rendering a **pure, predictable calculation** over state and props (UI = f(state)), which also enables concurrent rendering. The cost is repeated work and new identities, handled with `useMemo`, `useCallback`, and `memo`.

**Q: Where does state live for a function component?**
On the fiber, in a linked list of hook slots (`fiber.memoizedState`), not inside the function.

**Q: How do custom hooks get independent state per usage?**
Each custom hook call just appends its own hooks as new slots in the calling component's list, so two uses never share a slot.

---

## 10. Quick reference

```
Problem:     function re-runs each render, so locals vanish
Need:        stable per-call storage + reusable logic
Rejected:    names/keys (collisions), single state object (no private state)
Chosen:      call-order slots on the fiber (linked list)
Gain:        free composition, no collisions, minimal API, cheap runtime
Cost:        Rules of Hooks, stale closures, memoization needs
```

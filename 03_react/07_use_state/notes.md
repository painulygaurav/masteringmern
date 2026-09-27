# Notes: `useState` and Hooks Fundamentals

## `useState` — Syntax and Destructuring

```jsx
const [count, setCount] = useState(0);
```

`useState` returns an array with exactly two elements — you're destructuring it: `count` (the current value) and `setCount` (the function to update it). The array-destructuring pattern is why you can name them anything (`const [x, setX] = useState(0)` works identically) — position, not name, determines what each variable holds.

`useState(0)` — the argument passed in is the **initial value**, used only on the very first render. On every subsequent render, `count` reflects whatever the state currently holds, not `0` again.

```jsx
const handleClick = () => {
  setCount(count + 1);
};
```

## What Actually Happens When You Call `setCount`

Calling the setter does **not** directly mutate the DOM, and it doesn't even directly mutate the `count` variable in place — JS variables from `const` can't be reassigned anyway. Here's the real sequence:

1. `setCount(count + 1)` tells React: "this component's state has changed, schedule a re-render."
2. React **re-invokes the `App` function** from scratch on the next render — this produces a brand new JSX/element tree (exactly the `createElement(...)` tree structure from the manual fiber implementation), with `count` now reflecting the new value.
3. React **reconciles** this new tree against the previous one (the fiber diffing process — `UPDATE`/`PLACEMENT`/`DELETION` effect tags) and finds that only the text content inside the `<h2>` actually changed.
4. Only that specific DOM text node gets patched in the **commit phase** — the `<div>`, the `<button>`, and everything else that didn't change are left completely untouched.

So "how did it find only the count part" — it's not that React scans the DOM looking for what to change. It's the opposite: React already has an old element tree and a new element tree (as plain JS objects, cheap to compare), diffs those, and only then touches the real DOM for whatever differs. The DOM is the _output_ of that diff, not something React searches through.

This is why the whole page never reloads — there's no navigation or full re-fetch happening at all; it's a targeted, in-place DOM patch driven by the diff result.

## Categories of Hooks

A more precise breakdown (useful to know cold for interviews) than "logical/memoization/performance":

| Category              | Examples                                                      | Purpose                                                                                              |
| --------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **State Hooks**       | `useState`, `useReducer`                                      | Let a component hold and update its own data across renders                                          |
| **Effect Hooks**      | `useEffect`, `useLayoutEffect`                                | Run side effects (data fetching, subscriptions, manual DOM work) synced to render/commit             |
| **Context Hooks**     | `useContext`                                                  | Read shared data passed down without manually threading props through every level                    |
| **Ref Hooks**         | `useRef`, `useImperativeHandle`                               | Hold a mutable value or a direct DOM node reference that does _not_ trigger a re-render when changed |
| **Performance Hooks** | `useMemo`, `useCallback`, `useTransition`, `useDeferredValue` | Avoid unnecessary recalculation/re-renders, or de-prioritize non-urgent updates                      |

`useState` and `useEffect` are the two you'll reach for constantly; the rest solve more specific problems as they come up.

## Hooks vs Class Lifecycle (CLC) — Why the Shift Happened

Beyond "simpler syntax," the concrete advantages worth citing in an interview:

- **Logic reuse across components.** With classes, sharing stateful logic (e.g. "track window width") between two unrelated components required patterns like higher-order components or render props — both add extra wrapping layers to your component tree. **Custom hooks** let you extract that logic into a plain function (`useWindowWidth()`) and reuse it directly, no wrapping needed.
- **Colocation of related logic.** In a class, logic for one concern (e.g. subscribing to a data source) often gets split across `componentDidMount` (subscribe) and `componentWillUnmount` (unsubscribe) — physically far apart in the file. A single `useEffect` can hold both the setup and its cleanup together, since the cleanup is just the function it returns.
- **No `this` binding headaches.** Class methods needed manual `.bind(this)` or arrow-function class properties to work correctly as event handlers; function components avoid this class of bug entirely.
- **Smaller mental model.** Instead of memorizing which of several lifecycle methods fires when, you're reasoning about a single, consistent idea: "this runs after render, and re-runs when its dependencies change."

## The `use` Naming Convention — Correction Worth Knowing

One nuance worth being precise about for interviews: the `use` prefix is not something **Babel** specially detects to treat a function as "high priority." Babel just compiles JSX — it doesn't know or care what a "hook" is.

The `use` prefix is a **convention that React itself, and the companion ESLint plugin (`eslint-plugin-react-hooks`), rely on** to enforce the **Rules of Hooks**:

- Hooks must be called at the **top level** of a component or custom hook — never inside conditionals, loops, or nested functions.
- Hooks must only be called from **React function components or other custom hooks** — never from a plain regular JS function.

React relies on hooks being called in the **exact same order on every render** to correctly match each `useState`/`useEffect` call to its corresponding stored state internally — this is why conditionally skipping a hook call breaks things. The `use` prefix is what lets the linter statically recognize which functions these rules apply to.

## Hooks as a "Bridge" Between JS and the DOM — Precise Version

The "transportation service"/"knock on the DOM gate" mental model is a reasonable intuition, but here's the exact mechanism it's standing in for:

- Plain JS state (a normal variable) and the DOM have **no automatic connection** — changing a normal variable does nothing visible.
- `useState`'s setter function is the **explicit signal** that bridges the two: calling it doesn't update the DOM directly, but it **schedules React to re-run the component function** and go through the full render → reconcile → commit pipeline described above.
- This means a state update is **not synchronous/immediate** the way a normal variable assignment is — React may **batch multiple `setState` calls** from the same event handler into a single re-render for efficiency, rather than re-rendering after each individual call.

## One Addition Worth Knowing: Functional Updates

```jsx
setCount(count + 1); // reads `count` from the closure at render time
setCount((prev) => prev + 1); // reads the actual latest state value, guaranteed
```

When a new state value depends on the _previous_ state, the functional form (`prev => prev + 1`) is safer — especially if multiple updates could be batched together, since each call is guaranteed to receive the truly latest value rather than a possibly-stale `count` captured from the render's closure.

### Example: The Classic Bug

```jsx
const handleTripleClick = () => {
  setCount(count + 1);
  setCount(count + 1);
  setCount(count + 1);
};
```

If `count` starts at `0` and you click the button once, you might expect `count` to become `3`. It doesn't — it becomes `1`.

**Why:** all three calls happen within the _same_ event handler execution, before React re-renders. Each call reads `count` from the **same closure** — the value `count` held at the start of this render, which is still `0` for all three lines. So this is really equivalent to calling `setCount(0 + 1)` three times in a row — React sees the same "next value" (`1`) requested three times and the state simply ends up as `1`, not `3`.

**The fix — functional updates:**

```jsx
const handleTripleClick = () => {
  setCount((prev) => prev + 1);
  setCount((prev) => prev + 1);
  setCount((prev) => prev + 1);
};
```

Now each call receives the **actual latest pending state** at the moment React processes it, not a stale closure value. React queues these functional updates and applies them in order: `0 → 1`, `1 → 2`, `2 → 3`. Clicking once now correctly results in `count` being `3`.

**Rule of thumb:** if your new state depends on the previous state, use the functional form. If it doesn't (e.g. `setName("Gaurav")` — a fixed value, unrelated to whatever `name` currently is), the direct form is perfectly fine.

# Notes: React's Internal State Queue — Explained via Closures

## First, What Is a Closure

A closure is what happens when a function **"remembers" the variables from the scope it was created in**, even after that outer scope has technically finished running.

```jsx
function makeCounter() {
  let count = 0;
  return function increment() {
    count = count + 1;
    console.log(count);
  };
}

const counter = makeCounter();
counter(); // 1
counter(); // 2
```

`increment` keeps accessing `count` from `makeCounter`'s scope, long after `makeCounter()` itself has finished executing. That's a closure — the inner function carries a reference to the outer scope's variables with it.

## Every Render Creates a New Closure Over `count`

This is the key fact that connects closures to the `setCount` behavior. Each time `App` re-renders, **the entire function body runs again**, including the `const [count, setCount] = useState(0)` line and the `handleClick` function definition:

```jsx
const App = () => {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1); // <- this `count` is closed over THIS render's value
  };

  return <button onClick={handleClick}>Increase</button>;
};
```

`handleClick` is a **brand new function, recreated on every render**, and it closes over whatever `count` was _in that specific render's scope_ — a frozen snapshot, exactly as covered earlier. It is not a reference to "the state, live" — closures capture the variable binding as it existed at creation time, and `count` (from `const`) never changes after that point.

## Why `setCount(count + 1)` Fails When Called Multiple Times

```jsx
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);
```

All three of these lines run inside the **same invocation** of `handleClick` — meaning the **same closure**, over the **same `count` value** (say, `0`). There's no new render happening _between_ these three lines — a render only happens after the event handler finishes. So all three calls compute `0 + 1 = 1`, and React ends up with three redundant requests to set state to `1`. Closure staleness is the root cause: not React failing, but the value `count` being fixed for the entire lifetime of this `handleClick` call.

## Why `setCount(prev => prev + 1)` Doesn't Have This Problem — It Sidesteps Closures Entirely

```jsx
setCount((prev) => prev + 1);
```

`prev => prev + 1` is _also_ technically a closure (every function is) — but critically, **it doesn't close over `count` at all**. It doesn't reference `count` anywhere in its body. Its only input is its own parameter, `prev`, supplied fresh by whoever calls it. This is what makes it immune to the staleness problem: there's no captured variable to go stale, because nothing is captured — the value arrives as an argument, at call time, from outside.

## What Actually Supplies `prev` — React's Internal Queue

Since the function doesn't get its value from closure, it must get it from somewhere else: **React explicitly calls it and passes in a value it tracks internally**, separate from your component's scope entirely.

React queues each function you pass to `setCount`, then processes them in order — threading a running value through, much like `Array.prototype.reduce`:

```js
// conceptually, what React does internally:
let currentValue = fiber.memoizedState; // React's own stored value, starts at 0

for (const updateFn of fiber.updateQueue) {
  currentValue = updateFn(currentValue); // call it, feed in the running total
}

fiber.memoizedState = currentValue; // final result becomes the new `count`
```

Tracing your three queued functions:

| Iteration | `currentValue` in | Called as      | Returns | `currentValue` after |
| --------- | ----------------- | -------------- | ------- | -------------------- |
| 1         | `0`               | `(0) => 0 + 1` | `1`     | `1`                  |
| 2         | `1`               | `(1) => 1 + 1` | `2`     | `2`                  |
| 3         | `2`               | `(2) => 2 + 1` | `3`     | `3`                  |

## Tying the Two Ideas Together

|                                    | Direct form: `setCount(count + 1)`                                                       | Functional form: `setCount(prev => prev + 1)`                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Depends on closure?                | **Yes** — reads `count`, captured from this render's `handleClick` closure               | **No** — `prev` is a parameter, supplied externally, never captured from any outer scope                              |
| Where the value comes from         | Your component's scope, frozen at render time                                            | React's own internal storage (`fiber.memoizedState`), always current                                                  |
| What happens with 3 calls in a row | All 3 read the same frozen `count` → results collapse into 1 net change                  | Each call receives the _previous call's output_, threaded through by React's queue → results accumulate correctly     |
| Closest plain-JS analogy           | Three functions each independently reading the same outer `let x` before any of them run | `array.reduce((acc, fn) => fn(acc), initialValue, queueOfFunctions)` — accumulator passed explicitly, not closed over |

**The core insight:** `count` going "stale" across repeated calls is a **closures** problem — a snapshot frozen at function-creation time. The functional update form fixes it not by making closures smarter, but by **avoiding closure-based reads altogether** — React feeds the value in as an argument, from its own external bookkeeping, so there's nothing frozen to go stale.

# Notes: Declaring `useState` at the Top + Multiple `useState` Calls

## Why `useState` (and all hooks) Must Be Declared at the Top

React tracks each hook call by the **order it was called in**, not by variable name — first `useState` call → internal slot 0, second → slot 1, third → slot 2, and so on, matched the same way on **every single render**.

If a hook call is placed inside a condition, loop, or after an early `return`, it might run on some renders and not others — shifting the order and causing React to match the wrong stored state to the wrong call. This is why hooks must be called **unconditionally, at the top level** of the component (never nested inside `if`, loops, or conditionally skipped).

```jsx
// ❌ breaks the rule
if (someCondition) {
  const [x, setX] = useState(0);
}

// ✅ always called, condition applied afterward
const [x, setX] = useState(0);
if (someCondition) {
  // use x here
}
```

## Multiple `useState` Calls — Independent State

```jsx
const [count, setCount] = useState(0);
const [name, setName] = useState("");
const [isOpen, setIsOpen] = useState(false);
```

Each call is completely separate — its own slot, its own value, its own setter. Updating one (e.g. `setCount`) doesn't affect or re-initialize the others; React re-renders the component, but `name` and `isOpen` simply keep whatever value they already held.

```jsx
return (
  <div>
    <h2>Count: {count}</h2>
    <button onClick={() => setCount((prev) => prev + 1)}>Increase Count</button>

    <input value={name} onChange={(e) => setName(e.target.value)} />

    <button onClick={() => setIsOpen((prev) => !prev)}>
      {isOpen ? "Close" : "Open"}
    </button>
    {isOpen && <p>This is now visible.</p>}
  </div>
);
```

- **`count`** — plain number, updated via functional form (`prev => prev + 1`) for safety against batched updates.
- **`name`** — powers a **controlled input**: `value={name}` makes React the source of truth; `onChange` reads `event.target.value` and pushes it back into state on every keystroke.
- **`isOpen`** — a boolean flag, toggled with `prev => !prev`; drives conditional rendering (`isOpen && <p>...</p>`) — React adds/removes that `<p>`'s fiber (`PLACEMENT`/`DELETION`) rather than just updating text.

**Key point:** using several `useState` calls instead of one combined object is a **style choice**, not a technical requirement — both work; separate calls avoid needing to manually spread/merge (`{ ...prev, field: value }`) on every update, at the cost of more lines when state count grows large.

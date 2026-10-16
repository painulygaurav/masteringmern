# React Memoization: `useMemo`, `useCallback`, `memo`

## 1. The core problem

Every state change re-renders the component, and **a re-render re-runs the whole function body**. That causes two issues:

1. **Expensive computations** are recomputed on every render (e.g. a 1-billion-iteration loop).
2. **New function/object identities** are created on every render. Functions are first-class values, so `() => {}` creates a brand-new object each time. `Object.is(oldFn, newFn)` is `false` even if the code is identical.

Child components re-render by default whenever the parent re-renders, regardless of whether their props changed.

| Tool          | What it caches                    | Prevents                                 |
| ------------- | --------------------------------- | ---------------------------------------- |
| `useMemo`     | A computed **value**              | Re-running expensive calculations        |
| `useCallback` | A **function reference**          | New function identity on each render     |
| `memo`        | A **component's rendered output** | Child re-render when props are unchanged |

---

## 2. `useMemo`: cache a computed value

```jsx
const calculate = () => {
  let sum = 0;
  for (let i = 1; i <= 1000000000; i++) sum += i;
  return sum;
};

// Runs on EVERY render, so every click on "Counter" freezes the UI
const result = calculate();

// Runs only on the first render, then returns the cached value
const result = useMemo(() => calculate(), []);
```

**Signature:** `useMemo(computeFn, dependencyArray)`

- `[]` means compute once on mount and reuse forever.
- `[a, b]` means recompute only when `a` or `b` changes (compared with `Object.is`).
- No array means recompute every render, which makes it useless.

**Important caveat:** the first render still pays the full cost. `useMemo` only avoids _repeating_ the work on later renders.

### How it works internally

- React keeps a **linked list of hooks on the component's fiber** (`fiber.memoizedState`). Each hook call occupies one slot, in call order.
- A `useMemo` slot stores `[cachedValue, deps]`.
- On **mount**: run `computeFn`, store `[value, deps]`, return `value`.
- On **update**: compare new `deps` to stored `deps` element by element with `Object.is`.
  - All equal: return the stored `value` without calling `computeFn`.
  - Any different: call `computeFn`, store the new `[value, deps]`, return it.
- This is why **hooks must be called in the same order every render** (no conditions or loops). React finds each hook by its position in the list, not by name.
- It is a **performance hint, not a semantic guarantee**. React may discard the cache (e.g. memory pressure), so correctness must never depend on it.

---

## 3. `memo`: skip re-rendering a child

```jsx
import { memo } from "react";

const Child = ({ count1, sayHi }) => {
  console.log("Child component called...");
  return <div>Child Component</div>;
};

export default memo(Child);
```

`React.memo(Child)` and `memo(Child)` are the **same thing**. `memo` is a higher-order component (a function that wraps a component), **not a hook**.

**Behavior:** before re-rendering a memoized component, React **shallow-compares** the previous and next props (`Object.is` on each prop). If all are equal, it **reuses the previous result** and skips rendering the child and its subtree.

### How it works internally

- During reconciliation, React processes each fiber in `beginWork`. For a memo component it checks:
  1. Same component type?
  2. Props shallow-equal to `fiber.memoizedProps`?
  3. No pending state or context update inside this component?
- If all hold, React **bails out** and clones the existing child fibers instead of calling the function again.
- A parent re-render does not automatically re-render a memoized child. The child's **own state or context changes** still re-render it.

### Primitives vs. references

| Prop type                   | Compared by   | Parent re-render makes it "changed"?            |
| --------------------------- | ------------- | ----------------------------------------------- |
| `count1` (number)           | value         | No, only if the number differs                  |
| `sayHi` (function)          | **reference** | **Yes**, a new function is created every render |
| `{}` / `[]` (object, array) | **reference** | **Yes**, same reason                            |

---

## 4. `useCallback`: keep a function's identity stable

**The trap:** with only `count1` as a prop, `memo(Child)` works as expected. Pass a function prop and it breaks:

```jsx
const sayHi = () => console.log("Say Hi");

<Child count1={count1} sayHi={sayHi} />;
```

Clicking the _parent's_ "Counter" button re-renders `App`, which creates a **new** `sayHi` object. `memo` sees `oldSayHi !== newSayHi`, treats it as a prop change, and re-renders `Child` anyway.

**The fix:**

```jsx
const sayHi1 = useCallback(() => sayHi(), []);

<Child count1={count1} sayHi={sayHi1} />;
```

`sayHi1` keeps the **same reference** across renders, so `memo` sees no change and skips `Child`.

**Signature:** `useCallback(fn, dependencyArray)`

### How it works internally

- `useCallback(fn, deps)` is equivalent to `useMemo(() => fn, deps)`. It caches the **function itself** instead of calling it.
- It uses the same hook slot: `[fn, deps]`.
- On update, React compares `deps` with `Object.is`. If unchanged, it returns the **old function object** (same memory address). If changed, it stores and returns the **new** function.

### When does it change? Is it the dependency array?

**Yes.** The dependency array is the only thing that controls it.

| Deps    | Behavior                                     |
| ------- | -------------------------------------------- |
| `[]`    | Created once, never changes (frozen forever) |
| `[x]`   | New function whenever `x` changes            |
| omitted | New function every render (no benefit)       |

### Closures and stale values

The cached function is a **closure** over the variables from the render in which it was created. If it reads state or props, you must list them in deps, otherwise it keeps using **stale values**:

```jsx
// BUG: always logs the count from the first render
const log = useCallback(() => console.log(count), []);

// CORRECT: new function whenever count changes
const log = useCallback(() => console.log(count), [count]);
```

`sayHi` is safe with `[]` because it reads no state or props.

---

## 5. Putting it together

```
Click "Counter" (count changes)
 └─ App re-renders
     ├─ useMemo(calculate, [])    → cached, loop skipped ✅
     ├─ sayHi1 = useCallback(...) → same reference ✅
     └─ <Child count1 sayHi />    → memo: props shallow-equal → skipped ✅

Click "Child Counter" (count1 changes)
 └─ App re-renders
     └─ <Child count1 sayHi />    → count1 differs → Child re-renders ✅ (expected)
```

**`memo` and `useCallback` only help together.** `memo` without `useCallback` is defeated by function props. `useCallback` without `memo` does nothing, because the child re-renders anyway.

---

## 6. When to use (and not use)

**Use when:**

- A calculation is measurably expensive (`useMemo`).
- A function or object is passed to a `memo`-wrapped child (`useCallback` / `useMemo`).
- A value is used as a dependency of another hook (`useEffect`, `useMemo`) and its identity matters.

**Avoid when:**

- The work is cheap. Memoization has its own cost (storing the cache, comparing deps).
- The child isn't memoized. The optimization has no effect.
- You haven't measured. Profile first with React DevTools Profiler.

**Modern note:** the React Compiler can auto-memoize components, values, and functions at build time, reducing the need for manual `useMemo` / `useCallback` / `memo`. Knowing the manual APIs is still essential for interviews and legacy code.

---

## 7. Interview Q&A

**Q: Difference between `useMemo` and `useCallback`?**
`useMemo` caches the _result_ of calling a function. `useCallback` caches the _function itself_. `useCallback(fn, deps)` ≡ `useMemo(() => fn, deps)`.

**Q: Why does a `memo` child still re-render when the parent re-renders?**
A non-primitive prop (function, object, array) is recreated each render, so its reference differs and the shallow comparison fails. Stabilize it with `useCallback` / `useMemo`.

**Q: What does `memo` compare, and how?**
Previous vs. next props, shallowly, with `Object.is` per prop. It does not deep-compare. A custom comparator can be passed as a second argument: `memo(Component, areEqual)`.

**Q: Does `useMemo([])` make the first render fast?**
No. It computes once on the first render. It only prevents recomputation on later renders.

**Q: Why can't hooks be called conditionally?**
Hooks are stored in a per-fiber linked list and matched by call order. A conditional call shifts the positions and corrupts the state mapping.

**Q: Can `useMemo` be relied on for correctness?**
No. It's a performance optimization. React may drop cached values, so the code must still be correct if the computation re-runs.

**Q: Does `memo` block updates from the child's own state or context?**
No. It only skips re-renders caused by the **parent**. The child's own state or context changes still re-render it.

---

## 8. Quick reference

```jsx
const value = useMemo(() => expensive(a, b), [a, b]); // cache a value
const fn = useCallback(() => doThing(a), [a]); // cache a function
const Fast = memo(Component); // skip re-render if props are equal
```

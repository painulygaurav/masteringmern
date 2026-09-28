# Notes: `useEffect` and `useLayoutEffect` — Side Effect Hooks

## What Counts as a "Side Effect"

A side effect is anything that reaches **outside** of just computing what to render — API calls, timers, subscriptions, manually touching the DOM, logging, writing to `localStorage`. A component function's body is supposed to stay **pure**: given the same props/state, it should just compute and return JSX, nothing else. Side effects need to happen _around_ that pure computation, not inside it — that's the reason this category of hook exists.

## Why Side Effects Don't Belong in the Component Body

```jsx
console.log("Expensive API call"); // directly in the component body
```

Code placed directly in the body runs as part of the **render phase** itself — meaning it fires on _every single render_ of this component: the initial mount, every state update, and every re-render triggered by a parent, regardless of whether anything relevant actually changed. There's no way to control _when_ it runs — it simply runs every time the function is invoked.

## What `useEffect` Does

```jsx
useEffect(() => {
  console.log("Expensive API call");
}, []);
```

`useEffect` schedules its callback to run **after** React commits the new DOM and the browser has painted the frame — not as the component function executes, but afterward, as a deferred, separate step. The dependency array controls **how often** it gets scheduled again, not _whether_ it's deferred — it's always deferred, regardless of the array.

## The Dependency Array — All Three Forms

| Form                                   | Runs after initial mount | Runs after every re-render         | Runs again when a listed value changes                          |
| -------------------------------------- | ------------------------ | ---------------------------------- | --------------------------------------------------------------- |
| No array — `useEffect(fn)`             | ✅                       | ✅ (every render, unconditionally) | n/a                                                             |
| Empty array — `useEffect(fn, [])`      | ✅ (once, only)          | ❌                                 | n/a — nothing to compare against                                |
| With values — `useEffect(fn, [count])` | ✅                       | ❌                                 | ✅ — only when `count`'s value differs from the previous render |

An empty array means: the dependency list has nothing in it, so there's nothing that could change to trigger a re-run after the first one.

## Cleanup Functions — When They Actually Run

```jsx
useEffect(() => {
  console.log("Component updated");
  return () => {
    console.log("Running cleanup");
  };
}, [count]);
```

The returned function runs at **two** distinct moments:

1. **Right before the effect runs again** — i.e., just before React re-runs this same `useEffect` because `count` changed. This lets you clean up whatever the _previous_ run set up (an old subscription, an old timer) before the new run sets up its replacement.
2. **When the component actually unmounts** — the final cleanup, with no new effect run following it.

For a component that mounts, updates twice, then unmounts, the sequence is:

```
mount → effect runs ("Component updated" — 1st time)
count change → cleanup runs, THEN effect runs again ("unmounted" then "updated")
count change → cleanup runs, THEN effect runs again ("unmounted" then "updated")
unmount → cleanup runs, no new effect ("unmounted" — final)
```

Only the very last cleanup call corresponds to a true unmount — the earlier ones are "cleaning up before the next run," which is why naming that log something like "cleaning up" (rather than "unmounted") describes what's actually happening at every occurrence, not just the last one.

## Mapping to Class Lifecycle (CLC)

| Class lifecycle method | Hook equivalent                                   |
| ---------------------- | ------------------------------------------------- |
| `componentDidMount`    | `useEffect(fn, [])`                               |
| `componentDidUpdate`   | `useEffect(fn, [dep])` (fires when `dep` changes) |
| `componentWillUnmount` | The cleanup function returned from `useEffect`    |

Mount and unmount logic for the same concern can live together — the effect body plus its returned cleanup — instead of being split across two separately defined class methods.

## `useLayoutEffect` — What It's For

`useLayoutEffect` is a **correctness/visual-timing** tool: it lets you read or adjust the DOM _before the user sees a frame painted_, at the cost of blocking that paint until the callback finishes.

**Timing, compared directly:**

|                                   | `useEffect`                                                         | `useLayoutEffect`                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Runs relative to DOM commit       | After commit, **and after the browser has painted** the frame       | After commit, but **before the browser paints**                                                                                           |
| Blocks the browser from painting? | No — asynchronous, doesn't delay what the user sees                 | Yes — synchronous; painting waits for it to finish                                                                                        |
| Typical use                       | Data fetching, subscriptions, logging, anything not visually urgent | Measuring DOM (`getBoundingClientRect`, element height/width) and synchronously adjusting styles/layout before the user can see a flicker |
| Trade-off                         | Better for perceived performance — never delays a visible frame     | Can hurt responsiveness if the callback is slow, since it blocks paint                                                                    |

**A realistic example of what it's for:**

```jsx
const boxRef = useRef(null);
const [height, setHeight] = useState(0);

useLayoutEffect(() => {
  const measuredHeight = boxRef.current.getBoundingClientRect().height;
  setHeight(measuredHeight); // adjust state BEFORE the browser paints this frame
}, []);
```

Measuring and reacting to layout before paint prevents a visible flicker (briefly showing an incorrect size, then snapping to the correct one) — the browser simply waits until this runs before showing anything.

A `setTimeout` placed inside `useLayoutEffect` gains nothing from that choice — `setTimeout` is itself asynchronous no matter which hook schedules it, so it doesn't block paint either way; `useLayoutEffect`'s blocking behavior only matters for _synchronous_ work done directly in the callback (like a DOM measurement), not for callbacks that hand work off to something async.

## Stale Closures Inside Effects

If an effect references a piece of state or props but that value is missing from the dependency array, the effect's callback closes over the value from whichever render it was created in:

```jsx
useEffect(() => {
  console.log(count); // closes over `count` from the render this effect was created in
}, []); // missing `count` here means this effect never re-creates,
// so it forever logs whatever `count` was on the very first render
```

The ESLint rule `react-hooks/exhaustive-deps` exists specifically to catch this — it warns when a value used inside an effect is missing from its dependency array, since that combination almost always produces this exact stale-value bug rather than being an intentional choice.

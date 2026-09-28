# Notes: `useRef`, State vs Variables

## Why a Plain Variable Can't Hold Values Across Renders

```jsx
const App = () => {
  let randomVar = 0;

  const handleClick = () => {
    randomVar = randomVar + 1;
    console.log("Random variable: " + randomVar); // always logs 1
  };
  // ...
};
```

A component is just a function, and **React calls it again from scratch on every render**. Every call creates a brand new `randomVar` initialized to `0`. The click handler increments the variable that belongs to the render it was created in, and that variable is discarded when the next render begins. So the log always shows `1`.

`count` from `useState` behaves differently because its value is **not stored in the function's scope at all**. React keeps it in the component's fiber (in the `memoizedState` field, as a linked list of hook slots, one per hook call, matched by call order). Each render, `useState` looks up its slot and hands back the stored value.

## State vs Ref vs Plain Variable

|                                  | Plain variable (`let x`)                      | State (`useState`)                           | Ref (`useRef`)                                   |
| -------------------------------- | --------------------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| Survives re-renders              | ❌ Reset every render                         | ✅ Stored in the fiber                       | ✅ Stored in the fiber                           |
| Changing it triggers a re-render | ❌                                            | ✅ Through the setter                        | ❌                                               |
| Updated value visible on screen  | ❌                                            | ✅                                           | ❌ (not until something else triggers a render)  |
| Update behavior                  | Immediate                                     | Queued and batched, new value on next render | Immediate, synchronous mutation                  |
| Typical use                      | Temporary values inside one render or handler | Data the UI displays                         | Data the UI does not display, or DOM node access |

The deciding question: **does the UI need to change when this value changes?** If yes, use state. If no, but the value must survive re-renders, use a ref.

## What `useRef` Returns and How It Works

```jsx
const ref = useRef(0);
console.log(ref); // { current: 0 }
```

`useRef(initialValue)` returns a plain JavaScript object with a single property, `current`. On the first render React creates this object and stores it in the component's hook slot on the fiber. On every later render, `useRef` returns **the exact same object** (same reference in memory), and the argument is ignored.

Conceptually:

```js
// simplified mental model, not React's actual source
function useRef(initialValue) {
  const slot = getCurrentHookSlot(); // this hook's slot on the fiber
  if (slot.memoizedState === undefined) {
    slot.memoizedState = { current: initialValue }; // created once
  }
  return slot.memoizedState; // same object every render
}
```

This is why it persists: the **object** lives in the fiber, not in the function scope. Mutating `ref.current` changes a property on that persistent object, so the next render sees the new value.

```jsx
const handleClick = () => {
  ref.current = ref.current + 1;
  console.log(ref.current); // 1, 2, 3, ... keeps counting across renders
};
```

This works only because of one property of `useRef`: **React never watches `.current`.** It is an ordinary property. Writing to it does not notify React, so no re-render is scheduled. That is the entire difference from `useState`, whose setter is the signal that queues a re-render. A useful way to remember it: `useRef` behaves like `useState` without the setter and without the re-render trigger.

Because of this, the `.current` value changes immediately, but the screen will not reflect it until a re-render happens for some other reason.

## What an Empty `useRef()` Means

```jsx
const ref1 = useRef(); // { current: undefined }
```

With no argument, `current` starts as `undefined`. This is the normal form when the ref is meant to point at a DOM element: there is nothing to store at creation time, and React fills `current` in later (`useRef(null)` is the common, more explicit spelling of the same idea).

## Using a Ref to Access a DOM Node

```jsx
const ref1 = useRef();

useEffect(() => {
  ref1.current.style.color = "red";
});

return <h1 ref={ref1}>Count:{count}</h1>;
```

Passing the ref object to the special `ref` attribute tells React: "once you create the real DOM node for this element, store it in `ref1.current`."

**What `ref1.current` holds is the actual DOM element** (an `HTMLHeadingElement` here, the same object `document.getElementById` would return), **not a fiber node.** Fibers are React's internal bookkeeping objects and are not exposed to application code. The fiber's own `dom` field points to this same DOM node, and the `ref` attribute is how React hands that pointer to you.

The timing follows the render and commit phases covered earlier:

1. **Render phase:** the component runs and `ref1.current` is `undefined`. No DOM node exists yet.
2. **Commit phase:** React creates or updates the DOM, then assigns the node to `ref1.current`.
3. **After commit:** `useLayoutEffect` and `useEffect` callbacks run, so `ref1.current` is populated by then.
4. **On unmount:** React sets `ref1.current` back to `null`.

This is why DOM access through a ref belongs inside an effect or an event handler, and not in the component body, where the node does not exist yet. It is also why the `document.getElementById` attempt in the earlier events notes failed in the body but works inside `useEffect`.

With the node in hand, any native DOM API is available:

```jsx
ref1.current.style.color = "red";
ref1.current.focus();
ref1.current.getBoundingClientRect();
```

## Why the Red Color Persists Across Re-renders

Each state update re-renders and the effect runs again. React's diff compares props, and this `<h1>` has no `style` prop in either the old or new element, so there is no difference to apply and React never touches its `style`. The manual `color = "red"` therefore stays. Changes made directly to the DOM sit outside React's model, which is why refs are treated as an escape hatch and not the default way to update the UI.

## Common Uses of `useRef`

| Use                                                 | Example                                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Access a DOM node                                   | Focus an input, measure size, scroll into view, play a video                       |
| Store a mutable value that shouldn't cause a render | Timer or interval ID (`ref.current = setInterval(...)`) so it can be cleared later |
| Remember the previous value                         | Save `count` into a ref at the end of each render                                  |
| Count renders or track flags                        | `renderCount.current += 1`                                                         |

## Rule: Don't Read or Write `ref.current` During Render

Refs are meant to be changed in **event handlers and effects**, not in the component body. Render is expected to be pure, and mutating a ref there breaks that expectation, which makes behavior unpredictable under features like concurrent rendering and Strict Mode's double invocation.

## Interview Soundbite

> `useRef` returns a stable object, `{ current: value }`, that React stores in the component's fiber and hands back unchanged on every render. Mutating `.current` persists across renders without triggering a re-render, unlike `useState`. It is used to hold DOM nodes, which React assigns during the commit phase, and to store mutable values the UI doesn't display.

# Notes: State Lifting — How a Child Can Update a Parent's State

## What's Actually Happening

```jsx
// App.jsx
const [name, setName] = useState("");
<Child setName={setName} />;
```

```jsx
// Child.jsx
const handleChange = (e) => {
  props.setName(e.target.value);
};
```

The parent isn't "inheriting" from the child, and the child isn't reaching upward into the parent's scope either — you already have this right. What's actually being passed down is a **reference to a function** (`setName`), exactly like any other prop (a string, a number, a callback). The child doesn't know or care that this function happens to update state somewhere else — from the child's point of view, it's just calling a function it was handed, the same as calling any prop.

This pattern is called **lifting state up**: when two components need to share or react to the same piece of data, that state is kept in their closest common parent — here, just `App` — and the child is given a way to _request_ a change via a callback prop, rather than owning any state of its own.

## Why the Update Correctly Lands on `App`'s State, Not `Child`'s

This is the deeper mechanism worth understanding, and it connects directly to two things already covered: **closures**, and how `useState` ties state to a specific slot on a specific fiber.

1. `setName` was created by `useState("")` **inside `App`**. Internally, this function is permanently bound to `App`'s specific state slot (recall the fiber/`memoizedState` model from earlier — each `useState` call gets its own slot on that component's fiber). That binding is fixed at the moment `useState` runs — it never changes based on _where_ the function is later called from.

2. When `App` renders `<Child setName={setName} />`, it's passing that same function reference down as a prop — not creating a new state, not creating a new binding. `Child` receives a pointer to the _exact same function object_.

3. When `Child` calls `props.setName(e.target.value)`, it's invoking that function — and because the function is bound to `App`'s state slot regardless of who calls it, React updates `App`'s state, not `Child`'s (Child has no state at all here). This is really the same closure principle from the `count`/`prev` notes: `setName` "remembers" which component and which state slot it belongs to, no matter where the reference travels.

4. That state update schedules a re-render of `App` (the component that owns the state) — `App` re-runs, produces a new element tree with the updated `name`, and React's diff/commit process (the fiber reconciliation from earlier) patches only the `<h1>` text that actually changed. `Child` itself also re-renders as part of this (since it's `App`'s child in the tree), but its own JSX output — the `<input>` — hasn't changed, so nothing new is committed for it.

## Why This Isn't "Inheritance"

Worth being precise about the word here, since it's doing double duty in JS generally. **Inheritance** in JS (`class B extends A`) means one entity's _definition_ is built on top of another's — shared methods, prototype chain, that kind of relationship. Nothing like that is happening here. `App` and `Child` are two entirely independent functions with no structural relationship to each other at all. The only connection between them is **data flow via props**, one direction down (the function reference), and an _effect_ of calling that function flowing back up indirectly (the state change, and the resulting re-render). "State lifting" describes a _pattern of usage_, not a language feature or relationship type — it's a convention you (the developer) are choosing, not something React enforces structurally.

## One Thing Worth Noting: This Input Is _Uncontrolled_

Contrasting with the controlled `<input>` pattern from earlier (`value={name}` + `onChange`) — here, the `<input>` has **no `value` prop at all**, only `onChange`. This means the input manages its own internal DOM value entirely on its own (typed characters show up immediately, the browser's native behavior); React is only being _notified_ of changes via `onChange`, not _driving_ the input's displayed value the way it was in the controlled example.

This is a legitimate and common pattern — often called an **uncontrolled input** for this reason — but it's a meaningfully different setup from a controlled one, and worth being able to name the distinction in an interview:

|                                                           | Controlled input                          | Uncontrolled input (this example)                            |
| --------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| `value` prop set from state?                              | Yes — `value={name}`                      | No                                                           |
| Who drives what's shown on screen                         | React (state is the source of truth)      | The DOM itself (native input behavior)                       |
| `onChange` role                                           | Keeps state in sync with what's displayed | Just observes/reacts to changes, doesn't control display     |
| Can you programmatically reset/clear the input via state? | Yes — trivially, `setName("")`            | Not directly — you'd need a `ref` to manipulate the DOM node |

Both are valid; controlled inputs are more common in React apps because they make the input's value fully driven by state (easy to validate, reset, or derive other UI from), while uncontrolled inputs are simpler when you just need to _read_ a value on submit/change without React needing to own it moment-to-moment.

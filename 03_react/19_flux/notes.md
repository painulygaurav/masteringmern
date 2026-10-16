# Flux Architecture & Redux

## 1. The Problem Flux Solves

Take a shopping cart. The **item count** is displayed in three places:

- Nav bar (cart badge)
- Cart component (+ / - buttons)
- Product card (+ / - buttons)

Any of the three can update the count, and all three must stay in sync.

Ways to share state without Flux:

| Approach         | Works when                                  | Breaks when                                                                  |
| ---------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| Props drilling   | Shallow tree, parent -> child               | Many intermediate components pass props they don't use                       |
| Lifting state up | Siblings share a common parent              | Parent becomes a bloated "god component"                                     |
| Context API      | Rarely-changing global values (theme, auth) | Frequent updates cause every consumer to re-render; no structure for updates |

Once data starts flowing in **many directions** (child -> parent -> sibling -> child), updates become unpredictable and bugs are hard to trace. This is what Flux fixes.

## 2. Flux: Core Idea

> Data flows in **one direction only** (unidirectional data flow).

Flux follows a **Single Source of Truth (SSOT)**: one place owns the application state, and every change goes through it.

```
View --> Action --> Dispatcher --> Store --> View
```

| Part           | Role                                                             |
| -------------- | ---------------------------------------------------------------- |
| **View**       | UI (React components). Reads state, emits actions on user events |
| **Action**     | Plain object describing _what happened_ (`{ type, payload }`)    |
| **Dispatcher** | Sends actions to the store                                       |
| **Store**      | Holds the state and the logic to update it                       |

Redux is an implementation of this idea.

## 3. Redux: Flux Mapped to Redux

| Flux                     | Redux                                |
| ------------------------ | ------------------------------------ |
| Action                   | Action (plain object)                |
| Dispatcher               | `store.dispatch()` / `useDispatch()` |
| Multiple stores          | **One** store                        |
| Store logic              | **Reducers** (pure functions)        |
| View subscribes to store | `useSelector()` / `<Provider>`       |

### The mindset shift

In normal React, the component does the work:

```jsx
const handleClick = () => setCount(count + 1); // logic lives in the component
```

In Redux, the component **only describes what happened** and hands it over:

```jsx
const handleClick = () => dispatch(deposit({ amount: 10 })); // no logic here
```

> The component doesn't _perform_ the action. It _creates_ an action, wraps the payload in it, and **dispatches** it to the store.

## 4. Store, Reducer, Slice

### Store

- The single object that holds the **entire state tree**.
- Exposes: `getState()`, `dispatch(action)`, `subscribe(listener)`.
- Receives dispatched actions and runs them through reducers to compute the next state.

### Reducer

- A **pure function**: `(currentState, action) => newState`.
- Same input -> same output, no side effects (no API calls, no `Math.random()`, no `Date.now()`).
- Decides _how_ state changes for each action type.

### Slice

- A feature's portion of state, bundled together: **name + initial state + reducers + auto-generated actions**.
- Created with `createSlice` in Redux Toolkit (RTK).
- Store combines slices: `configureStore({ reducer: { todo: todoReducer } })` -> state looks like `{ todo: [...] }`.

### Time Travel Debugging (TTD)

Because reducers are pure and every state change is caused by a logged action, Redux can **record every action and the state after it**. With Redux DevTools you can step backward/forward through those actions, replay them, and inspect exactly what changed. This is only possible because state changes are predictable and centralized.

## 5. Full Flow: Deposit Example

```
Deposit button
  -> click
  -> event handler creates Action { type: "deposit", payload: 10 }
  -> useDispatch() sends the action to the Store
  -> Store runs it through the reducer: newBalance = balance + 10
  -> Store notifies subscribers that state changed
  -> useSelector() re-reads balance -> component re-renders with new value
```

**How does the store know the current balance?**
The store **owns** the state. It holds the current balance itself and passes it into the reducer along with the action.

**How does the component show the balance if data is one-way?**
Components don't get direct access to the store's internals. They get a **subscription**. Think of Netflix: you can't add or delete movies, you only have a subscription to consume content. `useSelector` is that subscription: it reads a slice of state and re-renders the component when that slice changes.

## 6. Redux Toolkit Walkthrough (Todo App)

### Folder layout

```
src/
  App.jsx
  AddTodo.jsx
  ViewTodo.jsx
  UpdateTodo.jsx
  DeleteTodo.jsx
  redux/
    store.js
    todoSlice.js
```

### `store.js`

```js
import { configureStore } from "@reduxjs/toolkit";
import todoReducer from "./todoSlice.js";

export default configureStore({ reducer: { todo: todoReducer } });
```

- The key in `reducer: { todo: ... }` decides the path in state -> `state.todo`.

### `todoSlice.js`

```js
import { createSlice, nanoid } from "@reduxjs/toolkit";

export const todoSlice = createSlice({
  name: "todos",
  initialState: [],
  reducers: {
    addTodo: (state, action) => {
      state.push({ id: nanoid(), text: action.payload.text, completed: false });
    },
    updateTodo: (state, action) => {
      const todo = state.find((t) => t.id === action.payload.id);
      if (todo) todo.text = action.payload.text;
    },
    deleteTodo: (state, action) =>
      state.filter((t) => t.id !== action.payload.id),
    removeAll: () => [],
  },
});

export const { addTodo, updateTodo, deleteTodo, removeAll } = todoSlice.actions;
export default todoSlice.reducer;
```

Key points:

- **`name: "todos"`** is only a prefix for action types (`"todos/addTodo"`). It is _not_ the path in state; the key in `configureStore` is.
- **Auto-generated action creators**: `createSlice` creates one per reducer. `addTodo({ text })` returns `{ type: "todos/addTodo", payload: { text } }`.
- **Named vs default exports**: action creators are named exports (imported by exact name in components); the reducer is the default export (imported under any name by the store).
- **Why `nanoid()`?** Each todo needs a unique identity so we can update/delete the right one, even when two todos have identical text. It is also used as the React `key`.
- **Immer**: it looks like we're mutating state (`state.push(...)`, `todo.text = ...`), but RTK uses Immer under the hood, which tracks the changes and produces a new immutable state. This is only safe inside `createSlice` reducers.
- **Mutate OR return, never both.** Either modify the draft (`push`, assign) or return a new value (`filter`, `[]`). Doing both throws an error.
- `completed: false` is a flag meaning the task is not done yet.

### `AddTodo.jsx` (dispatching)

```jsx
const dispatch = useDispatch();

const handleClick = () => dispatch(addTodo({ text: todo }));
const handleClear = () => dispatch(removeAll());
```

- The component keeps only the _input text_ in local `useState` (temporary UI state). The _todo list_ lives in the Redux store (shared app state).

### `ViewTodo.jsx` (subscribing)

```jsx
const todo = useSelector((state) => state.todo);
```

- `useSelector` takes a function that picks data out of the store state.
- It re-runs after every dispatched action and compares the old and new result with `===` (reference equality). If the reference changed, the component re-renders. This is why reducers must return new references for changed data (Immer handles that), and why selecting only what you need avoids unnecessary re-renders.
- `todo.map(...)` renders the list with `key={t.id}`.

### `UpdateTodo.jsx` / `DeleteTodo.jsx`

```jsx
dispatch(updateTodo({ id: todo.id, text }));
dispatch(deleteTodo({ id }));
```

- Each component passes the **id** in the payload so the reducer can find the right item.
- `UpdateTodo` keeps `isEditing` and the draft `text` in local state, and only dispatches when the user clicks **Save**. Typing alone never touches the store.

### Wiring it up (`main.jsx`)

```jsx
import { Provider } from "react-redux";
import store from "./redux/store";

<Provider store={store}>
  <App />
</Provider>;
```

- `Provider` makes the store available to the whole tree via context, so any component can call `useDispatch` / `useSelector`.

## 7. `key` in React (Deep Dive)

### What it is

`key` is a special string/number attribute that gives each element in a list a **stable identity** across renders. It is used only by React itself during reconciliation. It is **not** passed down as a prop: `props.key` is `undefined` inside the child.

```jsx
{
  todo.map((t) => (
    <li key={t.id}>...</li> // t.id from nanoid() -> unique and stable
  ));
}
```

### Why React needs it: reconciliation

On every re-render React builds a new tree of elements and **diffs** it against the previous one (the reconciliation / fiber process) to work out the minimum DOM updates.

- For **different element types or positions** it compares by position by default.
- For **lists of siblings**, position is unreliable because items get inserted, removed, and reordered.
- `key` tells React: "this element in the new list is _the same one_ as that element in the old list", so it can reuse the existing fiber and DOM node instead of destroying and recreating it.

Without keys, React falls back to comparing children **by index** and logs the warning _"Each child in a list should have a unique key prop"_.

### What goes wrong with index as key (worked example)

Todos: `[A, B, C]`, each `<UpdateTodo>` has its own `isEditing` state. User clicks **Edit** on `B` (so `B` is in edit mode), then deletes `A`.

|                   | Using `key={index}`                                                                                                                                                        | Using `key={t.id}`                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Before delete     | A=0, B=1 (editing), C=2                                                                                                                                                    | A=id1, B=id2 (editing), C=id3                                                 |
| After deleting A  | B=0, C=1                                                                                                                                                                   | B=id2, C=id3                                                                  |
| React's reasoning | Key 0 still exists, so reuse the first fiber (previously A's) and just change its props to B's. Key 2 is gone, so remove the last fiber                                    | id1 is gone, so remove A's fiber. id2 and id3 are matched to their own fibers |
| Result            | State stays with the **position**, not the item: the edit state that belonged to B's fiber (key 1) now sits on C (key 1), so **C appears to be in edit mode** and B is not | B keeps its own state, so **B stays in edit mode**                            |

Takeaway: **with index keys, component state and DOM state (input text, focus, `isEditing`) stick to the position, not the data.** This is a real bug in lists with local state, not just a performance concern.

### Rules for a good key

1. **Unique among siblings** (not globally). Two different lists can reuse the same keys.
2. **Stable**: the same item must get the same key on every render.
3. **Derived from the data**: a database id, or an id generated **once** when the item is created (`nanoid()` in the reducer, as in this app).
4. **Never `Math.random()` or `nanoid()` inside render**: a new key every render means React treats every item as new, unmounts and remounts everything, and loses all state and focus.
5. **Index is acceptable only if** the list is static: never reordered, filtered, inserted into, or deleted from, and the items have no local state.
6. **Put the key on the outermost element returned by `map`**, not on an element inside the child component.
   ```jsx
   {
     items.map((i) => <Row key={i.id} item={i} />);
   } // correct
   // key inside <Row>'s own root div does nothing for the list
   ```
7. For fragments in a list, use `<Fragment key={id}>`, since the short `<>` syntax can't take a key.

### Why this app uses `nanoid()` for `id`

- Two todos can have identical text, so text can't be the key or the identifier.
- The `id` is created **once, in the reducer** (`addTodo`), and stored in state, so it stays the same across re-renders. This is why it is safe as a key.
- The same `id` also lets `updateTodo` and `deleteTodo` find the correct item.

### Bonus: key as a "reset state" trick

Changing a component's key forces React to **unmount the old instance and mount a fresh one**, resetting all its state.

```jsx
<UpdateTodo key={todo.id} todo={todo} />
// different todo.id -> brand new component, fresh useState
```

This is a clean alternative to syncing state with `useEffect` when a prop changes (for example, resetting a form when switching between users).

### Quick comparison

| Key choice                               | Stable?                    | Unique?         | Safe for dynamic lists?    |
| ---------------------------------------- | -------------------------- | --------------- | -------------------------- |
| `t.id` (from DB or `nanoid` at creation) | Yes                        | Yes             | Yes                        |
| array index                              | Only if list never changes | Yes             | No                         |
| `t.text`                                 | No (editable)              | No (duplicates) | No                         |
| `Math.random()` / `nanoid()` in render   | No                         | Yes             | No (remounts every render) |

### Interview answers

**What is `key` and why is it needed?**
A special attribute that gives list elements a stable identity so React's reconciliation can match old and new elements, reuse them, and update only what changed.

**What happens if you use index as key?**
React matches by position, so after insert, delete, or reorder, component state and DOM state (input values, focus, `isEditing`) can end up attached to the wrong item, and React may do extra DOM work.

**Is `key` accessible as a prop?**
No. React consumes it internally. Pass the value under a different prop name if the child needs it.

**Does a key need to be globally unique?**
No, only unique among siblings in the same list.

**How can you use `key` to reset a component?**
Change the key. React unmounts the old instance and mounts a new one with fresh state.

## 8. Persistence: Rehydration Problem

- Redux state lives in **memory**. On page refresh, the store is recreated from `initialState` and all todos are lost.
- Restoring saved state into the store on startup is called **rehydration**.
- **Solution: `redux-persist`**: serializes state to JSON and saves it in `localStorage`, then rehydrates the store on load.

## 9. Redux vs Context API

|                    | Context API                                | Redux                                                     |
| ------------------ | ------------------------------------------ | --------------------------------------------------------- |
| Purpose            | Pass values down without drilling          | Full state management architecture                        |
| Update logic       | Anywhere (no structure)                    | Centralized in reducers                                   |
| Re-renders         | All consumers re-render when value changes | Only components whose selected data changed               |
| Debugging          | Manual                                     | DevTools, time travel, action log                         |
| Middleware / async | None built-in                              | Yes (RTK `createAsyncThunk`, RTK Query)                   |
| Best for           | Theme, auth, locale                        | Large apps with complex, frequently changing shared state |

## 10. When NOT to Use Redux

- State used by one component or a small subtree -> `useState`.
- Rarely changing global values -> Context.
- Server data (caching, refetching) -> RTK Query / React Query.
- Redux adds boilerplate; use it when shared state gets complex.

## 11. Interview Quick Answers

**What is Flux?**
An architecture pattern where data flows in one direction: View -> Action -> Dispatcher -> Store -> View. It avoids the tangled, multi-directional updates of props drilling and lifted state.

**What are Redux's three principles?**

1. Single source of truth: one store holds all state.
2. State is read-only: the only way to change it is to dispatch an action.
3. Changes are made with pure functions (reducers).

**Why must reducers be pure?**
Predictability, time-travel debugging, and so React can detect changes via reference comparison.

**What does `useSelector` do?**
Subscribes the component to the store, reads the selected state, and re-renders only when the selected value changes by reference.

**What does `useDispatch` do?**
Returns the store's `dispatch` function so components can send actions to the store.

**What is Immer and why does RTK use it?**
A library that lets you write "mutating" code inside reducers while producing immutable updates under the hood, removing the spread-operator boilerplate.

**What is a slice?**
A feature's state, reducers, and auto-generated actions bundled together with `createSlice`.

**Why is the action `payload` a single object?**
Convention: `dispatch(addTodo({ text }))` keeps actions extensible, so more fields can be added without changing the call signature.

**What is rehydration?**
Restoring persisted state into the store after a page reload, typically via `redux-persist`.

## 12. Small Improvements to the Todo App

- Clear the input after adding: call `setTodo("")` after dispatch.
- Block empty todos: `if (!todo.trim()) return;`.
- Use the `completed` flag: add a `toggleTodo` reducer and a checkbox.
- Add `redux-persist` so todos survive a refresh.

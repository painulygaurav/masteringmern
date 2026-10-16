# Props Drilling and Context API

## 1. The Setup

```
App
 └── Child1
      └── Child2
           └── Child3   ← only component that needs the data
```

- `App` owns the data (`person`).
- `Child3` is the only consumer.
- `Child1` and `Child2` are just pass-through components.

---

## 2. Props Drilling

Passing data down through every intermediate component, via props, until it reaches the target.

```jsx
// App.jsx
const App = () => {
  const person = { fullName: "Gaurav Painuly", age: 37, salary: 5000000 };
  return <Child1 person={person} />;
};

// Child1.jsx
const Child1 = ({ person }) => <Child2 person={person} />;

// Child2.jsx
const Child2 = ({ person }) => <Child3 person={person} />;

// Child3.jsx
const Child3 = ({ person }) => {
  console.log(person);
  return <div>Child3</div>;
};
```

### Problems

- `Child1` and `Child2` must accept and forward props they never use.
- Every component in the chain is coupled to the data shape. Renaming or adding a prop means editing all of them.
- A prop can be dropped or renamed by mistake somewhere in the middle.
- The deeper and more complex the hierarchy, the harder it is to maintain.

### When it is fine

- Shallow hierarchies (parent → child, or 1-2 levels).
- It is explicit and easy to trace, which is a real advantage in small trees.

---

## 3. Context API: Skipping the Middlemen

**Analogy:** Instead of the teacher teaching one student who passes it to the next, and so on until it reaches the target student, the teacher hires an assistant who delivers the knowledge directly to the student who needs it.

The component hierarchy stays the same. Only the data path changes: `Child1` and `Child2` no longer handle the data.

### Two pieces work together

| Piece           | Kind      | Role                                   |
| --------------- | --------- | -------------------------------------- |
| `createContext` | React API | Creates the context object             |
| `useContext`    | Hook      | Reads the context value in a component |

Plus `Context.Provider`, which supplies the value to everything beneath it.

### Step 1: Create the context

```jsx
// UserContext.jsx
import { createContext } from "react";
export const UserContext = createContext(null);
```

### Step 2: Provide it in `App`

Wrap the subtree that needs access in `UserContext.Provider`.

```jsx
// App.jsx
import Child1 from "./Child1";
import { UserContext } from "./UserContext";

const App = () => {
  const person = { fullName: "Gaurav Painuly", age: 37, salary: 5000000 };
  return (
    <UserContext.Provider value={person}>
      <Child1 />
    </UserContext.Provider>
  );
};
export default App;
```

### Step 3: Intermediate components carry no props

```jsx
// Child1.jsx
const Child1 = () => <Child2 />;

// Child2.jsx
const Child2 = () => <Child3 />;
```

### Step 4: Consume it in the target

```jsx
// Child3.jsx
import { useContext } from "react";
import { UserContext } from "./UserContext";

const Child3 = () => {
  const data = useContext(UserContext);
  console.log(data); // { fullName, age, salary }
  return <div>Child3</div>;
};
```

---

## 4. Rendering Behavior (Important)

- **Rendering is unchanged.** If `App` re-renders, `Child1` and `Child2` still re-render by default, because React re-renders children whenever the parent re-renders. This is true with or without context.
- **What changed is data ownership.** The data is no longer part of their props, so they are not responsible for it.
- **Context bypasses `React.memo`.** If `Child1` and `Child2` are wrapped in `React.memo`, they can skip re-rendering, but `Child3` will still re-render when the context value changes.
- **Consumers re-render when the Provider's `value` changes** (compared by reference with `Object.is`).

### Gotcha: new object on every render

```jsx
const App = () => {
  const person = { fullName: "Gaurav" }; // new reference on every render
  return <UserContext.Provider value={person}>...</UserContext.Provider>;
};
```

Every time `App` re-renders, `person` is a new reference, so **all consumers re-render**, even if the contents are identical.

Fix: stabilize the value.

```jsx
const person = useMemo(() => ({ fullName: "Gaurav", age: 37 }), []);
```

(Or define the object outside the component if it is static.)

---

## 5. Limitations of Context

- **Re-render cost:** every consumer re-renders when the value changes, and there is no selector to subscribe to just part of it. Large or frequently changing values cause wasted renders.
- **Single source:** one Provider holds the whole value, so a bug there affects every consumer.
- **Hidden dependency:** a component using `useContext` depends on a Provider somewhere above it. Without one, it silently gets the default value, which makes components harder to reuse and test.
- **Not built for high-frequency state** (typing, animation, large lists).

### Mitigations

- Split into multiple smaller contexts (e.g. `UserContext`, `ThemeContext`) so unrelated changes don't trigger each other.
- Memoize the Provider value (`useMemo`).
- For large or fast-changing global state, use a dedicated store (Redux, Zustand), which supports selector-based subscriptions.
- For limited depth, component composition (passing `<Child3 />` as `children` or a prop) can avoid drilling without context.

---

## 6. Comparison

|                         | Props Drilling                         | Context API                                            |
| ----------------------- | -------------------------------------- | ------------------------------------------------------ |
| Data path               | Through every intermediate component   | Directly Provider → consumer                           |
| Intermediate components | Must accept and forward props          | Unaware of the data                                    |
| Coupling                | High, since every level knows the prop | Low for middle components                              |
| Traceability            | Explicit, easy to follow               | Implicit, since the value comes from "somewhere above" |
| Re-render control       | Standard prop-based                    | All consumers re-render on value change                |
| Best for                | Shallow trees (1-2 levels)             | Deep trees, app-wide data (user, theme, locale)        |
| Pitfall                 | Maintenance burden as depth grows      | Unstable Provider value, over-broad contexts           |

---

## 7. Interview Summary

- **What is props drilling?** Passing props through components that don't use them just to reach a deeply nested one.
- **Why is it a problem?** It couples intermediate components to data they don't need and becomes hard to maintain as the tree grows.
- **How does Context fix it?** `createContext` makes the context, `Provider` supplies the value, `useContext` reads it where needed, so the middle components are bypassed.
- **Does Context stop re-renders in the middle?** No. Parents still re-render their children. Context only removes the data from their responsibility.
- **What is the catch?** All consumers re-render when the value changes, so keep contexts small, memoize values, and use a store for heavy global state.

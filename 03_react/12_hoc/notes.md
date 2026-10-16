# Higher-Order Components (HOC)

## 1. What is a HOC?

A **higher-order component** is a function that takes a component and returns a new, enhanced component.

```
const EnhancedComponent = higherOrderComponent(WrappedComponent);
```

- It is the component-level equivalent of a higher-order function (a function that takes or returns a function).
- It is a pattern for **reusing component logic**, not a React API.
- The original component is not modified. The HOC wraps it and adds behavior around it.
- Naming convention: HOCs start with `with` (`withLoading`, `withAuth`, `withLogger`).

---

## 2. The Problem

`User` just renders a name:

```jsx
// User.jsx
const User = ({ name }) => {
  return <h1>Hello, {name}</h1>;
};

export default User;
```

Requirement: until the data is loaded, show a loading message instead. The same loading behavior will be needed in many other components.

Putting `if (isLoading)` inside every component duplicates logic and mixes concerns. A HOC extracts it once and applies it to any component.

---

## 3. Implementation

### Step 1: Create the HOC

```jsx
// WithLoading.jsx
const WithLoading = (Component) => {
  return function EnhancedComponent({ isLoading, ...props }) {
    if (isLoading) {
      return <h2>Please wait we are loading...</h2>;
    }
    return <Component {...props} />;
  };
};

export default WithLoading;
```

How it works:

- `WithLoading` receives `Component` (here, `User`).
- It returns `EnhancedComponent`, a new component.
- `EnhancedComponent` pulls out `isLoading` and collects everything else with the rest operator (`...props`).
- If `isLoading` is true, it renders the loader and the wrapped component is never rendered.
- If false, it renders `Component` and spreads the remaining props onto it.
- `isLoading` is consumed by the HOC, so `User` never receives it.

### Step 2: Wrap the component

```jsx
// App.jsx
import User from "./User";
import WithLoading from "./WithLoading";

const UserWithLoading = WithLoading(User); // created once, outside App

const App = () => {
  return (
    <div>
      <UserWithLoading name="Gaurav" isLoading={false} />
    </div>
  );
};

export default App;
```

### Output

| `isLoading` | Rendered                        |
| ----------- | ------------------------------- |
| `true`      | `Please wait we are loading...` |
| `false`     | `Hello, Gaurav`                 |

---

## 4. Execution Flow

```
<UserWithLoading name="Gaurav" isLoading={false} />
        │
        ▼
EnhancedComponent receives { name, isLoading }
        │
        ├── isLoading === true  → return <h2>Loading...</h2>   (User never rendered)
        │
        └── isLoading === false → return <User name="Gaurav" /> (isLoading stripped out)
```

---

## 5. Key Points

- **Closure:** `EnhancedComponent` remembers `Component` from the outer `WithLoading` call, so each wrapped component gets its own enhanced version.
- **Props pass-through:** always forward the remaining props with `{...props}`, otherwise the wrapped component loses the props it needs.
- **Wrap outside the render path:** call `WithLoading(User)` at module level, not inside `App`. If it is called inside a component, a new component type is created on every render. React then treats it as a different component, unmounts and remounts it, and loses its state.
- **Don't mutate the original:** a HOC returns a new component and leaves the input component untouched.
- **Display name:** set `EnhancedComponent.displayName = \`WithLoading(${Component.displayName || Component.name})\`` so DevTools shows a readable name.
- **Statics and refs:** static methods are not copied automatically, and `ref` does not pass through a HOC (it needs `forwardRef`).
- **Composition:** HOCs can be stacked, e.g. `withAuth(withLoading(User))`.

---

## 6. Connection to Earlier Topics

- **Props drilling and Context:** both HOCs and Context solve "shared concern, many components" problems, but differently. Context moves _data_ to deeply nested components. A HOC moves _behavior_ (loading, auth, logging) onto components.
- **Closures:** the HOC pattern depends on a closure, since the returned component keeps a reference to the wrapped one.

---

## 7. HOC vs Alternatives

|                          | HOC                                                                           | Custom Hook                         | Render Props                            |
| ------------------------ | ----------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------- |
| What it reuses           | Component-level behavior or rendering                                         | Stateful logic                      | Logic and rendering via a function prop |
| Changes what is rendered | Yes, it can replace the output (e.g. loader)                                  | No, it only returns values          | Yes                                     |
| Wrapper nesting          | Yes, adds layers to the tree                                                  | None                                | Yes                                     |
| Readability              | Can get hard to trace when stacked                                            | Simple and explicit                 | Callback nesting                        |
| Typical use today        | Cross-cutting concerns, legacy codebases, libraries (`connect`, `withRouter`) | Default choice for most logic reuse | Less common now                         |

Modern React favors **custom hooks** for sharing logic. HOCs are still useful when you need to wrap or replace what a component renders (guards, loaders, error boundaries around components).

---

## 8. Interview Summary

- **What is a HOC?** A function that takes a component and returns a new component with added behavior.
- **Is it a React feature?** No, it is a composition pattern built on higher-order functions.
- **Why use it?** To reuse cross-cutting logic (loading, auth, logging) without duplicating it in every component.
- **How do props flow?** The HOC consumes the props it cares about (`isLoading`) and forwards the rest to the wrapped component.
- **Common pitfall?** Creating the enhanced component inside a render, which causes remounts and state loss.
- **Why are hooks preferred now?** They share logic without wrapper layers or prop-name collisions, and they are easier to read and compose.
- **Real examples:** Redux `connect`, React Router `withRouter`, `React.memo` (which is itself a HOC).

# Custom Hooks

## 1. What is a custom hook?

A **custom hook** is a plain JavaScript function that:

1. Has a name that **starts with `use`** (e.g. `useFetch`, `useCustom`), and
2. **Calls other hooks** inside it (`useState`, `useEffect`, other custom hooks, etc.).

That's all. There is no special API and no registration. It exists to **extract and reuse stateful logic** between components.

```jsx
// useFetch.jsx
import { useState, useEffect } from "react";

const useFetch = (url) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((data) => setData(data));
  }, [url]);

  return [data];
};

export default useFetch;
```

```jsx
// App.jsx
import useFetch from "./useFetch";

const App = () => {
  const [data] = useFetch("https://dummyjson.com/products");
  console.log(data);
  return <div>App</div>;
};

export default App;
```

---

## 2. What makes it a _hook_ and not a component?

It looks like a component (a function with hooks inside), but the differences are what matter:

|                        | Component                        | Custom hook                                             |
| ---------------------- | -------------------------------- | ------------------------------------------------------- |
| **Returns**            | JSX (UI)                         | Anything: values, arrays, objects, functions            |
| **Called as**          | `<Comp />` (React calls it)      | `useX()` (you call it inside another component or hook) |
| **Has its own fiber?** | **Yes**                          | **No**, it runs inside the caller's fiber               |
| **Name**               | Starts with a **capital** letter | Starts with **`use`** (lowercase)                       |
| **Purpose**            | Render UI                        | Share stateful logic                                    |

### The naming rule is functional, not cosmetic

- The `use` prefix is how the **linter** (`react-hooks/rules-of-hooks`) recognizes a hook and enforces the Rules of Hooks on it and on its callers.
- A capital first letter (`UseCustom`) makes tools treat it as a **component**, so hook rules are checked incorrectly.
- Convention: **`useSomething`**, always camelCase with a lowercase `u`.

---

## 3. How custom hooks work internally

A custom hook has **no fiber and no state of its own**. Its hooks are simply **more slots in the calling component's hook list**.

```jsx
const App = () => {
  const [data] = useFetch("https://dummyjson.com/products");
  // ...
};
```

Inside `useFetch` there are two hook calls: `useState` and `useEffect`. They become the first two slots of `App`'s fiber:

```
fiber(App).memoizedState
   │
   ▼
[ Slot 1: useState (data) ] ──► [ Slot 2: useEffect ([url]) ] ──► null
   ▲___________ both created inside useFetch ___________▲
```

Calling `useFetch` is just like writing its hook calls directly inside `App`. This means:

- It **follows the Rules of Hooks**: call it at the top level, unconditionally, in a stable order.
- The state is **owned by the component that calls it**, not by the hook function.

### Each call gets independent state

```jsx
const App = () => {
  const [products] = useFetch("https://dummyjson.com/products");
  const [users] = useFetch("https://dummyjson.com/users");
};
```

```
Slot 1: useState (products data)
Slot 2: useEffect (products url)
Slot 3: useState (users data)
Slot 4: useEffect (users url)
```

Two calls means two separate sets of slots. **State is never shared between calls**, even though the code is the same. Only the **logic** is shared, which is the point of custom hooks.

> If two components need to share the _same data_, a custom hook does not do that on its own. Use context, a store, or a data-fetching cache library.

---

## 4. Why return `[data]` and destructure `const [data] = ...`?

### It follows the `useState` convention

`useState` returns an array: `const [count, setCount] = useState(0)`. Returning an array from a custom hook uses the **same pattern**.

### Array vs. object return

|                         | Array `[a, b]`                                                  | Object `{ a, b }`                                      |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| **Naming at call site** | Free to rename: `const [products] = ...`, `const [users] = ...` | Must use the keys, or rename with `{ data: products }` |
| **Skipping values**     | Awkward: `const [, loading] = ...`                              | Easy: pick what you need                               |
| **Best for**            | 1 to 3 values, with clear order (like `useState`)               | Many values, where names carry the meaning             |
| **Adding values later** | Appending is safe; reordering breaks callers                    | Adding a key never breaks callers                      |

```jsx
// Array: rename freely, order matters
const [products] = useFetch(urlA);
const [users] = useFetch(urlB);

// Object: names matter, order doesn't
const { data, loading, error } = useFetch(url);
```

### Is the array necessary here?

Not strictly. With one value, `return data;` would work (`const data = useFetch(url)`). Returning `[data]` leaves room to **extend later** without changing existing callers:

```jsx
return [data, loading, error]; // callers using const [data] = ... still work
```

**Rule of thumb:** a hook's return can be **anything**. Pick the shape that gives the best call site: array for a small ordered tuple, object for several named values.

---

## 5. Flow of the example, step by step

```
1. First render of App
     useFetch runs → useState(null) → data = null
     useEffect registered (runs after paint)
     App logs: null

2. After paint: effect runs
     fetch(url) → res.json() → setData(json)

3. setData schedules a re-render of App
     useState slot now holds the products object
     useEffect deps [url] unchanged → effect NOT re-run
     App logs: { products: [...], total, ... }
```

**Why you see two logs:** the first render has `data = null`, the second has the fetched data. In development with `<StrictMode>`, React also mounts, unmounts, and remounts effects once, so the fetch may fire twice. That is expected and is a dev-only check.

### The dependency array `[url]`

- `[url]` means: re-run the effect **only when `url` changes**.
- Change the URL and it fetches again. Leave it the same and it fetches once.
- Omit the array and it would fetch **after every render**, and since `setData` triggers a render, that creates an **infinite loop**.

---

## 6. Making the hook production-ready

The basic version has gaps interviewers often probe:

```jsx
import { useState, useEffect } from "react";

const useFetch = (url) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => {
        if (err.name !== "AbortError") setError(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort(); // cleanup
  }, [url]);

  return { data, loading, error };
};
```

| Addition                    | What it fixes                                                  |
| --------------------------- | -------------------------------------------------------------- |
| `loading` / `error` state   | The UI can show spinners and error messages                    |
| `res.ok` check              | `fetch` does **not** reject on HTTP 4xx/5xx, so you must check |
| `AbortController` + cleanup | Cancels the in-flight request on unmount or URL change         |
| Ignoring `AbortError`       | Aborting is intentional, not a real error                      |

### The race condition cleanup prevents

```
url changes: A → B quickly
  request A (slow) ──────────────► resolves AFTER B
  request B (fast) ───────► resolves first

Without cleanup: A's response arrives last and overwrites B's data (stale UI)
With cleanup:    A is aborted when url changes, so only B updates state
```

Also prevents setting state on an unmounted component.

---

## 7. Why use custom hooks?

| Benefit                    | Explanation                                                                       |
| -------------------------- | --------------------------------------------------------------------------------- |
| **Reuse stateful logic**   | Any component can call `useFetch(url)` without duplicating the state and effect   |
| **No wrapper hell**        | No HOCs or render props adding layers to the component tree                       |
| **Separation of concerns** | The component describes the UI; the hook handles data fetching                    |
| **Testability**            | Logic can be tested on its own (e.g. with `renderHook`)                           |
| **Composability**          | Hooks can call other hooks: `useProducts` → `useFetch` → `useState` + `useEffect` |

Ties back to the slot design: because identity comes from **call order**, not names, custom hooks compose without key collisions, and each call gets its own independent slots.

---

## 8. Common mistakes

| Mistake                                              | Problem                                | Fix                                        |
| ---------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| Naming it `UseFetch` or `fetchData`                  | Linter can't recognize it as a hook    | Name it `useFetch`                         |
| Calling it conditionally or in a loop                | Breaks slot order                      | Call at the top level only                 |
| Expecting shared state between components            | Each call has its own state            | Use context or a store                     |
| Missing `url` in deps                                | Stale data when `url` changes          | Include every value the effect reads       |
| No cleanup on fetch                                  | Race conditions, updates after unmount | `AbortController` + cleanup                |
| Calling a hook inside a regular (non-`use`) function | Breaks the rules; lint error           | Make it a hook or call it from a component |

---

## 9. Interview Q&A

**Q: What is a custom hook?**
A function whose name starts with `use` and that calls other hooks. It extracts reusable stateful logic from components.

**Q: What's the difference between a custom hook and a component?**
A component returns JSX and gets its own fiber. A custom hook returns any value and runs **inside the caller's fiber**, adding its hooks as extra slots.

**Q: Does a custom hook share state between components?**
No. Each call creates independent state in the calling component. It shares the **logic**, not the **data**.

**Q: Why must a custom hook start with `use`?**
So the linter and React tooling recognize it and enforce the Rules of Hooks on it and its callers.

**Q: Array or object: which should a custom hook return?**
Array for a small ordered tuple (like `useState`) where callers rename freely. Object when there are several values and names matter more than order.

**Q: Why include `[url]` in the dependency array?**
So the effect re-runs only when `url` changes. Without it, the effect would run after every render, and `setData` would cause an infinite loop.

**Q: How do you avoid race conditions in a fetching hook?**
Return a cleanup from `useEffect` that aborts the request (`AbortController`) or ignores stale results.

**Q: Can custom hooks call other custom hooks?**
Yes. All hook calls flatten into one ordered list of slots on the calling component's fiber.

---

## 10. Quick reference

```jsx
// Define
const useThing = (arg) => {
  const [state, setState] = useState(null);
  useEffect(() => {
    /* logic using arg */
  }, [arg]);
  return [state]; // or { state, ... }
};

// Use (top level, unconditional)
const [thing] = useThing(arg);
```

```
Custom hook  = function named useX that calls other hooks
Owns state?  = No, its hooks are slots in the CALLER's fiber
Each call    = independent slots, independent state
Shares       = logic only (not data)
Return shape = whatever gives the best call site (array for tuples, object for named values)
```

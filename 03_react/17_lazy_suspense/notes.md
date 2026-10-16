# Lazy Loading, Suspense & Micro Frontend Basics

## 1. The problem

By default, `import Billing from "./Billing"` pulls **every component into one JavaScript bundle**. The browser must download, parse, and execute all of it before the first screen appears, including code for screens the user may never open.

| Effect of one big bundle | Impact                                                        |
| ------------------------ | ------------------------------------------------------------- |
| Large download           | Slow first load, especially on poor networks                  |
| Parse/execute cost       | Main thread blocked, UI feels frozen                          |
| Wasted work              | Code for rarely visited screens (e.g. Billing) loaded upfront |

**Goal:** load only what the current screen needs, and fetch the rest **on demand**.

This needs two pieces working together:

- **Code splitting + `lazy`:** load a component's code later.
- **`Suspense`:** show a fallback while that code is still arriving.

---

## 2. Code splitting with dynamic `import()`

```jsx
import Billing from "./Billing"; // static: bundled upfront

const loadBilling = () => import("./Billing"); // dynamic: returns a Promise
```

- A static `import` is resolved at **build time** and included in the main bundle.
- A dynamic `import()` is a function call that returns a **Promise of the module**. The bundler (Vite, Webpack) sees it and emits `Billing` as a **separate chunk** (a separate `.js` file) that is downloaded only when `import()` runs.
- Once loaded, the module is **cached**, so calling `import("./Billing")` again resolves instantly.

---

## 3. `React.lazy`

```jsx
import { lazy } from "react";

const Billing = lazy(() => import("./Billing"));
```

`lazy(loader)` takes a function returning a Promise that resolves to a module with a **default export**, and returns a component you can render like any other.

```jsx
// Billing.jsx must default-export the component
export default Billing;
```

For a named export, re-map it:

```jsx
const Billing = lazy(() =>
  import("./Billing").then((m) => ({ default: m.Billing })),
);
```

### Simulating a slow network (as in the example)

```jsx
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const Home = lazy(() => delay(1000).then(() => import("./Home")));
const Billing = lazy(() => delay(3000).then(() => import("./Billing")));
```

The `delay` wrapper pauses the load by 1s and 3s so the fallback stays visible long enough to see. In real apps there is no `delay`; the pause is the network fetching the chunk.

---

## 4. `Suspense`

```jsx
<Suspense fallback={<Spinner />}>
  <Home />
</Suspense>
```

`Suspense` is a **boundary**: if anything inside it isn't ready to render yet, React shows the `fallback` for that part of the tree instead of blocking the whole page. When the content is ready, the fallback is replaced with the real UI.

Think of it as the UI saying "just a minute" while the real component arrives.

### Full example flow

```jsx
const App = () => (
  <div>
    <Suspense fallback={<Spinner />}>
      <Home /> {/* ready after ~1s  */}
    </Suspense>
    <Suspense fallback={<Shimmer />}>
      <Billing /> {/* ready after ~3s  */}
    </Suspense>
  </div>
);
```

```
t = 0s   App renders
           Home    → code not loaded → <Spinner /> shown
           Billing → code not loaded → <Shimmer /> shown
t = 1s   Home chunk arrives    → Spinner replaced by <Home />
t = 3s   Billing chunk arrives → Shimmer replaced by <Billing />
```

Each boundary resolves **independently**, so Home appears without waiting for Billing.

### One boundary vs. several

| Setup                               | Behavior                                                              |
| ----------------------------------- | --------------------------------------------------------------------- |
| **Separate boundaries** (above)     | Each section shows its own fallback and appears as soon as it's ready |
| **One shared boundary** around both | One fallback until **both** are ready, then both appear together      |
| **No boundary**                     | Error: a component suspended with nothing to catch it                 |

React shows the fallback of the **nearest ancestor** `Suspense`. Boundaries can be nested to build progressive loading (page skeleton first, then sections).

---

## 5. How it works internally

### What `lazy` returns

`lazy(loader)` returns a special element type, not a normal function component. It holds a tiny state machine:

```js
{
  $$typeof: REACT_LAZY_TYPE,
  _payload: { _status: Uninitialized, _result: loader },
  _init: fn
}
```

| Status        | Meaning                                |
| ------------- | -------------------------------------- |
| Uninitialized | `loader` hasn't been called yet        |
| Pending       | `loader()` called, Promise in flight   |
| Resolved      | Module loaded, `default` export stored |
| Rejected      | Load failed, error stored              |

### What happens on render

1. React renders `<Billing />` and reaches the lazy type. It calls `_init`.
2. **Uninitialized:** call `loader()` (this triggers the `import()` / network fetch), set status to **Pending**, attach `.then` handlers to the Promise.
3. **Pending:** the component cannot render yet, so React **suspends**. Conceptually it _throws the Promise_.
4. The work loop (the fiber reconciliation process) catches this and walks up the fiber tree to the **nearest `Suspense` fiber**.
5. That boundary switches to rendering its **`fallback`** instead of its children.
6. When the Promise resolves, status becomes **Resolved**, and React is notified (a "ping") to **retry rendering** the suspended subtree.
7. On retry, `_init` returns the loaded component and the real UI replaces the fallback.
8. **Rejected:** the error is thrown and propagates to the nearest **Error Boundary**.

```
render <Billing />
   └─ lazy status Pending → throw Promise
        └─ caught by nearest <Suspense>
             ├─ show fallback (<Shimmer />)
             └─ Promise resolves → ping → retry render → show <Billing />
```

### Ties to earlier concepts

- **Fiber:** the `Suspense` boundary is a fiber. Showing a fallback is a decision made during reconciliation of that fiber's subtree, and the paused subtree's work is thrown away and redone on retry.
- **Concurrent rendering:** because render is a pure, restartable calculation, React can pause a subtree and retry it later without corrupting state.
- **Hooks and slots:** if a component suspends **before it ever commits**, its hook slots are discarded, so state in a never-shown component doesn't persist. Once it has committed, suspending again keeps its state hidden but intact.

### Error handling

A failed chunk load (offline, deploy changed file hashes) throws. Wrap in an **Error Boundary** so the whole app doesn't crash:

```jsx
<ErrorBoundary fallback={<p>Failed to load. Retry.</p>}>
  <Suspense fallback={<Spinner />}>
    <Billing />
  </Suspense>
</ErrorBoundary>
```

---

## 6. Loading on demand (the "Pay Bill" button case)

In the example, both lazy components render **immediately on mount**, so their chunks start downloading right away. To load Billing only when needed, render it **conditionally**:

```jsx
const App = () => {
  const [showBilling, setShowBilling] = useState(false);

  return (
    <div>
      <button onClick={() => setShowBilling(true)}>Pay Bill</button>
      {showBilling && (
        <Suspense fallback={<Shimmer />}>
          <Billing />
        </Suspense>
      )}
    </div>
  );
};
```

The chunk is fetched only after the click, so the user may wait. To make it feel instant, **preload** on a hint such as hover:

```jsx
const loadBilling = () => import("./Billing");
const Billing = lazy(loadBilling);

<button
  onMouseEnter={loadBilling} // start download before the click
  onClick={() => setShowBilling(true)}
>
  Pay Bill
</button>;
```

Calling `import()` early warms the module cache, so the later `lazy` resolves immediately.

### Where to apply lazy loading

| Good candidate                               | Poor candidate                                                 |
| -------------------------------------------- | -------------------------------------------------------------- |
| Route-level pages (biggest win, most common) | Tiny components (overhead exceeds savings)                     |
| Modals, drawers, tabs not shown initially    | Anything visible in the first paint (adds a flash of fallback) |
| Heavy libraries (charts, editors, maps)      | Above-the-fold content                                         |

---

## 7. Fallback design and layout shift

A fallback should be about the **same size** as the real content. Otherwise, swapping it in shifts the page layout (see CLS below).

| Fallback               | Best for                                                          |
| ---------------------- | ----------------------------------------------------------------- |
| **Spinner**            | Small or unknown-size content, short waits                        |
| **Shimmer / skeleton** | Known layout (cards, lists); feels faster and avoids layout shift |

---

## 8. Core Web Vitals

These measure real user-perceived performance and are central to frontend system design discussions.

| Metric                              | Measures                                                                    | Good    | What hurts it                                                                              | How lazy loading / design helps                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **LCP** (Largest Contentful Paint)  | Time until the largest visible element (hero image, headline) renders       | ≤ 2.5s  | Large bundles, slow server, unoptimized hero image                                         | Split code so the first screen's JS is small; preload the hero image; **don't lazy-load the LCP element** |
| **CLS** (Cumulative Layout Shift)   | How much visible content jumps around unexpectedly                          | ≤ 0.1   | Images without dimensions, late-injected content, fallbacks sized differently from content | Reserve space (width/height, skeletons matching final size)                                               |
| **INP** (Interaction to Next Paint) | Latency from a user interaction (click, tap, key) to the next visual update | ≤ 200ms | Long JavaScript tasks blocking the main thread                                             | Smaller bundles mean less main-thread work; split heavy work; defer non-critical JS                       |

(INP replaced FID as the responsiveness metric.)

### Rule of thumb

```
Lazy-load below-the-fold and on-demand UI  →  helps LCP and INP
Size your fallbacks like real content      →  protects CLS
Never lazy-load the LCP element            →  it would delay LCP
```

---

## 9. Micro frontend architecture

### What it is

Splitting one large frontend into **independently built, deployed, and owned** pieces, each usually by a separate team, composed into one product for the user. It is the frontend equivalent of microservices.

Example (e-commerce): **Header**, **Search**, **Product List**, **Cart**, **Checkout** are each separate apps, composed into one page by a **shell (host)**.

```
                ┌───────────────────────────┐
                │  Shell / Host application  │  routing, auth, layout, shared deps
                └──────┬──────┬──────┬──────┘
                       │      │      │      loaded at runtime
                 ┌─────▼─┐ ┌──▼───┐ ┌▼──────┐
                 │Search │ │Cart  │ │Checkout│   each: own repo, build, deploy
                 └───────┘ └──────┘ └────────┘
```

### How it works behind the scenes (Module Federation)

1. The **host** doesn't bundle remote apps. It knows a **remote entry URL** for each (e.g. `https://cart.example.com/remoteEntry.js`).
2. At runtime, the host fetches the remote's small manifest and **dynamically imports** its exposed modules.
3. Shared libraries (React, React DOM) are declared **shared**, so the browser loads **one copy** instead of one per team.
4. The host renders the remote component, typically through **`lazy` + `Suspense`**:

```jsx
const Cart = lazy(() => import("cart/CartApp")); // "cart" is a remote loaded at runtime

<Suspense fallback={<Shimmer />}>
  <Cart />
</Suspense>;
```

So everything in the earlier sections (dynamic import, lazy, Suspense, error boundaries) is exactly the mechanism a host uses to load a remote.

### Integration approaches

| Approach                               | How                                                          | Pros                             | Cons                                                      |
| -------------------------------------- | ------------------------------------------------------------ | -------------------------------- | --------------------------------------------------------- |
| **Build-time (npm packages)**          | Each micro frontend published as a package, host installs it | Simple, one bundle               | Host must rebuild to update; **loses independent deploy** |
| **Runtime: Module Federation**         | Remotes loaded dynamically from URLs                         | Independent deploys, shared deps | Version-mismatch risk, more config                        |
| **iframes**                            | Each app in its own frame                                    | Strong isolation                 | Poor UX (sizing, routing, accessibility), heavy           |
| **Web Components**                     | Each exposes a custom element                                | Framework-agnostic               | Integration and styling quirks                            |
| **Server-side composition (edge/SSI)** | Server stitches HTML fragments                               | Good for first paint and SEO     | More infra complexity                                     |

### Trade-offs

| Benefits                              | Costs                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Independent deploys and team autonomy | Duplicate code and larger total payload if sharing is done badly                            |
| Scales with organization size         | Inconsistent UX unless a shared design system exists                                        |
| Tech-stack freedom per team           | Cross-app communication is harder (use events, a shared contract, not shared mutable state) |
| Smaller blast radius for failures     | Version skew of shared libraries; more operational complexity                               |

**When to use:** many teams, a large product, a need for independent release cadence. **When not to:** a small team or app. The complexity isn't worth it.

---

## 10. Case study: loading 100 pages of products (Amazon-style)

**Problem:** a category has thousands of products across ~100 pages. How do you make browsing feel fast without loading everything?

### Windowing vs. pagination

|              | Pagination                                             | Windowing (virtualization)                                                                                |
| ------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Idea**     | Fetch and show one page at a time                      | Render only the items **visible in the viewport**, plus a small buffer; recycle DOM nodes while scrolling |
| **Best for** | Shopping/search with page numbers, SEO, shareable URLs | Very long single lists or infinite scroll                                                                 |
| **Controls** | Network payload                                        | DOM size and render cost                                                                                  |
| **Library**  | n/a                                                    | `react-window`, `react-virtual`                                                                           |

They solve different problems and are often combined (paginated API, virtualized list within a page).

### Offset vs. cursor pagination (API side)

|                        | Offset (`?page=100&limit=20`)                                   | Cursor (`?after=<id>&limit=20`) |
| ---------------------- | --------------------------------------------------------------- | ------------------------------- |
| **How**                | Skip `(page-1) × limit` rows                                    | Continue after a specific item  |
| **Jump to page N**     | Easy                                                            | Not possible directly           |
| **Cost on deep pages** | DB scans and skips many rows, so it gets slow                   | Constant, uses an index         |
| **Consistency**        | Items shift if data changes between requests (duplicates/skips) | Stable                          |
| **Fits**               | Numbered pages (shopping)                                       | Infinite scroll, feeds          |

### What if someone clicks page 100 directly?

- The URL carries the page (`/category/shoes?page=100`), so the server and client **fetch page 100 independently**, without needing pages 1 to 99.
- With **offset** pagination this works but is slower deep in the data; mitigate with indexes, caching popular pages, and capping or bucketing very deep pages.
- With **cursor** pagination direct jumps aren't possible. Some systems keep **page-to-cursor mappings** or use hybrid approaches.
- Show a skeleton while loading (Suspense or loading state) sized to the grid to avoid CLS.
- Provide **Prev/Next** and the nearby page numbers, so users can continue from page 100 in both directions.

### Resource hinting: making the _next_ page feel instant

Instead of loading all 100 pages, **predict the likely next step** and prepare it quietly.

| Hint                                            | What it does                                                                                | Use for                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `<link rel="preconnect" href="https://cdn...">` | Opens DNS + TCP + TLS to an origin early                                                    | Image/API/CDN origins you will definitely use |
| `<link rel="dns-prefetch">`                     | DNS lookup only                                                                             | Cheaper fallback for less certain origins     |
| `<link rel="preload" as="image" href="...">`    | Fetch a **critical resource for the current page** at high priority                         | The LCP hero image, key fonts, critical JS    |
| `<link rel="prefetch" href="...">`              | Fetch a resource likely needed on a **future navigation** at low priority, during idle time | Next page's JS chunk or data (e.g. page 2)    |
| `fetchpriority="high"` / `loading="lazy"`       | Raise or lower priority of an image                                                         | Hero image high; below-the-fold images lazy   |

**Amazon-style strategy:**

- Fully load only page 1 and its above-the-fold images (preload the LCP image).
- **Prefetch page 2** (data and chunk) during idle time, since most users go to the next page.
- Lazy-load product images below the fold (`loading="lazy"`).
- Preconnect to the image CDN.
- Optionally prefetch on **hover** over a pagination link or product card (same idea as preloading `Billing` on `onMouseEnter`).
- Do **not** prefetch all 100 pages: it wastes bandwidth and hurts the pages that matter.

### How products render within each category

- **Category route** (`/category/:slug`) is code-split as a lazy route; the product card component is shared.
- **Server-side rendering / edge caching** delivers the first page of products as HTML for fast LCP and SEO; the client then hydrates.
- A **product grid** renders cards with fixed image dimensions (no CLS), lazy-loaded images, and skeleton placeholders while data loads.
- **Filters and sort** are part of the URL (`?brand=x&sort=price`) so pages are shareable and cacheable.
- At scale, each category block (header, filters, product grid, recommendations) can be its own **micro frontend** or independently loaded section, wrapped in its own `Suspense` boundary so slow sections (recommendations) never block fast ones (the grid).

---

## 11. Putting it together

```
Initial load      → small main bundle, route-level lazy chunks, preloaded LCP image    (LCP)
Slow sections     → own Suspense boundary + same-size skeleton                         (CLS)
Heavy JS          → split and defer so the main thread stays free                      (INP)
Next likely step  → prefetch on idle/hover                                              (perceived speed)
Huge lists        → pagination (network) + windowing (DOM)
Many teams        → micro frontends loaded at runtime via lazy + Suspense
```

---

## 12. Interview Q&A

**Q: What do `lazy` and `Suspense` each do?**
`lazy` defers loading a component's code until it is first rendered, using dynamic `import()` to create a separate chunk. `Suspense` shows a fallback while that code (or other suspended content) isn't ready.

**Q: How does Suspense know a component isn't ready?**
Conceptually the component _throws a Promise_ during render. React catches it at the nearest `Suspense` boundary, renders the fallback, and retries the subtree when the Promise resolves.

**Q: What happens if the lazy chunk fails to load?**
The error propagates to the nearest Error Boundary. Without one, the app unmounts. Wrap lazy sections in an Error Boundary with a retry option.

**Q: Why would lazy loading _hurt_ performance?**
Lazy-loading above-the-fold content or the LCP element adds a request waterfall and fallback flash, delaying LCP and potentially adding layout shift.

**Q: Explain LCP, CLS, INP, and how each can be improved.**
LCP is time to the largest visible element (reduce bundle size, preload the hero image). CLS is unexpected layout movement (reserve space, size skeletons like real content). INP is interaction-to-paint latency (reduce long main-thread tasks, split code).

**Q: `preload` vs. `prefetch`?**
`preload` fetches a resource needed **for the current page** at high priority. `prefetch` fetches a resource for a **likely future navigation** at low priority, during idle time.

**Q: Windowing vs. pagination?**
Pagination limits what you **fetch**. Windowing limits what you **render**. Combine them for large datasets.

**Q: Offset vs. cursor pagination, and what breaks when a user jumps to page 100?**
Offset supports random page jumps but gets slower deep into the data and shifts if data changes. Cursor is fast and stable but can't jump to an arbitrary page. For direct jumps, keep the page in the URL, fetch that page independently, cache aggressively, and show a skeleton.

**Q: What is a micro frontend and how do remotes load?**
Independently built and deployed frontend pieces composed by a host. With Module Federation, the host dynamically imports a remote's exposed module from a URL at runtime (typically via `lazy` + `Suspense`), while shared libraries like React are loaded once.

**Q: When would you _not_ use micro frontends?**
A small team or a small app. The overhead (shared deps, version skew, UX consistency, cross-app communication) outweighs the benefit of independent deploys.

**Q: How do separate Suspense boundaries differ from one shared boundary?**
Separate boundaries let each section appear as soon as it is ready. A shared one waits for everything inside it, then reveals all at once.

---

## 13. Quick reference

```jsx
const Page = lazy(() => import("./Page")); // code-split, loads on first render

<ErrorBoundary fallback={<Retry />}>
  <Suspense fallback={<Skeleton />}>
    {" "}
    // fallback sized like real content
    <Page />
  </Suspense>
</ErrorBoundary>;

// Preload before it's needed
const loadPage = () => import("./Page");
<button onMouseEnter={loadPage} onClick={open}>
  Open
</button>;
```

```
lazy         = defer a component's CODE (separate chunk via import())
Suspense     = fallback boundary while something isn't ready
Mechanism    = throw Promise → nearest boundary → fallback → ping → retry
LCP/CLS/INP  = loading speed / visual stability / responsiveness
preload      = needed NOW   |  prefetch = needed LATER
Pagination   = limit fetching |  Windowing = limit rendering
Micro FE     = independent deploys, loaded at runtime (Module Federation) via lazy + Suspense
```

# Resource Hints: `preconnect`, `prefetch`, `preload`

## 1. Why resource hints exist

The browser discovers resources **late**: it parses HTML, finds a `<script>` or `<img>`, and only then starts the network work. For anything behind CSS, JS, or a dynamic `import()`, discovery is later still. Resource hints let you **tell the browser early** what it will need so network work overlaps with other work instead of waiting.

A network request has several phases:

```
DNS lookup → TCP connect → TLS handshake → HTTP request → download
└────────── connection setup (~100-500ms) ──────────┘
```

Each hint skips a different amount of this pipeline:

| Hint           | Does what, in advance                                                             | Saves                           |
| -------------- | --------------------------------------------------------------------------------- | ------------------------------- |
| `dns-prefetch` | DNS lookup only                                                                   | DNS time                        |
| `preconnect`   | DNS + TCP + TLS                                                                   | Entire connection setup         |
| `preload`      | **Downloads** a resource for the **current page** (high priority)                 | Discovery delay + download wait |
| `prefetch`     | **Downloads** a resource for a **future navigation** (lowest priority, idle time) | Whole load on the next page     |

---

## 2. `preconnect`: warm up the connection

```html
<link rel="preconnect" href="https://cdn.example.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

- Opens the connection (DNS, TCP, TLS) to an **origin** before any request is made to it.
- Downloads **nothing**. When the real request comes later, it reuses the open connection.
- Use for origins you are **certain** to hit soon: image CDN, API host, font host.

### The `crossorigin` attribute

Connections are keyed by whether they are credentialed. **Fonts and `fetch`/CORS requests use an anonymous connection**, so a `preconnect` without `crossorigin` opens a connection that those requests can't reuse. Add `crossorigin` for fonts and CORS requests.

### Limits and cost

- Idle connections are closed after roughly 10 seconds if unused, so don't preconnect to something needed minutes later.
- Each connection costs CPU and battery. Keep it to about **2 to 4 critical origins**.
- Cheaper fallback for less certain origins:

```html
<link rel="dns-prefetch" href="https://analytics.example.com" />
```

---

## 3. `preload`: fetch a critical resource for _this_ page

```html
<link rel="preload" href="/hero.jpg" as="image" fetchpriority="high" />
<link
  rel="preload"
  href="/fonts/inter.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
<link rel="preload" href="/critical.js" as="script" />
```

- **Downloads the resource now, at high priority**, and holds it in cache until the page uses it.
- Used for resources the browser would discover **late**:
  - Fonts referenced from CSS (not found until the CSS is parsed)
  - A hero image set via CSS `background-image` or injected by JS
  - A script that is only requested after another script runs
- Preload does **not execute** a script or apply a stylesheet. It only fetches and caches. The normal `<script>` / `<link rel="stylesheet">` / `<img>` tag still has to follow.

### Rules that trip people up

| Rule                                                               | Why                                                                                                  |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **`as` is required** (`image`, `font`, `script`, `style`, `fetch`) | It sets request priority and the right headers; without it the browser may fetch twice               |
| **`crossorigin` is required for fonts** (even same-origin)         | Fonts are always fetched in CORS mode; a mismatch causes a **double download**                       |
| **Use it within a few seconds**                                    | Otherwise Chrome logs "preloaded but not used" and you wasted bandwidth                              |
| **Don't preload everything**                                       | Preloaded resources compete for bandwidth and **delay other critical resources**, which can hurt LCP |
| **`type` helps**                                                   | Lets the browser skip formats it can't use                                                           |

### Preloading the LCP image

```html
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
```

Ties directly to Core Web Vitals: if the largest element is an image the browser finds late, preloading it directly improves **LCP**.

---

## 4. `prefetch`: fetch for the _next_ navigation

```html
<link rel="prefetch" href="/checkout.chunk.js" />
<link rel="prefetch" href="/api/products?page=2" as="fetch" />
```

- Downloads a resource the user is **likely to need next**, at **lowest priority**, **only when the browser is idle**.
- Stored in the HTTP cache, so the next navigation or `import()` finds it already there.
- Does **not** block or compete with current-page resources, and the browser may skip it on a slow connection or when Data Saver is on.
- It is a **hint**, not a command.

### `preload` vs. `prefetch`

|                        | `preload`                         | `prefetch`                          |
| ---------------------- | --------------------------------- | ----------------------------------- |
| **For**                | The **current** page              | A **future** page or action         |
| **Priority**           | High                              | Lowest (idle only)                  |
| **Browser must obey?** | Effectively yes                   | No, a hint it may skip              |
| **If unused**          | Console warning, wasted bandwidth | Harmless, cached for later          |
| **Typical targets**    | LCP image, fonts, critical JS     | Next route's chunk, page 2 data     |
| **Rule of thumb**      | "I need this **now**"             | "I'll probably need this **later**" |

---

## 5. How the browser handles them (internals)

- **Preload scanner:** while the main parser is blocked (e.g. on a script), a lightweight secondary scanner reads ahead in the HTML and starts fetching resources it finds. Hints in `<head>` are seen immediately. Resources hidden in CSS or JS are **invisible to the scanner**, which is why preload helps for them.
- **Priority queue:** every request gets a priority (Highest, High, Medium, Low, Lowest). `preload` raises a resource to its natural priority for its type (and `fetchpriority` adjusts it). `prefetch` is placed at Lowest and issued when the network is idle.
- **Caching:** preloaded and prefetched responses land in the HTTP cache (and a short-lived in-memory preload cache), so the later real request is a cache hit. If the response has `Cache-Control: no-store`, the benefit disappears.
- **Connection pools:** `preconnect` creates a socket in the pool for that origin (and credentials mode). Later requests pick from it instead of dialing.
- **HTTP/2 and HTTP/3:** multiplexing makes early connections even more valuable, because many requests share one warmed connection.

---

## 6. Related tools

| Tool                                             | What it does                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `<link rel="modulepreload">`                     | Preload for **ES modules**: fetches, parses, and compiles the module and its dependencies                             |
| `fetchpriority="high" \| "low"`                  | Raise or lower priority of an `<img>`, `<script>`, `<link>`                                                           |
| `loading="lazy"`                                 | Defer below-the-fold images until near the viewport                                                                   |
| `<link rel="prerender">` / Speculation Rules API | Fully load and render a **whole next page** in the background (heavier than prefetch)                                 |
| HTTP `Link:` header                              | Send hints in the response header, before HTML is even parsed                                                         |
| **103 Early Hints**                              | Server sends hints **while it is still generating the HTML**, so the browser starts fetching during server think-time |

---

## 7. Using them with React and bundlers

### Webpack magic comments (dynamic imports)

```jsx
const Billing = lazy(() => import(/* webpackPrefetch: true */ "./Billing"));
const Chart = lazy(() => import(/* webpackPreload: true  */ "./Chart"));
```

- `webpackPrefetch` adds a `<link rel="prefetch">` for the chunk, so it downloads at idle time after the parent chunk loads. Good for "likely next" screens such as Billing.
- `webpackPreload` loads the chunk **in parallel with the parent**. Use sparingly, only when it is needed almost immediately.
- Vite automatically emits `modulepreload` for a chunk's static dependencies. For manual control, use `<link>` tags or call `import()` early.

### Prefetch on user intent (hover / focus)

```jsx
const loadBilling = () => import("./Billing");
const Billing = lazy(loadBilling);

<button
  onMouseEnter={loadBilling} // warm the module cache before the click
  onFocus={loadBilling}
  onClick={() => setShowBilling(true)}
>
  Pay Bill
</button>;
```

This is **intent-based prefetching**: by the time the user clicks, `lazy` resolves instantly and `Suspense` never shows the fallback.

### React 19 `react-dom` APIs

React exposes the same hints as functions you can call during render:

```jsx
import { preconnect, prefetchDNS, preload, preinit } from "react-dom";

const App = () => {
  preconnect("https://cdn.example.com");
  prefetchDNS("https://analytics.example.com");
  preload("/hero.webp", { as: "image", fetchPriority: "high" });
  preinit("/critical.js", { as: "script" }); // fetch AND execute
  return <Home />;
};
```

React de-duplicates these calls and, with server rendering, hoists them into `<head>`.

---

## 8. Worked example: product listing (Amazon-style)

```html
<head>
  <!-- 1. Warm the image CDN and API origin: we will definitely use them -->
  <link rel="preconnect" href="https://images.example.com" />
  <link rel="preconnect" href="https://api.example.com" crossorigin />

  <!-- 2. Critical for THIS page: the first product image drives LCP -->
  <link
    rel="preload"
    as="image"
    href="https://images.example.com/p1.webp"
    fetchpriority="high"
  />

  <!-- 3. Likely NEXT step: page 2 data and its JS chunk, fetched at idle -->
  <link rel="prefetch" href="/api/products?page=2" as="fetch" crossorigin />
  <link rel="prefetch" href="/assets/product-detail.chunk.js" as="script" />
</head>
```

| Step                  | Hint                               | Reason                                                                   |
| --------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| Image CDN and API     | `preconnect`                       | Certain to be used, skips connection setup                               |
| First product image   | `preload` + `fetchpriority="high"` | It is the LCP element and would be discovered late                       |
| Page 2 data and chunk | `prefetch`                         | Most users go to page 2; do it at idle                                   |
| Pages 3 to 100        | **Nothing**                        | Prefetching all of them wastes bandwidth and hurts the pages that matter |
| Below-the-fold images | `loading="lazy"`                   | Not needed until the user scrolls                                        |

---

## 9. Common mistakes

| Mistake                              | Effect                                                  | Fix                                                        |
| ------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------- |
| `preload` without `as`               | Browser fetches the resource twice or at wrong priority | Always set `as`                                            |
| Font `preload` without `crossorigin` | **Double download**                                     | Add `crossorigin`                                          |
| Preloading many resources            | They compete with truly critical ones, delaying LCP     | Preload only 1 to 3 critical items                         |
| Preloading something unused          | "Preloaded but not used" warning, wasted data           | Remove it, or use it quickly                               |
| `preconnect` to many origins         | Wastes CPU, battery, sockets                            | Limit to critical origins; use `dns-prefetch` for the rest |
| `prefetch` expecting a guarantee     | Browser may skip it                                     | Treat it as an optimization, never a dependency            |
| `prefetch` for the current page      | Wrong priority (lowest)                                 | Use `preload` instead                                      |
| Hints on `no-store` responses        | Cache can't hold the result                             | Set proper `Cache-Control`                                 |
| Lazy-loading the LCP image           | Delays LCP                                              | Preload it, never `loading="lazy"`                         |

---

## 10. Decision guide

```
Do I need this resource on THIS page, soon, and the browser would find it late?
  └─ Yes → preload

Will I definitely connect to this origin soon (but don't know the exact URL)?
  └─ Yes → preconnect   (less certain → dns-prefetch)

Will the user probably need this on the NEXT navigation or action?
  └─ Yes → prefetch   (or prefetch on hover/focus for higher accuracy)

Whole next page, high confidence?
  └─ Speculation Rules (prerender)
```

---

## 11. Interview Q&A

**Q: Difference between `preload`, `prefetch`, and `preconnect`?**
`preconnect` only opens the connection (DNS, TCP, TLS) to an origin. `preload` downloads a resource needed on the **current** page at high priority. `prefetch` downloads a resource likely needed on a **future** navigation at lowest priority during idle time.

**Q: When would you use `preload` for an image?**
For the LCP image when the browser would otherwise discover it late (CSS background, JS-injected, or deep in the page). Pair it with `fetchpriority="high"`.

**Q: Why do font preloads need `crossorigin`?**
Fonts are fetched in CORS mode. Without `crossorigin` the preloaded response isn't reused by the real font request, so the font downloads twice.

**Q: Can too many `preload` tags hurt performance?**
Yes. Preloaded resources compete for bandwidth with other critical resources and can delay LCP. Preload only what is genuinely critical and discovered late.

**Q: Is `prefetch` guaranteed to happen?**
No. It is a hint at the lowest priority; the browser can skip it on slow networks, Data Saver, or when busy. Never depend on it for correctness.

**Q: How would you make a lazy-loaded Billing screen feel instant?**
Prefetch its chunk (`webpackPrefetch` or an early `import()`), or trigger `import()` on `onMouseEnter` / `onFocus` of the button. When the user clicks, `lazy` resolves from cache and `Suspense` doesn't show the fallback.

**Q: How do you handle prefetching in a 100-page product listing?**
Preload the LCP image on the current page, preconnect to the image CDN and API, prefetch only the likely next page (page 2) at idle, lazy-load below-the-fold images, and don't prefetch the rest.

**Q: What is 103 Early Hints?**
An interim HTTP response where the server sends `Link` hints (preload or preconnect) **before** the final HTML response is ready, so the browser fetches critical resources during the server's processing time.

**Q: Why does `preconnect` help with HTTPS specifically?**
HTTPS requires a TLS handshake on top of DNS and TCP, which can cost several round trips. `preconnect` does all of it ahead of time, so the first real request starts immediately.

---

## 12. Quick reference

```html
<link rel="dns-prefetch" href="https://x.com" />
<!-- DNS only -->
<link rel="preconnect" href="https://x.com" crossorigin />
<!-- DNS + TCP + TLS -->
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high" />
<!-- NOW, this page -->
<link rel="prefetch" href="/next.chunk.js" as="script" />
<!-- LATER, idle -->
```

```
dns-prefetch  = resolve the name                              (cheap, low commitment)
preconnect    = resolve + connect + TLS                       (certain origin)
preload       = download now, high priority, THIS page        (critical, found late)
prefetch      = download later, lowest priority, NEXT page    (likely next step)

Overuse hurts: every hint costs bandwidth, CPU, or both.
```

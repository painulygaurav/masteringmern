# Why React Was Needed — Before the Virtual DOM

Before learning the Virtual DOM, understand the problem React was trying to solve.

---

## 1. What is the Actual DOM?

When the browser receives HTML:

```html
<div id="app">
  <h1>Hello</h1>
  <button>Click me</button>
</div>
```

the browser parses it and creates an **in-memory tree of objects** called the **DOM (Document Object Model)**.

- Conceptually:

```
Document
   │
   └── div#app
         ├── h1
         │    └── "Hello"
         │
         └── button
              └── "Click me"
```

JavaScript can interact with this tree:

```javascript
document.querySelector("h1").textContent = "Hello Gaurav";
```

The DOM changes from:

```HTML
<h1>Hello</h1>
```

to:

```HTML
<h1>Hello Gaurav</h1>
```

## 2. The DOM Isn't the Problem

The DOM is not inherently bad or slow.

Modern browsers are very good at handling DOM operations.

The problem appears when an application becomes large and has lots of changing state and UI elements.

For example:

```text
Application
│
├── Header
├── Sidebar
├── Search
├── User Profile
├── Notifications
├── Product List
│   ├── Product 1
│   ├── Product 2
│   ├── Product 3
│   └── ...
├── Shopping Cart
└── Footer
```

Now imagine many things changing based on user actions.

You have to keep the **application state** and the **DOM/UI** synchronized.

## 3. The Real Problem: Keeping State and UI in Sync

Consider a simple counter.

Your application has:

```javascript
let count = 0;
```

And your HTML is:

```HTML
<h1 id="count">0</h1>
<button id="increment">+</button>
```

When the user clicks the button:

```javascript
count++;
```

Now:

```text
JavaScript state:
count = 1
```

But the screen still says:
`0`

Why?

Because changing a JavaScript variable does **not automaticaly change the DOM**.

You have to manually update it.

```
count++;

document.querySelector("#count").textContent = count;
```

Now everything is synchronized:

```
JavaScript State
       │
       │ manually update
       ↓
      DOM
       │
       ↓
     Screen
```

## 4. This is Fine for Small Applications

For a small application, this isn't a big deal. But as the application grows, thigs become complicated, and manual DOM manipulation becomes difficult to manage.

## 5. Imperative Programming

Traditional DOM manipulation is generally imperative.

> You tell the program **HOW** to do something.

For example:

```javascript
const button = document.querySelector("#button");

button.addEventListener("click", () => {
  const counter = document.querySelector("#counter");

  let value = Number(counter.textContent);

  value++;

  counter.textContent = value;
});
```

You're explicitly telling the browser:

```text
1. Find the button
2. Listen for a click
3. Find the counter
4. Read its value
5. Convert it to a number
6. Increment it
7. Change the DOM
```

## 6. The Bigger Problem: UI Logic Gets Mixed with DOM Logic

Imagine an application with:

```
State
├── loggedIn
├── username
├── cartItems
├── notificationCount
├── loading
└── selectedProduct
```

And UI has:

```text
Header
Sidebar
Product List
Cart
Notifications
User Profile
```

You may end up writing logic like:

```javascript
if (loggedIn) {
  document.querySelector("#login").style.display = "none";
  document.querySelector("#profile").style.display = "block";
}

if (cartItems.length > 0) {
  document.querySelector("#cart").classList.add("has-items");
}

if (loading) {
  document.querySelector("#loader").style.display = "block";
}

document.querySelector("#notification-count").textContent = notificationCount;
```

Now your application logic is mixed with:

> "Find the DOM element and change this property."

## 7. What we actually want

Ideally, we want to say:

> "If the user is logged in, show the profile."

Instead of manually saying:

```javascript
document.querySelector("#login").style.display = "none";
document.querySelector("#profile").style.display = "block";
```

We want to describe the desired UI:

```
loggedIn = true

        ↓

Show Profile
Hide Login
```

In other words:

> **The UI should be a representation of the current application state.**

Conceptually:

```
State
  ↓
UI
```

If State changes:

```
Old State
   ↓
New State
   ↓
New UI
```

## 8. Declarative Programming

React uses a declarative approach to describing UI.

Instead of saying:

> "Find this element and change it."

you describe:

> "Given this state, this is what the UI should look like."

For example:

```html
<h1>{count}</h1>
```

If:

`count = 10;`

the UI should contain:

`10`

If:

`count = 11;`

the UI should contain:

`11`

You don't manually tell React:

```javascript
document.querySelector("h1").textContent = "11";
```

You simply change the state:

```javascript
setCount(11);
```

React takes care of updating the actual DOM.

## 9. Imperative vs Declarative

This distinction is extremely important for learning React.

- **Imperative** How to change the UI
- **Declarative** What the UI should look like

### Imperative

```javascript
const h1 = document.querySelector("#counter");

h1.textContent = count;
```

You're giving instructions:

```
Find element
↓
Change element
```

### Declarative

```javascript
<h1>{count}</h1>
```

You're describing the desired result:

```
State
↓
Desired UI
```

## 10. Where CSSOM Comes In

Browser has to also understand CSS. The browser creates a representation of the HTML, and it also parses the CSS into the CSSOM.

The browser combines information from DOM and CSSOM to determine what should actually be rendered.

Simlified browser pipeline:

```
HTML
  ↓
DOM
  │
  │
CSS
  ↓
CSSOM
  │
  └──────────────┐
                 ↓
            Render Tree
                 ↓
               Layout
                 ↓
                Paint
                 ↓
              Composite
                 ↓
               Screen
```

## 11. Why Frequent DOM Changes Can Matter

Suppose JS changes something

```javascript
element.style.width = "500px";
```

The browser may need to do additional work.

```
JavaScript
    ↓
DOM change
    ↓
Style calculation
    ↓
Layout
    ↓
Paint
    ↓
Composite
    ↓
Screen
```

> Although modern browser are optimized but **DOM changes can trigger additional browser rendering work, depending on what changed**.

## 12. So what was the actual problem?

The problem wasn't:

> ❌ "HTML DOM is slow"
> The more accurate problem was:
> **As applications became more complex, manually keeping application state synchronized with the DOM became difficult and error-prone.**

## 13. This is where React comes in

```
             Application State
                    ↓
              React Components
                    ↓
              Desired UI
                    ↓
          React determines changes
                    ↓
              Actual DOM
                    ↓
              Browser rendering
                    ↓
                  Screen
```

> **If React doesn't want me to manually manipulate the DOM, how does React figure out what DOM changes are actually necessary?**

That leads directly into:

```
Virtual DOM
     ↓
Reconciliation
     ↓
Diffing
     ↓
Fiber
```

# React Reconciliation — Algorithm & Time Complexity

Let:

```text
n = number of nodes in the React tree
```

## 1. What Problem Is React Solving?

After a state change, React has:

```text
Previous Tree          New Tree

    div                   div
   /   \                 /   \
  h1    ul               h1    ul
       /  \                   / | \
      li   li                 li li li
```

React needs to determine:

- Which nodes can be reused?
- Which nodes changed?
- Which nodes should be created?
- Which nodes should be removed?
- Which nodes moved?

This process is called **reconciliation**.

---

# 2. Naive Tree Comparison

A completely general tree-diff algorithm can be very expensive.

For arbitrary trees, the algorithm may need to consider:

```text
Possible node matches
        +
Possible subtree transformations
        +
Cost of comparing transformations
```

Conceptually:

```text
n nodes
  ×
n possible matches
  ×
n transformation/comparison work
  ↓
O(n³)
```

So a general tree-diff algorithm can have:

```text
O(n³)
```

worst-case complexity.

For a UI framework, doing this on every update would be too expensive.

---

# 3. React's Solution: Heuristics

React doesn't try to solve the general tree-diff problem.

It makes several assumptions.

## Rule 1: Different element types → Replace subtree

```jsx
<div>
  <Counter />
</div>
```

becomes:

```jsx
<span>
  <Counter />
</span>
```

React sees:

```text
div ≠ span
```

and effectively does:

```text
Delete old subtree
        +
Create new subtree
```

It doesn't search for an optimal transformation from `div` to `span`.

---

## Rule 2: Same element type → Reuse

```jsx
<div className="old">Hello</div>
```

becomes:

```jsx
<div className="new">Hello</div>
```

React sees:

```text
div == div
```

So it can reuse the existing DOM node.

It then compares:

```text
props
  ↓
children
```

Only the changed property needs to be updated.

---

## Rule 3: Keys Give List Items Identity

Consider:

```jsx
<li key="A">A</li>
<li key="B">B</li>
<li key="C">C</li>
```

After inserting `X`:

```jsx
<li key="X">X</li>
<li key="A">A</li>
<li key="B">B</li>
<li key="C">C</li>
```

The keys tell React:

```text
X → new
A → existing
B → existing
C → existing
```

So React can reuse the existing elements instead of treating everything as a completely new list.

---

# 4. Simplified Reconciliation Algorithm

Conceptually, React does something like:

```text
reconcile(oldNode, newNode)

        │
        ▼
Does old node exist?
   │              │
  NO             YES
   │              │
 CREATE       Does new node exist?
                  │
             ┌────┴────┐
            NO         YES
             │          │
           DELETE    Same type?
                       │
                 ┌─────┴─────┐
                NO          YES
                 │            │
              REPLACE       REUSE
                              │
                        Compare props
                              │
                        Compare children
```

For children:

```text
Old children
     +
New children
     ↓
Match using type/key
     ↓
 ┌───┼────┬─────┐
 ↓   ↓    ↓     ↓
Reuse Update Create Delete
```

This is a simplified model; the actual implementation uses **Fiber** and is more sophisticated.

---

# 5. Why React Can Approach O(n)

Because React makes the assumptions above, it doesn't explore every possible way of transforming one arbitrary tree into another.

Instead, it can generally process each relevant node once:

```text
n nodes
   ↓
Inspect node
   ↓
Compare type
   ↓
Compare props
   ↓
Reconcile children
   ↓
Continue
```

Conceptually:

```text
n nodes
  ×
constant amount of work per node
  ↓
O(n)
```

Therefore:

```text
General tree diff       → O(n³)
React reconciliation    → ≈ O(n)
```

> **React sacrifices the ability to find the mathematically optimal tree transformation in exchange for a much faster heuristic approach.**

---

# 6. Reconciliation ≠ DOM Updates

This distinction is important.

Suppose:

```text
React tree = 1,000 nodes
```

After a state change:

```text
1,000 nodes
     ↓
Reconciliation
     ↓
5 nodes actually changed
     ↓
5 DOM mutations
```

So:

```text
Reconciliation work ≈ O(n)

DOM mutations ≠ necessarily O(n)
```

React may inspect many nodes but ultimately make only a few actual DOM changes.

---

# 7. Complete Mental Model

```text
              State Change
                   │
                   ▼
           Component renders
                   │
                   ▼
          New React tree
                   │
                   │
        ┌──────────▼──────────┐
        │   Reconciliation    │
        │                     │
        │ Old tree vs New     │
        │ tree                │
        └──────────┬──────────┘
                   │
                   ▼
           Determine changes
                   │
                   ▼
              Commit phase
                   │
                   ▼
              Actual DOM
                   │
                   ▼
          Browser rendering
```

## Complexity to Remember

| Approach                | Complexity | Why                                            |
| ----------------------- | ---------: | ---------------------------------------------- |
| General/naive tree diff |  **O(n³)** | Explores many possible matches/transformations |
| React reconciliation    | **≈ O(n)** | Uses type, position, and keys as heuristics    |

### The one-line takeaway

> **Naive tree diff tries to solve a general tree transformation problem; React uses assumptions about UI structure to reduce reconciliation to approximately linear time.**

# Virtual DOM → Reconciliation → Fiber

We can now connect the three concepts together.

> **Virtual DOM describes the desired UI. Reconciliation determines what changed. Fiber provides the data structure and mechanism React uses to perform that work.**

---

# 1. Virtual DOM

The term **Virtual DOM** is commonly used to describe React's in-memory representation of the UI.

Consider:

```jsx
function App() {
  return (
    <div>
      <h1>Hello</h1>
      <button>Click</button>
    </div>
  );
}
```

JSX is transformed into React element objects conceptually similar to:

```javascript
{
    type: "div",
    props: {
        children: [
            {
                type: "h1",
                props: {
                    children: "Hello"
                }
            },
            {
                type: "button",
                props: {
                    children: "Click"
                }
            }
        ]
    }
}
```

So React has an in-memory description of:

```text
        div
       /   \
     h1   button
      |      |
   "Hello" "Click"
```

This is **not the actual DOM**.

---

# 2. Virtual DOM vs Actual DOM

The difference is:

```text
Virtual DOM / React representation

        div
       /   \
     h1   button
      |      |
   "Hello" "Click"


Actual DOM

        <div>
       /       \
    <h1>      <button>
   Hello       Click
```

The Virtual DOM is essentially React's **description of what the UI should look like**.

The browser's DOM is the **actual UI structure managed by the browser**.

---

# 3. What Happens After State Changes?

Suppose:

```jsx
<h1>{count}</h1>
```

Initially:

```text
count = 10
```

React has a representation equivalent to:

```text
div
└── h1
     └── "10"
```

Then:

```javascript
setCount(11);
```

React renders the component again and obtains a new representation:

```text
div
└── h1
     └── "11"
```

Now React has:

```text
Previous representation

div
└── h1
     └── "10"


New representation

div
└── h1
     └── "11"
```

Something needs to determine:

> **What actually changed?**

That's where **reconciliation** comes in.

---

# 4. Reconciliation

We already covered the reconciliation algorithm in detail in the previous section.

Refer to:

> **React Reconciliation — Algorithm & Time Complexity**

The key idea is:

```text
Old React tree
      +
New React tree
      ↓
Reconciliation
      ↓
Determine required changes
```

For example:

```text
Old:

div
└── h1
     └── "10"

New:

div
└── h1
     └── "11"
```

Reconciliation determines:

```text
div       → same
h1        → same
text      → changed

Therefore:
UPDATE text
```

So React doesn't need to recreate:

```text
div
h1
```

It only needs to update the text.

---

# 5. Where Fiber Enters

Here's the important connection.

The React element tree is not itself the structure React uses to perform all of its work.

React creates **Fiber nodes** representing the work associated with those elements.

Conceptually:

```text
React Element Tree

        App
         │
        div
       /   \
     h1   button
```

becomes a Fiber structure:

```text
Fiber Tree

       Fiber(App)
           │
        Fiber(div)
           │
        child
         / \
      Fiber  Fiber
       h1    button
```

The Fiber nodes contain information React needs while rendering and reconciling.

---

# 6. A Fiber Node

A simplified Fiber object looks like:

```javascript
{
    type: "div",

    child: ...,
    sibling: ...,
    return: ...,

    pendingProps: ...,
    memoizedProps: ...,
    memoizedState: ...,

    flags: ...,

    alternate: ...
}
```

You don't need to memorize all of these yet.

The most important ones are:

| Field       | Purpose                                |
| ----------- | -------------------------------------- |
| `type`      | What this Fiber represents             |
| `key`       | Identity among siblings                |
| `child`     | First child                            |
| `sibling`   | Next sibling                           |
| `return`    | Parent                                 |
| `alternate` | Corresponding Fiber in the other tree  |
| `flags`     | Work/changes that need to be committed |

---

# 7. Fiber's Tree Structure

Consider:

```jsx
<div>
  <h1>Hello</h1>
  <p>Welcome</p>
</div>
```

Conceptually:

```text
             div
              │
            child
              ↓
             h1
              │
           sibling
              ↓
              p
```

The important relationships are:

```text
child
sibling
return
```

So:

```text
       div
        │
      child
        ↓
       h1 ──────→ p
        ↑
      return
        │
       div
```

This structure allows React to traverse the Fiber tree efficiently.

---

# 8. Why Does React Need Fiber?

This is the most important reason:

> **Fiber allows React to break rendering work into smaller units that can be scheduled, paused, resumed, or abandoned.**

Imagine a large application:

```text
App
├── Header
├── Sidebar
├── Main
│   ├── User
│   ├── Products
│   │   ├── Product
│   │   ├── Product
│   │   └── Product
│   └── ...
└── Footer
```

Instead of treating rendering as one giant operation:

```text
Render everything
        ↓
Finish
```

Fiber allows React to conceptually process:

```text
Fiber 1
   ↓
Fiber 2
   ↓
Fiber 3
   ↓
Pause if necessary
   ↓
Resume
   ↓
Fiber 4
   ↓
...
```

This gives React much more control over rendering work.

---

# 9. Current Fiber and Work-in-Progress Fiber

This is another key Fiber concept.

React maintains a relationship between:

```text
Current Tree
```

and:

```text
Work-in-Progress Tree
```

For example:

```text
Current

App
└── Counter = 10
```

After:

```javascript
setCount(11);
```

React can work toward:

```text
Work-in-Progress

App
└── Counter = 11
```

Conceptually:

```text
        Current Tree
             ↕
        alternate
             ↕
    Work-in-Progress Tree
```

The `alternate` field connects corresponding Fiber nodes.

---

# 10. Why Two Trees?

React doesn't immediately destroy the current representation.

It can build the next version separately:

```text
Current                 Work-in-Progress

Counter = 10            Counter = 11
     │                        │
     └───────── ↔ ───────────┘
             alternate
```

Once React has completed the necessary work:

```text
Work-in-Progress
       ↓
    Commit
       ↓
Becomes Current
```

---

# 11. Render Phase

During the **render phase**, React performs work such as:

```text
State update
     ↓
Create/reuse Fiber nodes
     ↓
Reconcile children
     ↓
Determine changes
     ↓
Build Work-in-Progress tree
```

Conceptually:

```text
State
 ↓
New React elements
 ↓
Fiber work
 ↓
Reconciliation
 ↓
Work-in-Progress tree
```

The render phase is designed to be **interruptible**.

---

# 12. Commit Phase

Once React knows what needs to change:

```text
Work-in-Progress tree
        ↓
    Commit phase
        ↓
Actual DOM mutations
```

For example:

```text
Virtual representation:

<h1>10</h1>

        ↓ reconciliation

<h1>11</h1>

        ↓ commit

Actual DOM:
<h1>11</h1>
```

The commit phase is different from the render phase because React needs to apply the resulting changes consistently.

---

# 13. Putting Everything Together

This is the complete picture:

```text
                    State Update
                         │
                         ▼
                 React Component
                         │
                         ▼
                React Elements
                (Virtual DOM)
                         │
                         ▼
               Work-in-Progress
                  Fiber Tree
                         │
                         ▼
                 Reconciliation
                 ──────────────
                 Compare old
                 and new trees
                         │
                         ▼
                 Determine changes
                         │
                         ▼
                  Render Phase
                         │
                         ▼
                  Commit Phase
                         │
                         ▼
                    Actual DOM
                         │
                         ▼
                      Browser
```

---

# 14. The Three Concepts in One Sentence

| Concept            | Think of it as                                      |
| ------------------ | --------------------------------------------------- |
| **Virtual DOM**    | **What should the UI look like?**                   |
| **Reconciliation** | **What changed?**                                   |
| **Fiber**          | **How does React represent and process that work?** |

Or even simpler:

```text
Virtual DOM
     ↓
Desired UI

Reconciliation
     ↓
Required changes

Fiber
     ↓
Unit of work + scheduling mechanism
```

## The mental model to retain

```text
State
  ↓
Virtual DOM / React Elements
  ↓
Fiber
  ↓
Reconciliation
  ↓
Work-in-Progress Fiber Tree
  ↓
Commit
  ↓
Actual DOM
```

**One important correction to the common explanation:** the "Virtual DOM" isn't a single separate DOM tree that React simply compares against the browser DOM. In modern React, **React elements and the Fiber tree are the more precise concepts**. "Virtual DOM" is useful shorthand for React's in-memory UI representation.

# From Virtual DOM to Fiber: What Actually Changed?

Yes — but there is one important timeline correction first:

> **Fiber did not replace the Virtual DOM in 2018.**
> Fiber was introduced as a **new reconciliation architecture** in React 16, released in **September 2017**. The Virtual DOM/React element model remained. ([React][1])

Then, in **React 18 (2022)**, Fiber became the foundation for **concurrent rendering**, where rendering work can actually be interrupted and resumed. ([React][2])

So the evolution is better understood as:

```text
React 15 and earlier
        ↓
React Element / Virtual DOM
        ↓
Stack Reconciler
        ↓
────────────────────────────
React 16 — 2017
        ↓
React Element / Virtual DOM
        ↓
Fiber Reconciler
        ↓
────────────────────────────
React 18 — 2022
        ↓
Fiber + Concurrent Rendering
```

---

# 1. Before Fiber: Stack Reconciler

Before React 16, React used what is commonly called the **Stack Reconciler**.

Imagine this component tree:

```text
App
├── Header
├── Main
│   ├── Profile
│   └── Products
│       ├── Product
│       ├── Product
│       └── Product
└── Footer
```

React would essentially process it recursively:

```text
App
 ↓
Header
 ↓
Main
 ↓
Profile
 ↓
Products
 ↓
Product
 ↓
Product
 ↓
Product
 ↓
Footer
```

Conceptually:

```javascript
function reconcile(node) {
  reconcile(node.child);
  reconcile(node.sibling);
}
```

The important problem wasn't necessarily the algorithmic complexity.

The problem was **scheduling**.

Once this JavaScript work started, it was essentially one continuous synchronous operation.

```text
┌──────────────────────────────────────┐
│          React rendering             │
│                                      │
│ App → Main → Products → Product...   │
│                                      │
│         CANNOT PAUSE EASILY          │
└──────────────────────────────────────┘
```

If the tree was large, this could occupy the main JavaScript thread while the browser also needed to respond to user interactions.

---

# 2. Why Was This a Problem?

Remember that the browser has one main JavaScript thread where React's JavaScript work runs.

Imagine React has a large update:

```text
React rendering
████████████████████████████████
```

At the same time, the user:

```text
Clicks
Types
Scrolls
Moves mouse
```

The browser wants to respond:

```text
User input → Browser/JS thread
```

But React is busy:

```text
React
████████████████████████████████
                  ↑
             JS thread busy
```

This could result in a less responsive UI.

---

# 3. What Fiber Changed

Fiber changed **how React represents and performs rendering work**.

Instead of thinking:

```text
"Render this entire tree recursively."
```

React can think:

```text
"This Fiber is one unit of work."
```

For example:

```text
App
 ↓
Header
 ↓
Main
 ↓
Profile
 ↓
Products
 ↓
Product 1
 ↓
Product 2
 ↓
Product 3
```

becomes units of work:

```text
[Fiber App]
     ↓
[Fiber Header]
     ↓
[Fiber Main]
     ↓
[Fiber Profile]
     ↓
[Fiber Products]
     ↓
[Fiber Product 1]
     ↓
[Fiber Product 2]
     ↓
[Fiber Product 3]
```

Now React has something it can reason about individually:

> **"I have completed this unit of work; what's next?"**

---

# 4. Why the Name "Fiber"?

Think of a Fiber as a **small unit of rendering work**.

Instead of:

```text
ONE BIG TASK

Render entire application
████████████████████████████
```

React can conceptually break it down:

```text
SMALLER WORK UNITS

Fiber 1 ███
Fiber 2 ███
Fiber 3 ███
Fiber 4 ███
Fiber 5 ███
```

This gives React the ability to make decisions about **when and in what order work should happen**.

---

# 5. Fiber Is a Data Structure

This is an important distinction.

Fiber isn't just an algorithm.

A Fiber is an actual internal data structure containing information such as:

```javascript
{
    type,
    key,

    child,
    sibling,
    return,

    pendingProps,
    memoizedProps,
    memoizedState,

    flags,

    alternate
}
```

So:

```text
Fiber
  ↓
Data structure representing a unit of React work
```

And the collection of these Fibers forms the:

```text
Fiber Tree
```

---

# 6. Virtual DOM Didn't Disappear

This is where many explanations become confusing.

It is **not**:

```text
Virtual DOM
     ↓
Fiber
```

as if Fiber replaced Virtual DOM.

Instead:

```text
React Elements
      ↓
Fiber Tree
      ↓
Actual DOM
```

The term **Virtual DOM** is still useful as a high-level description of React's in-memory representation of UI.

But internally, modern React works with **Fibers**.

A more precise model is:

```text
JSX
 ↓
React Elements
 ↓
Fiber Tree
 ↓
Reconciliation
 ↓
DOM changes
 ↓
Actual DOM
```

---

# 7. React 16: Fiber Arrives

React 16 was released in **September 2017** and introduced the new Fiber architecture. ([React][1])

The important change was:

```text
Before React 16

React Elements
      ↓
Stack Reconciler
      ↓
DOM


React 16+

React Elements
      ↓
Fiber Reconciler
      ↓
Fiber Tree
      ↓
DOM
```

The **UI programming model didn't fundamentally change** for developers.

You still wrote:

```jsx
function App() {
  return <h1>Hello</h1>;
}
```

But internally, React had a much more powerful way of organizing rendering work.

---

# 8. Fiber Enables Interruptible Work

This is probably the most important concept.

Suppose React is processing:

```text
Fiber A
 ↓
Fiber B
 ↓
Fiber C
 ↓
Fiber D
 ↓
Fiber E
```

Fiber allows React's architecture to support:

```text
A
↓
B
↓
C
↓
PAUSE
```

Then potentially:

```text
Browser handles important work
        ↓
React resumes
        ↓
D
↓
E
```

Conceptually:

```text
React Work
───────────────
A → B → C

             PAUSE
               ↓
       Browser gets time
               ↓
             RESUME
               ↓

D → E → F
```

This is the fundamental capability Fiber was designed to enable.

---

# 9. But There's an Important Timeline Detail

Fiber **enabled** this architecture in React 16.

But don't say:

> "React 16 automatically became concurrent."

That's incorrect.

For a long time, React could use Fiber while rendering synchronously.

The major concurrency features became available with **Concurrent React in React 18**. ([React][2])

So:

```text
React 16
Fiber architecture
        ↓
Foundation for scheduling/interruptible work


React 18
Concurrent rendering
        ↓
Actually use that capability for
interruptible rendering
```

---

# 10. React 18: Concurrent Rendering

React 18 introduced the **concurrent renderer** and features such as:

```text
startTransition
useTransition
useDeferredValue
```

These allow React to distinguish between urgent and non-urgent work. ([React][2])

For example:

```text
User typing
    ↓
URGENT
    ↓
Do immediately
```

while:

```text
Rendering a huge search result list
    ↓
NON-URGENT
    ↓
Can be interrupted
```

Conceptually:

```text
User types "R"
      ↓
Input update
      ↓
URGENT
      ↓
Render immediately

Meanwhile:

Search results
██████████████████
      ↓
Can be interrupted
```

This is one of the major things Fiber's architecture made possible.

---

# 11. Why This Is Called "Concurrent"

It doesn't necessarily mean:

```text
Two JavaScript threads
```

That's a common misconception.

React's concurrent rendering is about **being able to work on multiple versions/priorities of UI and interrupt rendering**, while keeping the final UI consistent. ([React][2])

Conceptually:

```text
               React
                 │
        ┌────────┴────────┐
        ↓                 ↓
   Urgent work       Non-urgent work
        │                 │
        ↓                 ↓
    Execute first    Pause/resume
```

---

# 12. Fiber + Reconciliation

Now connect this with what we learned earlier.

You already know:

```text
Old Tree
   +
New Tree
   ↓
Reconciliation
   ↓
Determine changes
```

Fiber provides the structure in which React performs that work.

So:

```text
React Elements
      ↓
Fiber Tree
      ↓
Reconciliation
      ↓
Work-in-progress Fiber Tree
      ↓
Commit
      ↓
DOM
```

The reconciliation algorithm hasn't disappeared.

**Fiber is the architecture/data structure used to perform and schedule that work.**

---

# 13. Render vs Commit

Fiber also makes it useful to distinguish two major phases.

## Render phase

React:

```text
State update
     ↓
Create/reuse Fibers
     ↓
Reconcile
     ↓
Calculate changes
```

This work can be interrupted in concurrent rendering.

```text
Render
  ↓
Pause
  ↓
Resume
  ↓
Finish
```

## Commit phase

Once React has finished calculating:

```text
Changes
   ↓
Commit
   ↓
DOM mutations
```

React applies the necessary DOM changes.

React's documentation describes this high-level process as **trigger → render → commit**, with DOM changes applied during commit. ([React][3])

---

# 14. The Evolution in One Diagram

This is probably the most useful diagram to remember:

```text
                  REACT EVOLUTION

React 15 and earlier
─────────────────────

JSX
 ↓
React Elements
 ↓
Virtual DOM concept
 ↓
Stack Reconciler
 ↓
Actual DOM


React 16+
─────────────────────

JSX
 ↓
React Elements
 ↓
Fiber Tree
 ↓
Fiber Reconciler
 ↓
Actual DOM


React 18+
─────────────────────

JSX
 ↓
React Elements
 ↓
Fiber Tree
 ↓
Concurrent Rendering
 │
 ├── Priorities
 ├── Interruptible rendering
 ├── Transitions
 └── Deferred work
 ↓
Commit
 ↓
Actual DOM
```

---

# 15. The Most Important Correction to Your Mental Model

Don't think:

```text
Virtual DOM → Fiber
```

as if React replaced one technology with another.

Think:

```text
Virtual DOM
   │
   │ high-level concept:
   │ "in-memory representation of UI"
   ↓
React Elements
   ↓
Fiber
   │
   │ internal data structure
   │ + reconciliation
   │ + scheduling
   ↓
Actual DOM
```

Or even more simply:

| Concept                  | Purpose                                                 |
| ------------------------ | ------------------------------------------------------- |
| **React Elements**       | Describe what UI should look like                       |
| **Virtual DOM**          | High-level term for React's in-memory UI representation |
| **Reconciliation**       | Determines what changed                                 |
| **Fiber**                | Data structure + architecture for processing that work  |
| **Concurrent rendering** | Allows rendering work to be prioritized/interrupted     |
| **Commit**               | Applies changes to the actual DOM                       |

### The key historical progression

> **React 16 (2017) introduced Fiber as a replacement for the old Stack Reconciler. React 18 (2022) built concurrent rendering capabilities on top of that architecture.** ([React][1])

So if you're learning React today, the clean mental model is:

```text
JSX
 ↓
React Elements
 ↓
Fiber Tree
 ↓
Reconciliation
 ↓
Render Phase
 ↓
Commit Phase
 ↓
Actual DOM
```

And **Fiber is the bridge between React's declarative UI description and the actual work React performs to update the DOM.**

[1]: https://react.dev/versions?utm_source=chatgpt.com "React Versions – React"
[2]: https://react.dev/blog/2022/03/29/react-v18?utm_source=chatgpt.com "React v18.0 – React"
[3]: https://react.dev/learn/render-and-commit?utm_source=chatgpt.com "Render and Commit – React"

> "React maintains an in-memory representation of the UI. When state changes, React produces a new element tree and reconciles it against the previous one. Fiber provides the data structure and architecture for processing that work, while the commit phase applies the necessary DOM mutations."

```
- Why does React re-render?
- What actually happens after setState?
- What is reconciliation?
- Why are keys important?
- Why can a component re-render without its DOM changing?
- What is Fiber?
- What happens during render vs commit?
- How does React prioritize work?
- What does concurrent rendering actually mean?
- Why can React interrupt rendering?
- How would you diagnose unnecessary renders?
- When would memo, useMemo, or useCallback actually help?
```

**HMR (Hot Module Replacement)** is a development feature that lets tools like Vite or Webpack update only the changed code in your running application **without doing a full browser reload**. In React, **Fast Refresh** builds on this to often preserve component state while you edit code. It mainly improves the developer experience and isn't a core React concept you need to deeply understand for interviews.

# React Fiber — Study Notes

## Problem it Solves

Before Fiber (React ≤15), reconciliation was a recursive walk over the whole component tree, using the JS call stack. This walk was synchronous and couldn't be paused — once React started diffing and updating, it ran to completion. For large trees, this could block the main thread long enough to drop frames or delay user input (typing, clicks) from being handled. Fiber restructures this so React's own state machine can pause work, do something else, and resume later.

## Mechanism

A _fiber_ is one JS object per element/component instance. Each fiber holds pointers to its `child`, `sibling`, and `return` (parent) — a linked-list-style tree, instead of relying on the call stack to represent "where am I in the tree."

\```
fiber = {
type, // e.g. "div", "h1", or a component function
props, // current props for this fiber
dom, // the real DOM node this fiber owns (or null until created)
child, // pointer to first child fiber
sibling, // pointer to next sibling fiber
return, // pointer to parent fiber
alternate, // pointer to this same fiber from the PREVIOUS render
effectTag, // PLACEMENT | UPDATE | DELETION — what to do in commit
}
\```

Two trees exist at once:

- `currentRoot` — the fiber tree matching what's on screen right now.
- `wipRoot` ("work in progress") — the new tree being built for the incoming render, linked back to `currentRoot` via `alternate`.

Work happens in **units**. `performUnitOfWork(fiber)` processes exactly one fiber, then returns the next one to visit:

\```
performUnitOfWork(fiber):
if fiber.dom is null: fiber.dom = createDom(fiber)
reconcileChildren(fiber, fiber.props.children) // builds this fiber's child fibers
if fiber.child exists: return fiber.child
walk up via fiber.return, returning the first sibling found
return null when back at the root
\```

Because each call only does one fiber's worth of work and returns, a scheduler can call this in a loop and check `deadline.timeRemaining()` between calls — yielding back to the browser if time runs out, resuming from `nextUnitOfWork` later:

\```
workLoop(deadline):
while nextUnitOfWork and deadline.timeRemaining() > 0:
nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
if nextUnitOfWork is null and wipRoot exists:
commitRoot()
requestIdleCallback(workLoop) // schedule the next chunk
\```

**Reconciliation (the diff)** happens inside `reconcileChildren`, comparing each new element against the corresponding fiber from the _old_ tree (`oldFiber`, reached through `alternate`):

\```
for each (element, oldFiber) pair:
same type? -> effectTag = UPDATE (reuse oldFiber.dom, patch props)
different type? -> effectTag = PLACEMENT (new element), DELETION (old fiber)
only in new tree? -> effectTag = PLACEMENT
only in old tree? -> effectTag = DELETION
\```

`argmin`-style comparison here is really just `element.type === oldFiber.type` (React also factors in `key` for list items, so items can be matched by identity even if their position shifts).

Once the whole `wipRoot` tree is built (all effect tags assigned), **commit** runs — synchronously, no yielding — walking the tree and applying `appendChild` / `removeChild` / patched-attributes to the real DOM based on each fiber's `effectTag`. After commit, `currentRoot = wipRoot`, and the next render will diff against this new tree.

## Render Phase vs Commit Phase

|                    | Render phase                             | Commit phase                   |
| ------------------ | ---------------------------------------- | ------------------------------ |
| What it does       | Builds fiber tree, assigns effectTags    | Applies effectTags to real DOM |
| Touches the DOM?   | No                                       | Yes                            |
| Interruptible?     | Yes                                      | No — runs straight through     |
| Functions involved | `performUnitOfWork`, `reconcileChildren` | `commitRoot`, `commitWork`     |

## vs Pre-Fiber (Stack Reconciler)

|                | Stack Reconciler (React ≤15)         | Fiber (React 16+)                                         |
| -------------- | ------------------------------------ | --------------------------------------------------------- |
| Traversal      | Recursive, uses JS call stack        | Iterative, uses `child`/`sibling`/`return` pointers       |
| Interruptible  | No — runs to completion once started | Yes — can pause/resume between fibers                     |
| Priority       | All updates treated equally          | Can assign priority (e.g. user input > background render) |
| Data structure | Implicit (call stack)                | Explicit fiber tree (`alternate` = old vs new)            |

## Interview Soundbite

> Fiber is React's internal data structure and reconciliation architecture — each component becomes a fiber node linked via child/sibling/return pointers instead of the call stack, so React can pause rendering mid-tree, do a diff against the previous fiber tree (via `alternate`), and only commit the DOM changes (placement/update/deletion) that are actually needed, all without blocking the main thread.

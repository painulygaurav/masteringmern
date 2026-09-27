# Notes: React Props — Passing Data Between Components

## What Are Props

"Props" (short for _properties_) are how a **parent component passes data down to a child component** — conceptually similar to function arguments, except the "function call" is JSX itself.

```jsx
// App.jsx (parent)
<Card fullname="Gaurav Painuly" salary="300000" age={37} />
```

Each attribute on the JSX tag (`fullname`, `salary`, `age`) becomes a key on the `props` object the child receives. String values can be written directly in quotes; anything that isn't a plain string (numbers, expressions, objects, functions) needs curly braces — hence `age={37}`, not `age="37"`.

## Receiving Props in the Child

```jsx
// Card.jsx (child)
const Card = (props) => {
  return (
    <div>
      <h2>Name: {props.fullname}</h2>
      <h2>Salary: {props.salary}</h2>
    </div>
  );
};
```

Or, more commonly, using **object destructuring** directly in the function's parameter list — pulling out only the specific fields you actually need:

```jsx
const Card = ({ fullname, salary }) => {
  return (
    <div>
      <h2>Name: {fullname}</h2>
      <h2>Salary: {salary}</h2>
    </div>
  );
};
```

This is especially useful when a component receives more data than it needs — a very common situation when props originate from an API response with many fields, most of which a given component doesn't care about. Destructuring lets you cherry-pick just `fullname` and `salary` while `age` simply passes through unused, with no need to explicitly ignore it.

## Reusability — the Whole Point of Props

Because `Card` reads its data from props rather than hardcoding values, the same component definition can be reused with different data for each instance:

```jsx
<Card fullname="Gaurav Painuly" salary="300000" age={37} />
<Card fullname="Shekhar Painuly" salary="300000" age={38} />
```

Each `<Card />` here is an independent instance with its own props — this is the core mechanism that makes components composable building blocks rather than one-off pieces of markup.

## Props Flow One Way: Parent → Child

This is worth stating precisely: **props only flow downward**, from parent to child. A child never directly "reaches up" and modifies or reads a parent's data — there's no built-in mechanism for that.

What _can_ happen — and what you're about to explore next — is the parent passing a **function** down as a prop. The child then calls that function (e.g. on a button click), and the function itself (defined in the parent) updates the parent's own state. From the child's point of view, it's just calling a prop like any other; the actual state change happens in the parent. This pattern is called **"lifting state up"** — state that multiple components need to share is kept in their closest common parent, with child components notifying the parent via callback props rather than owning that state themselves. It isn't the parent "inheriting" from the child — it's the reverse in a sense: the _child_ is handed a capability (a function) _by_ the parent, and uses it to trigger a change the parent controls.

## Props Are Read-Only

A component must never modify the props it receives (e.g. `props.salary = 500000` inside `Card` is not allowed). Props are owned by the parent that passed them; a child only reads them. If a child needs to change a value, that value has to actually live as **state**, either in the child itself, or lifted up to a shared parent, as above.

## Separation of Concerns: JavaScript vs React

Plain JavaScript and React are two distinct layers with a clean boundary between them: your JS logic computes and holds data, and React is the layer that takes the _current_ value of that data and reflects it in the UI. React doesn't automatically know when a plain JS variable changes — updating an ordinary variable does nothing to the screen. The UI only re-renders when React is explicitly told a piece of _state_ changed (via a state setter function) — that's the trigger that bridges "JS logic changed" to "UI updates."

## Class Components and the Component Lifecycle (CLC)

Before hooks existed, **class components** were the only way to give a component behavior beyond "receive props, return JSX" — specifically, the ability to run code at specific moments in a component's existence, known as the **lifecycle**:

| Phase   | What it means                                                     | Class method         |
| ------- | ----------------------------------------------------------------- | -------------------- |
| Mount   | Component is created and inserted into the DOM for the first time | `componentDidMount`  |
| Update  | Component re-renders due to new props or state                    | `componentDidUpdate` |
| Unmount | Component is removed                                              |

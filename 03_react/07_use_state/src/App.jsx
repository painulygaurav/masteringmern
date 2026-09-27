import { useState } from "react";
const App = () => {
  // [stateYouwanttodeliver, functiontoexecute] = useState(0)
  const [count, setCount] = useState(0); // count will be initialized with 0
  const handleClick = () => {
    setCount((count) => count + 1); // increase count in JS and update dom and the whole page will not be reloaded it will just cut that part of the node in this case count and update that. That's the beauty of React. It's amputation and replacement
    // but how did it find only the count part in the dom?
  };
  // now when I click the button it will amputate and replace the only part that will need to be updated and the whole website will not be reloaded
  return (
    // in the following code although the count value is being updated in JavaScript but it is not reflecting in the DOM
    // how we deliver this value to DOM and that is where hooks come into the picture
    // First you need to import useState from react
    <div>
      <h2>The value of count: {count}</h2>
      <button onClick={handleClick}>Increase</button>
    </div>
  );
};

export default App;

// Types of Hooks
// logical (general) hooks
// memoization hooks
// performance hooks

// how is hooks better than Component Lifecycle (CLC)?
// You don't have to go with Class based CLC rather you can use Hooks which has much simpler syntax.
// Hooks functions are like wrapper function and you just have to pass your logic
// Hooks are defined at the top of the document, and they are like middleware. They act as a middleware between JS and DOM.
// All the hooks functions will start with "use" like "useState"
// "use" perfix tells babel transpiler that this is a hook, they will be treated as high priority functions
// Here are two most useful hooks: useState, and useEffect and using these two hooks you can create custom hooks.
// Here is how Hooks work. Your logic (JS) and DOM doesn't have any way to communicate.
// Hooks like a transportation service that will take all the state updates from JS to DOM
// here state doesn't update the value in DOM rather it delivers the value to a gate till DOM and knocks on the DOM gate to reload it
// useState works similarly it delivers the state updates to component and tells component to reload
// That brings us to conclusion. A "useState" hook will have two responsibility first is state, and second one is the setState (function that will do the reload and update the DOM)
//

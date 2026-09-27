import { useState } from "react";
import { userState } from "react";
const App = () => {
  const [count, setCount] = useState(0);
  const handleClick = () => {
    setCount(count + 1);
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

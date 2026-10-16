import { useState, useMemo, useCallback } from "react";
import Child from "./Child";

const App = () => {
  const [count, setCount] = useState(0);
  const handleClick = () => {
    setCount((count) => count + 1);
  };

  const [count1, setCount1] = useState(0);
  const handleClick1 = () => {
    setCount1((count1) => count1 + 1);
  };

  const sayHi = () => {
    console.log("Say Hi");
  };

  const sayHi1 = useCallback(() => sayHi(), []);

  // this function performs an expensive calculation but makes the application slow to render
  const calculate = () => {
    let sum = 0;
    for (let i = 1; i <= 1000000000; i++) {
      sum += i;
    }
    return sum;
  };

  /**const result = calculate();
   * This line is going to cause a performance issue because of the expensive calculation.
   * We can solve this using useMemo. With useMemo I am going to return calculate and give an empty array that will tell this to run only once
   * for the first render.
   *
   * How does this work internally?
   */
  const result = useMemo(() => calculate(), []);
  // Here we have a "Child" component that may have an expensive call but without memo it will keep on re-rendered every time state changes.
  // for this we'll memoize the whole component itself
  // There are two methods. first one is "React.memo" second one is "memo" hook
  // How does this work internally?

  // In the below code with just count1 in the props the child component will be rendered only when count1 is changing and it gives the expected
  // behavior, but let's include a function object in the props in Child
  // Now I have added a sayHi props that holds the reference to a function and because function is a first class citizen so it can assigned to a
  // prop and but every time the Counter is clicked App.jsx will re-render and it will create a new function object for sayHi and that will be
  // considered a change in the props. Now even if you have memoized the child component still it will re-render the child unintentionally
  // Here we can use a hook called useCallback
  // Now I created a variable sayHi1 that uses useCallback and freezes the function. It sees if the definition of the function doesn't change then
  // It is going to use the same memory address for that function object
  // How does it work internally? and When it will change? is this controlled through the dependency array in the useCallback?
  return (
    <div>
      <div>
        <h1>Expensive calculation result: {result}</h1>
        <h1>Count: {count}</h1>
        <button onClick={handleClick}>Counter</button>
      </div>
      <div>
        <button onClick={handleClick1}>Child Counter</button>
        <Child count1={count1} sayHi={sayHi1} />
      </div>
    </div>
  );
};

export default App;

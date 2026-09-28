import { useState, useRef, useEffect } from "react";
const App = () => {
  const [count, setCount] = useState(0);
  const ref = useRef(0);
  const ref1 = useRef(); // What is the meaning of empty ref
  // State vs Variables
  // let randomVar = 0;
  // let's now target dom
  useEffect(() => {
    console.log(ref1.current); // This now holds the reference of h1 and you can manipulate the DOM
    // but what does ref1 holds. Is it a fiber node?
    ref1.current.style.color = "red";
  });
  const handleClick = () => {
    setCount((prev) => prev + 1);
    // Here this random variable will always be one because whenever the component re-render it will initialize the randomVar to 0 but that is not the case with count which is in the internal storage of the component as fiber.<forgot the word>. Count is being updated even after every re-render.

    // We can use useRef to fix this
    // randomVar = randomVar + 1;
    // console.log("Random variable: " + randomVar);
    // console.log(ref);
    /**
     * output: 
     * {current: 0}
        current: 0
        [[Prototype]]: Object
     */
    // ref.current = ref.current + 1;
    // console.log(ref.current);
    // How the useRef is doing this? please explain
  };
  return (
    <div>
      <h1 ref={ref1}>Count:{count}</h1>
      <button onClick={handleClick}>Change</button>
    </div>
  );
};
export default App;

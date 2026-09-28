import { useLayoutEffect, useState } from "react";
import { useEffect } from "react";
const App = () => {
  const [count, setCount] = useState(0);
  const handleClick = () => {
    setCount((prev) => prev + 1);
  };
  // Let's introduce a problem. The following code is simulating an expensive API call
  // Whenever I click the button the Expensive API call is taking place and unknowingly my client is paying a lot of money.
  // How do I stop it? That is where useEffect comes into picture
  /*
  Without useEffect the following line will incurr cost unknowingly
  console.log("Expensive API call");
  */

  // Let's solve the cost with useEffect(func, [dependency])
  // But first time it will run because the component will be mounted
  // without dependency the function behaves like a normal function and gets called
  // with empty array as the dependency it runs only at the time of first rendering
  // with variable in the array it changes as the state changes
  // useEffect(() => {
  //   console.log("Expensive API call");
  // }, []);

  //useEffect will run as a sideeffect and will not hinder the execution of index.html but it will only run after the rendeing is completed not before
  // useEffect(() => {
  //   console.log("Expensive API call");
  // }, [count]);

  // but there is a problem, what will you do if you need to calculate DOM height upfront before DOM gets rendered so in that case useEffect seems to be of no use
  // that is where performance enhancing hooks comes into picture and the first one is useLayoutEffect
  // Since useLayoutEffect runs before brower repaints the screen
  // but how is it a performance enhancing hook?
  // useLayoutEffect(() => {
  //   setTimeout(() => {}, 5000);
  // });

  // Now let's revisit the CLC
  useEffect(() => {
    console.log("Component mounted");
  }, []);
  useEffect(() => {
    console.log("Component updated");
    // Let's add a cleanup function
    // This will run after every update
    return () => {
      console.log("Component unmounted");
    };
  }, [count]);
  return (
    <div>
      <h1>Count:{count}</h1>
      <button onClick={handleClick}>Increase</button>
    </div>
  );
};
export default App;

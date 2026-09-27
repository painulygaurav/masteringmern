import { useEffect } from "react";

const App = () => {
  // following code will give this error
  // TypeError: Cannot read properties of null (reading 'addEventListener')
  //at App (App.jsx:3:7) because we are trying to access the btn before it is created
  // So how can I add event to this button
  // the idea is the button should come first and it's event is it's side effect that should come later
  // This is where hooks can help
  // This code should asynchronously parsed that's where hooks comes into the picture
  /*
  const btn = document.getElementById("btn");
  btn.addEventListener("click", () => {
    alert("button is clicked");
  });*/

  // Now attaching the above code inside a hook
  // how asynchronous batching happens in useEffect
  // it stops the code inside it till the time button is painted
  // useEffect(() => {
  //   const btn = document.getElementById("btn");
  //   btn.addEventListener("click", () => {
  //     alert("button is clicked");
  //   });
  // }, []);

  // but there is another aspect react says don't add eventlistener to the button rather add a synthetic event to your element and I'll call it when the event is triggered
  const handleClick = (event) => {
    console.log("event was " + event.type);
    console.log("event target was " + event.target);
    console.log("event value was", event.currentTarget);
  };

  // event with arguments
  const handleGreet = (name) => {
    console.log("name=" + name);
  };

  // this phenomena was called synthetic event
  // What is difference between synthetic event and traditional events in JS?
  return (
    // <div>
    //   <button id="btn">Click me</button>
    // </div>
    // <div>
    //   <button onClick={() => handleGreet("Gaurav")}>Click me</button>
    // </div>
    // with event object
    <div>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
};

export default App;

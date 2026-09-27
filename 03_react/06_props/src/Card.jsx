const Card = ({ fullname, salary }) => {
  //console.log(props);
  return (
    <div>
      <h2>Name:{fullname}</h2>
      <h2>Salary:{salary}</h2>
    </div>
  );
};

export default Card;

// To make this Card reusable we can use props
// next thing is we will somehow pass data from Card to App (kind of child to parent)

// JS handles logic and React handles UI it takes the updated state from JS and updates on the UI

// What if I don't want this value to be updated automatically.

// Here there is no relation between JS an React both has separation of concern
// If you want to have a sync between JS and React we had a class component
// Component had a lifecycle also known as CLC: Component Lifecycle
// Initialize, Mount, update, unmount
// When we shift to functional based approach we inherited Hooks
// More about this shift and why it took place?
// What are hooks in React?
// Hooks are kind of wrapper function that perform certain tasks?
// Hooks are called the top of the application?
// Hooks sit between JS and React
// Hooks like useState, useEffect
// Babel identifies Hooks from "use" keyword
// no connection between JS and DOM
// useState is used for this it takes the state to DOM and it will update the DOM

import Card from "./Card";
const App = () => {
  return (
    // fullname and salary are being passed from parent App.jsx to Child Card.jsx
    // I need to handle these values
    <div>
      <Card fullname="Gaurav Painuly" salary="300000" age={37} />
      <Card fullname="Shekhar Painuly" salary="300000" age={38} />
    </div>
  );
};

export default App;

// Here Parent also inherits from it's Child. it's called State uplifting in React.

// Let's now add age as well but we won't use it in the App.jsx. This is an example of receiving a lot of useless information receiving from an API. So for that we can
// use object destructuring

import UseCustom from "./UseCustom";

const App = () => {
  const [data] = UseCustom("https://dummyjson.com/products"); // Why we need to accept the data from custom hook in this way?
  console.log(data);
  return <div>App</div>;
};

export default App;

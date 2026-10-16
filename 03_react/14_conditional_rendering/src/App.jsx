import Home from "./Home";
import Login from "./Login";

const App = () => {
  let isLoggedin = false;

  return <div>{isLoggedin ? <Home /> : <Login />}</div>;
};

export default App;

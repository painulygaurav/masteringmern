import Child from "./Child";
import { useState } from "react";

const App = () => {
  const [name, setName] = useState("");
  return (
    <div>
      <Child setName={setName} />
      <h1>This value is coming from Child: {name}</h1>
    </div>
  );
};
export default App;

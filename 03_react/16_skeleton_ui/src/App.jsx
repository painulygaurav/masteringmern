import Card from "./Card";
import Skeleton from "./Skeleton";
import { useState, useEffect } from "react";

const App = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 3000);
  });
  return <div>{loading ? <Skeleton /> : <Card />}</div>;
};

export default App;

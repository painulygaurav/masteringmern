import { useState, useEffect } from "react";
// What makes this a custom hook? It looks just like another component
const UseCustom = (url) => {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((data) => setData(data));
  }, [url]);

  return [data]; // Why do we need to return in this way?
};

export default UseCustom;

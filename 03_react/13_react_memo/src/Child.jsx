import React from "react";
import { memo } from "react";

/*
const Child = React.memo(() => {
  console.log("Child component called...");
  return <div>Child Component</div>;
});
*/

const Child = () => {
  console.log("Child component called...");
  return <div>Child Component</div>;
};

export default memo(Child);

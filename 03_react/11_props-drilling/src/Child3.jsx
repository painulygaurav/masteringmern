import { useContext } from "react";
import { UserContext } from "./UserContext";

const Child3 = () => {
  const data = useContext(UserContext);
  console.log(data);
  return <div>Child3</div>;
};
export default Child3;

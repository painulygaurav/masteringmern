import Child1 from "./Child1";
import { UserContext } from "./UserContext";

const App = () => {
  let person = { fullName: "Gaurav Painuly", age: 37, salary: 5000000 };
  return (
    <div>
      <UserContext.Provider value={person}>
        <Child1 />
      </UserContext.Provider>
    </div>
  );
};

export default App;

/**
 * Title : Props drilling
 * Passing props from App.jsx
 * App.jsx has Child1
 * Child1 has Child2
 * Child2 has Child3
 *
 * We need to pass prop from App.jsx
 * Why prop drilling is not famous?
 * whenever hierarchy gets complex it's difficult to maintain props drilling
 * Component handling their own component so props can be lost in between
 * props drilling is good when you have simple heirarchy like parent and child.
 *
 * this is my initial setup.
 * App.jsx passes props to Child1, Child1 to Child 2, and Child 2 to Child 3
 * This is called props drilling
 *
 * Another important thing to notice is that this prop goes through all the rending of App.jsx, Child1.jsx, and Child2.jsx and finaly reaches Child3.jsx but there is one problem with this my component is being controlled by 3 components that is app.jsx, child1.jsx, and child2.jsx.
 * for two components this can work but for a more complex structure this can become difficult to maintain.
 *
 * for this some sort of mechanism is there to directly connect to the target component. That can be achieved using data transfer hooks.
 * Hierarche will still remain the same but child1, and child2 will not handle the data.
 * We have something called context api.
 *
 * We will use context creation. Think of it like a teacher rather than teaching one student and expect him to pass on that knowledge to second and so on till the target student the teacher will hire an assistant that will grasp all the component and dilivered the knowledge the required student.
 * So to achieve this let's say I'll create a UserContext.jsx
 * Two hooks work together. One is createcontext and second one is usecontext.
 * First I will create a UserContext using createContext hook.
 * Then I will use it in App.jsx using UserContext.Provider and wrap this around Child1 so I can establish the heirarchy.
 * Then will use the Context using useContext hook in Child3 (target)
 * It is still rendered by all components but it's not part of props rather part of context hook
 * So Child1 and Child2 are not handling the data.
 * This still has one problem. It is still a single point of failure and can have problem handling large data.
 *
 */

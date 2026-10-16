import AddTodo from "./AddTodo";
import ViewTodo from "./ViewTodo";

const App = () => {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">Todo App</h1>
        <div className="rounded-xl bg-white p-5 shadow-md">
          <AddTodo />
        </div>
        <div>
          <ViewTodo />
        </div>
      </div>
    </div>
  );
};
export default App;
/**
 * Flux architecture
 * Before we learn flux let's understand the problem it solves
 * Let's take the example of the following hierarchy:
 * We have number items added to a cart shows in three places, Nav bar, Cart component (using + and - symbol), and Product itself (using + and -).
 * Whenever we update anywhere we can update it with props drilling, context api, state uplifting, but the problem is when the data start moving in many directions then these methods won't be able to handle it. So in that case Flux helps
 * Flux says that the data will move in one direction only.
 * It follows Single Source of Truth (SST). One guy is responsible for all the data flow.
 * That is what redux is based on.
 * All the component will give data to SST.
 * SST has something called "Store" and it is responsible for all the data manipulations.
 * In general how we define events in React. We define onClick even on an element and we call the handler like "handleClick" function on it.
 * So within the component I define an event and I define action for it.
 * But in redux that is done differently. Redux says you don't have to define handleClick action within the Component.
 * Redux says create action wrap your payload around it and dispatch that to "Store"
 * So rather than performing the action in the Componet just create an action and dispatch that to store
 *
 * What actually is "Store"?
 * Store is an empty space that has all the actions that need to be performed.
 * Store has something called reducer also known as slicer. they are just functions these help perform the same action we are performing in component.
 *
 * In reducer we have something called Time Travel Debugging (TTD). It means we will have already ready so when the time comes we can execute them.
 *
 * So now the flow looks like this. Let's take a deposite example:
 * Deposite button -> button is clicked -> event handler creates Action {type=deposite, payload = $10 } -> useDispatch dispatch the action to Store -> Store [invoke logic1(available balance + deposite ), logic2, logic3]
 *
 * There is one problem. How does store know the current balance?
 * Here current balance is "State" and Store knows the State through subscription pipeline.
 * Another thing is how will I show the available balance back to component? because data is unidirection
 * So component will get the subscription of the store. Component will not get the access of the Store directly rather will get a subscription of the Store. It like saying user doesn't have access to add or delete movies in netflix rather has a subscription to consume the content. For this
 * We will use useSelector.
 */

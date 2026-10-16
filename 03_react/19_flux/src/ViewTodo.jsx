import { useSelector } from "react-redux";
import UpdateTodo from "./UpdateTodo";
import DeleteTodo from "./DeleteTodo";

// How does useSelector work?

// the console log will show us all the todo tasks we have added
// but once the page refresh the data will be gone
// No persistance is there and that is called rehydration issue
// this is where redux-persist comes into the picture
// we can convert the data into a json format and store it locally
const ViewTodo = () => {
  const todo = useSelector((state) => state.todo);

  if (todo.length === 0) {
    return (
      <p className="text-center text-slate-500">No tasks yet. Add one above!</p>
    );
  }

  return (
    <ul className="space-y-3">
      {todo.map((t) => (
        <li
          key={t.id} // what is key in react
          className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-4 shadow-md transition hover:shadow-lg"
        >
          <span className="min-w-0 flex-1 break-words font-medium text-slate-800">
            {t.text}
          </span>
          <UpdateTodo todo={t} />
          <DeleteTodo id={t.id} />
        </li>
      ))}
    </ul>
  );
};

export default ViewTodo;

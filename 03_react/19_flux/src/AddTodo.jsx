import { useState } from "react";
import { useDispatch } from "react-redux";
import { addTodo, removeAll } from "./redux/todoSlice";

const AddTodo = () => {
  const [todo, setTodo] = useState("");
  const dispatch = useDispatch();

  const handleChange = (e) => {
    setTodo(e.target.value);
  };

  const handleClick = () => {
    dispatch(addTodo({ text: todo }));
  };

  const handleClear = () => {
    dispatch(removeAll());
  };
  return (
    <div className="flex flex-wrap gap-2">
      <input
        type="text"
        value={todo}
        onChange={handleChange}
        placeholder="Enter any task"
        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
      <button
        onClick={handleClick}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
      >
        Add Todo
      </button>
      <button
        onClick={handleClear}
        className="rounded-lg bg-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-300"
      >
        Clear All
      </button>
    </div>
  );
};

export default AddTodo;

import { useState } from "react";
import { useDispatch } from "react-redux";
import { updateTodo } from "./redux/todoSlice";

const UpdateTodo = ({ todo }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(todo.text);
  const dispatch = useDispatch();

  const handleSave = () => {
    dispatch(updateTodo({ id: todo.id, text }));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setText(todo.text);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="rounded-lg bg-indigo-100 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-200"
      >
        Edit
      </button>
    );
  }

  return (
    <>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
      <button
        onClick={handleSave}
        className="rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-200"
      >
        Save
      </button>
      <button
        onClick={handleCancel}
        className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300"
      >
        Cancel
      </button>
    </>
  );
};

export default UpdateTodo;

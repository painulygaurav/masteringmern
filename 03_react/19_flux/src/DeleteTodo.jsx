import { useDispatch } from "react-redux";
import { deleteTodo } from "./redux/todoSlice";

const DeleteTodo = ({ id }) => {
  const dispatch = useDispatch();

  const handleDelete = () => {
    dispatch(deleteTodo({ id }));
  };

  return (
    <button
      onClick={handleDelete}
      className="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200"
    >
      Delete
    </button>
  );
};

export default DeleteTodo;

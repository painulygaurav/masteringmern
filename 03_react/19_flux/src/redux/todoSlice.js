import { createSlice, nanoid } from "@reduxjs/toolkit";

// I will create a new todo and will push it in the initialState.
// The problem is how will I identify similar types of task. and Before that why do we even need to identify tasks?
// We need some unique identification from different one similar task to another similar task for this we can use something called nanoId
export const todoSlice = createSlice({
  name: "todos",
  initialState: [],
  reducers: {
    addTodo: (state, action) => {
      const newTodo = {
        id: nanoid(),
        text: action.payload.text,
        completed: false, // flag means task is not completed
      };

      state.push(newTodo);
    },
    updateTodo: (state, action) => {
      const todo = state.find((t) => t.id === action.payload.id);
      if (todo) {
        todo.text = action.payload.text;
      }
    },
    deleteTodo: (state, action) => {
      return state.filter((t) => t.id !== action.payload.id);
    },
    removeAll: () => [],
  },
});

// Named exports: createSlice auto-generates an action creator for each reducer above.
// Components import these (by exact name) and dispatch them, e.g. dispatch(addTodo({ text })).
export const { addTodo, updateTodo, deleteTodo, removeAll } = todoSlice.actions;

// Default export: the combined reducer function for this slice.
// The store imports it (under any name) and registers it, e.g. configureStore({ reducer: { todo: todoReducer } }).
export default todoSlice.reducer;

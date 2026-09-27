const Child = (props) => {
  const handleChange = (e) => {
    props.setName(e.target.value);
  };
  return (
    <div>
      <input
        onChange={handleChange}
        type="text"
        placeholder="Enter name"
      ></input>
    </div>
  );
};
export default Child;

// Here Praent App.jsx is not inheriting from Child.jsx rather it's a state uplifting trick.
// How React does this internally? Leting children pass value to parent

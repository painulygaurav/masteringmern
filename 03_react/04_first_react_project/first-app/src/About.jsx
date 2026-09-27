function About() {
  const users = [
    { id: "1", name: "Gaurav" },
    { id: "2", name: "Sakshi" },
  ];
  return (
    <div>
      <table>
        <th>
          <td>ID</td>
          <td>Name</td>
        </th>
        {users.map((user) => {
          return (
            <tr>
              <td>{user.id}</td>
              <td>{user.name}</td>
            </tr>
          );
        })}
      </table>
    </div>
  );
}

export default About;

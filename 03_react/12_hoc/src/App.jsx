import User from "./User";
import WithLoalding from "./WithLoading";

const UserWithLoading = WithLoalding(User);

const App = () => {
  return (
    <div>
      <UserWithLoading name="Gaurav" isLoading={false} />
    </div>
  );
};

export default App;

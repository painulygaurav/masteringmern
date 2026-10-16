import Nav from "./Nav";
import Contact from "./Contact";
import About from "./About";
import Home from "./Home";
import { Routes, Route } from "react-router-dom";

const App = () => {
  return (
    <div>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
};

export default App;

/**
 * For this project we will install react-router-dom
 * In react we don't have anchor tag rather we have link.
 *
 * Whenever you try to do dom manipulation in React in this case react-router-dom we need to wrap the root component in main.jsx in browserrouter.
 * What it really does?
 */

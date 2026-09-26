// 1. Take access of the root node
const root = document.getElementById("root");

// 2. Fiber node architecture has a function called createElement. So we'll try to create our own.
function createElement(type, props = {}, ...children) {
  return {
    type,
    props,
    children,
  };
  /**
   * Object literal syntax and equivalent to {type: type, props: props, children: children}
   */
}

// 3. Now the function that is going to create the DOM element
// vnode means virtual node
function createDOM(vnode) {
  // If the element type is a text node then we can simply create a text node and return it.
  if (typeof vnode === "string" || typeof vnode === "number") {
    return document.createTextNode(vnode);
  }

  // We create the element like div, p, h1 etc
  const element = document.createElement(vnode.type);

  // iterate through each property in the virtual node
  for (const prop in vnode.props) {
    const value = vnode.props[prop];

    // some property will define the event for that element and will start with 'on'
    if (prop.startsWith("on")) {
      // extract the event name
      const eventName = prop.slice(2).toLowerCase();
      // value will be the function that should be invoked on the event trigger so we'll add an event listener with that event and it's function
      element.addEventListener(eventName, value);
    } else {
      // if it's not an event then it will be a normal attribute and that can be directly set with setAttribute function
      element.setAttribute(prop, value);
    }
  }

  // Let's add children
  vnode.children.forEach((child) => {
    const childElement = createDOM(child);
    element.appendChild(childElement);
  });

  return element;
}

// now we need to render
// This function is responsible for adding the fiber node to the root container
function render(vnode, container) {
  const dom = createDOM(vnode);

  // clear out the container
  container.innerHTML = "";
  container.appendChild(dom);
}

function Welcome() {
  return createElement("h1", {}, "Welcome from Gaurav!");
}

let state = 0;

function setState(newValue) {
  state = newValue;
  renderApp();
}

// Basically creating a component (HTML that we want to put inside the container)
function App() {
  return createElement(
    "div",
    {},
    createElement("h1", {}, "my manual react"),
    createElement("p", {}, `count:${state}`),
    createElement(
      "button",
      {
        onclick: () => {
          setState(state + 1);
        },
      },
      "increment",
    ),
    createElement(
      "button",
      {
        onclick: () => {
          setState(state - 1);
        },
      },
      "decrement",
    ),
    createElement(
      "button",
      {
        onclick: () => {
          setState(0);
        },
      },
      "reset",
    ),
    Welcome(),
  );
}

function renderApp() {
  const virtualDOM = App();
  console.log("virtual dom", virtualDOM);

  render(virtualDOM, root);
}

renderApp();

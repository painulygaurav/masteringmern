// rather then invoking water boiling function when raw maggie is available
// tell water boiling event to keep an eye for raw maggie arrival
// Here raw maggie will raise a flag that my part is done and water boiling is observing this flag and as it observe it has changed to true
// it will invoke itself

import { EventEmitter } from "events";

const emitter = new EventEmitter();

// Event subscribing
emitter.on("greet", () => {
  console.log("bye");
});

emitter.on("bye", () => {
  console.log("achha hua chala gaya");
});

emitter.emit("greet");
emitter.emit("bye");

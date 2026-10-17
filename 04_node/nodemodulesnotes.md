# Node.js Modules, fs, path, and Events

## 1. Modules

> A **module** is a file (or package) that keeps its own code private and **exports** only what other files need, so you can split a program into small, reusable pieces.

Every file in Node is its own module with its own scope: variables you declare in one file are **not** visible in another unless you export and import them.

### Three kinds of modules

| Kind                   | Examples                             | How you import it                      |
| ---------------------- | ------------------------------------ | -------------------------------------- |
| **Core (built-in)**    | `fs`, `path`, `events`, `http`, `os` | `import fs from "fs"` (or `"node:fs"`) |
| **Local (your files)** | `./math.js`                          | `import { add } from "./math.js"`      |
| **Third-party (npm)**  | `express`, `nodemon`, `lodash`       | `import express from "express"`        |

The `node:` prefix (`import fs from "node:fs"`) makes it explicit that it's a built-in module, not an npm package.

### Two module systems

|                                 | CommonJS (CJS)             | ES Modules (ESM)                                          |
| ------------------------------- | -------------------------- | --------------------------------------------------------- |
| Import                          | `const fs = require("fs")` | `import fs from "fs"`                                     |
| Export                          | `module.exports = { add }` | `export { add }` / `export default`                       |
| Enable                          | Default in Node            | `"type": "module"` in `package.json`, or `.mjs` extension |
| Loading                         | Synchronous                | Asynchronous, statically analyzable                       |
| File extension in local imports | Optional                   | **Required** (`"./math.js"`)                              |
| Top-level `await`               | No                         | Yes                                                       |
| `__dirname`, `__filename`       | Available                  | Not available (see section 3)                             |

The examples in these notes use **ES Modules**, so `package.json` needs:

```json
{
  "type": "module"
}
```

Without it, Node treats `.js` files as CommonJS and `import` throws `SyntaxError: Cannot use import statement outside a module`.

### Named exports and imports

```js
// math.js
export const PI = 3.14159;
export function add(a, b) {
  return a + b;
}
```

```js
// nodemodule.js
import { add } from "./math.js";
import { PI } from "./math.js";
// same thing in one line: import { add, PI } from "./math.js";

console.log(add(3, 2)); // 5
console.log(PI); // 3.14159
```

- Names inside `{ }` must match the exported names exactly.
- Rename on import with `as`: `import { add as sum } from "./math.js"`.
- Import everything: `import * as math from "./math.js"` -> `math.add(1, 2)`.

### Default export (one per file)

```js
// logger.js
export default function log(msg) {
  console.log(msg);
}

// app.js
import log from "./logger.js"; // no braces, any name works
```

|                | Named export             | Default export    |
| -------------- | ------------------------ | ----------------- |
| Per file       | Many                     | One               |
| Import syntax  | `import { x } from`      | `import x from`   |
| Name on import | Must match (or use `as`) | Any name you like |

### How modules load

- A module is **executed once** the first time it's imported, then **cached**. Importing it again elsewhere gives the same instance (so module-level variables act like shared singletons).
- This is the same pattern as the Redux store: it's created once in `store.js` and imported everywhere.

## 2. `fs` (File System) Module

`fs` lets Node read, write, append, rename, and delete files and directories. It's a core module, so no install needed:

```js
import fs from "fs";
```

### Three flavors of every operation

| Style           | Example                                                        | Behavior                                                                  |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Synchronous** | `fs.writeFileSync(...)`                                        | **Blocks the event loop** until done; simple, returns the result directly |
| **Callback**    | `fs.writeFile(path, data, cb)`                                 | Non-blocking; result arrives in a callback                                |
| **Promise**     | `fs.promises.writeFile(...)` or `import fs from "fs/promises"` | Non-blocking; returns a promise, works with `async/await`                 |

This is the callback -> promise -> async/await progression from earlier notes, applied to files. In servers, avoid `*Sync` methods inside request handlers because they freeze every other request.

### Write: `writeFile` / `writeFileSync`

```js
// Synchronous
fs.writeFileSync("gaurav.txt", "Hello from Gaurav");

// Callback
fs.writeFile(
  "log.txt",
  `User has logged in at ${new Date().toISOString()}`,
  (err) => {
    if (err) {
      console.error("Write failed:", err);
      return;
    }
    console.log("File written successfully");
  },
);
```

- **Creates** the file if it doesn't exist and **overwrites** it completely if it does.
- The callback receives only `(err)`, with no data on success.
- `Date.now()` gives milliseconds since 1970; `new Date().toISOString()` gives a readable timestamp.

### Append: `appendFile`

```js
fs.appendFile(
  "log.txt",
  `User has logged in at ${new Date().toISOString()}\n`,
  (err) => {
    if (err) {
      console.error("Append failed:", err);
      return;
    }
    console.log("File appended successfully");
  },
);
```

- **Adds to the end** of the file without erasing existing content, and creates the file if it doesn't exist.
- Include `\n` yourself so each entry lands on a new line.
- Perfect for **log files**.

### Read: `readFile`

```js
fs.readFile("log.txt", "utf-8", (err, data) => {
  if (err) {
    console.error("Read failed:", err);
    return;
  }
  console.log("Content of file read successfully!\n" + data);
});
```

- The second argument is the **encoding**. Without `"utf-8"`, `data` is a **Buffer** (raw bytes), not a string.
- `readFile` loads the **entire file into memory**. For very large files use streams (`fs.createReadStream`).

### Delete: `unlink`

```js
fs.unlink("log.txt", (err) => {
  if (err) {
    console.error("Delete failed:", err);
    return;
  }
  console.log("File deleted successfully");
});
```

- Removes the file. If the file doesn't exist, `err.code === "ENOENT"`.
- For folders: `fs.rmdir` / `fs.rm(path, { recursive: true })`.

### Handle errors inside the callback

Inside an async callback, `return err` does nothing useful: the caller that started the operation is long gone (see the callback notes). **Handle the error right there**: log it, show a message, or retry.

### Quick reference

| Operation       | Callback API    | Sync API            | What it does              |
| --------------- | --------------- | ------------------- | ------------------------- |
| Write           | `fs.writeFile`  | `fs.writeFileSync`  | Create or overwrite       |
| Append          | `fs.appendFile` | `fs.appendFileSync` | Add to the end            |
| Read            | `fs.readFile`   | `fs.readFileSync`   | Read contents             |
| Delete          | `fs.unlink`     | `fs.unlinkSync`     | Delete a file             |
| Rename / move   | `fs.rename`     | `fs.renameSync`     | Rename or move            |
| Copy            | `fs.copyFile`   | `fs.copyFileSync`   | Copy a file               |
| Check existence | `fs.access`     | `fs.existsSync`     | Does it exist?            |
| List folder     | `fs.readdir`    | `fs.readdirSync`    | Names inside a directory  |
| Make folder     | `fs.mkdir`      | `fs.mkdirSync`      | Create a directory        |
| File info       | `fs.stat`       | `fs.statSync`       | Size, dates, is-directory |

### Same operations with promises and async/await

```js
import fs from "fs/promises";

async function main() {
  try {
    await fs.writeFile("log.txt", "first line\n");
    await fs.appendFile("log.txt", "second line\n");
    const data = await fs.readFile("log.txt", "utf-8");
    console.log(data);
    await fs.unlink("log.txt");
    console.log("Done");
  } catch (err) {
    console.error(err);
  }
}

main();
```

Compare with the callback version: each step needed a callback nested inside the previous one. Here it reads top to bottom, and one `try/catch` covers every step.

### How `fs` fits the event loop

`fs.readFile(...)` hands the work to **libuv's thread pool**. The main thread keeps running other code, and when the worker finishes, the callback is queued for the event loop. `fs.readFileSync` skips all of that and **blocks the main thread**.

### Gotcha: relative paths

`fs.readFile("log.txt")` resolves `"log.txt"` against the **current working directory** (where you ran `node`), **not** against the file's own folder. Running `node src/app.js` from the project root looks for `log.txt` in the project root. Use `path` (next section) to build reliable paths.

## 3. `path` Module

`path` builds and parses file paths in a way that works on every operating system (Windows uses `\`, macOS/Linux use `/`).

```js
import path from "path";
```

| Method                   | What it does                                                                                               | Example result                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `path.join(...parts)`    | Joins segments with the correct separator and normalizes `..`                                              | `path.join("a", "b", "c.txt")` -> `a/b/c.txt`                    |
| `path.resolve(...parts)` | Builds an **absolute** path (from the right, until it gets an absolute one, else prepends the current dir) | `path.resolve("logs", "app.log")` -> `/current/dir/logs/app.log` |
| `path.basename(p)`       | Last part (file name)                                                                                      | `path.basename("/a/b/c.txt")` -> `c.txt`                         |
| `path.dirname(p)`        | Folder part                                                                                                | `path.dirname("/a/b/c.txt")` -> `/a/b`                           |
| `path.extname(p)`        | File extension                                                                                             | `path.extname("c.txt")` -> `.txt`                                |
| `path.parse(p)`          | Object with `root`, `dir`, `base`, `ext`, `name`                                                           | `{ dir: "/a/b", base: "c.txt", ext: ".txt", name: "c" }`         |
| `path.sep`               | OS separator                                                                                               | `/` or `\`                                                       |

### Why not just concatenate strings?

```js
const bad = "logs" + "/" + "app.log"; // breaks on Windows-style paths, double slashes, ".." handling
const good = path.join("logs", "app.log"); // correct on every OS
```

### Getting the current file's folder in ES Modules

CommonJS gives you `__dirname` and `__filename` for free. ES Modules don't, so derive them:

```js
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logPath = path.join(__dirname, "log.txt"); // always next to this file
```

Newer Node versions also offer `import.meta.dirname` and `import.meta.filename` directly.

### Combining `fs` and `path`

```js
import fs from "fs";
import path from "path";

const logFile = path.join(process.cwd(), "logs", "app.log");
fs.mkdirSync(path.dirname(logFile), { recursive: true });
fs.appendFileSync(logFile, "server started\n");
```

## 4. Events and `EventEmitter`

### The idea (your Maggie analogy)

Instead of the "raw Maggie arrived" step **calling** the "boil water" function directly, the water-boiling step **subscribes** to a signal and reacts when it happens:

```
Without events:  rawMaggieArrives() --calls--> boilWater()      (tightly coupled)
With events:     rawMaggieArrives() --raises flag--> boilWater() is watching for that flag
```

- The **emitter** says "this happened" and doesn't know or care who is listening.
- The **listeners** (observers) say "when that happens, run me".
- This is the **Observer pattern** (also called publish/subscribe): the parts are **decoupled**, and you can add or remove listeners without touching the emitter's code. It's the fix for the coupling problem from the callback notes (where `f1` had to know about `f2`).

### Your example

```js
import { EventEmitter } from "events";

const emitter = new EventEmitter();

// Event subscribing
emitter.on("greet", () => {
  console.log("bye");
});

emitter.on("bye", () => {
  console.log("achha hua chala gaya");
});

emitter.emit("greet"); // bye
emitter.emit("bye"); // achha hua chala gaya
```

- `emitter.on(eventName, listener)` **subscribes**: registers a listener for the named event.
- `emitter.emit(eventName)` **fires** the event: runs every listener registered for that name.
- Event names are just strings you choose. They're unrelated to each other, so `emit("greet")` runs only the `"greet"` listeners.

### Maggie with events

```js
import { EventEmitter } from "events";

const kitchen = new EventEmitter();

kitchen.on("rawMaggieArrived", () => {
  console.log("Water boiling started...");
  kitchen.emit("waterBoiling");
});

kitchen.on("waterBoiling", () => {
  console.log("Adding masala...");
});

kitchen.emit("rawMaggieArrived");
```

Each step only knows the **event it listens to**, not the step before it.

### Passing data with events

```js
emitter.on("order", (item, qty) => {
  console.log(`Preparing ${qty} x ${item}`);
});

emitter.emit("order", "Maggie", 2); // Preparing 2 x Maggie
```

Everything after the event name is passed to listeners as arguments.

### Important behavior to remember

1. **Listeners run synchronously**, in the order they were registered. `emit()` doesn't return until every listener has finished. `EventEmitter` is **not** the event loop's queue; it's a plain synchronous function-call mechanism (use `setImmediate` or `process.nextTick` inside a listener if you need to defer work).
2. **Multiple listeners** can subscribe to the same event, and all of them run.
3. **Subscribe before you emit.** An event emitted with no listeners is simply lost.
4. `emit()` returns `true` if the event had listeners, `false` otherwise.

### Useful methods

| Method                              | What it does                                |
| ----------------------------------- | ------------------------------------------- |
| `on(event, fn)` / `addListener`     | Subscribe to every occurrence               |
| `once(event, fn)`                   | Subscribe for the **first** occurrence only |
| `off(event, fn)` / `removeListener` | Unsubscribe a specific listener             |
| `removeAllListeners(event)`         | Remove all listeners for an event           |
| `emit(event, ...args)`              | Fire the event                              |
| `listenerCount(event)`              | How many listeners are attached             |
| `prependListener(event, fn)`        | Add a listener to run **first**             |

```js
emitter.once("login", () => console.log("welcome (only the first time)"));
emitter.emit("login"); // runs
emitter.emit("login"); // nothing happens
```

### The special `"error"` event

If an `"error"` event is emitted and **no listener** is attached, Node **throws** the error and can crash the process. Always attach one for emitters that can fail:

```js
emitter.on("error", (err) => console.error("Handled:", err.message));
emitter.emit("error", new Error("something broke"));
```

### Extending `EventEmitter`

Many Node core modules are built this way: HTTP servers, streams, sockets, and child processes are all emitters.

```js
class Order extends EventEmitter {
  place(item) {
    console.log("Placing " + item);
    this.emit("placed", item);
  }
}

const order = new Order();
order.on("placed", (item) => console.log(item + " confirmed"));
order.place("Maggie");
```

Real examples of events in core modules:

```js
import http from "http";

const server = http.createServer();
server.on("request", (req, res) => res.end("hi")); // fires on each incoming request
server.listen(3000);

const stream = fs.createReadStream("big.txt");
stream.on("data", (chunk) => {}); // fires per chunk
stream.on("end", () => {}); // fires when finished
```

### Callback vs Promise vs Event

|           | Callback                           | Promise                             | Event (`EventEmitter`)                                       |
| --------- | ---------------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| Fires     | Once, when the operation finishes  | **Once** (settles one time)         | **Any number of times**                                      |
| Listeners | One                                | Many `.then()` handlers, one result | Many listeners, many emits                                   |
| Best for  | Single async result (older APIs)   | Single async result                 | Repeated or ongoing things (requests, stream chunks, clicks) |
| Coupling  | Caller passes function into callee | Caller receives object              | Emitter and listeners are decoupled                          |

## 5. Putting It Together

```
index.js
  |-- imports { add, PI }       from "./math.js"      (local module)
  |-- imports fs                from "fs"             (core module: files)
  |-- imports path              from "path"           (core module: paths)
  |-- imports { EventEmitter }  from "events"         (core module: events)
```

A small logger that uses all three core modules:

```js
import fs from "fs";
import path from "path";
import { EventEmitter } from "events";

const logger = new EventEmitter();
const logFile = path.join(process.cwd(), "log.txt");

logger.on("login", (user) => {
  const line = `${user} logged in at ${new Date().toISOString()}\n`;
  fs.appendFile(logFile, line, (err) => {
    if (err) return console.error(err);
    console.log("Logged: " + user);
  });
});

logger.emit("login", "Gaurav");
```

## 6. Interview Quick Answers

**What is a module in Node.js?**
A file with its own scope that exports selected values for other files to import. Node has core, local, and third-party modules.

**CommonJS vs ES Modules?**
CJS uses `require` / `module.exports` and loads synchronously. ESM uses `import` / `export`, needs `"type": "module"` (or `.mjs`), requires file extensions on local imports, and supports top-level `await`.

**Named vs default export?**
Named exports can be many per file and must be imported by name inside `{ }`. A default export is one per file and can be imported under any name.

**Is a module executed every time it is imported?**
No. It runs once and is cached, so every importer shares the same instance.

**`writeFile` vs `appendFile`?**
`writeFile` creates or overwrites the whole file. `appendFile` adds to the end and keeps existing content.

**Sync vs async `fs` methods?**
Sync methods block the event loop until done. Async ones (callback or promise) delegate to libuv's thread pool and keep the main thread free. Avoid sync methods in servers.

**Why is `data` a Buffer when I forget the encoding in `readFile`?**
Without an encoding Node returns raw bytes as a Buffer. Pass `"utf-8"` to get a string.

**Why use `path.join` instead of string concatenation?**
It uses the correct separator for the OS and normalizes `.` and `..` segments.

**How do you get `__dirname` in ES Modules?**
Not available by default. Derive it with `path.dirname(fileURLToPath(import.meta.url))`, or use `import.meta.dirname` in newer Node versions.

**What is an `EventEmitter`?**
A core class implementing the observer pattern: `on` subscribes listeners to named events and `emit` fires them. Many Node core modules (http, streams) are built on it.

**Are `EventEmitter` listeners asynchronous?**
No. `emit` runs listeners synchronously in registration order. Any asynchronous behavior comes from what you do inside a listener.

**What happens if you emit `"error"` with no listener?**
Node throws the error, which can crash the process if it's uncaught. Always attach an `"error"` listener.

**EventEmitter vs Promise?**
A promise settles once and gives one result. An emitter can fire many times and notify many listeners, which suits ongoing streams of events.

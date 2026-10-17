# Node.js Basics

## 1. What is Node.js?

> **Node.js is a runtime that lets you run JavaScript outside the browser** (on servers, laptops, CLIs), built on Chrome's **V8** engine and the **libuv** library.

### The problem it solves

JavaScript runs your code on **a single thread**, one thing at a time. Imagine three tasks:

```
Task 1: quick
Task 2: slow (takes 10 minutes: file read, DB query, network call)
Task 3: quick
```

If everything ran in order on one thread, Task 3 would be **stuck** until Task 2 finishes, and the whole program would freeze.

**Node's answer:** don't wait. Hand the slow task off, keep running other code, and get **notified through a callback** when the slow task is done. (This is the callback / promise / async-await story from the earlier notes.)

```
Task 1 runs
Task 2 -> handed off to the system (queued), callback registered
Task 3 runs immediately
... later: Task 2 finishes -> its callback is queued -> runs when the thread is free
```

### How Node was built: V8 + libuv

- **V8** (from Chrome) compiles and executes JavaScript. It runs JS on **one main thread** and knows nothing about files, sockets, or timers.
- Node's developers needed a way to do slow work (file system, network, DNS, crypto) **off the main thread**. They used a C library, **libuv**, which provides:
  - the **event loop**
  - a **thread pool** (worker threads) for work the OS can't do asynchronously
  - cross-platform async I/O (uses `epoll` on Linux, `kqueue` on macOS, `IOCP` on Windows)
- V8 and libuv work independently, and together (plus Node's C++ bindings and built-in modules like `fs`, `http`, `path`) they are **Node.js**.

```
  Your JS code
      |
  +---------+      bindings       +-----------------------+
  |   V8    | <-----------------> |        libuv          |
  | (runs   |  (C++ glue layer)   | event loop            |
  |  JS)    |                     | thread pool (workers) |
  +---------+                     | OS async I/O          |
                                  +-----------------------+
```

### Node.js vs browser JavaScript

|                | Browser JS                                                   | Node.js                                           |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| Engine         | V8 (Chrome), SpiderMonkey (Firefox), JavaScriptCore (Safari) | V8                                                |
| Async provider | **Web APIs** (`setTimeout`, `fetch`, DOM events)             | **libuv** (timers, fs, network, DNS)              |
| Globals        | `window`, `document`                                         | `global` / `globalThis`, `process`                |
| Can access     | DOM, `localStorage`, cookies                                 | File system, OS, network sockets, child processes |
| Modules        | ES Modules                                                   | CommonJS (`require`) and ES Modules (`import`)    |
| Use case       | Frontend                                                     | Backend, tooling, scripts                         |

### REPL (a separate thing from the event loop)

**REPL = Read, Evaluate, Print, Loop.** It's the interactive shell you get by typing `node` in the terminal:

```
$ node
> 2 + 3
5
> const name = "Gaurav"
> name.toUpperCase()
'GAURAV'
```

It reads a line, evaluates it, prints the result, and loops back for the next line. It's a **developer tool for experimenting**. The **event loop** is a different concept: it's how Node's runtime schedules async work (next section).

## 2. The Event Loop

> The **event loop** is a loop (provided by libuv) that continuously checks whether the **call stack is empty**, and if so, picks the next ready **callback** and pushes it onto the stack.

This is what lets a single JS thread handle thousands of concurrent operations: it never _waits_, it only _reacts_ to completed work.

### Components of the event-driven architecture

| Component                              | Role                                                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Call stack**                         | Where JS code executes, one frame at a time (LIFO). The single main thread                                                 |
| **Node APIs / libuv**                  | Receives async work handed off from the stack (timers, fs, network, crypto)                                                |
| **Worker threads (libuv thread pool)** | Run blocking work off the main thread (default **4** threads)                                                              |
| **OS kernel async I/O**                | Handles network sockets directly without needing a worker thread                                                           |
| **Event queue / callback queue**       | Holds finished work's callbacks waiting for the stack to be free                                                           |
| **Microtask queues**                   | `process.nextTick` queue and the promise (`.then`, `await`) queue, which have **higher priority** than the callback queues |
| **Event loop**                         | Moves callbacks from the queues onto the call stack when the stack is empty                                                |

### The diagram

```
                +---------------------------------+
                |         Your JS code            |
                +----------------+----------------+
                                 |
                                 v
                +---------------------------------+
                |           CALL STACK            |  <-- V8, single main thread
                |      (executes JS, 1 at a time) |
                +--------+------------------+-----+
                         |                  ^
        async task (fs,  |                  | pushes callback when
        timer, network)  |                  | stack is empty
                         v                  |
                +--------------------+   +--+-----------------------+
                |   Node APIs / C++  |   |      EVENT LOOP          |
                |      bindings      |   |  (libuv: checks stack    |
                +--------+-----------+   |   and queues forever)    |
                         |               +--+-----------------------+
                         v                  ^
        +-----------------------------+     |
        |           libuv             |     |
        |  +-----------------------+  |     |
        |  | Thread pool (workers) |  |     |
        |  |  fs, crypto, zlib,    |  |     |
        |  |  dns.lookup           |  |     |
        |  +-----------------------+  |     |
        |  +-----------------------+  |     |
        |  | OS async I/O          |  |     |
        |  |  (sockets: epoll /    |  |     |
        |  |   kqueue / IOCP)      |  |     |
        |  +-----------------------+  |     |
        +--------------+--------------+     |
                       | task done          |
                       v                    |
        +-----------------------------+     |
        |  EVENT / CALLBACK QUEUE     |-----+
        |  (callbacks ready to run)   |
        +-----------------------------+
```

### Flow in words (reading a file)

```js
const fs = require("fs");

console.log("1. start");
fs.readFile("data.txt", "utf8", (err, data) => {
  console.log("3. file read done");
});
console.log("2. end");
```

1. `console.log("1. start")` runs on the call stack.
2. `fs.readFile` is called. Node hands it to **libuv**, registers the callback, and `readFile` **returns immediately**.
3. `console.log("2. end")` runs. The call stack is now empty.
4. A **worker thread** reads the file in the background (the main thread is free).
5. When done, libuv puts the callback in the **event queue**.
6. The **event loop** sees the stack is empty, takes the callback, and pushes it on the stack.
7. `"3. file read done"` prints.

Output: `1. start`, `2. end`, `3. file read done`.

### Event loop phases (what happens in each loop iteration)

```
   +--> 1. timers              (setTimeout, setInterval callbacks)
   |    2. pending callbacks   (some system-level callbacks)
   |    3. idle, prepare       (internal use)
   |    4. poll                (retrieve new I/O events, run I/O callbacks;
   |                            waits here if nothing else is scheduled)
   |    5. check               (setImmediate callbacks)
   |    6. close callbacks     (e.g. socket.on("close"))
   +---------------------------+  (repeat until nothing is left to do)
```

Between every phase (and after each callback) Node drains the **microtask queues**:

1. `process.nextTick` queue first
2. then the **promise** microtask queue (`.then`, `await` continuations)

### Execution order puzzle

```js
const fs = require("fs");

console.log("1. sync");

setTimeout(() => console.log("5. setTimeout"), 0);
setImmediate(() => console.log("6. setImmediate"));
Promise.resolve().then(() => console.log("4. promise"));
process.nextTick(() => console.log("3. nextTick"));

console.log("2. sync");
```

Output: `1. sync` -> `2. sync` -> `3. nextTick` -> `4. promise` -> `5. setTimeout` / `6. setImmediate`

- Synchronous code always finishes first.
- `nextTick` runs before promise microtasks.
- `setTimeout(fn, 0)` vs `setImmediate` from the **main module** has no guaranteed order (depends on process timing).
- **Inside an I/O callback**, `setImmediate` always runs before `setTimeout(fn, 0)`, because the loop is in the poll phase and `check` comes next.

### Connection to earlier notes

- **Callbacks:** every async API in Node historically took a callback; the event loop is what calls them back.
- **Promises / async-await:** their continuations are **microtasks**, which run before the next event loop phase, so they beat timers.
- **Closures:** a callback remembers the variables of the scope that created it, even after the outer function is gone.

## 3. Event-Driven Architecture

> Everything in Node is driven by **events**: a request arrives, a file finishes reading, a timer fires, a socket closes. You register handlers (callbacks) for these events, and Node runs them when the event happens.

```js
const EventEmitter = require("events");
const emitter = new EventEmitter();

emitter.on("order", (item) => console.log("Preparing " + item)); // register listener
emitter.emit("order", "Maggie"); // fire event
```

Many core modules (`http`, `fs` streams, `net`) are built on `EventEmitter`.

```
Event happens ---> Event queue ---> Event loop ---> Handler (callback) runs on the call stack
(request, timer,   (waits its      (picks one       (your code)
 file done)         turn)           when stack free)
```

### Why this model scales

- One thread handles **thousands of concurrent connections** because it never blocks waiting on I/O.
- No thread-per-request overhead (memory, context switching).
- Ideal for **I/O-bound** work: APIs, chat, streaming, proxies, real-time apps.

## 4. Node.js Strengths and the Bottleneck

### What is the Node.js bottleneck?

**CPU-intensive work on the main thread.** There is only one JS thread, so a long synchronous computation **blocks the event loop**, and every other request waits.

```js
// This blocks EVERYTHING for several seconds
app.get("/heavy", (req, res) => {
  let sum = 0;
  for (let i = 0; i < 1e10; i++) sum += i; // CPU-bound loop
  res.send(String(sum));
});
// While it runs, no other request (even a trivial /health) can be served
```

Other bottleneck sources:

- Synchronous APIs (`fs.readFileSync`, `JSON.parse` of huge payloads) in request handlers.
- The libuv thread pool is small (default 4), so many simultaneous `fs`/`crypto`/`zlib` calls queue up (tunable with `UV_THREADPOOL_SIZE`).
- Single process uses **one CPU core** by default.

### Ways to deal with it

| Technique                           | What it does                                                          |
| ----------------------------------- | --------------------------------------------------------------------- |
| **`worker_threads`**                | Run CPU-heavy JS in separate threads with their own V8 instance       |
| **`cluster` module / PM2**          | Start one Node process per CPU core and load-balance across them      |
| **`child_process`**                 | Offload work to another process or program                            |
| **Message queue + worker service**  | Push heavy jobs to a queue (RabbitMQ, SQS, Kafka) processed elsewhere |
| **Use async APIs**                  | Never use `*Sync` functions in request paths                          |
| **Offload to native/other service** | Move heavy computation to Go/Rust/Java microservice                   |

### Node.js vs Java for backends

|                     | Node.js                                                                                           | Java (JVM)                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Concurrency model   | Single-threaded event loop + async I/O                                                            | **Multi-threaded**: real threads (thread-per-request, plus virtual threads in newer versions) |
| Threading           | Non-blocking is the default; threads reached indirectly through libuv or `worker_threads`         | **Direct, first-class** thread APIs and concurrency libraries                                 |
| Best at             | I/O-bound, many concurrent connections, real-time                                                 | CPU-bound work, complex business logic, heavy parallel computation                            |
| CPU-heavy work      | Blocks the event loop unless offloaded                                                            | Spread across cores naturally                                                                 |
| Typing              | Dynamic (TypeScript optional)                                                                     | Static, strongly typed                                                                        |
| Ecosystem           | npm (huge, fast-moving)                                                                           | Mature enterprise ecosystem (Spring, Hibernate, JVM tooling)                                  |
| Startup / dev speed | Fast to build and iterate                                                                         | More boilerplate, slower iteration                                                            |
| Typical users       | Startups, API gateways, BFFs, real-time, streaming (Netflix, PayPal, LinkedIn use Node for parts) | Banks, fintech cores, large enterprises                                                       |

**Why many fintechs choose Java:**

- **True multithreading** with direct control over threads, locks, and thread pools, rather than going through libuv.
- Strong typing, long-term stability, and mature libraries for transactions, security, and compliance.
- Predictable performance for CPU-heavy and high-throughput transaction processing.
- Large existing codebases, talent pool, and enterprise tooling (monitoring, profiling, JVM tuning).

**Why companies still use Node:**

- One language (JavaScript/TypeScript) across frontend and backend.
- Excellent for I/O-heavy APIs and real-time features with fewer servers.
- Fast development, a huge npm ecosystem, and good fit for microservices and API gateways.

Common real-world pattern: Node for the API/edge layer, Java (or Go) for heavy core processing.

## 5. Your First Node Project

### Initialize

```bash
mkdir my-first-node-app
cd my-first-node-app
npm init          # asks questions step by step
npm init -y       # same, accepting all defaults
```

This creates **`package.json`**, the project's manifest:

- `name`, `version`, `description`
- `main`: entry file (default `index.js`)
- `scripts`: custom commands run with `npm run <name>`
- `dependencies` / `devDependencies`: packages the project needs

### Run a program

```js
// index.js
console.log("Hello from Node");
```

```bash
node index.js
```

### Watch mode (built in)

```bash
node --watch index.js
```

- Runs the program and **automatically restarts it** whenever the entry file or the modules it imports change.
- No extra install needed (stable in recent Node versions).
- Limitation: it only watches files in your program's import graph, so after **installing a new library** you may need to stop and start it again manually.

## 6. nodemon

**nodemon** is a tool that watches your files and restarts the app on change, with more configuration options than `--watch`.

### Install as a dev dependency

```bash
npm install --save-dev nodemon     # or: npm i -D nodemon
```

It goes under `devDependencies` because it's only needed during development, not in production.

### Add a script in `package.json`

```json
{
  "scripts": {
    "start": "nodemon index.js"
  }
}
```

### Run

```bash
npm start
```

`npm start` runs the `start` script, which launches `index.js` through nodemon.

Notes:

- `start`, `test`, and a few others are special names, so `npm start` works directly. Custom script names need `npm run`, e.g. `npm run dev`.
- Common convention: `"dev": "nodemon index.js"` for development and `"start": "node index.js"` for production.
- Type `rs` and press Enter in the nodemon terminal to restart manually.
- nodemon can be configured with a `nodemon.json` (watched folders, file extensions, ignored paths, delay).

### `node --watch` vs `nodemon`

|                                     | `node --watch`  | `nodemon`                                              |
| ----------------------------------- | --------------- | ------------------------------------------------------ |
| Install                             | Built in        | `npm i -D nodemon`                                     |
| Config                              | Minimal         | Rich (`nodemon.json`: ext, watch, ignore, delay, exec) |
| Non-JS runners (ts-node, python...) | No              | Yes (`--exec`)                                         |
| Best for                            | Simple projects | Larger or customized setups                            |

## 7. Project Files Cheat Sheet

| File / folder       | Purpose                                                 |
| ------------------- | ------------------------------------------------------- |
| `package.json`      | Project metadata, scripts, dependency list              |
| `package-lock.json` | Exact installed versions, ensures identical installs    |
| `node_modules/`     | Downloaded packages (never commit; add to `.gitignore`) |
| `index.js`          | Entry point                                             |
| `.gitignore`        | Files git should skip (`node_modules`, `.env`)          |

### CommonJS vs ES Modules

```js
// CommonJS (default in Node)
const fs = require("fs");
module.exports = { greet };

// ES Modules (set "type": "module" in package.json, or use .mjs)
import fs from "fs";
export { greet };
```

## 8. Interview Quick Answers

**What is Node.js?**
A JavaScript runtime built on V8 and libuv that lets you run JavaScript outside the browser, designed for scalable, non-blocking I/O using an event-driven architecture.

**What are V8 and libuv, and why are both needed?**
V8 executes JavaScript on a single main thread. libuv provides the event loop, thread pool, and async I/O that V8 lacks, so Node can do file, network, and timer work without blocking.

**Is Node.js single-threaded?**
Your JavaScript runs on a single main thread, but Node itself isn't purely single-threaded: libuv's thread pool and OS async I/O do work in the background, and `worker_threads` allow extra JS threads.

**What is the event loop?**
A libuv loop that keeps checking whether the call stack is empty and moves ready callbacks from the queues onto it, cycling through phases: timers, pending, poll, check, close, with microtasks drained between phases.

**`process.nextTick` vs promise vs `setTimeout` vs `setImmediate`?**
`nextTick` runs first, then promise microtasks, then timers or check-phase callbacks (`setImmediate`) in their respective phases.

**What does the thread pool handle?**
Blocking work like `fs`, `crypto`, `zlib`, and `dns.lookup` (default size 4). Network sockets use OS-level async I/O instead.

**What is the main bottleneck of Node.js?**
CPU-bound synchronous work blocks the single main thread and the event loop, delaying every other request. Fix with `worker_threads`, `cluster`, child processes, or offloading to a queue or other service.

**Why do many fintechs use Java instead of Node?**
Direct, first-class multithreading, strong typing, mature enterprise libraries, and strong CPU-bound performance. Node's strengths are I/O-bound, high-concurrency workloads.

**What is REPL?**
The interactive Read-Evaluate-Print-Loop shell started with `node`, used for trying out code. It is not the event loop.

**`node --watch` vs `nodemon`?**
Both restart the app on file changes. `--watch` is built in and minimal. nodemon is an installed dev dependency with more configuration.

**Why is nodemon installed with `--save-dev`?**
It's a development-only tool, so it belongs in `devDependencies` and isn't needed in production.

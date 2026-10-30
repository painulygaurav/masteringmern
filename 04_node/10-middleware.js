/**
 * Middleware functions have access to req, and res and they can execute the "next" function inline.
 * Application
 * Router
 * Error-handling
 * Build-in
 * Third-party
 */
import express from "express";
import fs from "fs";
import ejs from "ejs";
import morgan from "morgan";
const PORT = 3000;

const app = express();
// define the view engine
app.set("view engine", "ejs");
//From where you want to pick your file. We are going to put home.ejs into views folder.
// setting public resource to serve
app.use(express.static("public"));
app.use(express.json());
app.use(morgan("combined")); // third-party middleware

// app.get("/", (req, res) => {
//   //   res.status(200).json({ message: "welcome to the home page" });
//   // Returning an HTML page using fs module. It is not a good approach because there can be operating system level race condition
//   //   fs.readFile("home.html", "utf-8", (err, data) => {
//   //     if (err) return err;
//   //     res.send(data);
//   //   });
//   // We are going to do this using ejs
//   // Please add a bit about ejs, like what it is and when to use it?
//   res.render("home");
// });

// app.get("/products", (req, res) => {
//   fs.readFile("data.json", "utf-8", (err, data) => {
//     if (err) throw err;
//     res.json(data);
//   });
// });

// I want some code to execute before my home route so I'll write the middleware before my route

const username = "gaurav123";
const password = "gaurav123";

app.use((req, res, next) => {
  console.log(
    `user came at this time: ${Date.now()} and user used the method: ${req.method}`,
  );
  next(); // How does next points to next function?
});

app.use((req, res, next) => {
  if (req.body.username === username && req.body.password === password) {
    next();
  } else {
    res.send("invalid credentials");
  }
});

app.use((req, res, next) => {
  fs.appendFile(
    "log.txt",
    `${username} visited at ${Date.now()} and the method used is ${req.method} and on this route: ${req.url}\n`,
    (err) => (err ? console.log(err) : console.log("success..")),
  );
  next();
});

// with having above function only I won't reach here until the middleware invoke next function on the last line
app.get("/", (req, res) => {
  res.end("Hello from Gaurav");
});

// before this we need to validate username and password so for that I will run a middleware
app.post("/login", (req, res) => {
  console.log(req.body);
  res.end("Welcome to the dashboard");
});

app.listen(PORT, () => {
  console.log(`Server is running at PORT: ${PORT}`);
});

/**
 * Test:
 * curl -X POST http://localhost:3000/login -H "Content-Type: application/json" -d "{\"username\":\"gaurav123\",\"password\":\"gaurav123\"}"
 */

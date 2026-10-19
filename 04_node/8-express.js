/**
 * we can keep on attaching routes with new handlers with new functions.
 * No need to modify the code inside another route and it doesn't touch any other route
 */
import express from "express";

const app = express();
app.use(express.json());
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Welcome to home page");
});

app.get("/contact", (req, res) => {
  res.send("Welcome to contact page");
});

app.post("/login", (req, res) => {
  console.log(req.body); // by default this will print undefined because we haven't defined any parser
  // here we can use express parser app.use(express.json());
  res.send("Login received successfully!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

/**
 * Sample curl command to hit the API:
 curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "gaurav", "password": "secret123"}'

 */

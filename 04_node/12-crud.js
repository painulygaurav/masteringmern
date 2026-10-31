/**
 * Why Mongo DB?
 * Easier to manage
 * No SQL
 * Very compatible with NodeJS. Why?
 * Read Write ratio is 1.
 * It has a document and collection
 *
 * Please give internals about MongoDB why it is good and what are disadvantages
 *
 * converts data in to B-tree
 *
 * data read is very fast
 *
 * database drive name is mangoose
 * for database connection you either need an ORM (Object relation manager) or ODM (Object data model)
 * Mangoose is none
 * connection works somewhat like ODB
 *
 * Mangoose will help us connect database to backend
 *
 * I have the URI as below and I have suffixed it with "crud" and it automatically created a database. How?
 */

import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";

const app = express();
app.use(express.json());
dotenv.config();
const PORT = process.env.PORT || 5000;

// rate limit
const message = {
  message:
    "too many request from this ip address please try again after sometimes",
  success: false,
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1, // limit each IP to 5 requests per windowMS
  message,
});

// Three steps:
// 1. Connection to db
// 2. Creating a schema using mongoose.Schema()
// 3. Passing schema to a model using mongoose. model("User", userSchema)
// what does model function return
// model interacts with database
// check whether user exists using User.findOne method
// how the searching takes place
// 4. Create a new User model by passing value to the schema
// 5. user.save method to save the record in the database
// what will be the collection name what is it printed as "users" in terminal after running show collections command
// how does it get _id: attribute and __v attribute autopopulated
// connection to db
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("connected to db");
  })
  .catch((err) => {
    console.log("error while connecting to mongo", err);
  });

// schema building
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
});

// Model
const User = mongoose.model("User", userSchema);

app.post("/api/v1/auth/register", async (req, res) => {
  const { username, email, password } = req.body;
  const userExist = await User.findOne({ email });
  if (userExist)
    return res.status(400).json({ message: "user already exists" });
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashedPassword });
  await user.save();
  res.status(201).json({ message: "user created", user });
});

app.post("/api/v1/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user)
    return res
      .status(404)
      .json({ message: "User is not found. Make account first!" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: "Incorrect password!" });
  res.status(200).json({ message: "login successful", user });
});

app.get("/api/v1/users", limiter, async (req, res) => {
  const users = await User.find();
  if (!users) return res.status(404).json({ message: "No users found" });
  res.status(200).json({ message: "All users fetched", users });
});

// getting a user with id
// returning empty users array
app.get("/api/v1/users/:id", async (req, res) => {
  const { id } = req.params;
  const users = await User.findById(id);
  if (!users) return res.status(404).json({ message: "No users found" });
  res.status(200).json({ message: "The user has been fetched", users });
});

app.put("/api/v1/users/:id", async (req, res) => {
  const { id } = req.params;
  const { username, email, password } = req.body;
  try {
    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : undefined;
    const user = await User.findByIdAndUpdate(
      id,
      { username, email, password: hashedPassword },
      { new: true },
    );
    if (!user) return res.status(404).json({ message: "No user found" });
    res.status(200).json({ message: "User updated", user });
  } catch (err) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.delete("/api/v1/users/:id", async (req, res) => {
  const { id } = req.params;
  const user = await User.findByIdAndDelete(id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(201).json({ message: "user has been deleted", user });
});

app.listen(PORT, () => {
  console.log(`server is up and running on port : ${PORT}`);
});

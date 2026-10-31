# MongoDB + Mongoose + Express CRUD (Auth, Rate Limiting)

## 1. Why MongoDB?

MongoDB is a **document-oriented NoSQL database**. Data is stored as JSON-like documents (BSON) grouped into collections.

| SQL concept  | MongoDB concept       |
| ------------ | --------------------- |
| Database     | Database              |
| Table        | **Collection**        |
| Row          | **Document**          |
| Column       | Field                 |
| JOIN         | `$lookup` / embedding |
| Fixed schema | Flexible schema       |

**Reasons to pick it**

- **Easier to manage early on.** Schema-less documents mean no migrations while the data model is still changing.
- **No SQL.** Queries are JS-style objects (`{ email: "a@b.com" }`).
- **Natural fit with Node.js.** Documents are JSON, so there is no impedance mismatch between DB, backend and frontend: the same object shape flows through all three.
- **Horizontal scaling built in.** Replica sets give high availability, and sharding spreads data across machines.
- **Fast reads on indexed fields.**

### 1.1 Internals

- **Storage engine: WiredTiger** (default since 3.2). Collections and indexes are stored as **B-trees** (the `_id` index is one by default).
- **B-tree** keeps keys sorted and the tree shallow, so a lookup is `O(log n)` with very few disk page reads. Range queries and sorts on an indexed field are also cheap.
- **Documents are stored as BSON**, a binary JSON that adds types (`ObjectId`, `Date`, `Int64`) and supports fast traversal.
- **WiredTiger features:** document-level concurrency control, compression (snappy/zstd), a journal (write-ahead log) for crash recovery, and multi-document ACID transactions (4.0+).
- **Query path:** with no index on the queried field, MongoDB does a **COLLSCAN** (reads every document, `O(n)`). With an index it does an **IXSCAN** (B-tree lookup, `O(log n)`). Check with `.explain("executionStats")`.

### 1.2 Advantages vs Disadvantages

| Advantages                                              | Disadvantages                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Flexible schema, fast iteration                         | No enforced schema by default, so data can become inconsistent (Mongoose/JSON Schema validation compensates) |
| JSON-native, matches Node.js                            | Joins are weak and expensive compared to SQL                                                                 |
| Horizontal scaling (sharding)                           | Data duplication from denormalization, and updates must touch every copy                                     |
| Fast indexed reads and writes                           | Multi-document transactions are costlier than in relational DBs                                              |
| Rich query and aggregation pipeline                     | Not ideal for highly relational data (e.g. banking ledgers)                                                  |
| Embedded documents give one-read access to related data | 16 MB document size limit                                                                                    |

**Rule of thumb:** choose MongoDB when data is hierarchical or evolving and access patterns are known. Choose a relational DB when data is highly relational and needs strict integrity.

---

## 2. Mongoose: ODM, Not a Driver

- The **official driver** is `mongodb` (the native Node.js driver). It speaks the wire protocol to the server.
- **Mongoose** is an **ODM (Object Data Modeling) library** built on top of that driver.
- A relational DB would use an **ORM (Object Relational Mapper)** (Sequelize, Prisma, TypeORM). An ODM is the equivalent for document databases.

| Layer                       | Role                                                   |
| --------------------------- | ------------------------------------------------------ |
| Express route               | Handles HTTP                                           |
| Mongoose (ODM)              | Schemas, validation, models, query builder, middleware |
| MongoDB driver              | Connection pool, wire protocol                         |
| MongoDB server (WiredTiger) | Storage, indexes, B-trees                              |

Mongoose gives us: schemas, validation, type casting, hooks (`pre('save')`), population (`ref`), and a clean query API.

```mermaid
flowchart LR
    Client[Client]:::sysDesign --> Express[Express Routes]:::swArch
    Express --> Mongoose[Mongoose Model]:::swArch
    Mongoose --> Driver[MongoDB Driver]:::swArch
    Driver --> DB[(MongoDB / WiredTiger B-tree)]:::sysDesign

    classDef sysDesign fill:#e8eef6,stroke:#8a9bb5,color:#2d3748,stroke-width:1px;
    classDef swArch fill:#e9f2e8,stroke:#8fa88a,color:#2d3748,stroke-width:1px;
```

---

## 3. The Five-Step Mongoose Flow

1. **Connect** to the DB: `mongoose.connect(URI)`
2. **Define a schema**: `new mongoose.Schema({...})`
3. **Compile a model**: `mongoose.model("User", userSchema)`
4. **Create a document** from the model: `new User({...})`
5. **Persist it**: `user.save()`

```javascript
mongoose.connect(process.env.MONGODB_URI);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);
const user = new User({ username, email, password: hashedPassword });
await user.save();
```

### 3.1 Key Questions Answered

**How did suffixing the URI with `/crud` create a database?**
The path segment in the URI is just the **database name to use**. MongoDB creates databases and collections **lazily**: nothing exists on disk until the first write. When the first document is saved, the `crud` database and the `users` collection are created automatically.

```
mongodb+srv://user:pass@cluster.mongodb.net/crud
                                             ^^^^ database name
```

**What does `mongoose.model()` return?**
A **Model**, which is a class (constructor function) compiled from the schema. It is the interface to one collection. It provides:

- Static query methods: `User.find()`, `User.findOne()`, `User.findById()`, `User.findByIdAndUpdate()`, `User.findByIdAndDelete()`
- Instances (documents) created with `new User()`, which have `save()`, `deleteOne()`, etc.

**Why is the collection called `users`?**
Mongoose takes the model name `"User"`, **lowercases and pluralizes** it, giving `users`. That is what `show collections` prints. To override, pass a third argument: `mongoose.model("User", userSchema, "my_users")`.

**Where do `_id` and `__v` come from?**

- **`_id`**: every document must have a unique `_id` (the primary key). If none is given, Mongoose generates an **ObjectId** _on the client side_ before the insert. An ObjectId is 12 bytes: a 4-byte timestamp, a 5-byte random value, and a 3-byte incrementing counter. So `_id`s are roughly time-sortable and unique across machines without a central coordinator.
- **`__v`**: the **version key**. Mongoose adds it (default `0`) to track document revisions, mainly to guard against concurrent array modifications (a form of optimistic concurrency). It can be disabled with `{ versionKey: false }`.

**How does `findOne({ email })` search?**
The query goes through the driver to the server. **Without an index** on `email`, it does a COLLSCAN and checks every document until a match. **With an index** (e.g. `unique: true`, which builds a unique index), it does a B-tree lookup in `O(log n)`.

> **Important:** `unique: true` is an _index_, not a validator. It is what also protects against two simultaneous registrations with the same email (a race that `findOne` followed by `save` cannot prevent alone).

---

## 4. Express Setup

```javascript
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";

dotenv.config();

const app = express();
app.use(express.json()); // parse JSON request bodies into req.body
const PORT = process.env.PORT || 5000;
```

- `express.json()` is middleware that parses JSON bodies. Without it, `req.body` is `undefined`.
- `dotenv.config()` loads `.env` into `process.env`. Secrets (DB URI) stay out of source control.

---

## 5. Rate Limiting

Limits how many requests one client (by IP) can make in a time window, to protect against brute force, scraping and abuse.

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  limit: 100, // max requests per IP per window (older versions: `max`)
  message: {
    message: "Too many requests from this IP, please try again later",
    success: false,
  },
});

app.get("/api/v1/users", limiter, handler); // applied to one route
// app.use(limiter);                        // or applied to every route
```

- Limiter is **middleware**: it runs before the handler and short-circuits if the limit is exceeded.
- When exceeded it responds with **`429 Too Many Requests`**.
- By default the counter lives in **server memory**, which is fine for a single instance. With multiple instances or restarts, use a shared store such as **Redis**.
- Stricter limits belong on sensitive routes such as **login**, which is the brute-force target.

---

## 6. Password Hashing with bcrypt

```javascript
const hashedPassword = await bcrypt.hash(password, 10); // 10 = salt rounds (cost factor)
const isMatch = await bcrypt.compare(password, user.password);
```

- Passwords are **hashed**, never stored in plain text and never encrypted (hashing is one-way).
- bcrypt generates a random **salt** per password and embeds it in the output, so identical passwords produce different hashes.
- **Cost factor 10** means 2^10 iterations. It is deliberately slow, which makes brute force expensive. Raise it as hardware improves.
- `bcrypt.compare` re-hashes the input using the salt stored in the hash and compares.

---

## 7. CRUD Routes

Routes follow the REST contract: **method** states the intent, **status code** states the outcome.

```javascript
// REGISTER
app.post("/api/v1/auth/register", async (req, res) => {
  const { username, email, password } = req.body;
  const userExist = await User.findOne({ email });
  if (userExist)
    return res.status(409).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, password: hashedPassword });
  res.status(201).json({
    message: "User created",
    user: { id: user._id, username: user.username, email: user.email },
  });
});

// LOGIN
app.post("/api/v1/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user)
    return res
      .status(404)
      .json({ message: "User not found. Create an account first." });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

  res.status(200).json({
    message: "Login successful",
    user: { id: user._id, username: user.username, email: user.email },
  });
});

// READ ALL
app.get("/api/v1/users", limiter, async (req, res) => {
  const users = await User.find().select("-password");
  if (users.length === 0)
    return res.status(404).json({ message: "No users found" });
  res.status(200).json({ message: "All users fetched", users });
});

// READ ONE
app.get("/api/v1/users/:id", async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json({ message: "User fetched", user });
});

// UPDATE
app.put("/api/v1/users/:id", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const update = { username, email };
    if (password) update.password = await bcrypt.hash(password, 10);

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
    }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User updated", user });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// DELETE
app.delete("/api/v1/users/:id", async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json({ message: "User deleted" });
});

app.listen(PORT, () => console.log(`Server running on port: ${PORT}`));
```

### 7.1 Route Summary

| Route            | Method | Success                        | Failure                                              |
| ---------------- | ------ | ------------------------------ | ---------------------------------------------------- |
| `/auth/register` | POST   | `201 Created`                  | `409 Conflict` (duplicate)                           |
| `/auth/login`    | POST   | `200 OK`                       | `404` (no user), `401 Unauthorized` (wrong password) |
| `/users`         | GET    | `200 OK`                       | `404` (empty)                                        |
| `/users/:id`     | GET    | `200 OK`                       | `404 Not Found`                                      |
| `/users/:id`     | PUT    | `200 OK`                       | `404`, `500`                                         |
| `/users/:id`     | DELETE | `200 OK` (or `204 No Content`) | `404`                                                |

### 7.2 Mongoose Query Methods

| Method                                         | Returns                    | Notes                                                          |
| ---------------------------------------------- | -------------------------- | -------------------------------------------------------------- |
| `find(filter)`                                 | Array (empty `[]` if none) | An empty array is **truthy**, so check `.length`, not `!users` |
| `findOne(filter)`                              | Document or `null`         | First match                                                    |
| `findById(id)`                                 | Document or `null`         | Shorthand for `findOne({ _id: id })`                           |
| `findByIdAndUpdate(id, update, { new: true })` | Updated doc                | Without `new: true` it returns the **old** document            |
| `findByIdAndDelete(id)`                        | Deleted doc or `null`      |                                                                |
| `create(obj)`                                  | Saved document             | `new Model(obj)` + `save()` in one call                        |

### 7.3 Things to Remember

- **Never return the password hash** in a response. Use `.select("-password")` or return an explicit subset.
- **`find()` never returns `null`**; "no users" is an empty array.
- **Invalid ObjectId** strings passed to `findById` throw a `CastError`. Validate with `mongoose.isValidObjectId(id)` or wrap in try/catch.
- **Async errors in Express 4** are not caught automatically; wrap handlers in try/catch (Express 5 forwards rejected promises to the error handler).
- **Status codes are part of the contract**: `201` for creation, `409` for conflict, `401` for bad credentials, `429` for rate limit.

---

## 8. Interview Takeaways

- **"Why MongoDB?"** Flexible JSON-like documents, JS-native, horizontal scaling, fast indexed reads. Weak at joins and highly relational data.
- **"How does MongoDB store and find data?"** WiredTiger storage engine; collections and indexes are B-trees; indexed lookups are `O(log n)`, unindexed are a full COLLSCAN.
- **"ORM vs ODM?"** ORM maps objects to relational tables. ODM maps objects to documents. Mongoose is an ODM over the native driver.
- **"How is the database created?"** Lazily, on the first write.
- **"What is `_id`?"** Primary key, an ObjectId generated client-side (timestamp + random + counter). **`__v`** is Mongoose's version key.
- **"How do you store passwords?"** Salted hash (bcrypt), compared with `bcrypt.compare`, never plain text.
- **"Why rate limit?"** Brute-force and abuse protection; returns `429`; use Redis as the shared store across instances.
- **Follow-ups to expect:** indexes and compound indexes, `explain()`, embedding vs referencing, sharding vs replication, CAP theorem placement of MongoDB, JWT-based auth after login.

---

## 9. Connection to Earlier Concepts

- **REST contract:** every route above honors the method and status-code contract (POST creates `201`, missing resource `404`, unauthenticated `401`). Violating it (e.g. `200` with an error body) breaks clients, tests and tooling.
- **Closures:** `limiter` is created once and closed over by the route registrations, carrying its window state and config into every request.
- **Middleware chain:** `express.json()` → `limiter` → handler is the same composition idea as React's component tree, where each layer receives input, transforms or blocks it, and passes it on.

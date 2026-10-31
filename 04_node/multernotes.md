# Multer: File Uploads in Express (Multipart, Disk Storage, Cloud Upload Flow)

## 1. The Problem Multer Solves

`express.json()` only parses **JSON bodies** (`Content-Type: application/json`). A form that includes a PDF, JPEG or PNG is sent as **`multipart/form-data`**, which `express.json()` cannot read.

**Multipart body:** the request body is split into **parts**, one per form field. A part can be plain text or a file's raw bytes. Parts are separated by a **boundary** string that the client puts in the `Content-Type` header.

```
POST /api/v1/profile
Content-Type: multipart/form-data; boundary=----XYZ

------XYZ
Content-Disposition: form-data; name="dp"; filename="archimage.png"
Content-Type: image/png

<raw PNG bytes>
------XYZ--
```

**Multer** is the middleware that:

1. Reads and parses the multipart body (it is built on **busboy**, a streaming parser).
2. Saves the file (to disk or RAM) according to the storage engine you configure.
3. Populates `req.file` (or `req.files`) with the file's details and `req.body` with the text fields.
4. **Ignores any request that is not `multipart/form-data`** and calls `next()` untouched.

| Body type          | Content-Type                        | Parsed by              |
| ------------------ | ----------------------------------- | ---------------------- |
| JSON               | `application/json`                  | `express.json()`       |
| URL-encoded form   | `application/x-www-form-urlencoded` | `express.urlencoded()` |
| Files / mixed form | `multipart/form-data`               | **Multer**             |

---

## 2. Where Multer Fits: the Upload Flow

Multer holds the file **temporarily** while the request is being processed. The permanent home of the file is cloud storage, and the database stores only a **URL**.

```mermaid
flowchart LR
    Client[Client form with file]:::sysDesign --> Multer[Multer saves to ./uploads]:::swArch
    Multer --> Handler[Route handler reads req.file.path]:::swArch
    Handler --> Cloud[Upload to Cloudinary]:::sysDesign
    Cloud --> URL[Receive hosted URL]:::sysDesign
    URL --> DB[(Store URL in MongoDB)]:::sysDesign
    URL --> Clean[Delete local temp file]:::swArch

    classDef sysDesign fill:#e8eef6,stroke:#8a9bb5,color:#2d3748,stroke-width:1px;
    classDef swArch fill:#e9f2e8,stroke:#8fa88a,color:#2d3748,stroke-width:1px;
```

**Why not store the file in the database?**

- Multer saves the file's **raw bytes unchanged** (no compression, no encoding). Putting those bytes in MongoDB would bloat the database, and documents have a **16 MB limit**.
- Databases are optimized for structured queries, not serving large binaries.
- Object storage and CDNs (Cloudinary, S3) are built for serving media: caching, resizing, global delivery.
- So the DB holds a small string (the URL), and the cloud holds the heavy bytes.

**Why the local copy matters:** the temp file is only a **staging area**. After the cloud upload succeeds, delete it, or the server's disk fills up.

---

## 3. Storage Engines

| Engine                   | Where the file lives          | `req.file` gives                  | Use when                                                            |
| ------------------------ | ----------------------------- | --------------------------------- | ------------------------------------------------------------------- |
| `multer.diskStorage()`   | A folder on the server's disk | `path`, `filename`, `destination` | Files are large, or you'll upload them onward afterward (this note) |
| `multer.memoryStorage()` | RAM as a `Buffer`             | `buffer`                          | Files are small and you stream them straight to cloud storage       |

Trade-off: disk storage is safer for large files (no memory pressure). Memory storage avoids disk I/O but a few concurrent big uploads can exhaust RAM.

---

## 4. Code Walkthrough

```javascript
import express from "express";
import multer from "multer";
import path from "path"; // built-in Node module, no install needed

const app = express();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "_" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "_" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({ storage });

app.post("/api/v1/profile", upload.single("dp"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file received" });
  res.status(201).json({ message: "File uploaded", file: req.file.filename });
});

app.listen(3000, () => console.log("server is running"));
```

### 4.1 The `path` Module

Built-in Node module for working with file paths and names.

| Call                                  | Result                                   |
| ------------------------------------- | ---------------------------------------- |
| `path.extname("archimage.png")`       | `".png"` (includes the dot)              |
| `path.basename("/a/b/archimage.png")` | `"archimage.png"`                        |
| `path.join("uploads", "x.png")`       | `"uploads/x.png"` (OS-correct separator) |

Without re-appending the extension, the file is saved with no extension, and the OS and browsers cannot tell it is an image.

### 4.2 `diskStorage` Options and the `cb` Pattern

Both `destination` and `filename` are functions that receive `(req, file, cb)`. You return your answer through the **callback**, not with `return`.

```
cb(error, value)
cb(null, "./uploads")      // null = no error, second arg = the answer
cb(new Error("bad file"))  // pass an error to reject
```

This is the classic **Node error-first callback** convention. Multer waits for the callback, so these functions can do async work (e.g. look up the user) before answering.

**`destination`**

- The path is **relative to the folder you start `node` from** (`process.cwd()`), not relative to the source file.
- When `destination` is a **function**, Multer **does not create the folder**. It must already exist, or the upload fails with `ENOENT`. (When `destination` is a **string**, Multer creates it.)
- Fix: `fs.mkdirSync("./uploads", { recursive: true })` at startup.

**`filename`** receives `file` with:

| Property            | Example           | Meaning                          |
| ------------------- | ----------------- | -------------------------------- |
| `file.fieldname`    | `"dp"`            | Form field name (`-F "dp=@..."`) |
| `file.originalname` | `"archimage.png"` | Name on the user's machine       |
| `file.mimetype`     | `"image/png"`     | Type declared by the client      |

**Why a unique filename?** If two users upload `photo.png`, the second would **overwrite** the first. `Date.now()` plus a random number makes collisions practically impossible. Example result: `dp_1782941830201_639402847.png`.

**Security note:** never use `file.originalname` directly as the stored name. It is client-controlled (path traversal like `../../x`, odd characters, overwrites). Generate the name yourself and use only the **extension** from the original.

### 4.3 The Upload Middleware Variants

```javascript
upload.single("dp"); // ONE file from field "dp"       -> req.file
upload.array("photos", 5); // MANY files, same field, max 5  -> req.files (array)
upload.fields([
  // MANY fields, each with files   -> req.files (object)
  { name: "avatar", maxCount: 1 },
  { name: "gallery", maxCount: 8 },
]);
upload.none(); // text fields only, reject files
```

`upload.single("dp")` is just **middleware**. It runs **before** your handler, parses the body, saves the file, fills `req.file`, then calls `next()`.

### 4.4 What `req.file` Contains

```javascript
{
  fieldname: "dp",
  originalname: "archimage.png",
  encoding: "7bit",
  mimetype: "image/png",
  destination: "./uploads",
  filename: "dp_1782941830201_639402847.png",
  path: "uploads/dp_1782941830201_639402847.png",
  size: 48213 // bytes
}
```

**Silent failure to remember:** if no file arrives (wrong field name, or the request is not `multipart/form-data`), Multer does **not** throw. It skips and leaves `req.file` as `undefined`. Always check `req.file`. A **wrong field name** that doesn't match `upload.single(...)` is different: it throws `MulterError: Unexpected field`.

---

## 5. Hardening the Upload

```javascript
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPEG or WebP images are allowed"));
  },
});
```

| Concern                                | Defence                                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Huge uploads exhausting disk or memory | `limits.fileSize`, `limits.files`                                                                           |
| Wrong file types                       | `fileFilter` (note `mimetype` is client-declared, so for real security also inspect the file's magic bytes) |
| Name collisions and path tricks        | Server-generated filenames                                                                                  |
| Temp files piling up                   | Delete after cloud upload (and on failure)                                                                  |
| Abuse                                  | Rate limiting on the upload route                                                                           |

**Handling Multer errors:** limit violations throw a `MulterError` (e.g. `LIMIT_FILE_SIZE`). Catch it in an Express **error-handling middleware** `(err, req, res, next)` and respond with `400` or `413 Payload Too Large`.

---

## 6. Completing the Flow: Cloud Upload, Store URL, Clean Up

```javascript
import fs from "fs/promises";
import { v2 as cloudinary } from "cloudinary";

app.post("/api/v1/profile", upload.single("dp"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file received" });

  try {
    const result = await cloudinary.uploader.upload(req.file.path);
    await User.findByIdAndUpdate(req.user.id, { avatarUrl: result.secure_url });
    res
      .status(201)
      .json({ message: "Profile picture updated", url: result.secure_url });
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  } finally {
    await fs.unlink(req.file.path); // always remove the temp file, success or failure
  }
});
```

The `finally` block guarantees the local temp file is removed even if the cloud upload throws.

---

## 7. Testing with curl

```bash
curl -X POST -F "dp=@/Users/gaurav.painuly/Downloads/archimage.png" \
  http://localhost:3000/api/v1/profile
```

| Part | Meaning                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------- |
| `-F` | Sends a form field as `multipart/form-data`; curl sets the `Content-Type` header (with boundary) itself |
| `dp` | The field name, which **must match** `upload.single("dp")`                                              |
| `@`  | Send the **contents** of the file at that path, not the path as text                                    |

---

## 8. Interview Takeaways

- **"What is Multer?"** Express middleware for `multipart/form-data`. It parses the body, stores the file, and exposes it as `req.file` / `req.files`.
- **"Why can't `express.json()` handle files?"** It only parses JSON. Files need multipart encoding, where each field is a separate part with its own headers and raw bytes.
- **"Disk vs memory storage?"** Disk writes to a folder (good for large files and staging). Memory holds a `Buffer` in RAM (good for small files streamed onward, risky at scale).
- **"Why not store images in the database?"** It bloats the DB, hits the 16 MB document limit, and is poor at serving media. Store media in object storage/CDN and keep only the URL in the DB.
- **"What does `cb(null, value)` mean?"** Node's error-first callback: first argument is the error (`null` for none), second is the result.
- **"What happens if no file is sent?"** Multer doesn't throw. `req.file` is `undefined`, so check it and return `400`.
- **"How do you secure uploads?"** Size limits, `fileFilter`, server-generated filenames, validate real file type, rate limit, clean up temp files.
- **Follow-ups to expect:** streaming uploads straight to S3 (e.g. with `memoryStorage` or a stream-based engine), presigned URLs (client uploads directly to cloud, bypassing your server), chunked or resumable uploads for large files, and virus scanning.

---

## 9. Connection to Earlier Concepts

- **Middleware chain:** `upload.single("dp")` sits in the chain just like `express.json()` and the rate `limiter`: it runs before the handler, transforms the request (adds `req.file`), then calls `next()`.
- **REST contract:** respond with the right codes: `201` for a created upload, `400` for a missing file, `413` for too large, `500` for a failed cloud upload.
- **MongoDB + Mongoose:** after the cloud upload, store only the returned URL on the user document (`avatarUrl`), keeping documents small and fast to read.
- **Closures and callbacks:** the `destination` and `filename` functions are callbacks handed to Multer, which invokes them later with the request and file details. The `cb` function is how your answer travels back into Multer's internals.

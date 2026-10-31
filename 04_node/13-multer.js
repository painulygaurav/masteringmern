/**
 * MULTER: A form can have PDF, JPEG, so multer helps in holding that media for the time I has not been stored in database.
 * Once the file has been uploaded to cloudnary and whatever url that cloudnary will give me that URL I am going to store in the database then I'll remove it from local.
 * By default multer compressed the file into encoded format to prevent the storage of actual png file in database (mongodb in our case).
 *
 * express.json() can only read JSON bodies. Files are sent as "multipart/form-data"
 * (the body is split into parts, one part per form field, and a part can hold a file's bytes).
 * Multer is the middleware that reads that multipart body, saves the file and puts its details on req.file.
 * Multer ignores any request that is not multipart/form-data.
 */

import express from "express";
import multer from "multer";
// path is a built-in Node module (no npm install needed) for working with file paths and file names
// e.g. path.extname, path.basename, path.join
import path from "path";

const app = express();

// diskStorage = save uploaded files to a folder on this machine
// (multer.memoryStorage() would keep the file in RAM as a Buffer instead)
const storage = multer.diskStorage({
  // 1. Where to store the file
  // cb (callback) is how we hand our answer back to multer: cb(error, value)
  // null means "no error", second argument is the actual value
  destination: function (req, file, cb) {
    // relative to the folder you start node from (not this file's folder)
    // multer does NOT create this folder when destination is a function, it must already exist
    cb(null, "./uploads");
  },
  // 2. What to name the file
  // file has details about the uploaded file, e.g.
  // file.fieldname    -> "dp" (the form field name from curl -F "dp=@...")
  // file.originalname -> "archimage.png" (name of the file on the user's machine)
  // file.mimetype     -> "image/png"
  filename: function (req, file, cb) {
    // Date.now() + a random number so two uploads never get the same name and overwrite each other
    const uniqueSufix = Date.now() + "_" + Math.round(Math.random() * 1e9);

    // path.extname returns the extension of a file name including the dot
    // path.extname("archimage.png") -> ".png"
    // without it the file is saved with no extension and the OS doesn't know it is an image
    // Generates a name like: dp_1782941830201_639402847.png
    cb(
      null,
      file.fieldname + "_" + uniqueSufix + path.extname(file.originalname),
    );
  },
});

const upload = multer({ storage: storage });

// upload.single("dp") is middleware: it runs before our handler,
// accepts ONE file from the form field named "dp" and saves it using the storage above
// (upload.array("dp") would accept many files and give req.files instead)
app.post("/api/v1/profile", upload.single("dp"), (req, res) => {
  // After saving, multer puts the file details on req.file
  // (fieldname, originalname, mimetype, destination, filename, path, size)
  // If no file came in (wrong field name, or request not multipart/form-data)
  // multer does not throw an error, it just skips and req.file stays undefined.
  // So we check req.file to know if the upload really happened.
  res.send(req.file ? "file uploaded" : "no file received");
});

/**
 * curl -X POST -F "dp=@/Users/gaurav.painuly/Downloads/archimage.png" http://localhost:3000/api/v1/profile
 *
 * -F    sends a form field as multipart/form-data (curl sets the Content-Type header itself)
 * dp    the field name, must match upload.single("dp")
 * @     tells curl to send the contents of the file at that path, not the path as text
 */

app.listen(3000, () => {
  console.log("server is running");
});

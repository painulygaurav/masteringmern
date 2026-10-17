import fs from "fs";

// write file operation
// create a file if doesn't exist and overwrite incase file exist
// fs.writeFileSync("gaurav.txt", "Hello from Gaurav");

// fs.writeFile("log.txt", `User has logged in at ${Date.now()}`, (err, data) => {
//   if (err) return err;
//   console.log("File written successfully");
// });
// fs.appendFile(
//   "log.txt",
//   `User has logged in at ${Date.now()}\n`,
//   (err, data) => {
//     if (err) return err;
//     console.log("File appended successfully");
//   },
// );

// fs.readFile("log.txt", "utf-8", (err, data) => {
//   if (err) return err;
//   console.log("Content of file read successfully!" + data);
// });

fs.unlink("log.txt", (err) => {
  if (err) return err;
  console.log("File deleted successfully");
});

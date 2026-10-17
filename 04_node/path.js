import path from "path";

// console.log(path.extname("/sample_file.txt"));
// console.log(path.dirname("./sample_file.txt"));
console.log(path.parse("./sample_file.txt"));
console.log(path.resolve("./sample_file.txt"));
console.log(path.isAbsolute("./sample_file.txt"));

"use strict";
// function greet(name: string): string {
//   return "Hello " + name;
// }
// console.log(greet("Gaurav"));
/**
 * Example of any being unsafe
 */
// let value: any = "hello";
// // value(); fails at run time
// value.trim();
// //value.toFixed(); fails at run time
// console.log(`Value: ${value}`);
/**
 * Unknown example
 */
// let input: unknown = "Ada";
// // input.trim(); // Error!
// console.log(`Input is: ${input}`);
/**
 * Making unknown usable
 */
// function analyzeType(input: unknown): void {
//   if (typeof input === "string") {
//     console.log("Uppercased string: " + input.toUpperCase());
//   } else if (input instanceof Date) {
//     console.log("Date timestamp:" + input.getTime());
//   } else if (typeof input === "object" && input !== null && "length" in input) {
//     console.log("Array length:", input.length);
//   } else {
//     console.log("Unknown type");
//   }
// }
// analyzeType("hello");
// analyzeType(new Date());
// analyzeType([1, 2, 3]);
// analyzeType(42);
/**
 * Type Assertion:
 */
let input = "42";
const name1 = input;
const name2 = input;
console.log(`Name1: ${name1} Name2: ${name2}`);

/**
 * Take the following example:
 * Client is sending 500rs to server as a transaction with http (not https)
 * Client -------------500rs //http -----------> Server
 * Let's assume there is a man in the middle attack. Attackers want to intercept your request because it goes on a plain text.
 * Attacker modifies it to 50000rs and client will never know and server will never be able to verify that it was sent by client only.
 * So it should not be in the plain text.
 * So we made the http more secure.
 *
 * Here is the flow:
 * Client -----------------pre-flight/no payload------------------> server : to make handshaking to ensure that everything is good (please explain in a better technical terms)
 * Client ------------------------- request with TLS blocking (encrypted request) (https ) ---------------------------> (decrypted using key that was exposed while handshaking) server
 *
 * TLS - encryption protocol
 *
 * push architecture, pull architecture
 *
 * web socket tunnel connection for continuous updates like score updates in crickbuzz.com
 *
 * in push architecture websocket comes into the picture
 * in pull architecture there comes a technique called polling (short and long)
 * for example I want trade information every second and server gets that new data as well on it's end so I want to have that data available to me every second
 * so after every second I need to make request to the server then the response will be pushed this is known as short polling. It means I am sending many request within a short duration
 *
 * long polling I am sending this data in 1 hour or longer duration
 *
 * short polling is usually expensive so we make a permanent connect (bi-directional tunnel) using websocket
 *
 * websocket flow
 * Point1 --------------------pre-flight-------------------> Point2
 * switch protocol request
 * -------http connection + header (upgrade header) (101 -> switch protocol, upgrade http -> websocket) ------->
 * then this simple http connect will turn into a permanent tunnel (bi-directional) connection
 * include a header example as well
 *
 * normal http connection terminate after request and response cycle but this permanent connect will keep on live until you terminate it
 */

import http from "http";

/**
 * Import http methods
 * GET, POST, PURGE, OPTIONS, BIND, PATCH, PUT
 * Import http status codes
 *
 * 101 - Switching protocols
 * 200 - ok
 * 201 - created
 * 202 - accepted
 * redirection
 * 300 - multiple choices
 * 301 - moved permanently
 *
 * failure (problem from client)
 * 400 - bad request
 * 401 - unauthorized
 * 402 - payment required
 * 403 - Forbidden
 *
 * server side error
 * 500 - internal server error
 */

const PORT = 3000;
const server = http.createServer((req, res) => {
  console.log(req.url);
  // output: / -> root
  // /favicon.ico that is the icon you see on the page tab

  console.log(req.method);

  /**
   * /
GET
/favicon.ico
GET
   */
  res.setHeader("Content-Type", "text/html");
  res.setHeader("author", "Gaurav");
  res.statusCode = 200;
  // you can have any code here but each code has a meaning defined in http. For example I can put 700 here but it will be unknown

  // let's now try to create support for different urls
  if (req.url === "/") {
    res.end("Welcome to the home page"); // this will terminate the request
  } else if (req.url === "/contact") {
    res.end("Welcome to the contact page!");
  } else if (req.url === "/about") {
    res.end("Welcome to the about page!");
  } else {
    res.statusCode = 404;
    res.end("404: Page not found!");
  }
});

// Now you have created a server and now you need to give it a place to run that is port number
// Start the server
server.listen(PORT, () => {
  console.log("server started at port 3000");
});

/**
 * Problem with this and why we need Express
 * 1. IOC: I have one single call back and all routes are in this callback. If it fails the whole api stack goes down
 * 2. Complexity: As the complexity increases this code will be diffucult to maintain
 * 3. Open - close principal: This code is not following open close principal which means open to change but close to modify. We shouldn't be modifying the existing function and it is violating that.
 * 4. Nodejs directly doesn't provide middleware.
 *
 * So we need to use express that also provide middleware. Express is using nodejs only but it is abstracting for us.
 */

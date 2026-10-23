import http from "http";

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => {
    // chunk is a Buffer (raw bytes), keep it as bytes for now.
    // Don't do `body += chunk`: that calls chunk.toString() on EACH chunk
    // separately. A multi-byte character (e.g. "€" = E2 82 AC) can be split
    // across two chunks, and decoding each half alone gives "�" instead of "€".
    chunks.push(chunk);
  });

  req.on("end", () => {
    // join all the bytes first, then decode once, so split characters stay intact.
    // convert the incoming data into a string and add it to the request body
    req.body = Buffer.concat(chunks).toString();
    console.log("body:" + req.body);
    console.log("url:" + req.url);
    console.log("method" + req.method);
    console.log("header" + req.headers);
    res.writeHead(200, {
      "Content-Type": "application/json",
      author: "Gaurav",
      "Access-Control-Allow_Origin": "*",
    });

    res.end(
      JSON.stringify({
        message: "hello world",
        body: Buffer.concat(chunks).toString(),
      }),
    );
  });
  req.on("error", (err) => {
    console.log("error", err);
    res.writeHead(400, { "Content-Type": "application/json" });
  });
});

server.listen(3000, () => {
  console.log("Server is up and running");
});

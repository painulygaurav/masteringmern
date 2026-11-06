import express from "express";

const app = express();

app.listen(3000, () => {
  console.log("Server is running");
});

/**
 * Redis
 * Redis is an open source in-memory data structure store used primarily as cache.
 * Supports String, Hash, List, Set, Ordered Set, Persistence (can dump to disk or log every write in case server restarts)
 * Usecases:
 * Caching: Storing frequently accessed information to reduce load on the primary databases and speed up application response time.
 * Session management: Holding user session state across distributed web server.
 * Pub/Sub Message Queuing
 * Rate limiting
 *
 * Caching can never replace database.
 * Caching is primarity a volatile space. it is driven by TTL (Time to live)
 * Cache stampede: When every user is hitting on cache but the data is not there and all those users start hitting database this is known as cache stampede
 *
 */

# JWT Authentication in Express (Login, Token Signing, Verification Middleware)

## 1. The Problem: HTTP Is Stateless

Every HTTP request is independent. The server does not remember that you logged in a moment ago. There are two classic ways to carry "who you are" across requests:

| Approach              | Where identity lives                                                        | Cost per request                       | Scaling                                     |
| --------------------- | --------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| **Session-based**     | Server memory/DB/Redis keeps session data; client holds a session ID        | Session store lookup                   | Needs shared session store across instances |
| **Token-based (JWT)** | The token itself carries the claims; the server only verifies its signature | CPU-only signature check, no DB lookup | Stateless; any instance can verify          |

**Password vs token:** the password proves identity **once**, at login. After that, the token proves it on every request, so there is no bcrypt check or DB lookup each time.

---

## 2. What a JWT Is

**JWT (JSON Web Token)** is a compact, URL-safe string made of **three Base64URL-encoded parts** separated by dots:

```
xxxxx.yyyyy.zzzzz
header.payload.signature
```

| Part          | Contains                                                      | Example                                                                                            |
| ------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Header**    | Algorithm and token type                                      | `{ "alg": "HS256", "typ": "JWT" }`                                                                 |
| **Payload**   | Claims (data about the user and the token)                    | `{ "userId": "64f...", "email": "a@b.com", "role": "user", "iat": 1782941830, "exp": 1783028230 }` |
| **Signature** | `HMAC_SHA256(base64(header) + "." + base64(payload), secret)` | Proves the token was not altered                                                                   |

### 2.1 Signed, Not Encrypted

- Base64URL is an **encoding**, not encryption. **Anyone can decode the payload** (paste a token into jwt.io).
- The signature guarantees **integrity and authenticity**: only someone holding the secret could have produced it, and any edit to header or payload invalidates it.
- Therefore **never put sensitive data** (passwords, card numbers) in the payload. Put only identifiers and minimal claims (`userId`, `role`).

### 2.2 Standard Claims

| Claim         | Meaning                                           |
| ------------- | ------------------------------------------------- |
| `iat`         | Issued at (added automatically by `jsonwebtoken`) |
| `exp`         | Expiry time (set via `expiresIn`)                 |
| `sub`         | Subject (the user the token is about)             |
| `iss` / `aud` | Issuer / intended audience                        |

### 2.3 Symmetric vs Asymmetric Signing

|      | HS256 (symmetric)                                 | RS256 (asymmetric)                                                      |
| ---- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| Keys | One shared secret signs **and** verifies          | Private key signs, public key verifies                                  |
| Fits | Single backend that both issues and verifies      | Many services verify, only one issues (microservices, third-party auth) |
| Risk | Any service that can verify can also forge tokens | Verifiers cannot forge                                                  |

This note uses **HS256** (the `jsonwebtoken` default).

---

## 3. The Full Auth Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Express Server
    participant DB as MongoDB

    Note over C,DB: 1. Login (password used only here)
    C->>S: POST /auth/login {email, password}
    S->>DB: User.findOne({ email })
    DB-->>S: user document
    S->>S: bcrypt.compare(password, user.password)
    alt password wrong
        S-->>C: 401 Unauthorized, no token created
    else password matches
        S->>S: jwt.sign(payload, JWT_SECRET, { expiresIn })
        S-->>C: 200 OK + token
    end

    Note over C,DB: 2. Every later request (no password)
    C->>S: GET /users with Authorization: Bearer token
    S->>S: verifyToken: jwt.verify(token, JWT_SECRET)
    alt invalid or expired
        S-->>C: 401 Unauthorized
    else valid
        S->>S: req.user = decoded payload, next()
        S->>DB: handler runs
        S-->>C: 200 OK + data
    end
```

**Order matters:** `bcrypt.compare()` runs **before** `jwt.sign()`. A wrong password yields `401` and **no token is ever created**.

---

## 4. Step 1: Login and Token Signing

```javascript
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

app.post("/api/v1/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return res.status(401).json({ message: "Invalid email or password" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return res.status(401).json({ message: "Invalid email or password" });

  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );

  res.cookie("jwt-token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.status(200).json({ message: "Login successful", token });
});
```

### 4.1 `jwt.sign(payload, secret, options)`

| Argument            | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `payload`           | Claims to embed (keep small, non-sensitive)                        |
| `secret`            | Server-side key used to compute the signature                      |
| `options.expiresIn` | Token lifetime (`"15m"`, `"1d"`, or seconds). Adds the `exp` claim |

### 4.2 The Secret

- The secret is **not the user's password**. It is **one server-side key used to sign tokens for all users**.
- Anyone who learns it can **forge a valid token for any user** (including an admin), so treat it like a root credential.
- It belongs in `.env` as `JWT_SECRET`, never hard-coded or committed. Use a long random value (e.g. `openssl rand -hex 64`).
- Rotating the secret **invalidates every issued token**, which is the emergency kill switch.

### 4.3 Expiry

A JWT is **valid until `exp`, and the server cannot revoke it** (it keeps no record). So:

- Always set `expiresIn`. A token with no expiry is valid forever.
- Shorter lifetime means a smaller damage window if stolen.
- The cookie's `maxAge` only controls how long the **browser keeps** the cookie. It does not make the token itself expire. Set both, and keep them aligned.

### 4.4 Role in the Payload

The `role` claim lets the server make authorization decisions without a DB read. It should come from the **stored user record** (add a `role` field to the schema, default `"user"`), never be hard-coded or taken from the request body.

```javascript
const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["user", "admin"], default: "user" },
});
```

### 4.5 Same Error for Both Failures

Return the **same message** (`"Invalid email or password"`) for "user not found" and "wrong password". Different messages let an attacker **enumerate which emails are registered**.

---

## 5. Delivering the Token: Cookie vs Authorization Header

Two delivery channels exist. Pick one deliberately.

|                               | `httpOnly` cookie                                          | `Authorization: Bearer` header                           |
| ----------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| Sent automatically by browser | Yes                                                        | No, client JS must attach it                             |
| Readable by JavaScript        | **No** (`httpOnly`)                                        | Yes (stored in memory or `localStorage`)                 |
| XSS risk                      | Token cannot be stolen by injected script                  | Token can be stolen if stored in `localStorage`          |
| CSRF risk                     | **Yes** (browser auto-sends it), mitigated with `sameSite` | No (not auto-sent)                                       |
| Best for                      | Browser apps                                               | Mobile apps, third-party API clients, service-to-service |

### 5.1 Cookie Options

| Option               | Effect                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `httpOnly: true`     | JavaScript (`document.cookie`) cannot read it, which defends against XSS token theft                                                      |
| `secure: true`       | Cookie is sent **only over HTTPS**                                                                                                        |
| `sameSite: "strict"` | Cookie is sent only for same-site requests, which defends against CSRF (`"lax"` allows top-level navigations, `"none"` requires `secure`) |
| `maxAge`             | Lifetime in milliseconds                                                                                                                  |

### 5.2 Consequence for Reading the Token

- If the token is delivered as a **cookie**, the server reads it from `req.cookies` (needs the `cookie-parser` middleware) and the browser sends it automatically.
- If delivered in the **response body**, the client stores it and sends it in the `Authorization` header.
- Returning the token in the body **and** in an `httpOnly` cookie exposes it to JavaScript anyway, which cancels the cookie's XSS protection. For a browser app, send it **only** in the cookie.

---

## 6. Step 2: The `verifyToken` Middleware

```javascript
const verifyToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or malformed token" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

app.get("/api/v1/users", verifyToken, async (req, res) => {
  const users = await User.find().select("-password");
  res.status(200).json({ message: "All users fetched", users });
});
```

### 6.1 What It Does, Step by Step

1. Read `Authorization` header. Expected format: `Bearer <token>`.
2. Reject with `401` if missing or not starting with `"Bearer "`.
3. `split(" ")[1]` extracts the token string.
4. `jwt.verify(token, secret)` recomputes the signature and checks `exp`. It **returns the decoded payload** on success and **throws** on failure.
5. On success, attach the payload to **`req.user`** and call `next()`, so downstream handlers know who is calling.
6. On failure, respond `401` and **do not call `next()`**.

`jwt.verify` throws different errors: `TokenExpiredError` (past `exp`), `JsonWebTokenError` (bad signature or malformed), `NotBeforeError`. Catch them all and return `401`.

### 6.2 `jwt.decode` vs `jwt.verify`

|                         | `jwt.decode(token)` | `jwt.verify(token, secret)` |
| ----------------------- | ------------------- | --------------------------- |
| Checks signature        | **No**              | Yes                         |
| Checks expiry           | No                  | Yes                         |
| Safe for auth decisions | **Never**           | Yes                         |

Using `decode` for auth lets anyone hand-craft a token with any payload.

### 6.3 Making `verifyToken` Work With the Cookie

```javascript
import cookieParser from "cookie-parser";
app.use(cookieParser());

const token =
  req.cookies["jwt-token"] ?? req.headers.authorization?.split(" ")[1];
```

---

## 7. Authentication vs Authorization

|              | Authentication (AuthN)                            | Authorization (AuthZ)           |
| ------------ | ------------------------------------------------- | ------------------------------- |
| Question     | **Who are you?**                                  | **What are you allowed to do?** |
| Done by      | `verifyToken` (valid token, populates `req.user`) | Role/permission check after it  |
| Failure code | `401 Unauthorized`                                | `403 Forbidden`                 |

Role-based access control built as a second middleware that **runs after** `verifyToken`:

```javascript
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

app.delete(
  "/api/v1/users/:id",
  verifyToken,
  requireRole("admin"),
  deleteUserHandler,
);
```

This is a **middleware factory**: `requireRole("admin")` returns the actual middleware, which closes over the `roles` array.

---

## 8. Worked Example

**Login request:**

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"pass123"}'
```

**Response:**

```json
{ "message": "Login successful", "token": "eyJhbGciOiJIUzI1NiIs..." }
```

**Protected request:**

```bash
curl http://localhost:5000/api/v1/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

| Scenario                                    | Result                                 |
| ------------------------------------------- | -------------------------------------- |
| No header                                   | `401`                                  |
| `Authorization: eyJ...` (missing `Bearer `) | `401`                                  |
| Payload edited by hand                      | Signature mismatch, `401`              |
| Token past `exp`                            | `TokenExpiredError`, `401`             |
| Valid token, role `user` on admin route     | `403`                                  |
| Valid token, valid role                     | `200`, `req.user` available in handler |

---

## 9. Security Checklist

| Concern                           | Defence                                                           |
| --------------------------------- | ----------------------------------------------------------------- |
| Secret leaked                     | Store in env/secret manager, long random value, rotate if exposed |
| Token stolen (XSS)                | `httpOnly` cookie, sanitize output, CSP                           |
| Token stolen (network)            | HTTPS only, `secure` cookie                                       |
| CSRF (cookie delivery)            | `sameSite: "strict"`/`"lax"`, CSRF tokens                         |
| Long-lived exposure               | Short `expiresIn` plus refresh tokens                             |
| Cannot revoke a JWT               | Short expiry, denylist (e.g. in Redis), refresh-token rotation    |
| Algorithm confusion               | Pin `algorithms: ["HS256"]` in `jwt.verify`                       |
| Credential stuffing / brute force | Rate-limit the login route                                        |
| Sensitive data in payload         | Payload is readable, so store only IDs and role                   |
| User enumeration                  | Identical error for unknown email and wrong password              |

### 9.1 Access Token + Refresh Token (Common Production Pattern)

|           | Access token         | Refresh token                                                   |
| --------- | -------------------- | --------------------------------------------------------------- |
| Lifetime  | Short (about 15 min) | Long (days or weeks)                                            |
| Sent with | Every API request    | Only to the refresh endpoint                                    |
| Stored    | Memory or cookie     | `httpOnly` cookie, and tracked server-side so it can be revoked |
| Purpose   | Authorize requests   | Obtain a new access token without logging in again              |

This keeps the stateless benefit of JWT for most requests while restoring the ability to revoke access (revoke the refresh token and the session dies within minutes).

---

## 10. Interview Takeaways

- **"What is a JWT?"** Three Base64URL parts (header, payload, signature). Self-contained, signed so it cannot be tampered with, but **not encrypted**.
- **"Session vs JWT?"** Sessions keep state on the server (easy revocation, needs a shared store). JWTs keep state in the token (stateless, scales horizontally, hard to revoke).
- **"Why does the login order matter?"** Password check (`bcrypt.compare`) first, then `jwt.sign`. A wrong password gets `401` and no token.
- **"What does the secret do?"** It is the single server-side key behind every signature. Whoever has it can mint tokens for anyone.
- **"How do you invalidate a JWT before it expires?"** You can't directly. Use short expiry, a server-side denylist, refresh-token rotation, or rotate the secret in an emergency.
- **"Cookie or Authorization header?"** Cookie (`httpOnly`, `secure`, `sameSite`) is safer against XSS for browsers but needs CSRF protection. Header suits mobile and API clients but exposes the token to JS.
- **"401 vs 403?"** `401`: not authenticated (missing or invalid token). `403`: authenticated but not permitted.
- **"`decode` vs `verify`?"** `decode` only reads the payload with no trust. `verify` checks signature and expiry. Only `verify` is acceptable for authentication.
- **Follow-ups to expect:** refresh-token flow, OAuth 2.0 / OIDC, RS256 vs HS256, JWKS, token storage trade-offs, logout with stateless tokens, and where to hold tokens in a React app.

---

## 11. Connection to Earlier Concepts

- **Middleware chain:** `verifyToken` is the same pattern as `express.json()`, the rate `limiter` and Multer's `upload.single()`. It transforms the request (adds `req.user`) or short-circuits it (`401`), then calls `next()`. Order is the whole design: `limiter` → `verifyToken` → `requireRole` → handler.
- **REST contract:** status codes carry the auth outcome: `401` for authentication failure, `403` for authorization failure, `429` for rate limit.
- **Closures:** `requireRole("admin")` returns a function that closes over `roles`, the same way React hooks close over props and state.
- **bcrypt:** hashing protects the password **at rest** (database), JWT protects the **session in transit**. They solve different problems and run at different moments (bcrypt at login, JWT on every request).
- **MongoDB + Mongoose:** the token's `userId` is the document `_id`, so a handler can do `User.findById(req.user.userId)` when it needs fresh user data beyond what the token carries.
- **React connection:** in a React client, the same token decision applies to where you keep it. An `httpOnly` cookie is invisible to JS (and to React state), while a Bearer token held in memory or context is attached by an axios/fetch interceptor.

## Authentication vs Authorization

Authentication: Are you a valid user?
Authorization: What type of access you have?

Once a user has been authenticated and authorized the user doesn't have to go through auth again and again it's like you have entered to watch football and even after showing your ticket and getting a colored band that determines the type of access you again need to show at every stop that will be a bad experience. The guard should be able to see the color himself and let you enter in other areas.

Side note: We also do schema validation that checks the current input. We can use `zod` middleware for that

Stateful and stateless authentication:
Stateless authentication is much popular. State why stateless is more popular?

The server needs to verify the signature that user holds.
One of the popular stateless authentication is token based authentication
Let's talk about the concept. Once a user login he gets access token, and refresh token. Access token is a shortlived token. Once the access token is exired then refresh token is used to get the access token and refresh token is a long lived token.
But then we can also argue that once refresh token is compromised then we can easily obtain the access token so what's the use. This is overcome using cyclic rotation. But then how using refersh token it will be verified that this is the same user.

Let's understand about the token: Token is an encrypted key (32 or 62 bit). it contains three part. Header (contains algo, methodology), second part is payload, signature. Signature is responsible for encoding and ecoding. We have algo like HSA256
it will be like HSA256.{.....}.gaurav123

Signature is identified by the server. Server has the key and it uses that key to confirm if it is the correct user.

So how client will bring the token one way is that they bear the token in the header and that's why that part of the header is known as bearer token.
Authorization: Bearer Token
We can get the token and use method like JWT.verify then we can mark it decoded and call the next middleware.

Second method is server can put the token in the client's cookies.
To support such token based authentication we will need libraries that support such operation and one of those is JWT (JSON Web Token).
JSON Web Token:
we use library called jsonwebtoken

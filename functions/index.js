const functions = require("firebase-functions");

const app = require("express")();
const FBAuth = require("./util/FBAuth");

const { getAllPosts, postOnePost } = require("./handlers/posts");
const { signup, login, uploadProfileImage } = require("./handlers/users");

// Posts Routes
app.get("/posts", getAllPosts);
app.post("/post", FBAuth, postOnePost);

// Users Routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadProfileImage);

exports.api = functions.https.onRequest(app);

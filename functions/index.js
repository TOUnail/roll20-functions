const functions = require("firebase-functions");

const app = require("express")();
const FBAuth = require("./util/FBAuth");

const {
  getAllPosts,
  postOnePost,
  getPost,
  commentOnPost,
  likePost,
  //unlikePost,
} = require("./handlers/posts");
const {
  signup,
  login,
  uploadProfileImage,
  addUserDetails,
  getAuthenticatedUser,
} = require("./handlers/users");

// Posts Routes
app.get("/posts", getAllPosts);
app.post("/post", FBAuth, postOnePost);
app.get("/post/:postId", getPost);
// TODO delete post
app.get("/post/:postId/like", FBAuth, likePost);
//app.get("/post/:postId/unlike", FBAuth, unlikePost);
// TODO unlike post
app.post("/post/:postId/comment", FBAuth, commentOnPost);

// Users Routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadProfileImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);

//https://github.com/AlexanderHMagno/ideally_functions/tree/master/functions/handlers
exports.api = functions.https.onRequest(app);

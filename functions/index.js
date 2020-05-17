const functions = require("firebase-functions");

const app = require("express")();
const FBAuth = require("./util/FBAuth");

const {
  getAllPosts,
  postOnePost,
  getPost,
  commentOnPost,
  likePost,
  unlikePost,
  likeComment,
  unlikeComment,
  deletePost,
  deleteComment,
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
app.delete("/post/:postId", FBAuth, deletePost);
app.get("/post/:postId/like", FBAuth, likePost);
app.get("/post/:postId/unlike", FBAuth, unlikePost);
app.post("/post/:postId/comment", FBAuth, commentOnPost);
app.get("/comment/:commentId/like", FBAuth, likeComment);
app.get("/comment/:commentId/unlike", FBAuth, unlikeComment);
app.delete("/comment/:commentId", FBAuth, deleteComment);

// Users Routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadProfileImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);

//https://github.com/AlexanderHMagno/ideally_functions/tree/master/functions/handlers
exports.api = functions.https.onRequest(app);

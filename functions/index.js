const functions = require("firebase-functions");

const app = require("express")();
const FBAuth = require("./util/FBAuth");

const { db } = require("./util/admin");

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

exports.createNotificationOnLike = functions.firestore
  .document("likes/{id}")
  .onCreate(async (snapshot) => {
    const data = snapshot.data();
    try {
      const postInfo = await db.doc(`/posts/${data.postId}`).get();
      if (data.userHandle !== postInfo.data().userHandle) {
        await db.doc(`/notifications/${snapshot.id}`).set({
          recipient: postInfo.data().userHandle,
          sender: data.userHandle,
          read: false,
          postId: data.postId,
          type: "like",
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
    }
  });

exports.createNotificationOnCommentLike = functions.firestore
  .document("likes/{id}")
  .onCreate(async (snapshot) => {
    const data = snapshot.data();
    try {
      const commentInfo = await db.doc(`/comments/${data.commentId}`).get();
      if (data.userHandle !== commentInfo.data().userHandle) {
        await db.doc(`/notifications/${snapshot.id}`).set({
          recipient: commentInfo.data().userHandle,
          sender: data.userHandle,
          read: false,
          commentId: data.commentId,
          postId: commentInfo.data().postId,
          type: "like",
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
    }
  });

exports.createNotificationOnComment = functions.firestore
  .document("comments/{id}")
  .onCreate(async (snapshot) => {
    const data = snapshot.data();
    try {
      const postInfo = await db.doc(`/posts/${data.postId}`).get();
      if (data.userHandle !== postInfo.data().userHandle) {
        await db.doc(`/notifications/${snapshot.id}`).set({
          recipient: postInfo.data().userHandle,
          sender: data.userHandle,
          read: false,
          postId: data.postId,
          type: "comment",
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
    }
  });

exports.deleteNotificationOnUnlike = functions.firestore
  .document("likes/{id}")
  .onDelete(async (snapshot) => {
    try {
      await db.doc(`/notifications/${snapshot.id}`).delete();
    } catch (err) {
      console.error(err);
    }
  });

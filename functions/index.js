const functions = require("firebase-functions");

const app = require("express")();
const FBAuth = require("./util/FBAuth");

// const cors = require("cors");
// app.use(cors({ origin: true }));
app.use(function (req, res, next) {
  const allowedOrigins = [
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://localhost:5000",
    "https://roll20-a9af4.web.app",
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", true);
  return next();
});

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
  getUserDetails,
  markNotificationsRead,
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
app.get("/user/:handle", getUserDetails);
app.post("/notifications", FBAuth, markNotificationsRead);

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

exports.onUserImageChange = functions.firestore
  .document("/users/{userId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data().imageUrl;
    const after = change.after.data().imageUrl;
    const handle = context.params.userId;
    const batch = db.batch();
    if (before !== after) {
      try {
        const posts = await db
          .collection("posts")
          .where("userHandle", "==", handle)
          .get();
        posts.forEach((doc) => {
          const post = db.doc(`/posts/${doc.id}`);
          batch.update(post, { userImage: after });
        });
        const comments = await db
          .collection("comments")
          .where("userHandle", "==", handle)
          .get();
        comments.forEach((doc) => {
          const comments = db.doc(`/comments/${doc.id}`);
          batch.update(comments, { userImage: after });
        });
        batch.commit();
      } catch (err) {
        console.log(err);
      }
    }
  });

exports.onPostDelete = functions.firestore
  .document("/posts/{postId}")
  .onDelete(async (snapshot, context) => {
    const postId = context.params.postId;
    const batch = db.batch();
    try {
      const comments = await db
        .collection("comments")
        .where("postId", "==", postId)
        .get();
      comments.forEach((doc) => {
        batch.delete(db.doc(`/comments/${doc.id}`));
      });
      const likes = await db
        .collection("likes")
        .where("postId", "==", postId)
        .get();
      likes.forEach((doc) => {
        batch.delete(db.doc(`/likes/${doc.id}`));
      });
      const notifications = await db
        .collection("notifications")
        .where("postId", "==", postId)
        .get();
      notifications.forEach((doc) => {
        batch.delete(db.doc(`/notifications/${doc.id}`));
      });
      await batch.commit();
    } catch (err) {
      console.log(err);
    }
  });

exports.onCommentDelete = functions.firestore
  .document("/comments/{commentId}")
  .onDelete(async (snapshot, context) => {
    const commentId = context.params.commentId;
    const batch = db.batch();
    try {
      const likes = await db
        .collection("likes")
        .where("commentId", "==", commentId)
        .get();
      likes.forEach((doc) => {
        batch.delete(db.doc(`/likes/${doc.id}`));
      });
      const notifications = await db
        .collection("notifications")
        .where("commentId", "==", commentId)
        .get();
      notifications.forEach((doc) => {
        batch.delete(db.doc(`/notifications/${doc.id}`));
      });
      await batch.commit();
    } catch (err) {
      console.log(err);
    }
  });

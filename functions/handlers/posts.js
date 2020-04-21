const { db } = require("../util/admin");

// exports.getAllPosts = (req, res) => {
//   db.collection("posts")
//     .orderBy("createdAt", "desc")
//     .get()
//     .then((data) => {
//       let posts = [];
//       data.forEach((doc) => {
//         posts.push({
//           postId: doc.id,
//           body: doc.data().body,
//           userHandle: doc.data().userHandle,
//           createdAt: doc.data().createdAt,
//           roll: doc.data().roll,
//         });
//       });
//       return res.json(posts);
//     })
//     .catch((err) => console.error(err));
// };

exports.getAllPosts = async (req, res) => {
  try {
    let data = await db.collection("posts").orderBy("createdAt", "desc").get();
    let posts = [];
    data.forEach((doc) => {
      posts.push({
        postId: doc.id,
        body: doc.data().body,
        userHandle: doc.data().userHandle,
        createdAt: doc.data().createdAt,
        roll: doc.data().roll,
      });
    });
    return res.json(posts);
  } catch (err) {
    console.error(err);
  }
};

exports.postOnePost = async (req, res) => {
  let newPost = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
    roll: Math.floor(Math.random() * 20) + 1,
  };
  try {
    let data = await db.collection("posts").add(newPost);
    res.json({ message: `document ${data.id} created successfully` });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
    console.error(err);
  }
};

exports.getPost = async (req, res) => {
  let postData = {};
  let postId = req.params.postId;

  try {
    const data = await db.doc(`/posts/${postId}`).get();
    if (data.exists) {
      postData = data.data();
      postData.comments = [];
      const comments = await db
        .collection("comments")
        .orderBy("createdAt", "asc")
        .where("postId", "==", req.params.postId)
        .get();
      comments.forEach((comment) => {
        postData.comments.push({
          postId: comment.data().postId,
          body: comment.data().body,
          userHandle: comment.data().userHandle,
          createdAt: comment.data().createdAt,
          commentId: comment.id,
        });
      });
      res.json(postData);
    } else {
      res.status(404).json({ error: "Post not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.code });
  }
};

exports.commentOnPost = async (req, res) => {
  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    postId: req.params.postId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
  };

  try {
    if (req.body.body.trim() === "")
      res.status(400).json({ error: "Must not be empty" });

    let data = await db.doc(`/posts/${req.params.postId}`).get();
    if (!data.exists) {
      res.status(404).json({ error: "Post not found" });
    }
    await db.collection("comments").add(newComment);
    res.json(newComment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

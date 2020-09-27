const { db } = require("../util/admin");

exports.getAllPosts = async (req, res) => {
  try {
    let data = await db.collection("posts").orderBy("createdAt", "desc").get();
    let posts = [];
    data.forEach((doc) => {
      posts.push({
        postId: doc.id,
        ...doc.data(),
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
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    roll: Math.floor(Math.random() * 20) + 1,
  };
  try {
    let data = await db.collection("posts").add(newPost);
    newPost = { ...newPost, postId: data.id };
    res.json(newPost);
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
          userImage: comment.data().userImage,
          userHandle: comment.data().userHandle,
          createdAt: comment.data().createdAt,
          likeCount: comment.data().likeCount,
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
    likeCount: 0,
  };

  try {
    if (req.body.body.trim() === "")
      res.status(400).json({ comment: "Must not be empty" });

    let data = await db.doc(`/posts/${req.params.postId}`).get();
    if (!data.exists) {
      res.status(404).json({ error: "Post not found" });
    }
    await db.collection("comments").add(newComment);
    await db
      .doc(`/posts/${req.params.postId}`)
      .update({ commentCount: data.data().commentCount + 1 });
    res.json(newComment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.likePost = async (req, res) => {
  try {
    const likeDocument = await db
      .collection("likes")
      .where("userHandle", "==", req.user.handle)
      .where("postId", "==", req.params.postId)
      .limit(1)
      .get();

    if (likeDocument.empty) {
      const postDocument = await db.doc(`/posts/${req.params.postId}`).get();
      if (postDocument.exists) {
        let likeCount = { likeCount: 1 };
        let postData = postDocument.data();
        if (postData.likecount) likeCount.likeCount = postData.likeCount + 1;
        await db.doc(`/posts/${req.params.postId}`).update(likeCount);
        await db.collection("likes").add({
          userHandle: req.user.handle,
          postId: req.params.postId,
        });
        postData = { ...postData, ...likeCount, postId: postDocument.id };
        res.status(200).json({ postData });
      } else {
        res.status(400).json({ error: "Post not found" });
      }
    } else {
      res.status(400).json({ message: "Post already liked" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

exports.unlikePost = async (req, res) => {
  try {
    const likeDocument = await db
      .collection("likes")
      .where("userHandle", "==", req.user.handle)
      .where("postId", "==", req.params.postId)
      .limit(1)
      .get();

    if (!likeDocument.empty) {
      likeDocument.forEach(async (el) => await el.ref.delete());

      const post = await db.doc(`/posts/${req.params.postId}`).get();
      let postInfo = post.data();
      let likeCount = { likeCount: 0 };
      if (postInfo.likeCount) {
        likeCount.likeCount = postInfo.likeCount - 1;
      }
      await db.doc(`/posts/${req.params.postId}`).update(likeCount);
      postInfo = { ...postInfo, ...likeCount, postId: post.id };
      res.status(200).json({ message: "Post has been unliked", postInfo });
    } else {
      res.status(400).json({ message: "Post has not been liked by the user" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
};

exports.likeComment = async (req, res) => {
  try {
    const likeCommentDocument = await db
      .collection("likes")
      .where("userHandle", "==", req.user.handle)
      .where("commentId", "==", req.params.commentId)
      .limit(1)
      .get();

    if (likeCommentDocument.empty) {
      const commentDocument = await db
        .doc(`/comments/${req.params.commentId}`)
        .get();
      if (commentDocument.exists) {
        let likeCount = { likeCount: 1 };
        let commentData = commentDocument.data();
        if (commentData.likeCount)
          likeCount.likeCount = commentData.likeCount + 1;
        await db.doc(`/comments/${req.params.commentId}`).update(likeCount);
        await db.collection("likes").add({
          userHandle: req.user.handle,
          commentId: req.params.commentId,
        });
        commentData = {
          ...commentData,
          ...likeCount,
          commentId: commentDocument.id,
        };
        res.status(200).json({ commentData });
      } else {
        res.status(400).json({ error: "Comment not found" });
      }
    } else {
      res.status(400).json({ message: "Comment already liked" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

exports.unlikeComment = async (req, res) => {
  try {
    const likeCommentDocument = await db
      .collection("likes")
      .where("userHandle", "==", req.user.handle)
      .where("commentId", "==", req.params.commentId)
      .limit(1)
      .get();

    if (!likeCommentDocument.empty) {
      likeCommentDocument.forEach(async (el) => await el.ref.delete());

      const comment = await db.doc(`/comments/${req.params.commentId}`).get();
      let commentInfo = comment.data();
      let likeCount = { likeCount: 0 };
      if (commentInfo.likeCount) {
        likeCount.likeCount = commentInfo.likeCount - 1;
      }
      await db.doc(`/comments/${req.params.commentId}`).update(likeCount);
      commentInfo = { ...commentInfo, ...likeCount, commentId: comment.id };
      res
        .status(200)
        .json({ message: "Comment has been unliked", commentInfo });
    } else {
      res
        .status(400)
        .json({ message: "Comment has not been liked by the user" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
};

exports.deleteComment = async (req, res) => {
  const document = db.doc(`/comments/${req.params.commentId}`);
  const getDocument = await document.get();

  if (getDocument.exists) {
    if (getDocument.data().userHandle !== req.user.handle) {
      res.status(403).json({ error: "Unauthorized" });
    } else {
      await document.delete();
      const commentData = getDocument.data();
      let data = await db.doc(`/posts/${commentData.postId}`).get();
      let postData = data.data();
      let commentCount = { commentCount: 0 };
      if (postData.commentCount) {
        commentCount.commentCount = postData.commentCount - 1;
      }
      await db.doc(`/posts/${commentData.postId}`).update(commentCount);
      res.status(200).json({
        message: "Comment has been deleted",
        ...commentCount,
        commentId: commentData.commentId,
        postData: {
          ...postData,
          ...commentCount,
          postId: commentData.postId,
        },
      });
    }
  } else {
    res.status(404).json({ message: "Comment not found" });
  }
};

exports.deletePost = async (req, res) => {
  const document = db.doc(`/posts/${req.params.postId}`);
  const getDocument = await document.get();

  if (getDocument.exists) {
    if (getDocument.data().userHandle !== req.user.handle) {
      res.status(403).json({ error: "Unauthorized" });
    } else {
      await document.delete();
      res.status(200).json({ message: "Post has been deleted" });
    }
  } else {
    res.status(404).json({ message: "Post not found" });
  }
};

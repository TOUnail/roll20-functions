const { admin, db } = require("../util/admin");
const config = require("../util/config");
const firebase = require("firebase");
const { v4: uuidv4 } = require("uuid");
firebase.initializeApp(config);
const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../util/validators");

//Register user
exports.signup = async (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };
  const { valid, errors } = validateSignupData(newUser);
  if (!valid) return res.status(400).json(errors);
  try {
    let newHandler = await db.doc(`/users/${newUser.handle}`).get();
    if (newHandler.exists) {
      res.status(400).json({ handle: `This handle is already taken` });
    } else {
      const data = await firebase
        .auth()
        .createUserWithEmailAndPassword(newUser.email, newUser.password);
      const token = await data.user.getIdToken();
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/profile%2Fno-img.png?alt=media`,
        userId: data.user.uid,
      };
      await db.doc(`users/${newUser.handle}`).set(userCredentials);
      res.status(201).json({ token });
    }
  } catch (err) {
    console.error(err);
    if (err.code === "auth/email-already-in-use") {
      res.status(400).json({ email: "Email is already in use" });
    } else {
      res.status(500).json({ error: err.code });
    }
  }
};

// //Login User
exports.login = async (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  const { valid, errors } = validateLoginData(user);
  if (!valid) return res.status(400).json(errors);

  try {
    const data = await firebase
      .auth()
      .signInWithEmailAndPassword(user.email, user.password);
    const token = await data.user.getIdToken();
    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(403).json({ general: "Wrong credentials, please try again" });
  }
};

//Add user details
exports.addUserDetails = async (req, res) => {
  let userDetails = reduceUserDetails(req.body);
  try {
    await db.doc(`/users/${req.user.handle}`).update(userDetails);
    res.json({ message: "Details added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.code });
  }
};
//Get any user's details
exports.getUserDetails = async (req, res) => {
  try {
    let userData = await db.doc(`/users/${req.params.handle}`).get();
    if (userData.exists) {
      let userInfo = {
        user: userData.data(),
        posts: [],
      };
      const posts = await db
        .collection("posts")
        .where("userHandle", "==", req.params.handle)
        .orderBy("createdAt", "desc")
        .get();
      posts.forEach((doc) => {
        userInfo.posts.push({ postId: doc.id, ...doc.data() });
      });
      res.status(200).json({ userInfo });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.code });
  }
};
//Get own user details
exports.getAuthenticatedUser = async (req, res) => {
  let userData = {};
  try {
    const data = await db.doc(`/users/${req.user.handle}`).get();
    if (data.exists) {
      userData.credentials = data.data();
      userData.likes = [];
      const likes = await db
        .collection("likes")
        .where("userHandle", "==", req.user.handle)
        .get();
      likes.forEach((like) => {
        userData.likes.push(like.data());
      });
      userData.notifications = [];
      const notifications = await db
        .collection("notifications")
        .where("recipient", "==", req.user.handle)
        .where("read", "==", false)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
      notifications.forEach((doc) => {
        userData.notifications.push({
          ...doc.data(),
          notificationId: doc.id,
        });
      });
      res.status(200).json({ ...userData });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.code });
  }
};

//Upload profile image
exports.uploadProfileImage = async (req, res) => {
  const BusBoy = require("busboy"),
    path = require("path"),
    os = require("os"),
    fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });
  let imageFileName;
  let imageToBeUploaded = {};
  busboy.on("file", async (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      res.status(400).json({ error: "Wrong file type submitted" });
      return false;
    }
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    imageFileName = `${Math.round(
      Math.random() * 100000000000
    )}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    try {
      imageToBeUploaded = { filepath, mimetype };
      console.log(fieldname);
      console.log(filename);
      console.log(mimetype);
      file.pipe(fs.createWriteStream(filepath));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.code });
    }
  });
  busboy.on("finish", async () => {
    try {
      await admin
        .storage()
        .bucket(config.storageBucket)
        .upload(imageToBeUploaded.filepath, {
          destination: "profile/" + imageFileName,
          gzip: true,
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype,
              firebaseStorageDownloadTokens: uuidv4(),
            },
          },
        });
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/profile%2F${imageFileName}?alt=media`;
      await db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      res.json({ message: "Image uploaded successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.code });
    }
  });
  busboy.end(req.rawBody);
};

exports.markNotificationsRead = async (req, res) => {
  let batch = db.batch();
  req.body.forEach((notificationId) => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  try {
    await batch.commit();
    res.status(200).json({ message: "Notifications marked read" });
  } catch (err) {
    res.status(500).json({ err });
  }
};

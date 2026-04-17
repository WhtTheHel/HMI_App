const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendNotification = functions.firestore
  .document("notifications/{id}")
  .onCreate(async (snap) => {

    const data = snap.data();

    const user = await admin.firestore()
      .collection("users")
      .doc(data.to)
      .get();

    const token = user.data().fcmToken;

    if(!token) return;

    await admin.messaging().send({
      notification: {
        title: "HMI Connect",
        body: data.text
      },
      token: token
    });

  });

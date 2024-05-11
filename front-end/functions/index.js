const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// auth trigger (new user signup)
exports.newUserSignup = functions.auth.user().onCreate((user) => {
  console.log('user created', user.email, user.uid);

  // Add the user to the "users" collection in Firestore
  return db.collection('users').doc(user.uid).set({
    email: user.email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    registered: false,
  });
});

// auth trigger (user deleted)
exports.userDeleted = functions.auth.user().onDelete((user) => {
  console.log('user deleted', user.email, user.uid);

  // Remove the user from the "users" collection in Firestore
  return db.collection('users').doc(user.uid).delete();
});

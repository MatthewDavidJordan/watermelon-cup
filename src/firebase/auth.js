import { auth } from "./firebase";

import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, updatePassword, updateEmail } from "firebase/auth";

export const doCreateUserWithEmailAndPassword = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
};

export const doSignInWithEmailAndPassword = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
}

export const doSignInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // result.user is the user that signed in. Maybe save it to firestore

    return result;
};

export const doSignOut = () => {
    return auth.signOut();
};

export const doPasswordReset = (email) => {
    return sendPasswordResetEmail(email);
};


export const updatePass = (password) => {
    return updatePassword(auth.currentUser, password);
};

export const updateEmailAddress = (email) => {
    return updateEmail(auth.currentUser, email);
};

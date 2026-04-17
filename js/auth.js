import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

window.doLogout = () => signOut(auth);

document.getElementById("btnSignIn").onclick = () => {
  signInWithEmailAndPassword(
    auth,
    logEmail.value,
    logPass.value
  );
};

document.getElementById("btnGoogle").onclick = async () => {
  const res = await signInWithPopup(auth, new GoogleAuthProvider());
  const user = res.user;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      nama: user.displayName,
      email: user.email
    });
  }
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    authLayer.style.display = "none";
    appLayer.style.display = "block";
  }
});

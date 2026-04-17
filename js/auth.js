import { auth, db, messaging } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
  doc, setDoc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { getToken } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js";

btnSignIn.onclick = () => {
  signInWithEmailAndPassword(auth, logEmail.value, logPass.value);
};

btnGoogle.onclick = async () => {
  const res = await signInWithPopup(auth, new GoogleAuthProvider());
  const user = res.user;

  const ref = doc(db,"users",user.uid);
  const snap = await getDoc(ref);

  if(!snap.exists()){
    await setDoc(ref,{
      nama:user.displayName,
      role:"user"
    });
  }
};

window.doLogout = async ()=>{
  await signOut(auth);
  location.reload();
};

async function saveToken(user){
  const token = await getToken(messaging,{ vapidKey:"ISI_VAPID_KEY" });
  await updateDoc(doc(db,"users",user.uid),{ fcmToken:token });
}

onAuthStateChanged(auth, async (user)=>{
  if(user){

    Notification.requestPermission();

    const snap = await getDoc(doc(db,"users",user.uid));
    const data = snap.data();

    if(data.role === "admin" || data.role === "owner"){
      menuAdmin.style.display = "block";
    }

    await saveToken(user);

    authLayer.style.display="none";
    appLayer.style.display="block";
  }
});

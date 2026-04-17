import { db } from "./firebase.js";
import { addDoc, collection } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export async function sendNotif(uid,text){
  await addDoc(collection(db,"notifications"),{
    to:uid,
    text:text,
    time:Date.now()
  });
}

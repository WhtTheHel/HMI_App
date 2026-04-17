import { db } from "./firebase.js";
import {
  addDoc, collection, onSnapshot, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

window.sendChat = async () => {
  await addDoc(collection(db, "chats"), {
    msg: chatMsg.value,
    time: Date.now()
  });

  chatMsg.value = "";
};

onSnapshot(query(collection(db, "chats"), orderBy("time")), snap => {
  chatBox.innerHTML = "";

  snap.forEach(d => {
    const c = d.data();
    chatBox.innerHTML += `<div class="card">${c.msg}</div>`;
  });
});

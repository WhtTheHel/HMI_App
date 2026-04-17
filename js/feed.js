import { db, storage } from "./firebase.js";
import {
  addDoc, collection, onSnapshot, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

btnPost.onclick = async () => {
  const file = pFile.files[0];
  let url = "";

  if (file) {
    const r = ref(storage, "posts/" + Date.now());
    await uploadBytes(r, file);
    url = await getDownloadURL(r);
  }

  await addDoc(collection(db, "posts"), {
    text: pInput.value,
    media: url,
    time: Date.now()
  });

  pInput.value = "";
};

onSnapshot(query(collection(db, "posts"), orderBy("time", "desc")), snap => {
  feed.innerHTML = "";
  snap.forEach(d => {
    const p = d.data();
    feed.innerHTML += `
      <div class="card">
        ${p.text}
        ${p.media ? `<img src="${p.media}" width="100%">` : ""}
      </div>
    `;
  });
});

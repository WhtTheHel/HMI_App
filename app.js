import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged, 
    signOut 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    onSnapshot, 
    orderBy, 
    query, 
    limit, 
    serverTimestamp,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';

const firebaseConfig = {
    apiKey: "AIzaSyA_SW13O3EPp6L6TGT3UV5B2ADzwCV_Owo",
    authDomain: "hmi-app-ac76d.firebaseapp.com",
    projectId: "hmi-app-ac76d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('app');
const namaUser = document.getElementById('namaUser');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const chatInput = document.getElementById('chatInput');
const chatList = document.getElementById('chatList');
const typingStatus = document.getElementById('typingStatus');
const preview = document.getElementById('preview');
const multiFile = document.getElementById('multiFile');
const sidebar = document.getElementById('sidebar');
const profilePic = document.getElementById('profilePic');
const namaDisplay = document.getElementById('namaDisplay');
const overlay = document.getElementById('overlay');

let unsubscribeChat = null;
let unsubscribeTyping = null;
let selectedFiles = [];
let currentUserData = null;
let typingTimeout = null;

// Login Functions
window.login = async () => {
    try {
        if (!emailInput.value || !passwordInput.value) {
            alert('Mohon isi email dan password!');
            return;
        }
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            alert('Akun belum terdaftar. Silakan daftar dulu!');
        } else {
            alert('Login gagal: ' + error.message);
        }
    }
};

window.loginGoogle = async () => {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (error) {
        alert('Google login gagal: ' + error.message);
    }
};

window.showRegister = () => {
    namaUser.style.display = namaUser.style.display === 'none' ? 'block' : 'none';
};

window.register = async () => {
    try {
        if (!emailInput.value || !passwordInput.value || !namaUser.value) {
            alert('Mohon isi semua field!');
            return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), {
            nama: namaUser.value,
            foto: "",
            role: "anggota",
            online: true,
            updatedAt: serverTimestamp()
        });
        alert('Registrasi berhasil! Silakan login.');
        namaUser.style.display = 'none';
    } catch (error) {
        alert('Registrasi gagal: ' + error.message);
    }
};

// Auth State
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loginScreen.style.display = 'none';
        appScreen.style.display = 'block';
        
        // Load user data
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, "users", user.uid), {
                nama: user.displayName || 'User',
                foto: user.photoURL || "",
                role: "anggota",
                online: true,
                updatedAt: serverTimestamp()
            });
        }
        
        currentUserData = userDoc.data();
        namaDisplay.textContent = currentUserData.nama;
        if (currentUserData.foto) profilePic.src = currentUserData.foto;
        
        await updateDoc(doc(db, "users", user.uid), { online: true });
        initChat();
    } else {
        loginScreen.style.display = 'block';
        appScreen.style.display = 'none';
        if (unsubscribeChat) unsubscribeChat();
        if (unsubscribeTyping) unsubscribeTyping();
        chatList.innerHTML = '';
    }
});

// UI Functions
window.toggleMenu = () => {
    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
};

window.toggleDark = () => {
    document.body.classList.toggle("dark");
};

window.openGroup = () => {
    alert('Fitur Chat Grup segera hadir!');
};

window.logout = async () => {
    if (auth.currentUser) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), { online: false });
    }
    await signOut(auth);
};

// Profile Update
window.updateFoto = async () => {
    const fileInput = document.getElementById('editFoto');
    const file = fileInput.files[0];
    if (!file) return;

    try {
        const storageRef = ref(storage, "profile/" + auth.currentUser.uid);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "users", auth.currentUser.uid), { foto: url });
        profilePic.src = url;
        fileInput.value = '';
        alert('Foto berhasil diupdate!');
    } catch (error) {
        alert('Upload foto gagal: ' + error.message);
    }
};

// File Preview
multiFile.onchange = () => {
    preview.innerHTML = "";
    selectedFiles = Array.from(multiFile.files);
    
    selectedFiles.forEach(f => {
        const el = f.type.startsWith("image/") ? 
            document.createElement("img") : 
            document.createElement("video");
        el.src = URL.createObjectURL(f);
        if (el.tagName === 'VIDEO') el.controls = true;
        el.style.maxWidth = '80px';
        el.style.maxHeight = '80px';
        preview.appendChild(el);
    });
};

// Chat Functions
function initChat() {
    // Chat listener
    const q = query(collection(db, "chat"), orderBy("waktu", "desc"), limit(50));
    unsubscribeChat = onSnapshot(q, (snap) => {
        chatList.innerHTML = "";
        snap.forEach((docSnap) => {
            const d = docSnap.data();
            const div = document.createElement("div");
            if (d.uid === auth.currentUser.uid) div.classList.add("me");
            
            const time = d.waktu?.toDate ? 
                d.waktu.toDate().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '';
            
            div.innerHTML = `
                <div style="margin-bottom:8px;font-size:14px">
                    <b>${d.nama || 'Unknown'}</b> 
                    <small style="opacity:0.7;margin-left:10px">${time}</small>
                </div>
                ${d.reply ? `<i style="color:#888;font-size:12px">Reply: ${d.reply}</i><br>` : ''}
                <div style="margin-bottom:5px;white-space:pre-wrap">${d.pesan || ''}</div>
                <small>${d.status === "failed" ? "❌" : d.read ? "✔✔" : "✔"}</small>
            `;
            
            chatList.appendChild(div);
        });
        chatList.scrollTop = 0;
    }, (error) => {
        console.error('Chat error:', error);
    });

    // Typing listener
    unsubscribeTyping = onSnapshot(doc(db, "typing", "global"), (docSnap) => { // File app.js LENGKAP (lanjutan dari sebelumnya)

        const d = docSnap.data();
        if (d?.uid && d.uid !== auth.currentUser?.uid) {
            typingStatus.textContent = `${d.nama || 'Seseorang'} sedang mengetik...`;
        } else {
            typingStatus.textContent = "";
        }
    });
}

// Typing indicator
chatInput.addEventListener('input', () => {
    if (!auth.currentUser || !currentUserData) return;
    
    clearTimeout(typingTimeout);
    
    // Set typing
    setDoc(doc(db, "typing", "global"), {
        uid: auth.currentUser.uid,
        nama: currentUserData.nama,
        waktu: serverTimestamp()
    });
    
    // Clear after 2 seconds
    typingTimeout = setTimeout(() => {
        setDoc(doc(db, "typing", "global"), {
            uid: "",
            nama: "",
            waktu: serverTimestamp()
        });
    }, 2000);
});

window.sendChat = async () => {
    if (!auth.currentUser || !chatInput.value.trim()) return;
    
    const message = chatInput.value.trim();
    chatInput.value = '';
    
    try {
        await addDoc(collection(db, "chat"), {
            nama: currentUserData.nama,
            pesan: message,
            uid: auth.currentUser.uid,
            waktu: serverTimestamp(),
            read: false,
            status: "sent"
        });
        
        // Clear preview
        preview.innerHTML = '';
        selectedFiles = [];
        multiFile.value = '';
        
    } catch (error) {
        alert('Gagal kirim pesan: ' + error.message);
    }
};

// Prevent zoom on input focus (Android fix)
document.addEventListener('touchstart', function() {}, true);

// Service Worker for PWA (optional)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Auto-hide keyboard after send
chatInput.addEventListener('blur', () => {
    setTimeout(() => {
        chatInput.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
});

// Enter to send
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
    }
});

// File upload on click preview area
preview.addEventListener('click', () => multiFile.click());

// Online status
window.addEventListener('beforeunload', async () => {
    if (auth.currentUser && currentUserData) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), { 
            online: false,
            updatedAt: serverTimestamp()
        });
    }
});

// Visibility change handler
document.addEventListener('visibilitychange', async () => {
    if (auth.currentUser && !document.hidden) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), { online: true });
    }
});

console.log('HMI Super App v1.0.1 - Ready for Android! 🚀');

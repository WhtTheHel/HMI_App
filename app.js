import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut,
    sendEmailVerification 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
    getFirestore, collection, doc, addDoc, getDoc, setDoc, updateDoc, 
    onSnapshot, serverTimestamp, deleteDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyA_SW13O3EPp6L6TGT3UV5B2ADzwCV_Owo",
    authDomain: "hmi-app-ac76d.firebaseapp.com",
    projectId: "hmi-app-ac76d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- GLOBAL FUNCTIONS ---
window.handleLogin = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
        const res = await signInWithEmailAndPassword(auth, email, pass);
        if (!res.user.emailVerified) { alert("Verifikasi email Anda!"); await signOut(auth); }
    } catch (e) { alert("Login Gagal: " + e.message); }
};

window.handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
    catch (e) { alert("Google Login Gagal."); }
};

window.logout = () => signOut(auth);

// --- MONITORING USER & ROLE (FIXED FOR 'Owner') ---
onAuthStateChanged(auth, (user) => {
    const loginScr = document.getElementById('loginScreen');
    const appScr = document.getElementById('app');
    const userDisplay = document.getElementById('userNameDisplay');

    if (user && user.emailVerified) {
        if(loginScr) loginScr.style.display = 'none';
        if(appScr) appScr.style.display = 'block';

        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Menampilkan Nama (Gunakan email jika nama kosong)
                if(userDisplay) userDisplay.innerText = data.nama || data.email || "User HMI";

                // NORMALISASI ROLE: Mengubah 'Owner' ke 'owner' agar cocok dengan pengecekan
                const roleLower = (data.role || "anggota").toLowerCase();
                const isOwner = roleLower === "owner";
                const isAdmin = roleLower === "admin";
                const isPower = isOwner || isAdmin;

                const badge = document.getElementById('adminBadge');
                const adminMenu = document.getElementById('adminMenuSection');
                const adminPanel = document.getElementById('adminPanel');

                // 1. Tampilkan Badge Role
                if(badge) {
                    badge.style.display = isPower ? 'block' : 'none';
                    badge.innerText = (data.role || "USER").toUpperCase();
                }

                // 2. Tampilkan Menu Buat Grup (PENTING)
                if(adminMenu) {
                    adminMenu.style.display = isPower ? 'block' : 'none';
                }

                // 3. Tampilkan Panel Kelola Anggota (Hanya Owner)
                if(isOwner) {
                    if(adminPanel) adminPanel.style.display = 'block';
                    loadUserManagement();
                } else {
                    if(adminPanel) adminPanel.style.display = 'none';
                }
            }
        });
        loadGroupList();
    } else {
        if(loginScr) loginScr.style.display = 'block';
        if(appScr) appScr.style.display = 'none';
    }
});

// --- GRUP & USER MANAGEMENT ---
function loadGroupList() {
    onSnapshot(collection(db, "groups"), (snap) => {
        const container = document.getElementById('groupContainer');
        if(!container) return;
        container.innerHTML = "";
        snap.forEach(g => {
            const d = g.data();
            const div = document.createElement('div');
            div.style = "padding:10px; border-bottom:1px solid #eee; color:black;";
            div.innerHTML = `<b>📂 ${d.namaGrup}</b>`;
            container.appendChild(div);
        });
    });
}

window.submitGroup = async () => {
    const nameInput = document.getElementById('newGroupName');
    const name = nameInput.value;
    if(!name) return alert("Nama grup kosong!");

    try {
        await addDoc(collection(db, "groups"), {
            namaGrup: name,
            creator: auth.currentUser.uid,
            createdAt: serverTimestamp()
        });
        alert("Grup Berhasil Dibuat!");
        nameInput.value = "";
        if(window.closeAll) window.closeAll();
    } catch (e) {
        alert("Gagal: Izin ditolak (Cek Security Rules Firebase Anda).");
    }
};

function loadUserManagement() {
    onSnapshot(collection(db, "users"), (snap) => {
        const list = document.getElementById('userList');
        if(!list) return;
        list.innerHTML = "";
        snap.forEach(u => {
            const d = u.data();
            const div = document.createElement('div');
            div.style = "padding:8px; border-bottom:1px solid #eee; color:black; font-size:13px;";
            div.innerHTML = `👤 ${d.nama || d.email} | <small>${d.role}</small>`;
            list.appendChild(div);
        });
    });
            }

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

// --- MONITORING USER & ROLE ---
onAuthStateChanged(auth, (user) => {
    const loginScr = document.getElementById('loginScreen');
    const appScr = document.getElementById('app');
    const userDisplay = document.getElementById('userNameDisplay');

    if (user && user.emailVerified) {
        loginScr.style.display = 'none';
        appScr.style.display = 'block';

        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("Data User Ditemukan:", data); // Cek di Console F12

                // Update Nama
                if(userDisplay) userDisplay.innerText = data.nama || "User HMI";

                // Deteksi Role (Abaikan huruf besar/kecil)
                const currentRole = (data.role || "anggota").toLowerCase();
                const isPower = currentRole === "owner" || currentRole === "admin";

                // Update UI Elements
                const badge = document.getElementById('adminBadge');
                const adminMenu = document.getElementById('adminMenuSection');
                const adminPanel = document.getElementById('adminPanel');

                if(badge) {
                    badge.style.display = isPower ? 'block' : 'none';
                    badge.innerText = currentRole.toUpperCase();
                }

                // MENAMPILKAN TOMBOL BUAT GRUP
                if(adminMenu) {
                    console.log("Menampilkan Menu Admin untuk role:", currentRole);
                    adminMenu.style.display = isPower ? 'block' : 'none';
                }

                // MENAMPILKAN PANEL KELOLA ANGGOTA (HANYA OWNER)
                if(currentRole === "owner") {
                    if(adminPanel) adminPanel.style.display = 'block';
                    loadUserManagement();
                } else {
                    if(adminPanel) adminPanel.style.display = 'none';
                }
            } else {
                console.error("Dokumen user tidak ada di Firestore!");
                if(userDisplay) userDisplay.innerText = "Data Profil Hilang";
            }
        });
        loadGroupList();
    } else {
        loginScr.style.display = 'block';
        appScr.style.display = 'none';
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
            div.className = 'item-row';
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
        window.closeAll();
    } catch (e) {
        console.error("Gagal buat grup:", e);
        alert("Gagal: Anda tidak memiliki izin (Cek Security Rules).");
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
            div.innerHTML = `👤 ${d.nama} | <small>${d.role}</small>`;
            list.appendChild(div);
        });
    });
                       }

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

// --- AUTH LOGIC ---
window.handleLogin = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    if (!email || !pass) return alert("Masukkan Email dan Password!");
    try {
        const res = await signInWithEmailAndPassword(auth, email, pass);
        if (!res.user.emailVerified) {
            alert("Email belum diverifikasi.");
            await signOut(auth);
        }
    } catch (e) { alert("Login Gagal: " + e.message); }
};

window.handleGoogleLogin = async () => {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (e) { alert("Login Google Gagal."); }
};

window.handleRegister = async () => {
    const nama = document.getElementById('namaUser').value;
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    if (!nama || !email || !pass) return alert("Lengkapi semua data!");
    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await sendEmailVerification(res.user);
        await setDoc(doc(db, "users", res.user.uid), {
            nama: nama,
            email: email,
            role: "anggota",
            createdAt: serverTimestamp()
        });
        alert("Daftar Berhasil! Cek email verifikasi.");
        await signOut(auth);
        window.cancelRegisterUI();
    } catch (e) { alert("Gagal Daftar: " + e.message); }
};

window.logout = () => signOut(auth);

// --- MONITOR STATUS & ROLE (FIXED) ---
onAuthStateChanged(auth, (user) => {
    const loginScr = document.getElementById('loginScreen');
    const appScr = document.getElementById('app');
    const userDisplay = document.getElementById('userNameDisplay');

    if (user && user.emailVerified) {
        if(loginScr) loginScr.style.display = 'none';
        if(appScr) appScr.style.display = 'block';
        
        // Ambil data user secara realtime
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                
                // Perbaikan: Gunakan field 'nama' sesuai setDoc di atas
                if(userDisplay) userDisplay.innerText = userData.nama || "User Tanpa Nama";

                // Pengecekan Role (Normalisasi ke Huruf Kecil agar aman)
                const role = (userData.role || "anggota").toLowerCase();
                const isPower = role === "admin" || role === "owner";

                const badge = document.getElementById('adminBadge');
                const adminMenu = document.getElementById('adminMenuSection');
                const adminPanel = document.getElementById('adminPanel');

                // Update UI Badge
                if(badge) {
                    badge.style.display = isPower ? 'block' : 'none';
                    badge.innerText = role.toUpperCase();
                }

                // Tampilkan Menu "Buat Grup Baru" (Admin & Owner)
                if(adminMenu) {
                    adminMenu.style.display = isPower ? 'block' : 'none';
                }

                // Tampilkan Panel "Kelola Anggota" (Khusus Owner)
                if (role === "owner") {
                    if(adminPanel) adminPanel.style.display = 'block';
                    loadUserManagement(user.uid);
                } else {
                    if(adminPanel) adminPanel.style.display = 'none';
                }
            } else {
                if(userDisplay) userDisplay.innerText = "Data tidak ditemukan";
            }
        });
        loadGroupList();
    } else {
        if(loginScr) loginScr.style.display = 'block';
        if(appScr) appScr.style.display = 'none';
    }
});

// --- SISTEM GRUP ---
function loadGroupList() {
    onSnapshot(collection(db, "groups"), (snap) => {
        const container = document.getElementById('groupContainer');
        if (!container) return;
        container.innerHTML = snap.empty ? "<p>Belum ada grup.</p>" : "";
        snap.forEach(g => {
            const data = g.data();
            const div = document.createElement('div');
            div.style = "padding:10px; border-bottom:1px solid #eee; color:#333;";
            div.innerHTML = `<span>📂 <b>${data.namaGrup}</b></span>`;
            container.appendChild(div);
        });
    });
}

window.submitGroup = async () => {
    const name = document.getElementById('newGroupName').value;
    if (!name) return alert("Isi nama grup!");
    try {
        await addDoc(collection(db, "groups"), { 
            namaGrup: name, 
            creator: auth.currentUser.uid, 
            createdAt: serverTimestamp() 
        });
        alert("Grup Berhasil Dibuat!");
        window.closeAll();
        document.getElementById('newGroupName').value = "";
    } catch (e) { alert("Gagal: Izin ditolak."); }
};

function loadUserManagement(myUid) {
    onSnapshot(collection(db, "users"), (snap) => {
        const list = document.getElementById('userList');
        if(!list) return;
        list.innerHTML = "";
        snap.forEach(u => {
            const d = u.data();
            const div = document.createElement('div');
            div.innerHTML = `<p>${d.nama} - ${d.role}</p>`;
            list.appendChild(div);
        });
    });
        }

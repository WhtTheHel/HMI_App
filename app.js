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

// --- 1. KONFIGURASI FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyA_SW13O3EPp6L6TGT3UV5B2ADzwCV_Owo",
    authDomain: "hmi-app-ac76d.firebaseapp.com",
    projectId: "hmi-app-ac76d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. LOGIKA AUTHENTICATION ---

window.handleLogin = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    if (!email || !pass) return alert("Masukkan Email dan Password!");

    try {
        const res = await signInWithEmailAndPassword(auth, email, pass);
        if (!res.user.emailVerified) {
            alert("Email belum diverifikasi. Cek kotak masuk/spam Anda.");
            await signOut(auth);
            return;
        }
    } catch (e) {
        alert("Login Gagal: " + e.message);
    }
};

window.handleGoogleLogin = async () => {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (e) {
        alert("Login Google Gagal.");
    }
};

window.showRegisterUI = () => {
    document.getElementById('namaUser').style.display = 'block';
    document.getElementById('loginGroup').style.display = 'none';
    document.getElementById('registerGroup').style.display = 'block';
};

window.cancelRegisterUI = () => {
    document.getElementById('namaUser').style.display = 'none';
    document.getElementById('loginGroup').style.display = 'block';
    document.getElementById('registerGroup').style.display = 'none';
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

        alert("Daftar Berhasil! Silakan cek email Anda untuk verifikasi.");
        await signOut(auth);
        window.cancelRegisterUI();
    } catch (e) {
        alert("Gagal Daftar: " + e.message);
    }
};

window.logout = () => signOut(auth);

// --- 3. MONITOR STATUS LOGIN & ROLE ---

onAuthStateChanged(auth, async (user) => {
    const loginScr = document.getElementById('loginScreen');
    const appScr = document.getElementById('app');

    if (user && user.emailVerified) {
        if(loginScr) loginScr.style.display = 'none';
        if(appScr) appScr.style.display = 'block';
        // Di dalam onAuthStateChanged...
onSnapshot(doc(db, "users", user.uid), (docSnap) => {
    if (docSnap.exists()) {
        const userData = docSnap.data();
        
        // Simpan role dalam variabel
        const userRole = userData.role; 

        // Tentukan siapa yang bisa melihat Menu Admin (Buat Grup & Kelola Anggota)
        const isPower = userRole === "admin" || userRole === "Owner";

        // Ambil elemen UI
        const badge = document.getElementById('adminBadge');
        const adminMenu = document.getElementById('adminMenuSection');
        const adminPanel = document.getElementById('adminPanel');

        // Tampilkan Badge & Menu di Sidebar
        if(badge) {
            badge.style.display = isPower ? 'block' : 'none';
            badge.innerText = userRole.toUpperCase();
        }
        
        // INI PENTING: Menampilkan section "Buat Grup Baru" dan "Kelola Anggota"
        if(adminMenu) {
            adminMenu.style.display = isPower ? 'block' : 'none';
        }

        // Panel Kelola Anggota (Hanya untuk Owner)
        if (userRole === "Owner") {
            if(adminPanel) adminPanel.style.display = 'block';
            loadUserManagement(user.uid);
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

// --- 4. SISTEM GRUP ---

function loadGroupList() {
    onSnapshot(collection(db, "groups"), (snap) => {
        const container = document.getElementById('groupContainer');
        if (!container) return;
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = "<p style='font-size:12px; color:#999; padding:10px;'>Belum ada grup tersedia.</p>";
            return;
        }

        snap.forEach(g => {
            const data = g.data();
            const div = document.createElement('div');
            div.className = 'item-row';
            div.innerHTML = `
                <div style="padding: 10px; border-bottom: 1px solid #eee; width: 100%;">
                    <span>📂 <b>${data.namaGrup}</b></span><br>
                    <small style="color:gray">${data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Baru saja'}</small>
                </div>
            `;
            container.appendChild(div);
        });
    });
}

window.submitGroup = async () => {
    const nameEl = document.getElementById('newGroupName');
    const name = nameEl.value;
    if (!name) return alert("Isi nama grup!");

    try {
        await addDoc(collection(db, "groups"), { 
            namaGrup: name, 
            creator: auth.currentUser.uid, 
            createdAt: serverTimestamp() 
        });
        alert("Grup Berhasil Dibuat!");
        if(window.closeAll) window.closeAll();
        nameEl.value = "";
    } catch (e) { 
        alert("Gagal: Anda memerlukan akses Admin."); 
    }
};

// --- 5. MANAJEMEN ANGGOTA ---

function loadUserManagement(myUid) {
    onSnapshot(collection(db, "users"), (snap) => {
        // Logika manajemen user berlanjut di sini...
    });
    }

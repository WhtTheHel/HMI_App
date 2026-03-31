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

// --- CONFIGURASI FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyA_SW13O3EPp6L6TGT3UV5B2ADzwCV_Owo",
    authDomain: "hmi-app-ac76d.firebaseapp.com",
    projectId: "hmi-app-ac76d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 1. FUNGSI LOGIN (EMAIL & PASSWORD) ---
window.handleLogin = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;

    if (!email || !pass) return alert("Masukkan Email dan Password!");

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // CEK VERIFIKASI EMAIL
        if (!user.emailVerified) {
            alert("Email Anda belum diverifikasi. Silakan cek kotak masuk/spam email Anda.");
            await signOut(auth); // Paksa keluar jika belum klik link konfirmasi
            return;
        }
        // Jika sukses & verifikasi ok, onAuthStateChanged akan memproses sisa tugasnya
    } catch (e) {
        alert("Login Gagal: Periksa kembali email dan password Anda.");
        console.error(e);
    }
};

// --- 2. FUNGSI LOGIN (GOOGLE) ---
window.handleGoogleLogin = async () => {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        // Google otomatis terverifikasi, jadi tidak perlu cek emailVerified
    } catch (e) {
        alert("Login Google Gagal.");
    }
};

// --- 3. FUNGSI PENDAFTARAN (DENGAN KONFIRMASI EMAIL) ---
window.showRegisterUI = () => {
    document.getElementById('namaUser').style.display = 'block';
    document.getElementById('btnLogin').style.display = 'none';
    document.getElementById('btnRegisterInitial').style.display = 'none';
    document.getElementById('btnConfirmRegister').style.display = 'block';
    document.getElementById('btnCancelRegister').style.display = 'block';
};

window.cancelRegisterUI = () => {
    document.getElementById('namaUser').style.display = 'none';
    document.getElementById('btnLogin').style.display = 'block';
    document.getElementById('btnRegisterInitial').style.display = 'block';
    document.getElementById('btnConfirmRegister').style.display = 'none';
    document.getElementById('btnCancelRegister').style.display = 'none';
};

window.handleRegister = async () => {
    const nama = document.getElementById('namaUser').value;
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;

    if (!nama || !email || !pass) return alert("Mohon lengkapi semua kolom!");

    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        
        // KIRIM LINK KONFIRMASI KE EMAIL
        await sendEmailVerification(res.user);
        
        // SIMPAN DATA PROFIL KE FIRESTORE
        await setDoc(doc(db, "users", res.user.uid), {
            nama: nama,
            email: email,
            role: "anggota", // Default role
            createdAt: serverTimestamp()
        });

        alert("Pendaftaran Berhasil! Link konfirmasi telah dikirim ke email: " + email);
        
        await signOut(auth); // Logout sampai mereka verifikasi
        window.cancelRegisterUI();
    } catch (e) {
        alert("Gagal Daftar: " + e.message);
    }
};

// --- 4. LOGIKA UTAMA (DETEKSI LOGIN & HAK AKSES) ---
onAuthStateChanged(auth, async (user) => {
    const loginScr = document.getElementById('loginScreen');
    const appScr = document.getElementById('app');

    if (user && user.emailVerified) {
        loginScr.style.display = 'none';
        appScr.style.display = 'block';
        
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            document.getElementById('userNameDisplay').innerText = userData.nama;

            // Kontrol Badge & Tombol Berdasarkan Role
            const isAdmin = userData.role === "admin_utama" || userData.role === "admin";
            const adminBadge = document.getElementById('adminBadge');
            const adminPanel = document.getElementById('adminPanel');
            const groupBtn = document.getElementById('groupBtnSection');

            if(adminBadge) {
                adminBadge.style.display = isAdmin ? 'block' : 'none';
                adminBadge.innerText = userData.role.toUpperCase();
            }
            if(groupBtn) groupBtn.style.display = isAdmin ? 'block' : 'none';

            // Jika Owner, jalankan fungsi manajemen anggota
            if (userData.role === "admin_utama" && adminPanel) {
                adminPanel.style.display = 'block';
                loadUserList();
            }
        }
    } else {
        loginScr.style.display = 'block';
        appScr.style.display = 'none';
    }
});

// --- 5. MANAJEMEN ANGGOTA (KHUSUS OWNER) ---
function loadUserList() {
    onSnapshot(collection(db, "users"), (snap) => {
        const list = document.getElementById('userList');
        if (!list) return;
        list.innerHTML = "";
        snap.forEach((u) => {
            const d = u.data();
            const id = u.id;
            if (id === auth.currentUser?.uid) return;

            const div = document.createElement('div');
            div.className = 'user-item';
            div.innerHTML = `
                <div style="flex-grow:1">
                    <b>${d.nama}</b><br>
                    <small>${d.role} | ${d.email}</small>
                </div>
                <div class="dots-menu" onclick="toggleDropdown('drop-${id}')">⋮</div>
                <div id="drop-${id}" class="dropdown-content">
                    <button onclick="updateRole('${id}', 'admin')">⭐ Jadi Admin</button>
                    <button onclick="updateRole('${id}', 'anggota')">⬇️ Jadi Anggota</button>
                    <button style="color:red" onclick="hapusUser('${id}')">🗑️ Hapus</button>
                </div>`;
            list.appendChild(div);
        });
    });
}

window.updateRole = async (id, role) => { 
    await updateDoc(doc(db, "users", id), { role: role }); 
    alert("Role berhasil diubah!"); 
};

window.hapusUser = async (id) => { 
    if (confirm("Hapus pengguna ini secara permanen?")) await deleteDoc(doc(db, "users", id)); 
};

// --- 6. NAVIGASI & UI HELPERS ---
window.logout = () => signOut(auth);

window.toggleSidebar = () => {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
};

window.closeAll = () => {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    const modal = document.getElementById('groupModal');
    if(modal) modal.style.display = 'none';
};

window.openModal = (id) => {
    document.getElementById(id).style.display = 'block';
    document.getElementById('overlay').classList.add('active');
};

window.toggleDropdown = (id) => {
    document.querySelectorAll('.dropdown-content').forEach(d => {
        if (d.id !== id) d.style.display = 'none';
    });
    const drop = document.getElementById(id);
    if(drop) drop.style.display = (drop.style.display === 'block') ? 'none' : 'block';
};

window.submitGroup = async () => {
    const name = document.getElementById('newGroupName').value;
    if (!name) return alert("Isi nama grup!");
    await addDoc(collection(db, "groups"), { 
        namaGrup: name, creator: auth.currentUser.uid, createdAt: serverTimestamp() 
    });
    alert("Grup Berhasil Dibuat!");
    window.closeAll();
};

// Menutup overlay jika diklik
const overlay = document.getElementById('overlay');
if(overlay) overlay.addEventListener('click', window.closeAll);

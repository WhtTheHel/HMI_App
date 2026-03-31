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

// --- 1. FUNGSI LOGIN & DAFTAR (Tombol Layar Depan) ---

window.handleLogin = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    if (!email || !pass) return alert("Masukkan Email dan Password!");

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        if (!userCredential.user.emailVerified) {
            alert("Email belum diverifikasi. Silakan cek kotak masuk email Anda.");
            await signOut(auth);
        }
    } catch (e) { alert("Login Gagal: Akun tidak ditemukan atau password salah."); }
};

window.handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
    catch (e) { console.error(e); }
};

window.showRegister = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const nama = prompt("Masukkan Nama Lengkap:");
    
    if (!nama || !email || !pass) return alert("Harap isi email & password di kolom, lalu masukkan nama.");

    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await sendEmailVerification(res.user);
        await setDoc(doc(db, "users", res.user.uid), {
            nama: nama, email: email, role: "anggota", emailVerified: false, createdAt: serverTimestamp()
        });
        alert("Pendaftaran berhasil! Link konfirmasi telah dikirim ke email Anda.");
        await signOut(auth);
    } catch (e) { alert("Gagal Daftar: " + e.message); }
};

// --- 2. LOGIKA UTAMA (Deteksi Login & Role) ---

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

            // Kontrol Tombol Berdasarkan Role
            const isAdmin = userData.role === "admin_utama" || userData.role === "admin";
            document.getElementById('groupBtnSection').style.display = isAdmin ? 'block' : 'none';
            document.getElementById('adminBadge').style.display = isAdmin ? 'block' : 'none';
            document.getElementById('adminBadge').innerText = userData.role.toUpperCase();

            if (userData.role === "admin_utama") {
                document.getElementById('adminPanel').style.display = 'block';
                loadUserList();
            }
        }
    } else {
        loginScr.style.display = 'block';
        appScr.style.display = 'none';
    }
});

// --- 3. FITUR ADMIN (Titik Tiga & Grup) ---

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
                <div><b>${d.nama}</b><br><small>${d.role}</small></div>
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
    alert("Role diperbarui!"); 
};

window.hapusUser = async (id) => { 
    if (confirm("Hapus pengguna ini secara permanen?")) await deleteDoc(doc(db, "users", id)); 
};

window.submitGroup = async () => {
    const name = document.getElementById('newGroupName').value;
    if (!name) return alert("Nama grup kosong!");
    await addDoc(collection(db, "groups"), { 
        namaGrup: name, creator: auth.currentUser.uid, createdAt: serverTimestamp() 
    });
    alert("Grup Berhasil Dibuat!");
    window.closeAll();
};

window.logout = () => signOut(auth);

// --- 4. NAVIGASI & UI (Buka Tutup Menu) ---

window.toggleSidebar = () => {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
};

window.closeAll = () => {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('groupModal').style.display = 'none';
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
    drop.style.display = (drop.style.display === 'block') ? 'none' : 'block';
};

// Menutup menu saat klik di mana saja (Overlay)
document.getElementById('overlay').addEventListener('click', window.closeAll);

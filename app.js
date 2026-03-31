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

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyA_SW13O3EPp6L6TGT3UV5B2ADzwCV_Owo",
    authDomain: "hmi-app-ac76d.firebaseapp.com",
    projectId: "hmi-app-ac76d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 1. FUNGSI LOGIN ---
window.handleLogin = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;

    if (!email || !pass) return alert("Masukkan Email dan Password!");

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        // Proteksi: Jika email belum diklik konfirmasinya, paksa logout
        if (!userCredential.user.emailVerified) {
            alert("Email Anda belum diverifikasi. Silakan cek kotak masuk/spam email Anda.");
            await signOut(auth);
            return;
        }
        // Jika berhasil & sudah verifikasi, onAuthStateChanged akan mengarahkan ke App
    } catch (e) {
        alert("Login Gagal: Periksa kembali email dan password Anda.");
        console.error(e);
    }
};

// --- 2. FUNGSI PENDAFTARAN (UI & PROSES) ---

// Menampilkan form pendaftaran
window.showRegisterUI = () => {
    document.getElementById('namaUser').style.display = 'block';
    document.getElementById('btnLogin').style.display = 'none';
    document.getElementById('btnRegisterInitial').style.display = 'none';
    document.getElementById('btnConfirmRegister').style.display = 'block';
    document.getElementById('btnCancelRegister').style.display = 'block';
};

// Kembali ke form login
window.cancelRegisterUI = () => {
    document.getElementById('namaUser').style.display = 'none';
    document.getElementById('btnLogin').style.display = 'block';
    document.getElementById('btnRegisterInitial').style.display = 'block';
    document.getElementById('btnConfirmRegister').style.display = 'none';
    document.getElementById('btnCancelRegister').style.display = 'none';
};

// Eksekusi Pendaftaran
window.handleRegister = async () => {
    const nama = document.getElementById('namaUser').value;
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;

    if (!nama || !email || !pass) return alert("Mohon lengkapi semua kolom!");

    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        
        // KIRIM EMAIL VERIFIKASI
        await sendEmailVerification(res.user);
        
        // SIMPAN DATA KE FIRESTORE
        await setDoc(doc(db, "users", res.user.uid), {
            nama: nama,
            email: email,
            role: "anggota",
            createdAt: serverTimestamp()
        });

        alert("Pendaftaran Berhasil! Link konfirmasi telah dikirim ke email: " + email);
        
        // Logout otomatis sampai mereka klik link di email
        await signOut(auth);
        window.cancelRegisterUI();
    } catch (e) {
        alert("Gagal Daftar: " + e.message);
    }
};

// --- 3. MONITOR STATUS LOGIN (LOGIKA UTAMA) ---
onAuthStateChanged(auth, async (user) => {
    const loginScr = document.getElementById('loginScreen');
    const appScr = document.getElementById('app');

    if (user && user.emailVerified) {
        // User Login dan sudah Verifikasi Email
        loginScr.style.display = 'none';
        appScr.style.display = 'block';
        
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            document.getElementById('userNameDisplay').innerText = userData.nama;

            // Kontrol Badge & Tombol Berdasarkan Role
            const isAdmin = userData.role === "admin_utama" || userData.role === "admin";
            document.getElementById('adminBadge').style.display = isAdmin ? 'block' : 'none';
            document.getElementById('adminBadge').innerText = userData.role.toUpperCase();
            
            // Tampilkan tombol buat grup jika dia admin
            const groupSection = document.getElementById('groupBtnSection');
            if(groupSection) groupSection.style.display = isAdmin ? 'block' : 'none';

            // Jika dia Owner (Admin Utama), tampilkan panel manajemen anggota
            if (userData.role === "admin_utama") {
                document.getElementById('adminPanel').style.display = 'block';
                loadUserList();
            }
        }
    } else {
        // User belum login atau belum verifikasi
        loginScr.style.display = 'block';
        appScr.style.display = 'none';
    }
});

// --- 4. FITUR ADMIN (MANAJEMEN ANGGOTA) ---
function loadUserList() {
    onSnapshot(collection(db, "users"), (snap) => {
        const list = document.getElementById('userList');
        if (!list) return;
        list.innerHTML = "";
        snap.forEach((u) => {
            const d = u.data();
            const id = u.id;
            if (id === auth.currentUser?.uid) return; // Sembunyikan diri sendiri

            const div = document.createElement('div');
            div.className = 'user-item';
            div.innerHTML = `
                <div>
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
    alert("Role diperbarui!"); 
};

window.hapusUser = async (id) => { 
    if (confirm("Hapus pengguna ini?")) await deleteDoc(doc(db, "users", id)); 
};

window.submitGroup = async () => {
    const name = document.getElementById('newGroupName').value;
    if (!name) return alert("Nama grup wajib diisi!");
    await addDoc(collection(db, "groups"), { 
        namaGrup: name, creator: auth.currentUser.uid, createdAt: serverTimestamp() 
    });
    alert("Grup Berhasil Dibuat!");
    window.closeAll();
};

// --- 5. NAVIGASI & UI HELPERS ---
window.handleGoogleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
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
    drop.style.display = (drop.style.display === 'block') ? 'none' : 'block';
};

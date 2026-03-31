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

// --- 1. REGISTRASI DENGAN KONFIRMASI EMAIL ---
window.showRegister = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const nama = prompt("Masukkan Nama Lengkap Anda:");
    
    if (!nama || !email || !pass) return alert("Data tidak lengkap!");

    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        
        // 1. Kirim Email Verifikasi
        await sendEmailVerification(res.user);
        
        // 2. Simpan Data ke Firestore
        await setDoc(doc(db, "users", res.user.uid), {
            nama: nama,
            email: email,
            role: "anggota",
            emailVerified: false, // Status awal
            createdAt: serverTimestamp()
        });

        alert("Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi sebelum login.");
        await signOut(auth); // Paksa logout sampai mereka verifikasi email
        location.reload(); 
    } catch (e) { 
        alert("Gagal Daftar: " + e.message); 
    }
};

// --- 2. LOGIN DENGAN PROTEKSI VERIFIKASI ---
window.handleLogin = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // Cek apakah email sudah diklik konfirmasinya
        if (!user.emailVerified) {
            alert("Email Anda belum dikonfirmasi. Silakan cek kotak masuk/spam email Anda.");
            await signOut(auth);
            return;
        }
    } catch (e) {
        alert("Login Gagal: Email atau Password salah.");
    }
};

// --- 3. MONITOR STATUS LOGIN & AUTO-LOGIN ---
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

            // Update status verifikasi di database jika belum update
            if (userData.emailVerified === false) {
                await updateDoc(doc(db, "users", user.uid), { emailVerified: true });
            }

            // Role Check
            if (userData.role === "admin_utama") {
                document.getElementById('adminPanel').style.display = 'block';
                document.getElementById('adminBadge').style.display = 'block';
                document.getElementById('groupBtnSection').style.display = 'block';
                loadUserList();
            } else if (userData.role === "admin") {
                document.getElementById('adminBadge').style.display = 'block';
                document.getElementById('groupBtnSection').style.display = 'block';
            }
        }
    } else {
        loginScr.style.display = 'block';
        appScr.style.display = 'none';
    }
});

// --- 4. ADMIN & UI LOGIC (Tetap sama seperti sebelumnya) ---
window.handleGoogleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
window.logout = () => signOut(auth);

function loadUserList() {
    onSnapshot(collection(db, "users"), (snap) => {
        const list = document.getElementById('userList');
        list.innerHTML = "";
        snap.forEach((u) => {
            const d = u.data();
            const id = u.id;
            if (id === auth.currentUser?.uid) return;
            const div = document.createElement('div');
            div.className = 'user-item';
            div.innerHTML = `
                <div><b>${d.nama}</b><br><small>${d.role} | ${d.emailVerified ? '✅ Terverifikasi' : '⏳ Pending'}</small></div>
                <div class="dots-menu" onclick="toggleDropdown('drop-${id}')">⋮</div>
                <div id="drop-${id}" class="dropdown-content">
                    <button onclick="updateRole('${id}', 'admin')">⭐ Jadi Admin</button>
                    <button onclick="updateRole('${id}', 'anggota')">⬇️ Anggota Biasa</button>
                    <button style="color:red" onclick="hapusUser('${id}')">🗑️ Hapus</button>
                </div>`;
            list.appendChild(div);
        });
    });
}

window.updateRole = async (id, role) => { await updateDoc(doc(db, "users", id), { role: role }); alert("Role diperbarui!"); };
window.hapusUser = async (id) => { if (confirm("Hapus user ini?")) await deleteDoc(doc(db, "users", id)); };
window.submitGroup = async () => {
    const name = document.getElementById('newGroupName').value;
    if (!name) return;
    await addDoc(collection(db, "groups"), { namaGrup: name, creator: auth.currentUser.uid, createdAt: serverTimestamp() });
    alert("Grup berhasil dibuat!");
    window.closeAll();
};

// UI Helpers
window.toggleSidebar = () => { document.getElementById('sidebar').classList.toggle('active'); document.getElementById('overlay').classList.toggle('active'); };
window.closeAll = () => { document.getElementById('sidebar').classList.remove('active'); document.getElementById('overlay').classList.remove('active'); document.getElementById('groupModal').style.display = 'none'; };
window.openModal = (id) => { document.getElementById(id).style.display = 'block'; document.getElementById('overlay').classList.add('active'); };
window.toggleDropdown = (id) => { 
    document.querySelectorAll('.dropdown-content').forEach(d => { if (d.id !== id) d.style.display = 'none'; });
    const drop = document.getElementById(id); drop.style.display = (drop.style.display === 'block') ? 'none' : 'block'; 
};

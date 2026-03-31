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

// --- 1. LOGIN & REGISTER LOGIC ---
window.handleLogin = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    if (!email || !pass) return alert("Masukkan Email dan Password!");

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        if (!userCredential.user.emailVerified) {
            alert("Email belum diverifikasi. Cek kotak masuk/spam Anda.");
            await signOut(auth);
        }
    } catch (e) {
        alert("Login Gagal: Periksa kembali akun Anda.");
    }
};

window.handleGoogleLogin = async () => {
    try {
        await signInWithPopup(auth, new GoogleAuthProvider());
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

    if (!nama || !email || !pass) return alert("Mohon lengkapi semua kolom!");

    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await sendEmailVerification(res.user);
        await setDoc(doc(db, "users", res.user.uid), {
            nama: nama,
            email: email,
            role: "anggota",
            createdAt: serverTimestamp()
        });
        alert("Daftar Berhasil! Cek email untuk verifikasi.");
        await signOut(auth);
        window.cancelRegisterUI();
    } catch (e) {
        alert("Gagal Daftar: " + e.message);
    }
};

// --- 2. MONITOR STATUS LOGIN & ROLE ---
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

            const isPower = userData.role === "admin" || userData.role === "admin_utama";
            document.getElementById('adminBadge').style.display = isPower ? 'block' : 'none';
            document.getElementById('adminBadge').innerText = userData.role.toUpperCase();
            
            // Tampilkan Menu Admin di Sidebar
            document.getElementById('adminMenuSection').style.display = isPower ? 'block' : 'none';

            // Jika Admin Utama, tampilkan panel manajemen anggota
            if (userData.role === "admin_utama") {
                document.getElementById('adminPanel').style.display = 'block';
                loadUserManagement(user.uid);
            }
        }
        loadGroupList();
    } else {
        loginScr.style.display = 'block';
        appScr.style.display = 'none';
    }
});

// --- 3. DAFTAR GRUP (REALTIME) ---
function loadGroupList() {
    onSnapshot(collection(db, "groups"), (snap) => {
        const container = document.getElementById('groupContainer');
        if (!container) return;
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = "<p style='font-size:12px; color:#999;'>Belum ada grup yang dibuat.</p>";
            return;
        }

        snap.forEach(g => {
            const data = g.data();
            const div = document.createElement('div');
            div.className = 'group-item';
            div.innerHTML = `
                <span>📂 <b>${data.namaGrup}</b></span>
                <small style="color:gray">${data.createdAt?.toDate().toLocaleDateString() || ''}</small>
            `;
            container.appendChild(div);
        });
    });
}

window.submitGroup = async () => {
    const name = document.getElementById('newGroupName').value;
    if (!name) return alert("Isi nama grup!");
    try {
        await addDoc(collection(db, "groups"), { 
            namaGrup: name, creator: auth.currentUser.uid, createdAt: serverTimestamp() 
        });
        alert("Grup Berhasil Dibuat!");
        window.closeAll();
    } catch (e) { alert("Gagal membuat grup."); }
};

// --- 4. MANAJEMEN ANGGOTA (KHUSUS ADMIN UTAMA) ---
function loadUserManagement(myUid) {
    onSnapshot(collection(db, "users"), (snap) => {
        const list = document.getElementById('userList');
        if (!list) return;
        list.innerHTML = "";
        
        snap.forEach((u) => {
            const d = u.data();
            const id = u.id;
            if (id === myUid) return; // Sembunyikan diri sendiri

            const div = document.createElement('div');
            div.className = 'user-item';
            div.innerHTML = `
                <div style="flex-grow:1">
                    <b>${d.nama}</b><br>
                    <small style="color:#0b6623">${d.role.toUpperCase()} | ${d.email}</small>
                </div>
                <div class="dots-menu" onclick="window.toggleDropdown('drop-${id}')">⋮</div>
                <div id="drop-${id}" class="dropdown-content">
                    ${d.role === 'anggota' ? 
                        `<button onclick="updateRole('${id}', 'admin')">⭐ Jadikan Admin</button>` : 
                        `<button onclick="updateRole('${id}', 'anggota')">❌ Copot Admin</button>`
                    }
                    <button style="color:red" onclick="hapusUser('${id}')">🗑️ Hapus Anggota</button>
                </div>`;
            list.appendChild(div);
        });
    });
}

window.updateRole = async (id, newRole) => { 
    try {
        await updateDoc(doc(db, "users", id), { role: newRole }); 
        alert("Jabatan diperbarui!"); 
    } catch (e) { alert("Gagal memperbarui role."); }
};

window.hapusUser = async (id) => { 
    if (confirm("Hapus pengguna secara permanen?")) {
        await deleteDoc(doc(db, "users", id)); 
    }
};

// --- 5. LOGOUT ---
window.logout = () => signOut(auth);

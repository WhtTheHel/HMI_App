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
        // Proteksi jika user belum verifikasi email
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
        // Google biasanya otomatis terverifikasi, jadi tidak perlu cek emailVerified
    } catch (e) {
        alert("Login Google Gagal.");
    }
};

window.showRegisterUI = () => {
    document.getElementById('namaUser').style.display = 'block';
    const loginGrp = document.getElementById('loginGroup');
    const regGrp = document.getElementById('registerGroup');
    if(loginGrp) loginGrp.style.display = 'none';
    if(regGrp) regGrp.style.display = 'block';
};

window.cancelRegisterUI = () => {
    document.getElementById('namaUser').style.display = 'none';
    const loginGrp = document.getElementById('loginGroup');
    const regGrp = document.getElementById('registerGroup');
    if(loginGrp) loginGrp.style.display = 'block';
    if(regGrp) regGrp.style.display = 'none';
};

window.handleRegister = async () => {
    const nama = document.getElementById('namaUser').value;
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;

    if (!nama || !email || !pass) return alert("Lengkapi semua data!");

    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await sendEmailVerification(res.user);
        
        // Simpan data ke Firestore
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
        
        // Ambil Data Role dari Firestore
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                const userDisplay = document.getElementById('userNameDisplay');
                if(userDisplay) userDisplay.innerText = userData.nama;

                const isPower = userData.role === "admin" || userData.role === "admin_utama";
                const badge = document.getElementById('adminBadge');
                const adminMenu = document.getElementById('adminMenuSection');

                if(badge) {
                    badge.style.display = isPower ? 'block' : 'none';
                    badge.innerText = userData.role.toUpperCase();
                }
                if(adminMenu) adminMenu.style.display = isPower ? 'block' : 'none';

                if (userData.role === "admin_utama") {
                    const adminPnl = document.getElementById('adminPanel');
                    if(adminPnl) adminPnl.style.display = 'block';
                    loadUserManagement(user.uid);
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
                <div style="padding: 10px; border-bottom: 1px solid #eee;">
                    <span>📂 <b>${data.namaGrup}</b></span><br>
                    <small style="color:gray">${data.createdAt ? data.createdAt.toDate().toLocaleDateString() : ''}</small>
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
        window.closeAll();
        nameEl.value = "";
    } catch (e) { 
        console.error(e);
        alert("Gagal: Pastikan Anda memiliki akses Admin."); 
    }
};

// --- 5. MANAJEMEN ANGGOTA ---

function loadUserManagement(myUid) {
    onSnapshot(collection(db, "users"), (snap) => {
        const list = document.getElementById('userList');
        if (!list) return;
        list.innerHTML = "";
        
        snap.forEach((u) => {
            const d = u.data();
            const id = u.id;
            if (id === myUid) return; 

            const div = document.createElement('div');
            div.className = 'user-item';
            div.style = "display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee; position:relative;";
            div.innerHTML = `
                <div style="flex-grow:1">
                    <b>${d.nama}</b><br>
                    <small style="color:#0b6623">${d.role.toUpperCase()} | ${d.email}</small>
                </div>
                <div class="dots-menu" style="cursor:pointer; padding:5px 10px;" onclick="window.toggleDropdown('drop-${id}')">⋮</div>
                <div id="drop-${id}" class="dropdown-content" style="display:none; position:absolute; right:0; top:40px; background:white; border:1px solid #ccc; z-index:100; box-shadow:0 2px 5px rgba(0,0,0,0.2);">
                    <button style="display:block; width:100%; padding:8px; border:none; background:none; text-align:left; cursor:pointer;" onclick="window.updateRole('${id}', 'admin')">⭐ Jadi Admin</button>
                    <button style="display:block; width:100%; padding:8px; border:none; background:none; text-align:left; cursor:pointer;" onclick="window.updateRole('${id}', 'anggota')">⬇️ Jadi Anggota</button>
                    <button style="display:block; width:100%; padding:8px; border:none; background:none; text-align:left; cursor:pointer; color:red;" onclick="window.hapusUser('${id}')">🗑️ Hapus</button>
                </div>`;
            list.appendChild(div);
        });
    });
}

window.updateRole = async (id, newRole) => { 
    try {
        await updateDoc(doc(db, "users", id), { role: newRole }); 
        alert("Role berhasil diubah!"); 
    } catch (e) { alert("Gagal memperbarui role."); }
};

window.hapusUser = async (id) => { 
    if (confirm("Hapus pengguna ini secara permanen dari database?")) {
        try {
            await deleteDoc(doc(db, "users", id));
        } catch(e) { alert("Gagal menghapus."); }
    }
};

// --- 6. UI HELPERS ---

window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if(sidebar) sidebar.classList.toggle('active');
    if(overlay) overlay.classList.toggle('active');
};

window.closeAll = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('groupModal');
    
    if(sidebar) sidebar.classList.remove('active');
    if(overlay) overlay.classList.remove('active');
    if(modal) modal.style.display = 'none';
    
    document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
};

window.openModal = (id) => {
    const modal = document.getElementById(id);
    const overlay = document.getElementById('overlay');
    if(modal) modal.style.display = 'block';
    if(overlay) overlay.classList.add('active');
};

window.scrollToView = (id) => {
    const el = document.getElementById(id);
    if(el) {
        el.scrollIntoView({ behavior: 'smooth' });
        window.closeAll();
    }
};

// Tambahkan baris ini di bagian bawah atau di dalam fungsi UI Helpers
// untuk memastikan fungsi benar-benar tersedia secara global
window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if(sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    } else {
        console.error("Elemen sidebar atau overlay tidak ditemukan!");
    }
};

window.closeAll = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('groupModal');
    
    if(sidebar) sidebar.classList.remove('active');
    if(overlay) overlay.classList.remove('active');
    if(modal) modal.style.display = 'none';
    
    document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
};


window.toggleDropdown = (id) => {
    const el = document.getElementById(id);
    const wasVisible = el.style.display === 'block';
    // Sembunyikan dropdown lain dulu
    document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
    // Toggle yang dipilih
    if(el) el.style.display = wasVisible ? 'none' : 'block';
};

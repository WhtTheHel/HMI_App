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
        loginScr.style.display = 'none';
        appScr.style.display = 'block';
        
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                document.getElementById('userNameDisplay').innerText = userData.nama;

                const isPower = userData.role === "admin" || userData.role === "admin_utama";
                const badge = document.getElementById('adminBadge');
                const adminMenu = document.getElementById('adminMenuSection');

                if(badge) {
                    badge.style.display = isPower ? 'block' : 'none';
                    badge.innerText = userData.role.toUpperCase();
                }
                if(adminMenu) adminMenu.style.display = isPower ? 'block' : 'none';

                if (userData.role === "admin_utama") {
                    document.getElementById('adminPanel').style.display = 'block';
                    loadUserManagement(user.uid);
                }
            }
        });
        loadGroupList();
    } else {
        loginScr.style.display = 'block';
        appScr.style.display = 'none';
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
        window.closeAll();
        nameEl.value = "";
    } catch (e) { 
        alert("Gagal: Anda memerlukan akses Admin."); 
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
            div.className = 'item-row';
            div.style.padding = "10px";
            div.innerHTML = `
                <div style="flex-grow:1">
                    <b>${d.nama}</b><br>
                    <small style="color:#0b6623">${d.role.toUpperCase()} | ${d.email}</small>
                </div>
                <div class="dots-menu" onclick="window.toggleDropdown('drop-${id}')">⋮</div>
                <div id="drop-${id}" class="dropdown-content">
                    <button onclick="window.updateRole('${id}', 'admin')">⭐ Jadi Admin</button>
                    <button onclick="window.updateRole('${id}', 'anggota')">⬇️ Jadi Anggota</button>
                    <button onclick="window.hapusUser('${id}')" style="color:red;">🗑️ Hapus</button>
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
    if (confirm("Hapus pengguna ini secara permanen?")) {
        try {
            await deleteDoc(doc(db, "users", id));
        } catch(e) { alert("Gagal menghapus."); }
    }
};

window.toggleDropdown = (id) => {
    const el = document.getElementById(id);
    const wasVisible = el.style.display === 'block';
    document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
    if(el) el.style.display = wasVisible ? 'none' : 'block';
};

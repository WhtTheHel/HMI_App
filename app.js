import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
    getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
    getFirestore, doc, collection, onSnapshot, addDoc, serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyA_SW13O3EPp6L6TGT3UV5B2ADzwCV_Owo",
    authDomain: "hmi-app-ac76d.firebaseapp.com",
    projectId: "hmi-app-ac76d"
};

let currentGroupId = null; // Menyimpan ID grup yang sedang dibuka
let chatListener = null;   // Menyimpan listener pesan agar bisa dimatikan saat pindah grup

// --- FUNGSI BUKA CHAT ---
window.openChat = (groupId, groupName) => {
    currentGroupId = groupId;
    document.getElementById('groupListView').style.display = 'none';
    document.getElementById('chatView').style.display = 'flex';
    document.getElementById('chatGroupName').innerText = "💬 " + groupName;
    
    loadMessages(groupId);
};

window.backToGroups = () => {
    if(chatListener) chatListener(); // Matikan listener chat sebelumnya
    document.getElementById('groupListView').style.display = 'block';
    document.getElementById('chatView').style.display = 'none';
};

// --- LOAD PESAN REAL-TIME ---
function loadMessages(groupId) {
    const container = document.getElementById('messagesContainer');
    
    // Query ke sub-koleksi 'messages' di dalam dokumen grup
    const msgQuery = collection(db, "groups", groupId, "messages");
    
    // Gunakan onSnapshot agar pesan muncul otomatis saat ada kiriman baru
    chatListener = onSnapshot(msgQuery, (snap) => {
        container.innerHTML = "";
        
        // Urutkan pesan berdasarkan waktu (jika ada timestamp)
        const docs = snap.docs.sort((a, b) => a.data().time - b.data().time);
        
        docs.forEach(doc => {
            const m = doc.data();
            const isMe = m.senderId === auth.currentUser.uid;
            
            const div = document.createElement('div');
            div.style = `
                max-width: 80%;
                padding: 10px;
                border-radius: 15px;
                font-size: 13px;
                align-self: ${isMe ? 'flex-end' : 'flex-start'};
                background: ${isMe ? '#0b6623' : '#eee'};
                color: ${isMe ? 'white' : 'black'};
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            `;
            div.innerHTML = `
                <small style="display:block; font-weight:bold; font-size:10px; margin-bottom:3px;">${m.senderName}</small>
                ${m.text}
            `;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight; // Scroll ke bawah otomatis
    });
}

// --- KIRIM PESAN ---
window.sendMessage = async () => {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if(!text || !currentGroupId) return;

    try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        await addDoc(collection(db, "groups", currentGroupId, "messages"), {
            text: text,
            senderId: auth.currentUser.uid,
            senderName: userData.nama || auth.currentUser.email,
            time: Date.now() // Gunakan timestamp sederhana
        });
        input.value = "";
    } catch (e) {
        alert("Gagal mengirim pesan.");
    }
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- FUNGSI LOGIN ---
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
    catch (e) { alert("Login Google Gagal."); }
};

window.logout = () => signOut(auth);

// --- MONITOR ROLE (SOLUSI UNTUK 'Owner') ---
onAuthStateChanged(auth, (user) => {
    const loginScr = document.getElementById('loginScreen');
    const appScr = document.getElementById('app');
    const userDisplay = document.getElementById('userNameDisplay');

    if (user && user.emailVerified) {
        if(loginScr) loginScr.style.display = 'none';
        if(appScr) appScr.style.display = 'block';

        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Update Nama
                if(userDisplay) userDisplay.innerText = data.nama || "Kader HMI";

                // --- BAGIAN KRUSIAL ---
                // Kita ambil data role dari Firebase (tulisan 'Owner')
                const roleAsli = data.role || "anggota";
                
                // Kita paksa jadi huruf kecil untuk dicek di kode (menjadi 'owner')
                const roleCek = roleAsli.toLowerCase().trim();

                const badge = document.getElementById('adminBadge');
                const adminMenu = document.getElementById('adminMenuSection');
                const adminPanel = document.getElementById('adminPanel');

                // 1. Update Badge (Tampilkan OWNER sesuai database)
                if(badge) {
                    badge.style.display = (roleCek === "owner" || roleCek === "admin") ? 'block' : 'none';
                    badge.innerText = roleAsli.toUpperCase();
                }

                // 2. MUNCULKAN TOMBOL BUAT GRUP (Untuk Owner atau admin)
                if(adminMenu) {
                    if (roleCek === "owner" || roleCek === "admin") {
                        adminMenu.style.display = 'block'; // Tombol akan muncul!
                    } else {
                        adminMenu.style.display = 'none';
                    }
                }

                // 3. Tampilkan Panel Manajemen (Hanya untuk Owner)
                if(roleCek === "owner") {
                    if(adminPanel) adminPanel.style.display = 'block';
                    loadUserManagement();
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

// --- FUNGSI LOAD DATA ---
function loadGroupList() {
    onSnapshot(collection(db, "groups"), (snap) => {
        const container = document.getElementById('groupContainer');
        if(!container) return;
        container.innerHTML = snap.empty ? "Belum ada grup." : "";
        snap.forEach(g => {
            const d = g.data();
            const div = document.createElement('div');
            div.style = "padding:10px; border-bottom:1px solid #eee; color:#333;";
            div.innerHTML = `📂 <b>${d.namaGrup}</b>`;
            container.appendChild(div);
        });
    });
}

window.submitGroup = async () => {
    const nameInput = document.getElementById('newGroupName');
    const name = nameInput.value;
    if(!name) return alert("Masukkan nama grup!");
    try {
        await addDoc(collection(db, "groups"), {
            namaGrup: name,
            creator: auth.currentUser.uid,
            createdAt: serverTimestamp()
        });
        alert("Grup Berhasil Dibuat!");
        nameInput.value = "";
        if(window.closeAll) window.closeAll();
    } catch (e) { alert("Gagal: Anda tidak memiliki izin."); }
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
            div.innerHTML = `👤 ${d.nama || d.email} | <small>${d.role}</small>`;
            list.appendChild(div);
        });
    });
                      }

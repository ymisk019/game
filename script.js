// --- إعدادات Firebase ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

let db = null;
let isOnline = false;
let myRef = null;
const myId = 'chef_' + Math.random().toString(36).substr(2, 6);
let chefName = "شيف يزن";

try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        isOnline = true;
        document.getElementById('network-status').className = "status-online";
        document.getElementById('status-text').innerText = "متصل أونلاين بـ Firebase 🟢";
    }
} catch (e) {
    console.log("يعمل بالوضع المحلي.");
}

// --- مشهد Three.js ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x06060c, 0.015);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// إضاءة المحيط
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffaa00, 1);
dirLight.position.set(10, 25, 15);
dirLight.castShadow = true;
scene.add(dirLight);

// قاعدة الصحن (Plate)
const plateGroup = new THREE.Group();
const plateGeo = new THREE.CylinderGeometry(3.5, 3.8, 0.4, 32);
const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.1 });
const plate = new THREE.Mesh(plateGeo, plateMat);
plate.receiveShadow = true;
plateGroup.add(plate);

// حلقة نيون تحت الصحن
const ringGeo = new THREE.RingGeometry(3.5, 3.8, 32);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide });
const plateRing = new THREE.Mesh(ringGeo, ringMat);
plateRing.rotation.x = Math.PI / 2;
plateRing.position.y = -0.21;
plateGroup.add(plateRing);

plateGroup.position.set(0, -4, 0);
scene.add(plateGroup);

// متغيرات اللعبة
let score = 0;
let stackHeight = 0;
let lives = 3;
let gamePlaying = false;
const stackedLayers = [];
let currentFallingItem = null;

// أنواع مكونات البرجر بأشكال وألوان مختلفة
const ingredientTypes = [
    { name: 'خبز علوي', color: 0xd27d2d, geo: new THREE.SphereGeometry(2.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2) },
    { name: 'لحمة', color: 0x5c2c16, geo: new THREE.CylinderGeometry(2.1, 2.1, 0.5, 24) },
    { name: 'جبنة', color: 0xffcc00, geo: new THREE.BoxGeometry(3.2, 0.2, 3.2) },
    { name: 'خس', color: 0x33cc44, geo: new THREE.CylinderGeometry(2.3, 2.3, 0.3, 16) },
    { name: 'طماطم', color: 0xff2233, geo: new THREE.CylinderGeometry(2.0, 2.0, 0.4, 20) },
    { name: 'صوص', color: 0xffffff, geo: new THREE.CylinderGeometry(1.8, 1.8, 0.2, 16) }
];

function spawnNewIngredient() {
    if (!gamePlaying) return;
    const type = ingredientTypes[Math.floor(Math.random() * ingredientTypes.length)];
    const mat = new THREE.MeshStandardMaterial({ color: type.color, roughness: 0.3 });
    const mesh = new THREE.Mesh(type.geo, mat);
    mesh.castShadow = true;
    
    mesh.position.set((Math.random() - 0.5) * 6, 12, 0);
    mesh.itemType = type.name;
    scene.add(mesh);
    currentFallingItem = mesh;
}

// أزرار وبدء اللعبة
document.getElementById('btn-start').addEventListener('click', () => {
    const n = document.getElementById('player-name').value.trim();
    if (n) chefName = n;
    document.getElementById('start-overlay').classList.add('hidden');
    resetGame();
});

document.getElementById('btn-restart').addEventListener('click', () => {
    document.getElementById('gameover-overlay').classList.add('hidden');
    resetGame();
});

function resetGame() {
    stackedLayers.forEach(l => scene.remove(l));
    stackedLayers.length = 0;
    if (currentFallingItem) scene.remove(currentFallingItem);
    score = 0;
    stackHeight = 0;
    lives = 3;
    updateHUD();
    gamePlaying = true;
    spawnNewIngredient();
}

function updateHUD() {
    document.getElementById('score-val').innerText = score;
    document.getElementById('stack-height').innerText = stackHeight;
    document.getElementById('lives-container').innerText = '❤️'.repeat(Math.max(0, lives));
}

// نظام التحكم بالصحن
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' && currentFallingItem) {
        currentFallingItem.position.x = plateGroup.position.x; // إسقاط سريع فوق الصحن
    }
});
window.addEventListener('keyup', (e) => keys[e.code] = false);

// حلقة اللعبة الأساسية
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (gamePlaying) {
        // حركة الصحن باليمين واليسار
        const moveSpeed = 14;
        if ((keys['KeyA'] || keys['ArrowLeft']) && plateGroup.position.x > -6) {
            plateGroup.position.x -= moveSpeed * delta;
        }
        if ((keys['KeyD'] || keys['ArrowRight']) && plateGroup.position.x < 6) {
            plateGroup.position.x += moveSpeed * delta;
        }

        // حركة المكون الساقط
        if (currentFallingItem) {
            currentFallingItem.position.y -= 7 * delta;
            currentFallingItem.rotation.y += 1 * delta;

            const targetY = -3.2 + (stackedLayers.length * 0.5);

            // التحقق من وصوله للصحن أو البرجر المبني
            if (currentFallingItem.position.y <= targetY) {
                const distance = Math.abs(currentFallingItem.position.x - plateGroup.position.x);
                
                if (distance < 2.2) {
                    // نجح في التركيب!
                    currentFallingItem.position.y = targetY;
                    stackedLayers.push(currentFallingItem);
                    score += 10 + (stackHeight * 2);
                    stackHeight++;
                    updateHUD();
                    
                    // تحريك الكاميرا للأعلى تدريجياً مع ارتفاع البرجر
                    camera.position.y = 8 + (stackHeight * 0.25);

                    currentFallingItem = null;
                    setTimeout(spawnNewIngredient, 400);
                } else {
                    // سقط خارج الصحن!
                    scene.remove(currentFallingItem);
                    currentFallingItem = null;
                    lives--;
                    updateHUD();

                    if (lives <= 0) {
                        gamePlaying = false;
                        document.getElementById('final-score').innerText = score;
                        document.getElementById('gameover-overlay').classList.remove('hidden');
                    } else {
                        setTimeout(spawnNewIngredient, 600);
                    }
                }
            }
        }

        // تحديث Firebase
        if (isOnline && Math.random() < 0.1) {
            if (!myRef) myRef = db.ref('burger_chefs/' + myId);
            myRef.set({ name: chefName, score: score, height: stackHeight });
        }
    }

    renderer.render(scene, camera);
}

// قراءة المتصدرين أونلاين
if (isOnline) {
    db.ref('burger_chefs').on('value', (snap) => {
        const data = snap.val() || {};
        const list = [];
        for (let id in data) list.push(data[id]);
        list.sort((a, b) => b.score - a.score);
        
        document.getElementById('players-list').innerHTML = list.slice(0, 5).map(p => `
            <div class="player-row">
                <span>${p.name}</span>
                <span class="highlight-orange">${p.score} نقطة</span>
            </div>
        `).join('') || '<div class="player-row">لا توجد نتائج بعد</div>';
    });
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

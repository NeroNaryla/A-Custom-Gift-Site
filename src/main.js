import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ===== 1. Typewriter intro =====
const consoleEl = document.getElementById('console');
const threeContainer = document.getElementById('three-container');

const lines = [
  '> Annie',
  '...',
  '> Happy New Year!',
  '> Made you something special~'
];

let lineIndex = 0;
let charIndex = 0;
let currentText = '';

function typeNextChar() {
  if (lineIndex >= lines.length) {
    setTimeout(() => {
      consoleEl.style.display = 'none';
      threeContainer.style.opacity = 1;
    }, 1000);
    return;
  }

  const line = lines[lineIndex];

  if (charIndex < line.length) {
    currentText += line[charIndex++];
  } else {
    currentText += '\n';
    lineIndex++;
    charIndex = 0;
  }

  consoleEl.textContent = currentText;
  setTimeout(typeNextChar, 40);
}

typeNextChar();



// ===== 2. Three.js scene =====
const cardOverlay = document.getElementById('card-overlay');
const cardClose = document.getElementById('card-close');

let scene, camera, renderer, controls, raycaster, mouse;
const clickableObjects = [];

initThree();
animate();

function initThree() {
  scene = new THREE.Scene();

  const texLoader = new THREE.TextureLoader();

  const width = window.innerWidth;
  const height = window.innerHeight;

  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
  camera.position.set(0, 2, 6);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  threeContainer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.enableDamping = true;

  // ===== Cylindrical sky background =====

  const bgUrl = new URL('/Background.jpg', window.location.origin).href;
// If you're using Vite AND the file is in /public, the above is fine.
// If the file is NOT in /public, use option #2 below.

const bgTex = texLoader.load(
  bgUrl,
  (t) => {


    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy(); // Maximum quality
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
  },
  undefined,
  (err) => console.error('âŒ Background failed to load:', bgUrl, err)
);



  const skyRadius = 20;
  const skyHeight = 20;
  //const thetaStart = Math.PI * 0.75;
  //const thetaLength = Math.PI * 1.5;

  const skyGeo = new THREE.CylinderGeometry(
    skyRadius,
    skyRadius,
    skyHeight,
    128,
    1,
    true//,
    //thetaStart,
    //thetaLength
  );

  skyGeo.attributes.uv.array.forEach((v, i) => {
  if (i % 2 === 0) { // U coordinates
    skyGeo.attributes.uv.array[i] = 1 - v;
  }
  });

  const skyMat = new THREE.MeshBasicMaterial({
    map: bgTex,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.position.y = 5;
  sky.renderOrder = -1;
  scene.add(sky);

  //Circles
  const texLoader2 = new THREE.TextureLoader();

  //Ground
  const groundTex = texLoader.load('/Ground.png'); // Your ground texture
  groundTex.wrapS = THREE.RepeatWrapping;
  groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(4, 4); // Tile the texture
  groundTex.rotation = Math.PI / 2;
  groundTex.center.set(0.5, 0.5);

  const groundGeo = new THREE.CircleGeometry(50, 64); // radius, segments
  const groundMat = new THREE.MeshStandardMaterial({ 
  map: groundTex,
  side: THREE.DoubleSide
  });

  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.position.y = -4; // Just below the table
  scene.add(ground);

  //Sky
  const skyTopGeo = new THREE.CircleGeometry(50, 64);
  const skyTopMat = new THREE.MeshBasicMaterial({ 
  color: 0x151523,
  });
  const skyTop = new THREE.Mesh(skyTopGeo, skyTopMat);
  skyTop.rotation.x = Math.PI / 2;
  skyTop.position.y = 25;
  scene.add(skyTop);


  // ===== Fog =====
  scene.fog = new THREE.Fog(0x000000, 6, 80);

  // ===== Lights =====
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const point = new THREE.PointLight(0xffffff, 1.0);
  point.position.set(2, 5, 3);
  scene.add(point);

  const dir = new THREE.DirectionalLight(0xffffff, 2.0);
  dir.position.set(5, 10, 5);
  scene.add(dir);

  // ===== Table =====
  const tableGeo = new THREE.CylinderGeometry(3, 3, 0.2, 32);
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const table = new THREE.Mesh(tableGeo, tableMat);
  scene.add(table);

  // ===== Cake =====
  const gltfLoader = new GLTFLoader();

  gltfLoader.load(
    '/models/caramel_cheesecake_sliced.glb',
    (gltf) => {
      const wrapper = new THREE.Group();
      wrapper.add(gltf.scene);
      scene.add(wrapper);

      wrapper.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(wrapper);
      const center = box.getCenter(new THREE.Vector3());
      wrapper.position.sub(center);

      wrapper.updateMatrixWorld(true);
      const size = new THREE.Box3().setFromObject(wrapper).getSize(new THREE.Vector3());
      const scale = 1.2 / Math.max(size.x, size.y, size.z);
      wrapper.scale.setScalar(scale);

      wrapper.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(wrapper);
      wrapper.position.y -= box2.min.y;
      wrapper.position.y += 0.25;
      wrapper.position.x += 0.35;
      wrapper.position.z += 1;

      wrapper.traverse((c) => {
        if (c.isMesh && c.material) {
          c.material.side = THREE.DoubleSide;
          c.frustumCulled = false;
        }
      });
    },
    undefined,
    (e) => console.error('GLB load failed:', e)
  );

  // ===== Photo frames =====
  addPhotoFrame('/Reach.png', new THREE.Vector3(-2, 1.3, 0));
  addPhotoFrame('/Lady.png', new THREE.Vector3(2, 1.3, 0));
  addPhotoFrame('/Padoru.png', new THREE.Vector3(0, 1.3, -2));

  // ===== Clickable card =====
  const cardTexture = texLoader.load('/card.jpg');
  const cardGeo = new THREE.PlaneGeometry(1.5, 1);
  const cardMat = new THREE.MeshStandardMaterial({
    map: cardTexture,
    side: THREE.DoubleSide
  });

  const cardMesh = new THREE.Mesh(cardGeo, cardMat);
  cardMesh.position.set(0, 1.1, 1.2);
  cardMesh.rotation.x = -0.6;
  cardMesh.name = 'card';

  scene.add(cardMesh);
  clickableObjects.push(cardMesh);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  window.addEventListener('click', onClick);
  window.addEventListener('resize', onResize);
}

function addPhotoFrame(path, position) {
  const tex = new THREE.TextureLoader().load(path);
  const geo = new THREE.PlaneGeometry(1.6, 1.1);
  const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);

  mesh.position.copy(position);
  mesh.position.y = 1.4;
  mesh.lookAt(0, 1.4, 0);
  scene.add(mesh);
}

function onClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(clickableObjects);
  if (hits.length && hits[0].object.name === 'card') {
    cardOverlay.classList.add('visible');
  }
}

cardClose.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevent event bubbling
  cardOverlay.classList.remove('visible');
});

cardOverlay.addEventListener('click', (e) => {
  if (e.target === cardOverlay) {
    cardOverlay.classList.remove('visible');
  }
});

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
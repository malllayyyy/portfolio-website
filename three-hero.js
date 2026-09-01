import * as THREE from 'three';

/* ==========================================================================
   HERO BACKGROUND — PROCEDURAL 3D ANIME LIKENESS
   ==========================================================================
   A custom procedural 3D cartoon/anime style likeness built using only 
   Three.js primitives. Features:
   - Wavy dark hair clusters
   - Translucent sporty sunglasses
   - Googly eyes that track the cursor behind the glasses
   - Wide toothy smile
   - Red string necklace & black tee
   ========================================================================== */

const MINT = 0x00f5a0;
const AMBER = 0xff9e00;
const SKIN_COLOR = 0xF1C27D;
const HAIR_COLOR = 0x181818;
const SHIRT_COLOR = 0x121212;

export function initHero(canvas) {
  if (!canvas) return () => {};

  let animationFrameId = null;
  let isIntersecting = true;
  let targetMouseX = 0;
  let targetMouseY = 0;
  let mouseX = 0;
  let mouseY = 0;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6.5);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lights — combining realistic white ambient with the site's mint/amber accents
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(MINT, 1.2);
  keyLight.position.set(-2.2, 2.4, 3.5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(AMBER, 0.8);
  rimLight.position.set(2.6, -1.2, -2);
  scene.add(rimLight);

  // -------------------------------------------------------------
  // MASCOT CONSTRUCTION
  // -------------------------------------------------------------
  const mascot = new THREE.Group();
  scene.add(mascot);

  function updateMascotLayout() {
    if (window.innerWidth > 900) {
      mascot.position.set(-2.0, -0.2, 0);
      mascot.scale.setScalar(0.9);
    } else {
      mascot.position.set(0, 1.5, 0);
      mascot.scale.setScalar(0.7);
    }
  }
  updateMascotLayout();



  const disposables = [];

  function addMesh(geometry, material, parent) {
    const mesh = new THREE.Mesh(geometry, material);
    parent.add(mesh);
    if (!disposables.includes(geometry)) disposables.push(geometry);
    if (!disposables.includes(material)) disposables.push(material);
    return mesh;
  }

  // 1. Head Base
  const headGroup = new THREE.Group();
  mascot.add(headGroup);

  const headGeo = new THREE.SphereGeometry(1.0, 32, 32);
  const skinMat = new THREE.MeshStandardMaterial({
    color: SKIN_COLOR,
    roughness: 0.5,
    metalness: 0.1,
  });
  const headBase = addMesh(headGeo, skinMat, headGroup);
  headBase.scale.set(1.05, 1.1, 0.95);

  const noseGeo = new THREE.ConeGeometry(0.08, 0.18, 16);
  const nose = addMesh(noseGeo, skinMat, headGroup);
  nose.position.set(0, -0.05, 0.96);
  nose.rotation.x = Math.PI / 2.2;

  // 2. Eyes (Tracking)
  const EYE_Y = 0.1;
  const EYE_Z = 0.85;
  const EYE_X = 0.35;
  const PUPIL_RANGE = 0.12;

  const scleraGeo = new THREE.SphereGeometry(0.28, 24, 18);
  const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 20);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1c1c1e });

  function makeEye(xSign) {
    const socket = new THREE.Group();
    socket.position.set(xSign * EYE_X, EYE_Y, EYE_Z);
    
    // Angle sockets outward slightly for spherical placement
    socket.rotation.y = xSign * 0.2;

    const sclera = addMesh(scleraGeo, scleraMat, socket);
    sclera.scale.set(1.0, 1.1, 0.15);

    const pupil = addMesh(pupilGeo, pupilMat, socket);
    pupil.rotation.x = Math.PI / 2;
    pupil.position.z = 0.05;
    pupil.position.x = -xSign * 0.04; // slight inward resting focus

    headGroup.add(socket);
    return pupil;
  }

  const pupilLeft = makeEye(-1);
  const pupilRight = makeEye(1);

  // 3. Wavy Dark Hair
  const hairMat = new THREE.MeshStandardMaterial({ color: HAIR_COLOR, roughness: 0.8 });
  const hairSphereGeo = new THREE.SphereGeometry(0.45, 16, 16);
  const hairCapsuleGeo = new THREE.CapsuleGeometry(0.2, 0.5, 8, 16);
  // Top crown
  for(let i=0; i<4; i++) {
    const h = addMesh(hairSphereGeo, hairMat, headGroup);
    h.scale.set(1.4, 0.9, 1.2);
    h.position.set((Math.random()-0.5)*1.2, 1.05 + Math.random()*0.25, (Math.random()-0.5)*0.8 - 0.1);
    h.rotation.set(Math.random(), Math.random(), Math.random());
  }
  // Front Bangs
  for(let i=0; i<4; i++) {
    const h = addMesh(hairCapsuleGeo, hairMat, headGroup);
    const xOffset = -0.6 + (i * 0.4);
    h.position.set(xOffset, 0.85, 0.85);
    h.rotation.set(0.4, 0, xOffset * 0.5 + 0.2);
  }
  // Side & Back locks
  for(let i=0; i<6; i++) {
    const h = addMesh(hairCapsuleGeo, hairMat, headGroup);
    const side = i % 2 === 0 ? 1 : -1;
    h.position.set(side * 1.0, 0.1 + Math.random()*0.5, -0.3 + Math.random()*0.5);
    h.rotation.set(Math.random()*0.5, 0, side * 0.4);
  }
  // Back bulk
  const backHair = addMesh(hairSphereGeo, hairMat, headGroup);
  backHair.scale.set(2.2, 1.6, 1.6);
  backHair.position.set(0, 0.3, -0.65);
  // 4. Translucent Sunglasses
  const frameGeo = new THREE.BoxGeometry(0.65, 0.45, 0.05);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.6 });
  const lensGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.04, 32);
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    transmission: 0.6,
    opacity: 0.8,
    transparent: true,
    roughness: 0.1
  });
  const bridgeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8);

  const glassesGroup = new THREE.Group();
  // Pos slightly down nose
  glassesGroup.position.set(0, EYE_Y - 0.05, EYE_Z + 0.15);
  headGroup.add(glassesGroup);

  const frameL = addMesh(frameGeo, frameMat, glassesGroup);
  frameL.position.set(-0.38, 0, 0);
  frameL.rotation.y = -0.1;
  const lensL = addMesh(lensGeo, lensMat, glassesGroup);
  lensL.rotation.x = Math.PI / 2;
  lensL.position.set(-0.38, 0, 0.01);
  lensL.scale.set(1, 0.6, 1);

  const frameR = addMesh(frameGeo, frameMat, glassesGroup);
  frameR.position.set(0.38, 0, 0);
  frameR.rotation.y = 0.1;
  const lensR = addMesh(lensGeo, lensMat, glassesGroup);
  lensR.rotation.x = Math.PI / 2;
  lensR.position.set(0.38, 0, 0.01);
  lensR.scale.set(1, 0.6, 1);

  const bridge = addMesh(bridgeGeo, frameMat, glassesGroup);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 0.1, 0.02);

  // 5. Wide Toothy Smile
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.38, 0.88);
  mouthGroup.rotation.x = -0.1;
  headGroup.add(mouthGroup);

  const cavityGeo = new THREE.SphereGeometry(0.26, 16, 16);
  const cavityMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const cavity = addMesh(cavityGeo, cavityMat, mouthGroup);
  cavity.scale.set(1.4, 0.55, 0.15);

  const teethGeo = new THREE.CapsuleGeometry(0.08, 0.35, 8, 8);
  const teethMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const teeth = addMesh(teethGeo, teethMat, mouthGroup);
  teeth.rotation.z = Math.PI / 2;
  teeth.scale.set(1.2, 0.25, 0.15);
  teeth.position.set(0, 0.06, 0.02);

  // 6. Body & Necklace
  const bodyGroup = new THREE.Group();
  mascot.add(bodyGroup);

  const neckGeo = new THREE.CylinderGeometry(0.28, 0.3, 0.5, 16);
  const neck = addMesh(neckGeo, skinMat, bodyGroup);
  neck.position.set(0, -1.05, 0);

  const stringGeo = new THREE.TorusGeometry(0.31, 0.02, 8, 32);
  const stringMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.4 });
  const necklace = addMesh(stringGeo, stringMat, bodyGroup);
  necklace.position.set(0, -1.15, 0);
  necklace.rotation.x = Math.PI / 2 + 0.1;

  const shirtGeo = new THREE.CylinderGeometry(0.62, 0.85, 0.95, 16);
  const shirtMat = new THREE.MeshStandardMaterial({ color: SHIRT_COLOR, roughness: 0.9 });
  const shirt = addMesh(shirtGeo, shirtMat, bodyGroup);
  shirt.position.set(0, -1.65, 0);

  // Mouse tracking 
  const handleMouseMove = (event) => {
    targetMouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = -(event.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('mousemove', handleMouseMove);

  let scrollProgress = 0;
  const handleScroll = () => {
    const heroHeight = document.getElementById('home')?.offsetHeight || window.innerHeight;
    scrollProgress = Math.min(1, Math.max(0, window.scrollY / heroHeight));
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    updateMascotLayout();
  };
  window.addEventListener('resize', handleResize);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        isIntersecting = entry.isIntersecting;
        if (isIntersecting && !document.hidden && !animationFrameId) {
          animate();
        }
      });
    },
    { threshold: 0.1 }
  );

  const heroSection = document.getElementById('home') || canvas;
  observer.observe(heroSection);

  const handleVisibilityChange = () => {
    if (document.hidden && animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    } else if (!document.hidden && isIntersecting && !animationFrameId) {
      animate();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  const clock = new THREE.Clock();

  const animate = () => {
    if (!isIntersecting || document.hidden) {
      animationFrameId = null;
      clock.stop();
      return;
    }

    if (!clock.running) clock.start();
    const t = clock.getElapsedTime();

    const easing = 0.12;
    mouseX += (targetMouseX - mouseX) * easing;
    mouseY += (targetMouseY - mouseY) * easing;

    // Googly-eye pupil tracking
    const offsetX = THREE.MathUtils.clamp(mouseX * PUPIL_RANGE, -PUPIL_RANGE, PUPIL_RANGE);
    const offsetY = THREE.MathUtils.clamp(mouseY * PUPIL_RANGE, -PUPIL_RANGE, PUPIL_RANGE);
    pupilLeft.position.x = -0.04 + offsetX;
    pupilLeft.position.y = offsetY;
    pupilRight.position.x = 0.04 + offsetX;
    pupilRight.position.y = offsetY;

    if (!prefersReducedMotion) {
      // Idle breathing — subtle squash/stretch
      const breathe = Math.sin(t * 1.6) * 0.015;
      headGroup.scale.set(1 - breathe * 0.5, 1 + breathe, 1 - breathe * 0.5);
      bodyGroup.scale.set(1 + breathe * 0.3, 1 - breathe * 0.3, 1 + breathe * 0.3);

      // Direct head tracking toward cursor
      headGroup.rotation.y = mouseX * 0.6;
      headGroup.rotation.x = -mouseY * 0.4;
      
      // Slight body twist
      bodyGroup.rotation.y = mouseX * 0.05;
    }

    // Scroll dolly
    camera.position.z = 6.5 + scrollProgress * 1.2;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    if (prefersReducedMotion) {
      animationFrameId = null;
      return;
    }

    animationFrameId = requestAnimationFrame(animate);
  };

  animate();

  return function cleanup() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    observer.disconnect();
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('visibilitychange', handleVisibilityChange);

    disposables.forEach((d) => d.dispose());
    renderer.dispose();
  };
}

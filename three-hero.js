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
  let rawCursorX = 0;
  let rawCursorY = 0;
  let mouseX = 0;
  let mouseY = 0;
  const headNDC = new THREE.Vector3();

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

  let basePosX = -2.0;
  let basePosY = -0.2;
  let baseScale = 0.9;
  let dockX = -2.0;
  let dockY = -1.4;
  let dockScale = 0.28;

  function updateMascotLayout() {
    const aspect = window.innerWidth / window.innerHeight;
    const vHalfHeight = camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    const vHalfWidth = vHalfHeight * aspect;

    if (window.innerWidth > 900) {
      basePosX = -2.0;
      basePosY = -0.2;
      baseScale = 0.9;
      dockX = -vHalfWidth * 0.82;
      dockY = -vHalfHeight * 0.80;
      dockScale = 0.28;
    } else {
      // x must stay non-zero — exactly 0 causes a full render failure on some GL drivers (confirmed via pixel-readback testing)
      basePosX = -0.05;
      basePosY = 1.1;
      baseScale = 0.5;
      dockX = -vHalfWidth * 0.75;
      dockY = -vHalfHeight * 0.80;
      dockScale = 0.25;
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

  // 3. Wavy Dark Hair (Physical material for sheen)
  const hairMat = new THREE.MeshPhysicalMaterial({
    color: HAIR_COLOR,
    roughness: 0.6,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
  });
  const hairSphereGeo = new THREE.SphereGeometry(0.45, 16, 16);
  const hairCapsuleGeo = new THREE.CapsuleGeometry(0.2, 0.5, 8, 16);
  // Hair Base (prevents bald spots on the scalp)
  const hairBaseGeo = new THREE.SphereGeometry(1.02, 32, 32);
  const hairBase = addMesh(hairBaseGeo, hairMat, headGroup);
  hairBase.position.set(0, 0.15, -0.1);
  hairBase.scale.set(1.05, 1.0, 1.0);

  // Top crown (deterministic layered locks)
  const crownTransforms = [
    { pos: [0, 1.22, 0.1], rot: [0.2, 0, 0], scale: [1.5, 1.0, 1.4] },
    { pos: [-0.4, 1.18, -0.1], rot: [0.1, -0.3, -0.2], scale: [1.4, 1.0, 1.3] },
    { pos: [0.4, 1.18, -0.1], rot: [0.1, 0.3, 0.2], scale: [1.4, 1.0, 1.3] },
    { pos: [-0.2, 1.25, -0.25], rot: [-0.2, -0.1, 0.1], scale: [1.3, 0.9, 1.3] },
    { pos: [0.2, 1.25, -0.25], rot: [-0.2, 0.1, -0.1], scale: [1.3, 0.9, 1.3] },
  ];
  crownTransforms.forEach((t) => {
    const h = addMesh(hairSphereGeo, hairMat, headGroup);
    h.scale.set(...t.scale);
    h.position.set(...t.pos);
    h.rotation.set(...t.rot);
  });

  // Front Bangs (deterministic locks framing forehead)
  const bangTransforms = [
    { pos: [-0.7, 0.88, 0.95], rot: [0.55, 0.1, -0.35] },
    { pos: [-0.35, 0.92, 1.05], rot: [0.48, 0.05, -0.18] },
    { pos: [0.0, 0.94, 1.08], rot: [0.45, 0, 0] },
    { pos: [0.35, 0.92, 1.05], rot: [0.48, -0.05, 0.18] },
    { pos: [0.7, 0.88, 0.95], rot: [0.55, -0.1, 0.35] },
  ];
  bangTransforms.forEach((t) => {
    const h = addMesh(hairCapsuleGeo, hairMat, headGroup);
    h.position.set(...t.pos);
    h.rotation.set(...t.rot);
  });

  // Side locks (deterministic side framing)
  const sideTransforms = [
    { pos: [-1.05, 0.45, 0.2], rot: [0.25, -0.2, -0.4] },
    { pos: [1.05, 0.45, 0.2], rot: [0.25, 0.2, 0.4] },
    { pos: [-1.08, 0.25, 0.05], rot: [0.35, -0.1, -0.4] },
    { pos: [1.08, 0.25, 0.05], rot: [0.35, 0.1, 0.4] },
    { pos: [-1.02, 0.1, -0.1], rot: [0.45, 0, -0.35] },
    { pos: [1.02, 0.1, -0.1], rot: [0.45, 0, 0.35] },
  ];
  sideTransforms.forEach((t) => {
    const h = addMesh(hairCapsuleGeo, hairMat, headGroup);
    h.position.set(...t.pos);
    h.rotation.set(...t.rot);
  });
  // Back bulk
  const backHair = addMesh(hairSphereGeo, hairMat, headGroup);
  backHair.scale.set(2.4, 1.8, 1.6);
  backHair.position.set(0, 0.2, -0.7);
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
    rawCursorX = (event.clientX / window.innerWidth - 0.5) * 2;
    rawCursorY = -(event.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('mousemove', handleMouseMove);

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

  const handleVisibilityChange = () => {
    if (document.hidden && animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      clock.stop();
    } else if (!document.hidden && !animationFrameId) {
      animate();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  const clock = new THREE.Clock();

  const animate = () => {
    if (document.hidden) {
      animationFrameId = null;
      clock.stop();
      return;
    }
    if (!clock.running) clock.start();
    const t = clock.getElapsedTime();

    // Persistent dock transform based on scroll position
    const dockProgress = THREE.MathUtils.clamp(window.scrollY / window.innerHeight, 0, 1);
    let currentScale, currentX, currentY;

    if (window.innerWidth > 900) {
      currentScale = THREE.MathUtils.lerp(baseScale, dockScale, dockProgress);
      currentX = THREE.MathUtils.lerp(basePosX, dockX, dockProgress);
      currentY = THREE.MathUtils.lerp(basePosY, dockY, dockProgress);
    } else {
      const vHalfHeight = camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
      const scrollOffset = (window.scrollY / window.innerHeight) * (vHalfHeight * 2);
      currentScale = baseScale;
      currentX = basePosX;
      currentY = basePosY - scrollOffset;
    }
    mascot.scale.setScalar(currentScale);
    mascot.position.set(currentX, currentY, 0);

    headGroup.getWorldPosition(headNDC).project(camera);
    const targetX = THREE.MathUtils.clamp(rawCursorX - headNDC.x, -1.0, 1.0);
    const targetY = THREE.MathUtils.clamp(rawCursorY - headNDC.y, -1.0, 1.0);

    const easing = 0.12;
    mouseX += (targetX - mouseX) * easing;
    mouseY += (targetY - mouseY) * easing;

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
    camera.position.z = 6.5;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    const isPaused = prefersReducedMotion || (document.documentElement.dataset.fx === 'off');
    if (isPaused) {
      animationFrameId = null;
      return;
    }

    animationFrameId = requestAnimationFrame(animate);
  };

  animate();
  const handleFxChange = () => {
    const isPaused = prefersReducedMotion || (document.documentElement.dataset.fx === 'off');
    if (!isPaused && animationFrameId === null) {
      animate();
    }
  };
  window.addEventListener('fxchange', handleFxChange);


  return function cleanup() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('fxchange', handleFxChange);

    disposables.forEach((d) => d.dispose());
    renderer.dispose();
  };
}

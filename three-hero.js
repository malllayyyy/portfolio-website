import * as THREE from 'three';

/* ==========================================================================
   HERO BACKGROUND — CARTOON MASCOT WITH CURSOR-TRACKING EYES
   ==========================================================================
   A friendly procedural low-poly character (no external model/photo — pure
   Three.js primitives) whose pupils slide toward the cursor "googly eye"
   style: a flat dark pupil disc translated within its eye socket, clamped
   to a max radius and eased toward the target each frame, not a full
   eyeball rotation. Head follows "cute" proportions (eyes on/below the
   centerline, big relative to the head, slight built-in inward focus) per
   character-design research. Sits at the same de-emphasized corner
   position/scale as the previous background element so the hero's bold
   typography still carries the section — this is a charming detail, not
   the focal point. Scroll drives a slow camera dolly, matching the
   interactivity established elsewhere in the hero.
   ========================================================================== */

const MINT = 0x00f5a0;
const AMBER = 0xff9e00;
const HEAD_COLOR = 0x121824;

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

  // Lights — mint key light + a rare amber rim light for warmth/contrast,
  // reusing the site's exact two-color accent system as the light colors.
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(MINT, 1.4);
  keyLight.position.set(-2.2, 2.4, 3.5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(AMBER, 0.5);
  rimLight.position.set(2.6, -1.2, -2);
  scene.add(rimLight);

  // Mascot group — de-emphasized corner placement/scale, matching the
  // previous background element so hero typography still leads.
  const mascot = new THREE.Group();
  mascot.position.set(1.9, -1.0, 0);
  mascot.scale.setScalar(0.85);
  scene.add(mascot);

  // Head — a plain uniform sphere. A non-uniform "squash" looked appealing
  // in theory but made hand-placing features on its surface error-prone;
  // a true sphere keeps every feature's placement math exact and reliable.
  const HEAD_R = 1.25;
  const headGeo = new THREE.SphereGeometry(HEAD_R, 32, 24);
  const headMat = new THREE.MeshStandardMaterial({
    color: HEAD_COLOR,
    roughness: 0.45,
    metalness: 0.15,
    emissive: new THREE.Color(MINT),
    emissiveIntensity: 0.1,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  mascot.add(head);

  // Places a feature group on (or just outside) the head's surface along a
  // given direction, guaranteeing it never ends up embedded inside the head
  // regardless of how the direction vector is chosen.
  function onHeadSurface(x, y, z, padding = 0.02) {
    const dir = new THREE.Vector3(x, y, z).normalize();
    return dir.multiplyScalar(HEAD_R + padding);
  }

  // Eyes — cute proportions: large, on/below the head's centerline, spaced
  // wide, each built from a flattened white sclera disc + a smaller dark
  // pupil disc that slides within it (translation, not rotation).
  const PUPIL_RANGE = 0.09; // max distance the pupil can slide from center

  const scleraGeo = new THREE.SphereGeometry(0.32, 24, 18);
  const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilGeo = new THREE.CircleGeometry(0.13, 20);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0a0d14, side: THREE.DoubleSide });

  function makeEye(xSign) {
    const socket = new THREE.Group();
    const pos = onHeadSurface(xSign * 0.52, 0.16, 0.82, 0.14);
    socket.position.copy(pos);
    socket.lookAt(pos.clone().multiplyScalar(2)); // face straight outward along its own surface normal

    const sclera = new THREE.Mesh(scleraGeo, scleraMat);
    sclera.scale.set(1, 1, 0.4);
    socket.add(sclera);

    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.z = 0.14;
    // Built-in slight inward focus — a classic charm trick — biases the
    // pupils' resting point toward each other before cursor-tracking offsets it.
    pupil.position.x = -xSign * 0.045;
    socket.add(pupil);

    mascot.add(socket);
    return pupil;
  }

  const pupilLeft = makeEye(-1);
  const pupilRight = makeEye(1);

  // Eyebrows — small capsules that lift/tilt with vertical cursor position.
  const browGeo = new THREE.CapsuleGeometry(0.045, 0.4, 4, 8);
  const browMat = new THREE.MeshBasicMaterial({ color: MINT });

  function makeBrow(xSign) {
    const pos = onHeadSurface(xSign * 0.52, 0.48, 0.72, 0.05);
    const brow = new THREE.Mesh(browGeo, browMat);
    brow.position.copy(pos);
    brow.lookAt(pos.clone().multiplyScalar(2));
    brow.rotation.z += xSign * 0.35;
    mascot.add(brow);
    return brow;
  }

  const browLeft = makeBrow(-1);
  const browRight = makeBrow(1);
  const browBaseY = { left: browLeft.position.y, right: browRight.position.y };

  // Mouth — a small simple capsule. Research on cute-character design says
  // minimal-to-omitted reads younger/friendlier than an elaborate shape, and
  // a straight capsule sidesteps the arc-orientation math a curved smile needs.
  const mouthGeo = new THREE.CapsuleGeometry(0.035, 0.5, 4, 8);
  const mouthMat = new THREE.MeshBasicMaterial({ color: MINT });
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  const mouthPos = onHeadSurface(0, -0.55, 0.75, 0.03);
  mouth.position.copy(mouthPos);
  mouth.lookAt(mouthPos.clone().multiplyScalar(2));
  mouth.rotation.z = Math.PI / 2;
  mascot.add(mouth);

  // Mouse tracking (drives pupil offset + a subtle head/brow reaction)
  const handleMouseMove = (event) => {
    targetMouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = -(event.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('mousemove', handleMouseMove);

  // Scroll (drives a slow camera dolly, matching the site's established hero interactivity)
  let scrollProgress = 0;
  const handleScroll = () => {
    const heroHeight = document.getElementById('home')?.offsetHeight || window.innerHeight;
    scrollProgress = Math.min(1, Math.max(0, window.scrollY / heroHeight));
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Resize Handling
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };
  window.addEventListener('resize', handleResize);

  // Visibility & Intersection Observers (pause rendering when offscreen/hidden)
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

    // Ease mouse toward target. Under reduced motion the loop only ever
    // runs once (see the early-return below), so this renders a single
    // static frame with default pupil position rather than live tracking —
    // consistent with how the rest of this hero treats reduced motion.
    const easing = 0.12;
    mouseX += (targetMouseX - mouseX) * easing;
    mouseY += (targetMouseY - mouseY) * easing;

    // Googly-eye pupil offset: translate within the socket, clamped to PUPIL_RANGE.
    const offsetX = THREE.MathUtils.clamp(mouseX * PUPIL_RANGE, -PUPIL_RANGE, PUPIL_RANGE);
    const offsetY = THREE.MathUtils.clamp(mouseY * PUPIL_RANGE, -PUPIL_RANGE, PUPIL_RANGE);
    pupilLeft.position.x = -0.045 + offsetX;
    pupilLeft.position.y = offsetY;
    pupilRight.position.x = 0.045 + offsetX;
    pupilRight.position.y = offsetY;

    // Eyebrows lift/tilt with vertical cursor position — a quick "amazed" reaction.
    browLeft.position.y = browBaseY.left + offsetY * 0.5;
    browRight.position.y = browBaseY.right + offsetY * 0.5;

    if (!prefersReducedMotion) {
      // Idle breathing — subtle squash/stretch so the simple geometry feels alive.
      const breathe = Math.sin(t * 1.6) * 0.02;
      head.scale.set(1 - breathe * 0.6, 1 + breathe, 1 - breathe * 0.6);

      // A very slow idle head sway, independent of cursor tracking.
      mascot.rotation.y = Math.sin(t * 0.4) * 0.06 + mouseX * 0.08;
      mascot.rotation.x = mouseY * 0.05;
    }

    // Scroll dolly — camera drifts back slightly as the visitor scrolls away.
    camera.position.z = 6.5 + scrollProgress * 1.2;
    camera.lookAt(mascot.position);

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

    [headGeo, scleraGeo, pupilGeo, browGeo, mouthGeo].forEach((g) => g.dispose());
    [headMat, scleraMat, pupilMat, browMat, mouthMat].forEach((m) => m.dispose());
    renderer.dispose();
  };
}

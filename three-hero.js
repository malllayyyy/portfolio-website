import * as THREE from 'three';

export function initHero(canvas) {
  if (!canvas) return () => {};

  let animationFrameId = null;
  let isIntersecting = true;
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 7;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Particle Field (~1500 particles)
  const particleCount = 1500;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const cyan = new THREE.Color('#5ef5ff');
  const violet = new THREE.Color('#b46bff');

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

    const mixedColor = Math.random() > 0.5 ? cyan : violet;
    colors[i * 3] = mixedColor.r;
    colors[i * 3 + 1] = mixedColor.g;
    colors[i * 3 + 2] = mixedColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.75
  });

  const particleSystem = new THREE.Points(geometry, particleMaterial);
  scene.add(particleSystem);

  // Wireframe Low-Poly Icosahedron
  const icoGeometry = new THREE.IcosahedronGeometry(2.2, 0);
  const wireframeGeo = new THREE.WireframeGeometry(icoGeometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x5ef5ff,
    transparent: true,
    opacity: 0.35
  });
  const icoMesh = new THREE.LineSegments(wireframeGeo, lineMaterial);
  scene.add(icoMesh);

  // Subtle Mouse Parallax
  const handleMouseMove = (event) => {
    mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('mousemove', handleMouseMove);
  // Scroll Velocity & Depth Dynamics
  let lastScrollY = window.scrollY;
  let scrollDelta = 0;

  const handleScroll = () => {
    const currentScrollY = window.scrollY;
    scrollDelta = currentScrollY - lastScrollY;
    lastScrollY = currentScrollY;
  };
  window.addEventListener('scroll', handleScroll, { passive: true });


  // Resize Handling
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  window.addEventListener('resize', handleResize);

  // Visibility & Intersection Observers
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

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Animation Loop
  const animate = () => {
    if (!isIntersecting || document.hidden) {
      animationFrameId = null;
      return;
    }

    animationFrameId = requestAnimationFrame(animate);

    if (!prefersReducedMotion) {
      icoMesh.rotation.x += 0.003;
      icoMesh.rotation.y += 0.005;
      icoMesh.rotation.z += scrollDelta * 0.0015;
      particleSystem.rotation.y -= 0.0008;
      particleSystem.rotation.x += scrollDelta * 0.0004;

      scrollDelta *= 0.85;

      targetX = mouseX * 0.5;
      targetY = -mouseY * 0.5;
      const targetZ = 7 + Math.min(window.scrollY / 400, 2.5);

      camera.position.x += (targetX - camera.position.x) * 0.05;
      camera.position.y += (targetY - camera.position.y) * 0.05;
      camera.position.z += (targetZ - camera.position.z) * 0.05;
      camera.lookAt(scene.position);
    }

    renderer.render(scene, camera);
  };

  animate();

  return function cleanup() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    observer.disconnect();
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('scroll', handleScroll);

    geometry.dispose();
    particleMaterial.dispose();
    icoGeometry.dispose();
    wireframeGeo.dispose();
    lineMaterial.dispose();
    renderer.dispose();
  };
}

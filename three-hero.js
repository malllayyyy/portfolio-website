import * as THREE from 'three';

/* ==========================================================================
   HERO BACKGROUND — RAYMARCHED LIQUID METABALLS
   ==========================================================================
   Three iridescent SDF spheres drift and fuse into a single gloopy liquid
   mass via a smooth-min raymarcher, entirely inside one fragment shader on
   a fullscreen quad. No models, no lights, no extra dependencies — just
   THREE.ShaderMaterial + THREE.PlaneGeometry(2, 2) rendered with an
   orthographic-style passthrough vertex shader. The canvas stays alpha:true
   so the site's CSS aurora background still shows through around the blobs.
   Mouse position drives the light/reflection angle; scroll drives a slow
   camera dolly, matching the interactivity of the previous particle hero.
   ========================================================================== */

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform float u_scroll;
  uniform float u_motion; // 1.0 = full animation, 0.0 = reduced-motion freeze
  float sdSphere(vec3 p, float r) {
    return length(p) - r;
  }

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  float map(vec3 p) {
    float t = u_time * 0.35 * u_motion;
    p.y -= 0.55; // lift the cluster up behind the title, clear of the CTA buttons

    vec3 p1 = p + vec3(sin(t * 0.7) * 0.68, cos(t * 0.5) * 0.48, sin(t * 0.9) * 0.4);
    vec3 p2 = p + vec3(cos(t * 0.6) * 0.58, sin(t * 0.8) * 0.52, cos(t * 0.4) * 0.44);
    vec3 p3 = p + vec3(sin(t * 0.4 + 2.0) * 0.52, cos(t * 0.3 + 1.0) * 0.4, sin(t * 0.6 + 3.0) * 0.48);

    float d1 = sdSphere(p1, 0.58);
    float d2 = sdSphere(p2, 0.44);
    float d3 = sdSphere(p3, 0.36);

    float d = smin(d1, d2, 0.5);
    d = smin(d, d3, 0.5);
    return d;
  }

  vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.0015, 0.0);
    return normalize(vec3(
      map(p + e.xyy) - map(p - e.xyy),
      map(p + e.yxy) - map(p - e.yxy),
      map(p + e.yyx) - map(p - e.yyx)
    ));
  }

  // Tight cyan -> violet -> magenta gradient — matches the site's accent
  // palette exactly instead of a full-spectrum rainbow cycle.
  vec3 palette(float t) {
    vec3 cCyan = vec3(0.369, 0.961, 1.0);
    vec3 cViolet = vec3(0.706, 0.42, 1.0);
    vec3 cMagenta = vec3(1.0, 0.38, 0.78);
    float tt = fract(t * 0.5 + 0.5);
    return tt < 0.5
      ? mix(cCyan, cViolet, tt * 2.0)
      : mix(cViolet, cMagenta, (tt - 0.5) * 2.0);
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= u_resolution.x / u_resolution.y;

    vec3 ro = vec3(0.0, 0.0, 4.3 - u_scroll * 0.7);
    vec3 rd = normalize(vec3(uv, -1.65));

    float dist = 0.0;
    float minDist = 1e5;
    vec3 p = ro;
    bool hit = false;
    for (int i = 0; i < 60; i++) {
      p = ro + rd * dist;
      float d = map(p);
      minDist = min(minDist, d);
      if (d < 0.001) { hit = true; break; }
      dist += d;
      if (dist > 8.0) break;
    }

    vec3 color = vec3(0.0);
    float alpha = 0.0;

    if (hit) {
      vec3 n = getNormal(p);
      vec3 viewDir = -rd;
      vec3 lightDir = normalize(vec3(u_mouse.x * 1.6, u_mouse.y * 1.6 + 0.4, 1.4));

      float diff = clamp(dot(n, lightDir), 0.0, 1.0);
      float fresnel = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 3.0);
      float spec = pow(clamp(dot(reflect(-lightDir, n), viewDir), 0.0, 1.0), 26.0);

      vec3 base = palette(n.x * 0.5 + n.y * 0.35 + u_time * 0.04 * u_motion);
      color = base * (0.28 + diff * 0.5) + fresnel * base * 0.95 + vec3(1.0) * spec * 0.65;
      alpha = 0.9;
    } else {
      // Soft glow halo around the surface instead of a hard silhouette edge
      float glow = exp(-minDist * 2.6);
      vec3 glowColor = palette(u_time * 0.03 * u_motion + 0.15);
      color = glowColor * glow * 0.6;
      alpha = glow * 0.35;
    }

    gl_FragColor = vec4(color, alpha);
  }
`;

export function initHero(canvas) {
  if (!canvas) return () => {};

  let animationFrameId = null;
  let isIntersecting = true;
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const uniforms = {
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    u_time: { value: 0 },
    u_mouse: { value: new THREE.Vector2(0, 0) },
    u_scroll: { value: 0 },
    u_motion: { value: prefersReducedMotion ? 0 : 1 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(quad);

  // Mouse Parallax (drives the shader's light/reflection direction)
  const handleMouseMove = (event) => {
    targetMouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = -(event.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('mousemove', handleMouseMove);

  // Scroll (drives a slow camera dolly via u_scroll, 0-1 across the hero)
  const handleScroll = () => {
    const heroHeight = document.getElementById('home')?.offsetHeight || window.innerHeight;
    uniforms.u_scroll.value = Math.min(1, Math.max(0, window.scrollY / heroHeight));
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // sync on load — e.g. a restored scroll position or deep link

  // Resize Handling
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    uniforms.u_resolution.value.set(width, height);
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
      clock.stop(); // freeze elapsed time so a long pause doesn't jump on resume
      return;
    }

    if (!clock.running) clock.start();

    uniforms.u_time.value = clock.getElapsedTime();

    // Lerp mouse toward target for a smooth, slightly trailing light source
    mouseX += (targetMouseX - mouseX) * 0.06;
    mouseY += (targetMouseY - mouseY) * 0.06;
    uniforms.u_mouse.value.set(mouseX, mouseY);

    renderer.render(scene, camera);

    // A static reduced-motion frame never changes — render once and stop
    // scheduling instead of burning GPU/battery on identical frames forever.
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

    quad.geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}

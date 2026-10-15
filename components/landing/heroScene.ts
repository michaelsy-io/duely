// Three.js hero for the landing page: a regal-purple noise blob with invoices, peso coins and gems orbiting it.
// Ported from the published landing page (originally three r128 global) to the `three` npm package.
import * as THREE from "three";
import { BLOB_SHADER } from "./shader";

export interface Pointer { x: number; y: number }

type RedrawTex = THREE.CanvasTexture & { redraw: () => void; done?: boolean };

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function tex(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number): RedrawTex {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c) as RedrawTex;
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  t.redraw = () => {
    g.clearRect(0, 0, w, h);
    draw(g, w, h);
    t.needsUpdate = true;
  };
  return t;
}

const INVOICES: [string, string, string, string][] = [
  ["INV-12158", "₱288,110.20", "PAID ✓", "#4ADE9A"],
  ["INV-11830", "₱379,358.00", "DUE 8 SEP", "#FFC960"],
  ["INV-11765", "₱145,040.00", "65 DAYS", "#FF7A85"],
  ["INV-12316", "₱64,750.00", "CHECK", "#AB9FF2"],
];

/** Starts the scene; returns a cleanup function. Returns null if WebGL is unavailable. */
export function startHeroScene(canvas: HTMLCanvasElement, hero: HTMLElement, pointer: Pointer, reduce: boolean): (() => void) | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const blobMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uAmp: { value: 0.32 } }, ...BLOB_SHADER });
  const blobGeo = new THREE.IcosahedronGeometry(1.55, 48);
  const blob = new THREE.Mesh(blobGeo, blobMat);
  scene.add(blob);

  // three r155+ dropped legacy light units; scale by PI to match the original look.
  scene.add(new THREE.AmbientLight(0xffffff, 0.75 * Math.PI));
  const key = new THREE.DirectionalLight(0xffffff, 0.9 * Math.PI);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0x8e6be8, 1.2 * Math.PI, 30, 1);
  rim.position.set(4, -2, 4);
  scene.add(rim);

  const textures: RedrawTex[] = [];
  const invoiceTex = (d: [string, string, string, string]) =>
    tex((g, w, h) => {
      g.fillStyle = "#ffffff"; rr(g, 0, 0, w, h, 34); g.fill();
      g.fillStyle = "#1C1240"; g.font = '800 34px "Plus Jakarta Sans", sans-serif'; g.fillText("duely", 36, 64);
      g.fillStyle = "#8C86A3"; g.font = '600 24px "Plus Jakarta Sans", sans-serif'; g.fillText(d[0], 36, 120);
      g.fillStyle = "#E9E6F7"; for (let i = 0; i < 5; i++) { rr(g, 36, 160 + i * 44, w - 72 - (i % 2) * 80, 18, 9); g.fill(); }
      g.fillStyle = "#1C1240"; g.font = '800 46px "Plus Jakarta Sans", sans-serif'; g.fillText(d[1], 36, h - 110);
      g.fillStyle = d[3]; rr(g, 36, h - 84, 200, 48, 24); g.fill();
      g.fillStyle = "#17131F"; g.font = '800 22px "Plus Jakarta Sans", sans-serif'; g.fillText(d[2], 56, h - 52);
    }, 400, 520);
  const coinFace = tex((g, w, h) => {
    const gr = g.createRadialGradient(w * 0.35, h * 0.3, 10, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "#F3EEFF"); gr.addColorStop(1, "#8E6BE8");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(28,18,64,.25)"; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 26, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#1C1240"; g.font = '800 130px "Plus Jakarta Sans", sans-serif'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("₱", w / 2, h / 2 + 6);
  }, 256, 256);
  textures.push(coinFace);

  const floaters: THREE.Mesh[] = [];
  const small = window.innerWidth < 720;
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xe9e6f7, roughness: 0.6 });
  const disposables: { dispose: () => void }[] = [blobGeo, blobMat, edgeMat];
  for (const d of INVOICES) {
    const t = invoiceTex(d);
    textures.push(t);
    const face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 });
    const geo = new THREE.BoxGeometry(1.15, 1.5, 0.03);
    disposables.push(face, geo);
    floaters.push(new THREE.Mesh(geo, [edgeMat, edgeMat, edgeMat, edgeMat, face, edgeMat]));
  }
  const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 48);
  const coinSide = new THREE.MeshStandardMaterial({ color: 0x5b3fd0, roughness: 0.3, metalness: 0.4 });
  const faceMat = new THREE.MeshStandardMaterial({ map: coinFace, roughness: 0.35, metalness: 0.15 });
  disposables.push(coinGeo, coinSide, faceMat);
  for (let k = 0; k < (small ? 3 : 6); k++) floaters.push(new THREE.Mesh(coinGeo, [coinSide, faceMat, faceMat]));
  const gemMat = new THREE.MeshStandardMaterial({ color: 0xe9c46a, roughness: 0.25, metalness: 0.1, flatShading: true });
  const mintMat = new THREE.MeshStandardMaterial({ color: 0x7ee2b8, roughness: 0.25, flatShading: true });
  const g1 = new THREE.OctahedronGeometry(0.32), g2 = new THREE.TorusGeometry(0.3, 0.12, 20, 48), g3 = new THREE.IcosahedronGeometry(0.26, 0);
  disposables.push(gemMat, mintMat, g1, g2, g3, ...textures);
  floaters.push(new THREE.Mesh(g1, gemMat), new THREE.Mesh(g2, mintMat), new THREE.Mesh(g3, gemMat));

  floaters.forEach((m, i) => {
    const a = (i / floaters.length) * Math.PI * 2;
    m.userData = { a, r: 1.9 + (i % 3) * 0.3, y: ((i % 4) - 1.5) * 0.9, sp: 0.08 + (i % 5) * 0.025, depth: 0.6 + (i % 4) * 0.35, spin: 0.3 + (i % 3) * 0.25 };
    m.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(m);
  });

  let orbit = 1;
  function size() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const wide = w > 880;
    blob.position.x = wide ? 2.5 : 0;
    blob.position.y = wide ? 0 : -2.2;
    blob.scale.setScalar(wide ? 1 : 0.75);
    orbit = wide ? 1 : 0.7;
  }
  size();
  window.addEventListener("resize", size);

  let visible = true;
  const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0 });
  io.observe(hero);

  const clock = new THREE.Clock();
  let cx = 0, cy = 0, raf = 0, alive = true;
  function frame() {
    const t = clock.getElapsedTime();
    const scroll = Math.min(window.scrollY / Math.max(hero.clientHeight, 1), 1.5);
    cx += (pointer.x * 1.4 - cx) * 0.05;
    cy += (-pointer.y * 1.0 - cy) * 0.05;
    camera.position.x = cx;
    camera.position.y = cy;
    camera.lookAt(blob.position.x * 0.4, 0, 0);
    blobMat.uniforms.uTime.value = t;
    blobMat.uniforms.uAmp.value = 0.3 + scroll * 0.35 + Math.sin(t * 0.7) * 0.04;
    blob.rotation.y = t * 0.15;
    blob.rotation.x = Math.sin(t * 0.2) * 0.2;
    blob.position.z = -scroll * 2;
    for (const m of floaters) {
      const u = m.userData as { a: number; r: number; y: number; sp: number; depth: number; spin: number };
      const a = u.a + t * u.sp;
      m.position.set(
        blob.position.x + Math.cos(a) * u.r * orbit,
        blob.position.y + u.y * orbit + Math.sin(t * 0.6 + u.a) * 0.25 + scroll * u.depth * 3,
        Math.sin(a) * u.r * 0.7 - 0.6,
      );
      m.rotation.x += 0.004 * u.spin;
      m.rotation.y += 0.006 * u.spin;
    }
    renderer.render(scene, camera);
  }
  function loop() {
    if (!alive) return;
    if (visible) frame();
    raf = requestAnimationFrame(loop);
  }
  frame();
  if (!reduce) raf = requestAnimationFrame(loop);
  document.fonts?.ready.then(() => {
    if (!alive) return;
    for (const t of textures) if (!t.done) { t.redraw(); t.done = true; }
    frame();
  });

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", size);
    io.disconnect();
    for (const d of disposables) d.dispose();
    renderer.dispose();
  };
}

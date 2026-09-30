// score3d — s06 "Win." (3D towers, 10.0–14.0) + s07 blue type field and circle reveal (14.0–15.5).
// Every visual is a pure function of film time t. three.js renders into a transparent canvas so the page paper shows.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { C, FILL, clamp, lerp, seg, smooth, smoother, outCubic, outBack, inCubic, outQuint, div, css } from '../shared/lib.js';
import { hand, TILT_DEG, PERSPECTIVE } from '../shared/handoff.js';
import { loadGame, finalState, boardCanvas } from './score3d-board.js';
import { spline, cfg } from './score3d-layout.js';

const T0 = 10.0, T_FLY = 13.5, T_BLUE = 14.0, T_IRIS = 15.1, T_END = 15.5;
const BLUE = '#2f6bd8';

export default {
  id: 'score3d', vis: [T0, T_END],
  async build({ layer, W, H, V }) {
    const HO = hand(V), Cb = HO.C, G = Cb.gap, k = G / 150;
    const L = cfg(V, k);
    const game = await loadGame();
    const st = finalState(game);

    // ---------------- geometry of the board in world units (1 unit = 1 film px) ----------------
    const bcx = Cb.x + 2 * G, bcy = Cb.y + 2 * G;            // board centre in film px (= screen centre)
    const m = L.margin, S = 4 * G + 2 * m;                    // slab top face size
    const th = L.slabT, bh = L.baseH, bo = L.baseOut;         // slab thickness, base height, base outset
    const groundY = -(th + bh);
    const s = L.cube;                                         // cube edge
    const q = Math.min(2048 / S, 3);                          // texels per px
    const [cvA, cvB] = await Promise.all([
      boardCanvas(st, Cb, { x0: bcx - S / 2, y0: bcy - S / 2, S, q, fills: true }),
      boardCanvas(st, Cb, { x0: bcx - S / 2, y0: bcy - S / 2, S, q, fills: false }),
    ]);

    // ---------------- renderer ----------------
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    css(canvas, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px' });
    layer.appendChild(canvas);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.0;

    const camera = new THREE.PerspectiveCamera(2 * Math.atan((H / 2) / PERSPECTIVE) * 180 / Math.PI, W / H, 4, 20000);

    // ---------------- lights ----------------
    const hemi = new THREE.HemisphereLight(0xfff6e8, 0xcdbd9c, 0);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 0);
    key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.6;
    const sc = key.shadow.camera; sc.left = -1700 * k; sc.right = 1700 * k; sc.top = 1700 * k; sc.bottom = -1700 * k; sc.near = 100; sc.far = 9000 * k;
    scene.add(key); scene.add(key.target);
    const rim = new THREE.DirectionalLight(0xffb36b, 0);
    scene.add(rim); scene.add(rim.target);

    // ---------------- slab top (board texture, per-cell swap A→B as boxes lift, flat→lit blend) ----------------
    const texOf = (cv) => { const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = renderer.capabilities.getMaxAnisotropy(); tx.generateMipmaps = true; tx.minFilter = THREE.LinearMipmapLinearFilter; tx.magFilter = THREE.LinearFilter; return tx; };
    const texA = texOf(cvA), texB = texOf(cvB);
    const topU = { mapB: { value: texB }, uLift: { value: new Array(16).fill(0) }, uFlat: { value: 1 }, uS: { value: S }, uM: { value: m }, uG: { value: G } };
    const topMat = new THREE.MeshStandardMaterial({ map: texA, roughness: 0.92, metalness: 0 });
    topMat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, topU);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform sampler2D mapB; uniform float uLift[16]; uniform float uFlat; uniform float uS; uniform float uM; uniform float uG;`)
        .replace('#include <map_fragment>', `
          vec3 flatCol = vec3(1.0);
          {
            vec4 tA = texture2D(map, vMapUv); vec4 tB = texture2D(mapB, vMapUv);
            vec2 bp = vec2(vMapUv.x * uS - uM, (1.0 - vMapUv.y) * uS - uM) / uG;  // board coords in cells
            float lift = 0.0;
            if (bp.x >= 0.0 && bp.x < 4.0 && bp.y >= 0.0 && bp.y < 4.0) { int idx = int(floor(bp.y)) * 4 + int(floor(bp.x)); lift = uLift[idx]; }
            vec4 tx = mix(tA, tB, lift);
            flatCol = tx.rgb; diffuseColor *= tx;
          }`)
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>\n gl_FragColor.rgb = mix(gl_FragColor.rgb, sRGBTransferOETF(vec4(flatCol, 1.0)).rgb, uFlat);`);
    };
    const top = new THREE.Mesh(new THREE.PlaneGeometry(S, S), topMat);
    top.rotation.x = -Math.PI / 2; top.receiveShadow = true;
    scene.add(top);

    // slab edge (paper) + base (ink), heights grow from 0 during the first 0.45 s
    const paperEdge = new THREE.MeshStandardMaterial({ color: new THREE.Color('#efe7d4'), roughness: 0.85 });
    const slab = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 3, 0.02), paperEdge);
    slab.castShadow = true; slab.receiveShadow = true; scene.add(slab);
    const baseMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(L.baseColor), roughness: 0.42, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.35 });
    const baseGeo = new RoundedBoxGeometry(1, 1, 1, 5, 0.12);
    const base = new THREE.Mesh(baseGeo, baseMat); base.castShadow = true; base.receiveShadow = true; scene.add(base);

    // ground: shadow catcher so the background stays paper
    const shadowMat = new THREE.ShadowMaterial({ color: 0x3a3226, opacity: 0 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), shadowMat);
    ground.rotation.x = -Math.PI / 2; ground.position.y = groundY; ground.receiveShadow = true; scene.add(ground);
    // soft contact shadows (blurred blobs) under the base and the towers
    const blobTex = (() => {
      const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d');
      const im = g.createImageData(N, N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        // rounded-square falloff
        const u = Math.abs(x / (N - 1) * 2 - 1), v = Math.abs(y / (N - 1) * 2 - 1);
        const p = 6, d = Math.pow(Math.pow(u, p) + Math.pow(v, p), 1 / p);
        const a = clamp(1 - smooth(clamp((d - 0.55) / 0.45)));
        const i = (y * N + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 0; im.data[i + 3] = Math.round(a * 255);
      }
      g.putImageData(im, 0, 0); const tx = new THREE.CanvasTexture(cv); return tx;
    })();
    const blobMat = (o) => new THREE.MeshBasicMaterial({ map: blobTex, color: 0x2b2418, transparent: true, opacity: o, depthWrite: false, toneMapped: false });
    const baseBlob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blobMat(0));
    baseBlob.rotation.x = -Math.PI / 2; baseBlob.position.y = groundY + 0.4; scene.add(baseBlob);

    // ---------------- cubes & towers ----------------
    const cubeGeo = new RoundedBoxGeometry(1, 1, 1, 5, L.cubeR);
    const cubeMat = {};
    for (const p of ['p1', 'p2']) cubeMat[p] = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(L.cubeColor[p]), roughness: 0.34, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.22 });
    // the fly-through cube: same look, plus a flat brand-blue blend at the end
    const flyU = { uFlat: { value: 0 }, uFlatCol: { value: new THREE.Color(BLUE) } };
    const flyMat = cubeMat.p1.clone();
    flyMat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, flyU);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uFlat; uniform vec3 uFlatCol;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.rgb = mix(gl_FragColor.rgb, sRGBTransferOETF(vec4(uFlatCol, 1.0)).rgb, uFlat);');
    };
    const towers = { p1: L.tower.p1, p2: L.tower.p2 };
    const towerBlobs = {};
    for (const p of ['p1', 'p2']) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(s * 2.1, s * 2.1), blobMat(0));
      b.rotation.x = -Math.PI / 2; b.position.set(towers[p].x, groundY + 0.5, towers[p].z); scene.add(b); towerBlobs[p] = b;
    }
    const count = { p1: 0, p2: 0 };
    const cubes = st.order.map((bx, i) => {
      const o = st.owner.get(bx), [, r, c] = bx.split('_').map(Number);
      const n = count[o]++;
      const last = o === 'p1' && n === 9;
      const mesh = new THREE.Mesh(cubeGeo, last ? flyMat : cubeMat[o]);
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.visible = false; scene.add(mesh);
      return { bx, o, n, r, c, idx: r * 4 + c, mesh, last,
        x0: Cb.x + (c + 0.5) * G - bcx, z0: Cb.y + (r + 0.5) * G - bcy };
    });
    // launch schedule: intervals shrink (the stack accelerates); flight ≈ 1.9 × interval → ≤ 2 airborne
    { let tt = L.firstLaunch; for (let i = 0; i < cubes.length; i++) { const d = lerp(L.gap0, L.gap1, i / (cubes.length - 1)); cubes[i].t0 = tt; cubes[i].dur = d * 1.9; cubes[i].yaw = (i % 2 ? -1 : 1) * Math.PI / 2; tt += d; } }
    const landT = (cb) => cb.t0 + cb.dur;
    const lastOf = { p1: cubes.filter((c) => c.o === 'p1').at(-1), p2: cubes.filter((c) => c.o === 'p2').at(-1) };
    const foot = G - 6.5 * (G / 64);

    // ---------------- HTML overlay (never text in 3D) ----------------
    const ov = div('', layer); css(ov, { position: 'absolute', inset: 0 });
    const chip = (p, name, score) => {
      const e = div('', ov); css(e, { position: 'absolute', left: 0, top: 0, display: 'flex', alignItems: 'center', gap: 14 * L.ui + 'px',
        padding: `${10 * L.ui}px ${20 * L.ui}px ${10 * L.ui}px ${16 * L.ui}px`, background: C.card, border: `${2 * L.ui}px solid ${C.ink}`, borderRadius: 16 * L.ui + 'px',
        boxShadow: `${4 * L.ui}px ${5 * L.ui}px 0 rgba(56,53,47,0.14)`, transformOrigin: '50% 100%', willChange: 'transform', whiteSpace: 'nowrap' });
      e.innerHTML = `<span style="width:${18 * L.ui}px;height:${18 * L.ui}px;border-radius:50%;background:${FILL[p]};box-shadow:0 0 0 ${4 * L.ui}px ${FILL[p]}33"></span>`
        + `<span style="font-family:'Patrick Hand';font-size:${34 * L.ui}px;color:${C.ink};line-height:1">${name}</span>`
        + `<span style="font-family:Nunito;font-weight:800;font-size:${42 * L.ui}px;color:${C.ink};line-height:1">${score}</span>`;
      return e;
    };
    const chips = { p1: chip('p1', game.players.p1.name, game.final.scores.p1), p2: chip('p2', game.players.p2.name, game.final.scores.p2) };
    const win = div('cv', ov, game.final.resultText); css(win, { position: 'absolute', left: 0, top: 0, fontSize: L.winSize + 'px', color: C.ink, transformOrigin: '50% 50%' });
    const chipSize = {}; for (const p in chips) { const r = chips[p].getBoundingClientRect(); chipSize[p] = { w: r.width, h: r.height }; }
    const winR = win.getBoundingClientRect(); const winSz = { w: winR.width, h: winR.height };

    // s07: blue field + words + dot
    const field = div('', layer); css(field, { position: 'absolute', inset: 0, background: BLUE, visibility: 'hidden' });
    const w1 = div('cv', field, 'Play it'), w2 = div('cv', field, 'your way.');
    for (const w of [w1, w2]) css(w, { position: 'absolute', left: 0, top: 0, fontSize: L.s07Size + 'px', color: '#fff', willChange: 'transform' });
    const w1R = w1.getBoundingClientRect(), w2R = w2.getBoundingClientRect();
    const ring = div('', field); css(ring, { position: 'absolute', left: 0, top: 0, borderRadius: '50%', background: '#fff' });
    const ripple = div('', field); css(ripple, { position: 'absolute', left: 0, top: 0, borderRadius: '50%', border: `${3 * L.ui}px solid #fff` });

    // ---------------- pose ----------------
    const tmpV = new THREE.Vector3();
    const project = (x, y, z) => { tmpV.set(x, y, z).project(camera); return { x: (tmpV.x + 1) / 2 * W, y: (1 - tmpV.y) / 2 * H }; };
    const camPose = (t) => {
      const el = spline(t, L.cam.el) * Math.PI / 180, az = spline(t, L.cam.az) * Math.PI / 180, D = spline(t, L.cam.dist);
      const tx = spline(t, L.cam.tx), ty = spline(t, L.cam.ty), tz = spline(t, L.cam.tz);
      camera.position.set(tx + D * Math.cos(el) * Math.sin(az), ty + D * Math.sin(el), tz + D * Math.cos(el) * Math.cos(az));
      camera.up.set(0, 1, 0); camera.lookAt(tx, ty, tz); camera.updateMatrixWorld(true);
    };
    const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), eul = new THREE.Euler(), mTmp = new THREE.Matrix4(), mCam = new THREE.Matrix4();
    const vS = new THREE.Vector3(), vE = new THREE.Vector3(), sc3 = new THREE.Vector3();

    function restPose(cb) { return { x: towers[cb.o].x, y: groundY + s * (cb.n + 0.5), z: towers[cb.o].z }; }

    function poseCube(cb, t) {
      const u = seg(t, cb.t0, cb.t0 + cb.dur);
      const mesh = cb.mesh;
      if (t < cb.t0) { mesh.visible = false; return; }
      mesh.visible = true;
      const e = smoother(u), g = smoother(seg(u, 0, 0.5));
      const sx = lerp(foot, s, g), sy = lerp(0.6 * k, s, g);
      const R = restPose(cb);
      const y0 = sy / 2, y1 = R.y;
      const A = Math.max(y0, y1) - (y0 + y1) / 2 + L.arc;
      let y = lerp(y0, y1, e) + 4 * e * (1 - e) * A;
      // landing squash (bottom stays seated)
      const lu = seg(t, landT(cb), landT(cb) + 0.12);
      const sq = lu > 0 && lu < 1 ? 1 - 0.06 * Math.sin(Math.PI * lu) * (1 - lu) : 1;
      const syy = sy * sq, sxx = sx * (1 + (1 - sq) * 0.5);
      if (u >= 1) y = R.y - (s - syy) / 2;
      mesh.position.set(lerp(cb.x0, R.x, e), y, lerp(cb.z0, R.z, e));
      const dir = Math.atan2(R.z - cb.z0, R.x - cb.x0);
      const tumble = Math.sin(Math.PI * e) * 0.45;
      eul.set(Math.sin(dir) * tumble, cb.yaw * e, -Math.cos(dir) * tumble, 'YXZ');
      mesh.rotation.copy(eul);
      mesh.scale.set(sxx, syy, sxx);
    }

    function poseFly(cb, t) {
      // Mia's top cube: from its resting pose on the tower to face-on in front of the camera (in camera space)
      const u = seg(t, T_FLY, T_BLUE - 0.02);
      const R = restPose(cb);
      mTmp.compose(vS.set(R.x, R.y, R.z), qA.setFromEuler(eul.set(0, cb.yaw, 0)), sc3.set(s, s, s));
      mCam.copy(camera.matrixWorld).invert();
      mTmp.premultiply(mCam); // camera-space start pose
      const p0 = new THREE.Vector3(), q0 = new THREE.Quaternion(), s0 = new THREE.Vector3(); mTmp.decompose(p0, q0, s0);
      // end: top face (+Y) towards the camera, its edges on the screen axes
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      const tanH = Math.tan(camera.fov * Math.PI / 360) * Math.max(1, W / H), tanV = Math.tan(camera.fov * Math.PI / 360);
      const flatHalf = s / 2 - L.cubeR;
      const dFace = 0.72 * flatHalf / Math.max(tanH, tanV);
      const p1 = new THREE.Vector3(0, 0, -(dFace + s / 2));
      // anticipation: a small lift + tip in place, then the rush
      const a = smooth(seg(u, 0, 0.25)), e = smoother(seg(u, 0.12, 1)), er = smoother(seg(u, 0.05, 0.85));
      const d0 = p0.length(), d1 = p1.length();
      const dir0 = p0.clone().normalize(), dir1 = p1.clone().normalize();
      const dir = dir0.clone().lerp(dir1, e).normalize();
      const d = d0 * Math.pow(d1 / d0, e);
      const pos = dir.multiplyScalar(d);
      // lift along camera-up during the anticipation
      pos.y += a * (1 - e) * s * 0.35;
      const qq = q0.clone().slerp(q1, er);
      mTmp.compose(pos, qq, sc3.set(s, s, s)).premultiply(camera.matrixWorld);
      mTmp.decompose(cb.mesh.position, cb.mesh.quaternion, cb.mesh.scale);
      cb.mesh.visible = true;
      flyU.uFlat.value = smoother(seg(t, T_BLUE - 0.32, T_BLUE - 0.04));
    }

    function pose(t) {
      camPose(t);
      // flat 2D board → lit slab
      const lit = smoother(seg(t, T0, T0 + 0.45));
      topU.uFlat.value = 1 - lit;
      const grow = smoother(seg(t, T0 + 0.02, T0 + 0.5));
      const thN = th * grow, bhN = bh * grow;
      slab.visible = thN > 0.3; slab.scale.set(S, Math.max(thN, 0.01), S); slab.position.y = -thN / 2 - 0.25;
      const bw = S + 2 * bo * smoother(seg(t, T0 + 0.08, T0 + 0.55));
      base.visible = bhN > 0.3; base.scale.set(bw, Math.max(bhN, 0.01), bw); base.position.y = -thN - bhN / 2 - 0.25;
      ground.position.y = -thN - bhN - 0.3; baseBlob.position.y = ground.position.y + 0.3;
      for (const p in towerBlobs) towerBlobs[p].position.y = ground.position.y + 0.35;
      baseBlob.scale.set(bw * 1.12, bw * 1.12, 1); baseBlob.material.opacity = 0.22 * lit;
      shadowMat.opacity = 0.2 * lit;
      hemi.intensity = L.light.hemi * lit;
      key.intensity = L.light.key * lit; rim.intensity = L.light.rim * lit;
      scene.environmentIntensity = L.light.env * lit;
      key.position.set(...L.light.keyPos); key.target.position.set(0, 0, 0);
      rim.position.set(...L.light.rimPos); rim.target.position.set(0, 0, 0);
      // cubes
      for (const cb of cubes) {
        topU.uLift.value[cb.idx] = smoother(seg(t, cb.t0, cb.t0 + cb.dur * 0.22));
        if (cb.last && t >= T_FLY) poseFly(cb, t); else poseCube(cb, t);
      }
      for (const p of ['p1', 'p2']) {
        const landed = cubes.filter((c) => c.o === p && t >= landT(c) - 0.03).length;
        towerBlobs[p].material.opacity = 0.3 * smoother(clamp(landed / 2));
      }
    }

    function overlay(t) {
      // chips above each tower top
      for (const p of ['p1', 'p2']) {
        const lc = lastOf[p], R = restPose(lc);
        const ta = landT(lc) + 0.02;
        const a = seg(t, ta, ta + 0.38), out = seg(t, T_FLY - 0.12, T_FLY + 0.06);
        const e = chips[p];
        if (a <= 0 || out >= 1) { e.style.visibility = 'hidden'; continue; }
        e.style.visibility = 'visible';
        const pt = project(R.x, R.y + s / 2 + L.chipLift, R.z);
        const sc = lerp(0.55, 1, outBack(a, 2.2)) * lerp(1, 0.6, inCubic(out));
        const x = pt.x - chipSize[p].w / 2, y = pt.y - chipSize[p].h - 10 * L.ui - 26 * L.ui * (1 - outCubic(a)) - 60 * L.ui * inCubic(out);
        e.style.transform = `translate(${x}px,${y}px) scale(${sc})`;
        e.style.opacity = clamp(a * 3) * (1 - inCubic(out));
      }
      // "Mia Wins!"
      const wa = seg(t, 12.6, 13.05), wo = seg(t, T_FLY - 0.1, T_FLY + 0.12);
      if (wa <= 0 || wo >= 1) win.style.visibility = 'hidden';
      else {
        win.style.visibility = 'visible';
        const [wx, wy] = L.winPos(W, H, winSz);
        const drift = (t - 12.6) * L.ui * 14;
        const x = wx + L.winFrom * (1 - outQuint(wa)) - 700 * L.ui * inCubic(wo) + drift, y = wy;
        win.style.transform = `translate(${x}px,${y}px) scale(${lerp(1.12, 1, outCubic(wa))})`;
        win.style.opacity = clamp(wa * 2.5) * (1 - inCubic(wo));
      }
    }

    function s07(t) {
      const D = HO.D;
      const [p1x, p1y, p2x, p2y] = L.s07Pos(W, H, w1R, w2R);
      const i1 = outQuint(seg(t, T_BLUE - 0.05, T_BLUE + 0.5)), i2 = outQuint(seg(t, T_BLUE + 0.05, T_BLUE + 0.6));
      const o2 = inCubic(seg(t, 15.0, 15.24)), o1 = inCubic(seg(t, 15.04, 15.3));
      const dr = (t - T_BLUE) * 22 * L.ui;
      w1.style.transform = `translate(${p1x - (1 - i1) * W * 0.62 + dr + o1 * W * 0.9}px,${p1y}px)`;
      w2.style.transform = `translate(${p2x + (1 - i2) * W * 0.62 - dr - o2 * W * 0.9}px,${p2y}px)`;
      // the dot: pops in, pulses on the beats, becomes the rim of the iris
      const dotR = L.dotR, ap = seg(t, 14.3, 14.62);
      const pulse = (tb) => { const u = seg(t, tb, tb + 0.3); return u > 0 && u < 1 ? Math.sin(Math.PI * u) * (1 - u) * 0.9 : 0; };
      let rOut = dotR * outBack(ap, 2.4) * (1 + 0.35 * pulse(14.5) + 0.35 * pulse(15.0));
      const iu = seg(t, T_IRIS, T_END - 0.005);
      const far = Math.max(Math.hypot(D.x, D.y), Math.hypot(W - D.x, D.y), Math.hypot(D.x, H - D.y), Math.hypot(W - D.x, H - D.y)) + 40;
      const hole = iu > 0 ? far * Math.pow(iu, 2.1) : 0;
      if (iu > 0) rOut = hole + lerp(dotR, 7 * L.ui, smoother(clamp(iu * 3)));
      css(ring, { width: 2 * rOut + 'px', height: 2 * rOut + 'px', transform: `translate(${D.x - rOut}px,${D.y - rOut}px)`, visibility: rOut > 0.2 ? 'visible' : 'hidden' });
      // ripple ring on each beat pulse
      const ru = Math.max(seg(t, 14.5, 14.95), 0) < 1 && t >= 14.5 && t < 14.95 ? seg(t, 14.5, 14.95) : (t >= 15.0 && t < 15.1 ? seg(t, 15.0, 15.45) : 0);
      const rr = dotR * (1 + 2.2 * outCubic(ru));
      css(ripple, { width: 2 * rr + 'px', height: 2 * rr + 'px', transform: `translate(${D.x - rr}px,${D.y - rr}px)`, opacity: ru > 0 ? 0.7 * (1 - ru) : 0 });
      if (hole > 0) {
        const mk = `radial-gradient(circle at ${D.x}px ${D.y}px, transparent ${hole - 0.75}px, #000 ${hole + 0.75}px)`;
        layer.style.maskImage = mk; layer.style.webkitMaskImage = mk;
      } else { layer.style.maskImage = 'none'; layer.style.webkitMaskImage = 'none'; }
    }

    // warm up
    pose(T0); renderer.compile(scene, camera); renderer.render(scene, camera);

    return {
      render(t) {
        const blue = t >= T_BLUE;
        field.style.visibility = blue ? 'visible' : 'hidden';
        canvas.style.visibility = blue ? 'hidden' : 'visible';
        ov.style.visibility = blue ? 'hidden' : 'visible';
        if (!blue) { pose(t); renderer.render(scene, camera); overlay(t); layer.style.maskImage = 'none'; layer.style.webkitMaskImage = 'none'; }
        else s07(t);
      },
    };
  },
};

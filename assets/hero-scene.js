(function () {
  var canvas = document.getElementById("heroCanvas");
  var heroSection = document.querySelector(".hero");
  if (!canvas || !heroSection || typeof THREE === "undefined") return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.innerWidth < 640;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (err) {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 6, 13);

  scene.add(new THREE.HemisphereLight(0xdff5df, 0x0a2a15, 1.15));
  var dirLight = new THREE.DirectionalLight(0xfff4d6, 0.85);
  dirLight.position.set(5, 8, 4);
  scene.add(dirLight);

  // Mossy ground with gentle procedural undulation
  var groundGeo = new THREE.PlaneGeometry(30, 20, 40, 30);
  var gPos = groundGeo.attributes.position;
  for (var gi = 0; gi < gPos.count; gi++) {
    var gx = gPos.getX(gi), gy = gPos.getY(gi);
    var bump = Math.sin(gx * 0.6) * 0.25 + Math.cos(gy * 0.7) * 0.2 + (Math.random() - 0.5) * 0.15;
    gPos.setZ(gi, bump);
  }
  groundGeo.computeVertexNormals();
  var ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshStandardMaterial({ color: 0x175c33, roughness: 1, flatShading: true })
  );
  ground.rotation.x = -Math.PI / 2.15;
  ground.position.y = -1.6;
  scene.add(ground);

  // Ferns
  function makeFern(hue) {
    var group = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ color: hue, flatShading: true, side: THREE.DoubleSide });
    var count = 8;
    for (var i = 0; i < count; i++) {
      var t = i / count;
      var leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55 - t * 0.25, 4), mat);
      var side = i % 2 === 0 ? -1 : 1;
      leaf.position.set(side * (0.15 + t * 0.25), t * 1.6, 0);
      leaf.rotation.z = side * (0.5 + t * 0.3);
      leaf.rotation.x = Math.PI / 2;
      group.add(leaf);
    }
    return group;
  }
  var fernColors = [0x3f8a44, 0x458f4a, 0x59a35d];
  var fernPositions = [[-4.5, -1.6, 1], [4.2, -1.6, -0.5], [5.4, -1.6, 1.6], [-3.1, -1.6, -1.8]];
  fernPositions.forEach(function (p, i) {
    var fern = makeFern(fernColors[i % fernColors.length]);
    fern.position.set(p[0], p[1], p[2]);
    fern.rotation.y = Math.random() * Math.PI;
    fern.scale.setScalar(0.9 + Math.random() * 0.4);
    scene.add(fern);
  });

  // Pale flowers
  function makeFlower() {
    var group = new THREE.Group();
    var petalMat = new THREE.MeshStandardMaterial({ color: 0xf6f0e2, flatShading: true, side: THREE.DoubleSide });
    for (var i = 0; i < 5; i++) {
      var petal = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), petalMat);
      var angle = (i / 5) * Math.PI * 2;
      petal.position.set(Math.cos(angle) * 0.14, 0, Math.sin(angle) * 0.14);
      petal.scale.set(1, 0.5, 1.8);
      group.add(petal);
    }
    group.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0xe8b23d })));
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5), new THREE.MeshStandardMaterial({ color: 0x2f6b32 }));
    stem.position.y = -0.45;
    group.add(stem);
    return group;
  }
  var flowerSpots = [[-3.6, -1.15, 1.4], [-4.6, -1.15, 0.4], [4.9, -1.15, 1.1], [5.6, -1.15, -0.4], [2.6, -1.2, -2.1]];
  flowerSpots.forEach(function (p) {
    var f = makeFlower();
    f.position.set(p[0], p[1], p[2]);
    f.scale.setScalar(0.9 + Math.random() * 0.3);
    scene.add(f);
  });

  // Drifting pollen
  var pollenCount = isMobile ? 90 : 180;
  var pollenGeo = new THREE.BufferGeometry();
  var pollenPos = new Float32Array(pollenCount * 3);
  var pollenSeed = new Float32Array(pollenCount);
  for (var pi = 0; pi < pollenCount; pi++) {
    pollenPos[pi * 3] = (Math.random() - 0.5) * 14;
    pollenPos[pi * 3 + 1] = Math.random() * 5 - 1.5;
    pollenPos[pi * 3 + 2] = (Math.random() - 0.5) * 8;
    pollenSeed[pi] = Math.random() * Math.PI * 2;
  }
  pollenGeo.setAttribute("position", new THREE.BufferAttribute(pollenPos, 3));

  function pollenSprite() {
    var c = document.createElement("canvas");
    c.width = c.height = 32;
    var ctx = c.getContext("2d");
    var g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,244,198,0.95)");
    g.addColorStop(1, "rgba(255,244,198,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  }
  var pollen = new THREE.Points(
    pollenGeo,
    new THREE.PointsMaterial({
      size: 0.14, map: pollenSprite(), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, color: 0xfff4c6
    })
  );
  scene.add(pollen);

  // Landing butterfly
  var wingMat = new THREE.MeshStandardMaterial({ color: 0xf6ead0, side: THREE.DoubleSide, flatShading: true });
  var wingL = new THREE.Mesh(new THREE.CircleGeometry(0.32, 12, Math.PI * 0.15, Math.PI * 0.85), wingMat);
  wingL.position.x = -0.02;
  var wingR = wingL.clone();
  wingR.rotation.y = Math.PI;
  wingR.position.x = 0.02;
  var body = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.22, 4, 6), new THREE.MeshStandardMaterial({ color: 0x3a2a1a }));
  body.rotation.z = Math.PI / 2;
  var butterfly = new THREE.Group();
  butterfly.add(wingL, wingR, body);
  butterfly.rotation.x = -Math.PI / 2.4;
  scene.add(butterfly);

  var flightStart = new THREE.Vector3();
  var flightEnd = new THREE.Vector3();
  var phase = "fly";
  var phaseStart = 0;
  var flyDuration = 5;
  var landDuration = 4;

  function resetFlight(t) {
    var edge = Math.random() < 0.5 ? -7 : 7;
    flightStart.set(edge, 2 + Math.random(), (Math.random() - 0.5) * 6);
    var spot = flowerSpots[Math.floor(Math.random() * flowerSpots.length)];
    flightEnd.set(spot[0], spot[1] + 0.55, spot[2]);
    phase = "fly";
    phaseStart = t;
  }
  resetFlight(0);

  function updateButterfly(t) {
    var elapsed = t - phaseStart;
    if (phase === "fly") {
      var f = Math.min(elapsed / flyDuration, 1);
      var eased = f * f * (3 - 2 * f);
      butterfly.position.lerpVectors(flightStart, flightEnd, eased);
      butterfly.position.y += Math.sin(f * Math.PI) * 1.2;
      var flap = Math.sin(t * 14) * 0.9;
      wingL.rotation.y = flap;
      wingR.rotation.y = Math.PI - flap;
      if (f >= 1) { phase = "land"; phaseStart = t; }
    } else {
      var flapSlow = Math.sin(t * 3) * 0.35;
      wingL.rotation.y = flapSlow;
      wingR.rotation.y = Math.PI - flapSlow;
      if (elapsed > landDuration) resetFlight(t);
    }
  }

  function resize() {
    var w = heroSection.clientWidth, h = heroSection.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  var running = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      running = entries[0].isIntersecting;
    }, { threshold: 0.01 }).observe(heroSection);
  }
  document.addEventListener("visibilitychange", function () {
    running = !document.hidden;
  });

  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    if (!running) return;
    var t = clock.getElapsedTime();

    var pa = pollenGeo.attributes.position;
    for (var i = 0; i < pollenCount; i++) {
      var seed = pollenSeed[i];
      var y = pa.getY(i) + 0.004;
      if (y > 3.5) y = -1.6;
      pa.setY(i, y);
      pa.setX(i, pa.getX(i) + Math.sin(t * 0.6 + seed) * 0.002);
    }
    pa.needsUpdate = true;

    updateButterfly(t);
    camera.position.x = Math.sin(t * 0.08) * 0.4;
    camera.lookAt(0, 1.2, 0);

    renderer.render(scene, camera);
  }

  camera.lookAt(0, 1.2, 0);
  if (reduceMotion) {
    renderer.render(scene, camera);
  } else {
    animate();
  }
})();

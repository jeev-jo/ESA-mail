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
  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 1.5, 9);

  // ---- flat, hand-drawn canvas textures (no 3D geometry to go wrong) ----
  function makeTexture(w, h, draw) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    var tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  var fernTex = makeTexture(128, 256, function (ctx, w, h) {
    var p0 = { x: w * 0.5, y: h - 6 };
    var p1 = { x: w * 0.34, y: h * 0.5 };
    var p2 = { x: w * 0.48, y: 10 };
    function stemPoint(t) {
      var mt = 1 - t;
      return {
        x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
      };
    }
    function stemAngle(t) {
      var dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
      var dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
      return Math.atan2(dy, dx);
    }

    ctx.strokeStyle = "#2f6b32";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
    ctx.stroke();

    var leafColors = ["#3f8a44", "#458f4a", "#4d9752", "#59a35d"];
    var leaflets = 9;
    for (var i = 0; i < leaflets; i++) {
      var t = (i + 0.5) / leaflets;
      var pt = stemPoint(t);
      var angle = stemAngle(t);
      var side = i % 2 === 0 ? -1 : 1;
      var rw = 26 - t * 15, rh = 10 - t * 5;
      var lateral = 8 + (1 - t) * 6;
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(angle + side * 1.15);
      ctx.translate(lateral, 0);
      ctx.fillStyle = leafColors[i % leafColors.length];
      ctx.beginPath();
      ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  var flowerTex = makeTexture(64, 64, function (ctx, w, h) {
    var cx = w / 2, cy = h / 2;
    ctx.fillStyle = "#f6f0e2";
    for (var i = 0; i < 5; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((i / 5) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, -13, 7, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#e8b23d";
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  var butterflyTex = makeTexture(256, 128, function (ctx, w, h) {
    var cx = w / 2, cy = h / 2;
    ctx.fillStyle = "#f6ead0";
    ctx.strokeStyle = "#c9a670";
    ctx.lineWidth = 3;
    function wing(sign) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.bezierCurveTo(cx + sign * 90, cy - 95, cx + sign * 125, cy - 16, cx + sign * 48, cy + 10);
      ctx.bezierCurveTo(cx + sign * 88, cy + 35, cx + sign * 64, cy + 74, cx, cy + 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    wing(-1);
    wing(1);
    ctx.fillStyle = "#3a2a1a";
    ctx.beginPath();
    ctx.ellipse(cx, cy, 6, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a2a1a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 38); ctx.lineTo(cx - 16, cy - 64);
    ctx.moveTo(cx, cy - 38); ctx.lineTo(cx + 16, cy - 64);
    ctx.stroke();
  });

  var pollenTex = makeTexture(32, 32, function (ctx) {
    var g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,244,198,0.95)");
    g.addColorStop(1, "rgba(255,244,198,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });

  function makeSprite(tex, w, h) {
    var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    var s = new THREE.Sprite(mat);
    s.scale.set(w, h, 1);
    return s;
  }

  var groundY = -1.3;

  var fernSpots = [[-3.4, -1], [3.0, -2], [-2.1, -3], [2.3, 0.4], [-3.8, 1.4], [3.6, 1.8]];
  fernSpots.forEach(function (p) {
    var h = 1.8 + Math.random() * 0.7;
    var s = makeSprite(fernTex, h * 0.55, h);
    s.position.set(p[0], groundY + h / 2 - 0.15, p[1]);
    scene.add(s);
  });

  var flowerSpots = [[-2.6, -0.4], [2.0, -1], [-1.2, 1.2], [1.4, 1.8], [3.0, 0.6], [-3.6, 0.2]];
  var flowerSprites = flowerSpots.map(function (p) {
    var s = makeSprite(flowerTex, 0.5, 0.5);
    s.position.set(p[0], groundY + 0.3, p[1]);
    scene.add(s);
    return s;
  });

  var pollenCount = isMobile ? 70 : 140;
  var pollenGeo = new THREE.BufferGeometry();
  var pollenPos = new Float32Array(pollenCount * 3);
  var pollenSeed = new Float32Array(pollenCount);
  for (var pi = 0; pi < pollenCount; pi++) {
    pollenPos[pi * 3] = (Math.random() - 0.5) * 10;
    pollenPos[pi * 3 + 1] = Math.random() * 3.2 - 1;
    pollenPos[pi * 3 + 2] = (Math.random() - 0.5) * 5;
    pollenSeed[pi] = Math.random() * Math.PI * 2;
  }
  pollenGeo.setAttribute("position", new THREE.BufferAttribute(pollenPos, 3));
  var pollen = new THREE.Points(
    pollenGeo,
    new THREE.PointsMaterial({
      size: 0.12, map: pollenTex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, color: 0xfff4c6
    })
  );
  scene.add(pollen);

  var butterfly = makeSprite(butterflyTex, 0.9, 0.45);
  scene.add(butterfly);
  var baseButterflyWidth = butterfly.scale.x;

  var flightStart = new THREE.Vector3();
  var flightEnd = new THREE.Vector3();
  var phase = "fly";
  var phaseStart = 0;
  var flyDuration = 5;
  var landDuration = 4;

  function resetFlight(t) {
    var edge = Math.random() < 0.5 ? -5 : 5;
    flightStart.set(edge, 1.1 + Math.random() * 0.6, (Math.random() - 0.5) * 3);
    var spot = flowerSpots[Math.floor(Math.random() * flowerSpots.length)];
    flightEnd.set(spot[0], groundY + 0.55, spot[1]);
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
      butterfly.position.y += Math.sin(f * Math.PI) * 0.9;
      butterfly.scale.x = baseButterflyWidth * (0.35 + Math.abs(Math.sin(t * 10)) * 0.65);
      if (f >= 1) { phase = "land"; phaseStart = t; }
    } else {
      butterfly.scale.x = baseButterflyWidth * (0.75 + Math.abs(Math.sin(t * 2.5)) * 0.25);
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
      var y = pa.getY(i) + 0.0035;
      if (y > 2.2) y = -1;
      pa.setY(i, y);
      pa.setX(i, pa.getX(i) + Math.sin(t * 0.6 + seed) * 0.0015);
    }
    pa.needsUpdate = true;

    flowerSprites.forEach(function (s, i) {
      s.material.rotation = Math.sin(t * 0.8 + i) * 0.1;
    });

    updateButterfly(t);
    camera.position.x = Math.sin(t * 0.06) * 0.3;
    camera.lookAt(0, 0.4, 0);

    renderer.render(scene, camera);
  }

  camera.lookAt(0, 0.4, 0);
  if (reduceMotion) {
    renderer.render(scene, camera);
  } else {
    animate();
  }
})();

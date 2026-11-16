(() => {
  const canvas = document.querySelector("#tree-scene");
  const context = canvas.getContext("2d");
  const track = document.querySelector(".tree-track");
  const ornament = document.querySelector("#tree-card");
  const phase = document.querySelector("#scene-phase");
  const progressFill = document.querySelector("#progress-fill");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const turn = Math.PI * 2;

  if (!context) return;

  let seed = 191224;
  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  const needleColors = ["#174b3e", "#27634e", "#398167", "#578f6d", "#8fb888"];
  const needles = needleColors.map(() => Array.from({ length: 350 }, () => ({
    height: 0.025 + random() * 0.962,
    angle: random() * turn,
    distance: 0.48 + Math.sqrt(random()) * 0.54,
    length: 1 + random() * 6,
    tilt: random() * 5,
  })));
  const decorations = Array.from({ length: 36 }, () => ({
    height: 0.19 + random() * 0.745,
    angle: random() * turn,
    size: 3 + random() * 4,
    tone: random(),
  }));
  const flakes = Array.from({ length: 100 }, () => ({
    x: random(),
    y: random(),
    speed: 0.022 + random() * 0.061,
    size: 0.6 + random() * 2,
    drift: random() * turn,
  }));
  const stars = Array.from({ length: 178 }, () => ({
    x: random(),
    y: random(),
    glow: random(),
    drift: random() * turn,
  }));

  const lightColors = [
    ["#ffc45c", "#fff0b4"],
    ["#ff654e", "#ffd1a8"],
    ["#87dcb7", "#e4ffe8"],
    ["#fca1b4", "#ffe0d8"],
    ["#a8dfff", "#effcff"],
  ];
  const halos = lightColors.map(([color]) => {
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 48;
    const painter = sprite.getContext("2d");
    const glow = painter.createRadialGradient(24, 24, 0, 24, 24, 24);
    glow.addColorStop(0, color + "e8");
    glow.addColorStop(0.18, color + "80");
    glow.addColorStop(0.46, color + "24");
    glow.addColorStop(1, color + "00");
    painter.fillStyle = glow;
    painter.fillRect(0, 0, 48, 48);
    return sprite;
  });

  let width = 0;
  let height = 0;
  let centerX = 0;
  let treeTop = 0;
  let treeHeight = 0;
  let treeWidth = 0;
  let scale = 1;
  let frame = 0;
  let lastFrame = -Infinity;
  let visible = true;

  const clamp = (n) => Math.max(0, Math.min(1, n));
  function ramp(from, to, value) {
    const fraction = clamp((value - from) / (to - from));
    return fraction * fraction * (3 - 2 * fraction);
  }

  function updateSize() {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    width = bounds.width;
    height = bounds.height;
    const mobile = width <= 750;
    const density = Math.min(window.devicePixelRatio || 1, width < 500 ? 1.65 : 1.8);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    context.setTransform(density, 0, 0, density, 0, 0);

    centerX = width * (mobile ? 0.5 : 0.683);
    treeHeight = Math.min(height * (mobile ? 0.565 : 0.69), width * (mobile ? 1.03 : 0.43));
    treeTop = mobile ? Math.max(height * 0.272, height * 0.822 - treeHeight) : (height - treeHeight) * 0.46;
    treeWidth = Math.min(treeHeight * 0.382, width * (mobile ? 0.435 : 0.235));
    scale = Math.min(1.1, Math.max(0.6, treeHeight / 550));
    ornament.style.left = (centerX + treeWidth * (mobile ? 0.28 : 0.31)) + "px";
    ornament.style.top = (treeTop + treeHeight * 0.60) + "px";
    requestPaint();
  }

  function drawLight(x, y, size, color, alpha) {
    const radius = size * 5.6;
    context.globalAlpha = alpha;
    context.drawImage(halos[color], x - radius, y - radius, radius * 2, radius * 2);
    context.fillStyle = lightColors[color][1];
    context.beginPath();
    context.arc(x, y, size, 0, turn);
    context.fill();
    context.globalAlpha = 1;
  }

  function drawStar(x, y, radius, time) {
    const strength = 0.86 + Math.sin(time * 1.4) * 0.13;
    context.globalAlpha = strength;
    context.drawImage(halos[0], x - radius * 4, y - radius * 4, radius * 8, radius * 8);
    context.beginPath();
    for (let corner = 0; corner < 10; corner++) {
      const angle = corner * Math.PI / 5 - Math.PI / 2;
      const distance = corner % 2 ? radius * 0.43 : radius;
      context.lineTo(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance);
    }
    context.closePath();
    context.fillStyle = "#fff1bb";
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = "#ffce77";
    context.stroke();
    context.globalAlpha = 1;
  }

  function drawSky(time, sparkle) {
    const sky = context.createRadialGradient(centerX, height * 0.49, 0, centerX, height * 0.49, Math.max(width, height) * 0.70);
    sky.addColorStop(0, sparkle > 0.3 ? "#21483e" : "#173d31");
    sky.addColorStop(0.48, "#0b211a");
    sky.addColorStop(1, "#030f0d");
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    if (sparkle > 0.01) {
      for (let stripe = 0; stripe < 3; stripe++) {
        const center = height * (0.23 + stripe * 0.12);
        const ribbon = context.createLinearGradient(0, center - 70, width, center + 85);
        ribbon.addColorStop(0.06, "#4eb99c00");
        ribbon.addColorStop(0.54, "#5dd2a43d");
        ribbon.addColorStop(0.86, "#cf9aeb4d");
        ribbon.addColorStop(1, "#c89ce200");
        context.globalAlpha = sparkle * (0.78 - stripe * 0.15);
        context.fillStyle = ribbon;
        context.beginPath();
        context.moveTo(width * 0.10, center + height * 0.10);
        context.bezierCurveTo(width * 0.42, center + 40, width * 0.64, center - 90, width * 1.06, center - 21);
        context.bezierCurveTo(width * 0.76, center + 23, width * 0.45, center + 111, width * 0.10, center + height * 0.10);
        context.fill();
      }
      context.globalAlpha = 1;
    }

    for (const star of stars) {
      const x = star.x * width;
      const y = star.y * height * 0.90;
      const brightness = Math.max(0.06, 0.14 + star.glow * 0.42 + Math.sin(time * 0.7 + star.drift) * 0.14);
      context.fillStyle = "#ffeaca";
      context.globalAlpha = brightness * (0.55 + sparkle * 0.45);
      const size = star.glow > 0.95 ? 2 : 1;
      context.fillRect(x, y, size, size);
      if (star.glow > 0.94 && sparkle > 0.03) {
        context.globalAlpha = brightness * sparkle * 0.6;
        context.fillRect(x - 3, y + 0.5, 8, 1);
        context.fillRect(x + 0.5, y - 3, 1, 8);
      }
    }
    context.globalAlpha = 1;
  }

  function drawGround(sparkle) {
    const ground = treeTop + treeHeight + 13 * scale;
    context.save();
    context.translate(centerX, ground);
    context.scale(1, 0.21);
    const size = treeWidth * 1.69;
    const glow = context.createRadialGradient(0, 0, 0, 0, 0, size);
    glow.addColorStop(0, "#d4a35f45");
    glow.addColorStop(0.45, "#a88c5a27");
    glow.addColorStop(1, "#8fc0b100");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, size, 0, turn);
    context.fill();
    context.lineWidth = 1.4;
    for (let ring = 1; ring <= 3; ring++) {
      context.strokeStyle = "#d5ad668a";
      context.globalAlpha = (0.17 + sparkle * 0.26) / ring;
      context.beginPath();
      context.arc(0, 0, treeWidth * (0.56 + ring * 0.24), 0, turn);
      context.stroke();
    }
    context.restore();
    context.fillStyle = "#574332";
    context.fillRect(centerX - 8 * scale, ground - treeHeight * 0.11, 16 * scale, treeHeight * 0.108);
  }

  function drawBoughs() {
    const bough = context.createLinearGradient(centerX - treeWidth, 0, centerX + treeWidth, 0);
    bough.addColorStop(0, "#112f27");
    bough.addColorStop(0.38, "#285c47");
    bough.addColorStop(0.60, "#376b50");
    bough.addColorStop(1, "#15392d");
    context.fillStyle = bough;

    for (let band = 8; band >= 0; band--) {
      const tip = 0.012 + band * 0.092;
      const end = 0.263 + band * 0.088;
      const apexY = treeTop + tip * treeHeight;
      const baseY = treeTop + end * treeHeight;
      const half = treeWidth * Math.pow(end, 0.88);
      const slope = baseY - apexY;
      context.beginPath();
      context.moveTo(centerX, apexY);
      context.quadraticCurveTo(centerX + half * 0.26, apexY + slope * 0.54, centerX + half * 0.65, baseY - slope * 0.25);
      context.lineTo(centerX + half * 0.58, baseY - slope * 0.20);
      context.quadraticCurveTo(centerX + half * 0.83, baseY - slope * 0.12, centerX + half, baseY);
      for (let tooth = 0; tooth <= 24; tooth++) {
        const step = tooth / 24;
        const distance = 1 - step * 2;
        const jagged = tooth % 2 ? Math.pow(1 - Math.abs(distance), 0.8) * (5 + band) : 0;
        context.lineTo(centerX + half * distance, baseY - slope * 0.3 * Math.sin(step * Math.PI) + jagged);
      }
      context.quadraticCurveTo(centerX - half * 0.83, baseY - slope * 0.12, centerX - half * 0.60, baseY - slope * 0.20);
      context.lineTo(centerX - half * 0.68, baseY - slope * 0.24);
      context.quadraticCurveTo(centerX - half * 0.20, apexY + slope * 0.45, centerX, apexY);
      context.closePath();
      context.fill();
      context.strokeStyle = "#7ead8224";
      context.lineWidth = 0.7;
      context.stroke();
    }
  }

  function project(heightRatio, angle, radial = 1) {
    const radius = treeWidth * Math.pow(heightRatio, 0.88) * radial;
    const depth = Math.sin(angle);
    return {
      x: centerX + Math.cos(angle) * radius,
      y: treeTop + treeHeight * heightRatio + depth * radius * 0.15,
      depth,
    };
  }

  function drawNeedles(rotation) {
    for (let shade = 0; shade < needles.length; shade++) {
      context.beginPath();
      for (const needle of needles[shade]) {
        const tier = (needle.height * 9.8) % 1;
        const point = project(needle.height, needle.angle + rotation * 0.6, needle.distance * (0.79 + tier * 0.21));
        const length = needle.length * scale;
        const direction = point.x > centerX ? 1 : -1;
        context.moveTo(point.x, point.y);
        context.lineTo(point.x + length * direction, point.y + needle.tilt * scale);
      }
      context.strokeStyle = needleColors[shade];
      context.lineWidth = shade === 4 ? 0.85 : 1.1;
      context.globalAlpha = shade > 2 ? 0.57 : 0.82;
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  function drawDecorations(rotation, sparkle) {
    for (const decoration of decorations) {
      const point = project(decoration.height, decoration.angle + rotation, 0.86);
      if (point.depth < -0.12) continue;
      const radius = decoration.size * scale;
      const color = decoration.tone > 0.65 ? 0 : decoration.tone < sparkle * 0.40 ? 2 : 1;
      const tone = lightColors[color][0];
      context.fillStyle = color === 0 ? "#9e6b32" : color === 1 ? "#832e32" : "#2b6c54";
      context.strokeStyle = tone + "bb";
      context.lineWidth = 0.75;
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, turn);
      context.fill();
      context.stroke();
      context.fillStyle = tone;
      context.fillRect(point.x - radius * 0.2, point.y - radius - 2, radius * 0.40, 2.4);
      context.fillStyle = "#fff1cc88";
      context.beginPath();
      context.arc(point.x - radius * 0.30, point.y - radius * 0.30, radius * 0.22, 0, turn);
      context.fill();
    }
  }

  function garlandPoint(progress, rotation) {
    const length = 0.095 + progress * 0.855;
    return project(length, length * turn * 5.6 + rotation + 0.3);
  }

  function drawGarland(time, rotation, snow, sparkle) {
    context.lineWidth = 1.4 * scale;
    context.strokeStyle = "#f2bc645c";
    context.beginPath();
    let previous;
    for (let step = 0; step <= 260; step++) {
      const point = garlandPoint(step / 260, rotation);
      if (point.depth > -0.16 && previous && previous.depth > -0.16) {
        context.lineTo(point.x, point.y);
      } else {
        context.moveTo(point.x, point.y);
      }
      previous = point;
    }
    context.stroke();

    for (let bulb = 0; bulb <= 91; bulb++) {
      const point = garlandPoint(bulb / 91, rotation);
      if (point.depth < -0.25) continue;
      const warmth = 0.59 + Math.cos(time * 2.4 + bulb * 2.3) * 0.26;
      const color = bulb % 7 < sparkle * 4 ? (bulb % 2 ? 4 : 3) : bulb % 5 < snow * 3 ? (bulb % 2 ? 1 : 2) : 0;
      drawLight(point.x, point.y, (2 + warmth * 0.9) * scale, color, warmth * (0.78 + Math.max(point.depth, 0) * 0.22));
    }
  }

  function drawSnow(time, snow, sparkle) {
    const amount = Math.floor(16 + snow * 67 + sparkle * 17);
    for (let index = 0; index < amount; index++) {
      const flake = flakes[index];
      const x = flake.x * (width + 52) - 26 + Math.sin(time * 0.6 + flake.drift) * 17;
      const y = ((flake.y + time * flake.speed) % 1) * height;
      const radius = flake.size * (0.67 + snow * 0.26);
      context.globalAlpha = 0.16 + flake.size * 0.17 + snow * 0.15;
      context.fillStyle = index % 6 === 0 && sparkle > 0.3 ? "#ffdb96" : "#f2f6e4";
      context.beginPath();
      context.arc(x, y, radius, 0, turn);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawScene(progress, time) {
    const snow = ramp(0.12, 0.49, progress);
    const sparkle = ramp(0.55, 0.92, progress);
    const rotation = 0.25 + progress * 2.9 + time * 0.12;
    drawSky(time, sparkle);
    drawGround(sparkle);
    drawBoughs();
    drawNeedles(rotation);
    drawDecorations(rotation, sparkle);
    drawGarland(time, rotation, snow, sparkle);
    drawStar(centerX, treeTop - 5 * scale, 17 * scale, time);
    drawSnow(time, snow, sparkle);
    const label = progress < 0.29 ? "金色灯火" : progress < 0.66 ? "雪落松枝" : "星光漫天";
    if (phase.textContent !== label) phase.textContent = label;
    progressFill.style.transform = "scaleX(" + (0.05 + progress * 0.95) + ")";
  }

  function animate(timestamp) {
    frame = 0;
    if (timestamp - lastFrame >= 30 || reducedMotion.matches) {
      const bounds = track.getBoundingClientRect();
      const travel = Math.max(1, bounds.height - height);
      drawScene(clamp(-bounds.top / travel), reducedMotion.matches ? 0 : timestamp / 1000);
      lastFrame = timestamp;
    }
    if (!reducedMotion.matches) requestPaint();
  }

  function requestPaint() {
    if (visible && width && !frame) frame = requestAnimationFrame(animate);
  }

  document.querySelector("#scroll-cue").addEventListener("click", () => {
    const bounds = track.getBoundingClientRect();
    const travel = Math.max(1, bounds.height - height);
    const current = clamp(-bounds.top / travel);
    const next = [0.39, 0.78, 1].find((position) => position > current + 0.07);
    if (next === undefined) {
      document.querySelector("#compose").scrollIntoView();
    } else {
      window.scrollTo({ top: window.scrollY + bounds.top + travel * next });
    }
  });

  new ResizeObserver(updateSize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) requestPaint();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }).observe(canvas);
  window.addEventListener("scroll", requestPaint, { passive: true });
  reducedMotion.addEventListener("change", requestPaint);
  updateSize();
})();

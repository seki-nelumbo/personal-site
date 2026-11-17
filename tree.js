(() => {
  const canvas = document.querySelector("#tree-scene");
  const context = canvas.getContext("2d");
  const snowCanvas = document.querySelector("#scene-snow");
  const snowContext = snowCanvas.getContext("2d");
  const backdrop = document.createElement("canvas");
  const backdropContext = backdrop.getContext("2d");
  const track = document.querySelector(".tree-track");
  const sleigh = document.querySelector("#sleigh-arrival");
  const ornament = document.querySelector("#tree-card");
  const starEgg = document.querySelector("#star-egg");
  const progressFill = document.querySelector("#progress-fill");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const turn = Math.PI * 2;
  const sceneDuration = 6000;
  const departureDuration = 2200;
  const sparkRelease = 0.045;
  const starArrival = 0.21;
  const lightingStart = 0.35;
  const sleighStart = 0.46;
  const lightingEnd = 0.90;

  if (!context || !snowContext || !backdropContext) return;

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
  const forest = [27, 18].map((count) => Array.from({ length: count }, (_, index) => ({
    x: (index + random() * 0.85) / count,
    size: 0.48 + random() * 0.52,
  })));
  const lightColors = [
    ["#ffc45c", "#fff0b4"],
    ["#ff654e", "#ffd1a8"],
    ["#87dcb7", "#e4ffe8"],
  ];
  const wireOpacity = [0.16, 0.42, 0.73, 1];
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
  let landingY = 0;
  let flightStart = null;
  let departureStart = null;
  let canRotate = false;
  let gesture = null;
  let yaw = 0;
  let targetYaw = 0;
  let frame = 0;
  let lastFrame = -Infinity;
  let visible = true;

  const clamp = (n) => Math.max(0, Math.min(1, n));
  function ramp(from, to, value) {
    const fraction = clamp((value - from) / (to - from));
    return fraction * fraction * (3 - 2 * fraction);
  }

  function starY() {
    return treeTop - 5 * scale;
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
    snowCanvas.width = canvas.width;
    snowCanvas.height = canvas.height;
    context.setTransform(density, 0, 0, density, 0, 0);
    snowContext.setTransform(density, 0, 0, density, 0, 0);

    centerX = width * (mobile ? 0.5 : 0.683);
    treeHeight = Math.min(height * (mobile ? 0.565 : 0.69), width * (mobile ? 1.03 : 0.43));
    treeTop = mobile ? Math.max(height * 0.272, height * 0.822 - treeHeight) : (height - treeHeight) * 0.46;
    treeWidth = Math.min(treeHeight * 0.382, width * (mobile ? 0.435 : 0.235));
    scale = Math.min(1.1, Math.max(0.6, treeHeight / 550));
    starEgg.style.left = centerX + "px";
    starEgg.style.top = starY() + "px";
    const sleighWidth = mobile ? Math.min(width * 0.91, 430) : Math.min(Math.max(width * 0.40, 340), 580);
    sleigh.style.width = sleighWidth + "px";
    landingY = height * (mobile ? 0.88 : 0.90) - sleighWidth / 4;
    paintBackdrop(density);
    requestPaint();
  }

  function paintBackdrop(density) {
    backdrop.width = canvas.width;
    backdrop.height = canvas.height;
    const pen = backdropContext;
    pen.setTransform(density, 0, 0, density, 0, 0);
    const layers = [
      { ground: 0.79, high: 0.12, fill: "#284d416e" },
      { ground: 0.86, high: 0.16, fill: "#142f2ae8" },
    ];

    for (let layer = 0; layer < layers.length; layer++) {
      const { ground, high, fill } = layers[layer];
      const horizon = (x) => height * (ground + Math.sin(x * turn * 1.12 + layer) * 0.025);
      pen.beginPath();
      pen.moveTo(0, height);
      for (let step = 0; step <= 40; step++) pen.lineTo(width * step / 40, horizon(step / 40));
      pen.lineTo(width, height);
      pen.closePath();
      for (const pine of forest[layer]) {
        const x = pine.x * width;
        const base = horizon(pine.x) + 1;
        const tall = Math.min(height * high, width * 0.18) * pine.size;
        pen.moveTo(x, base - tall);
        for (const [spread, level] of [[0.16, 0.50], [0.10, 0.47], [0.23, 0.75], [0.13, 0.70], [0.29, 1]]) {
          pen.lineTo(x + tall * spread, base - tall * (1 - level));
        }
        pen.lineTo(x - tall * 0.29, base);
        for (const [spread, level] of [[0.13, 0.70], [0.23, 0.75], [0.10, 0.47], [0.16, 0.50]]) {
          pen.lineTo(x - tall * spread, base - tall * (1 - level));
        }
        pen.closePath();
      }
      pen.fillStyle = fill;
      pen.fill();
    }

    const ground = pen.createLinearGradient(0, height * 0.86, 0, height);
    ground.addColorStop(0, "#3d696149");
    ground.addColorStop(0.54, "#33534b20");
    ground.addColorStop(1, "#081b16");
    pen.fillStyle = ground;
    pen.beginPath();
    pen.moveTo(0, height * 0.90);
    pen.bezierCurveTo(width * 0.29, height * 0.84, width * 0.64, height * 0.93, width, height * 0.88);
    pen.lineTo(width, height);
    pen.lineTo(0, height);
    pen.fill();
  }

  function bezier(start, first, second, end, t) {
    const remaining = 1 - t;
    return remaining ** 3 * start + 3 * remaining ** 2 * t * first
      + 3 * remaining * t ** 2 * second + t ** 3 * end;
  }

  function flightPose(progress) {
    // Ease out at the landing point while following one uninterrupted arc.
    const t = progress + progress * progress * (1 - progress);
    return {
      x: bezier(width * 0.985, width * 0.955, centerX + width * 0.084, centerX, t),
      y: bezier(height * 0.068, height * 0.12, landingY - height * 0.17, landingY, t),
      scale: 0.15 + 0.85 * ramp(0.05, 0.94, progress),
      bank: -9 * (1 - ramp(0.12, 0.95, progress)),
      opacity: ramp(0, 0.12, progress),
    };
  }

  function departurePose(progress) {
    const t = progress * (0.45 + 0.55 * progress);
    return {
      x: bezier(centerX, centerX - width * 0.10, width * 0.18, -width * 0.25, t),
      y: bezier(landingY, landingY + height * 0.015, height * 0.60, height * 0.42, t),
      scale: 1 - 0.42 * ramp(0.08, 1, progress),
      bank: 8 * ramp(0.14, 0.80, progress),
      opacity: 1 - ramp(0.85, 1, progress),
    };
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

  function drawStar(x, y, radius, time, amount) {
    const strength = 0.86 + Math.sin(time * 1.4) * 0.13;
    context.globalAlpha = strength * amount;
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

  function drawGround(lighting) {
    const ground = treeTop + treeHeight + 13 * scale;
    context.save();
    context.translate(centerX, ground);
    context.scale(1, 0.21);
    const size = treeWidth * 1.69;
    const glow = context.createRadialGradient(0, 0, 0, 0, 0, size);
    glow.addColorStop(0, "rgba(212, 163, 95, " + (lighting * 0.27) + ")");
    glow.addColorStop(0.45, "#191d1735");
    glow.addColorStop(1, "#8fc0b100");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, size, 0, turn);
    context.fill();
    context.lineWidth = 1.4;
    for (let ring = 1; ring <= 3; ring++) {
      context.strokeStyle = "#d5ad668a";
      context.globalAlpha = lighting * 0.23 / ring;
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
      const tip = band * 0.092;
      const end = 0.263 + band * 0.088;
      const apexY = treeTop + tip * treeHeight;
      const baseY = treeTop + end * treeHeight;
      const half = treeWidth * Math.pow(end, 0.88);
      const center = centerX;
      const slope = baseY - apexY;
      context.beginPath();
      context.moveTo(center, apexY);
      context.quadraticCurveTo(center + half * 0.26, apexY + slope * 0.54, center + half * 0.65, baseY - slope * 0.25);
      context.lineTo(center + half * 0.58, baseY - slope * 0.20);
      context.quadraticCurveTo(center + half * 0.83, baseY - slope * 0.12, center + half, baseY);
      for (let tooth = 0; tooth <= 24; tooth++) {
        const step = tooth / 24;
        const distance = 1 - step * 2;
        const jagged = tooth % 2 ? Math.pow(1 - Math.abs(distance), 0.8) * (5 + band) : 0;
        context.lineTo(center + half * distance, baseY - slope * 0.3 * Math.sin(step * Math.PI) + jagged);
      }
      context.quadraticCurveTo(center - half * 0.83, baseY - slope * 0.12, center - half * 0.60, baseY - slope * 0.20);
      context.lineTo(center - half * 0.68, baseY - slope * 0.24);
      context.quadraticCurveTo(center - half * 0.20, apexY + slope * 0.45, center, apexY);
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
    const offsetY = depth * radius * 0.15;
    const spaceAboveGround = treeHeight * (1 - heightRatio) * 0.76;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: treeTop + treeHeight * heightRatio + Math.min(offsetY, spaceAboveGround),
      depth,
    };
  }

  function drawNeedles(rotation) {
    for (let shade = 0; shade < needles.length; shade++) {
      context.beginPath();
      for (const needle of needles[shade]) {
        const tier = (needle.height * 9.8) % 1;
        const point = project(needle.height, needle.angle + rotation, needle.distance * (0.79 + tier * 0.21));
        const length = needle.length * scale;
        const direction = 2 * clamp(0.5 + (point.x - centerX) / (treeWidth * 0.32)) - 1;
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

  function drawDecorations(rotation, opacity) {
    for (const decoration of decorations) {
      const point = project(decoration.height, decoration.angle + rotation, 0.86);
      const front = ramp(-0.45, 0.27, point.depth);
      if (front <= 0) continue;
      context.globalAlpha = opacity * front;
      const radius = decoration.size * scale * (0.85 + 0.15 * front);
      const color = decoration.tone > 0.65 ? 0 : 1;
      const tone = lightColors[color][0];
      context.fillStyle = color === 0 ? "#9e6b32" : "#832e32";
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
    context.globalAlpha = 1;
  }

  function garlandPoint(progress, rotation) {
    const length = 0.095 + progress * 0.855;
    return project(length, length * turn * 5.6 + rotation - 2.5);
  }

  function drawMagic(progress, rotation) {
    if (progress <= sparkRelease || progress >= 0.99) return;
    const tipY = starY();
    const startX = Math.min(width * 0.95, centerX + width * 0.23);
    const startY = Math.max(height * 0.09, tipY - height * 0.075);
    const firstBulb = garlandPoint(0, rotation);
    const glow = ramp(sparkRelease, sparkRelease + 0.035, progress) * (1 - ramp(0.91, 0.99, progress));

    for (let spark = 17; spark >= 0; spark--) {
      const past = progress - spark * 0.0045;
      if (past < sparkRelease) continue;
      let point;
      if (past < starArrival) {
        const t = (past - sparkRelease) / (starArrival - sparkRelease);
        point = {
          x: bezier(startX, startX - width * 0.04, centerX + width * 0.04, centerX, t),
          y: bezier(startY, startY + height * 0.06, tipY - height * 0.035, tipY, t),
          depth: 1,
        };
      } else if (past < lightingStart) {
        const t = ramp(starArrival + 0.035, lightingStart, past);
        point = {
          x: centerX + (firstBulb.x - centerX) * t,
          y: tipY + (firstBulb.y - tipY) * t,
          depth: 1,
        };
      } else {
        point = garlandPoint(clamp((past - lightingStart) / (lightingEnd - lightingStart)), rotation);
      }
      const tail = 1 - spark / 18;
      const depth = 0.17 + 0.83 * ramp(-0.28, 0.21, point.depth);
      drawLight(point.x, point.y, (1.15 + tail * 2.9) * scale, 0, glow * depth * tail);
    }
  }

  function drawGarland(time, rotation, lighting, snow) {
    context.lineWidth = 1.4 * scale;
    context.strokeStyle = "#f2bc645c";
    const brightness = ramp(0, 0.15, lighting);
    const lines = wireOpacity.map(() => []);
    let previous = garlandPoint(0, rotation);
    for (let step = 1; step <= Math.floor(lighting * 260); step++) {
      const point = garlandPoint(step / 260, rotation);
      const front = ramp(-0.49, 0.28, (point.depth + previous.depth) / 2);
      if (front > 0) {
        const layer = Math.min(wireOpacity.length - 1, Math.floor(front * wireOpacity.length));
        lines[layer].push(previous.x, previous.y, point.x, point.y);
      }
      previous = point;
    }
    for (let layer = 0; layer < lines.length; layer++) {
      const segments = lines[layer];
      if (!segments.length) continue;
      context.globalAlpha = brightness * wireOpacity[layer];
      context.beginPath();
      for (let index = 0; index < segments.length; index += 4) {
        context.moveTo(segments[index], segments[index + 1]);
        context.lineTo(segments[index + 2], segments[index + 3]);
      }
      context.stroke();
    }
    context.globalAlpha = 1;

    for (let bulb = 0; bulb <= 91; bulb++) {
      const position = bulb / 91;
      const reveal = ramp(0, 0.075, lighting * 1.08 - position);
      if (reveal <= 0) continue;
      const point = garlandPoint(position, rotation);
      const front = ramp(-0.49, 0.28, point.depth);
      if (front <= 0) continue;
      const warmth = 0.59 + Math.cos(time * 2.4 + bulb * 2.3) * 0.26;
      const color = bulb % 5 < snow * 3 ? (bulb % 2 ? 1 : 2) : 0;
      drawLight(point.x, point.y, (2 + warmth * 0.9) * scale, color, reveal * warmth * front);
    }
  }

  function drawGifts(progress) {
    const appear = ramp(0.87, 1, progress);
    if (appear <= 0) return;
    const spacing = treeWidth * (width > 750 ? 1.22 : 0.96);
    const floor = height * (width > 750 ? 0.903 : 0.885);
    const presents = [
      { x: centerX - spacing, y: floor, size: 25, color: "#893d37", ribbon: "#e7ba70" },
      { x: centerX - spacing + 24 * scale, y: floor + 4 * scale, size: 18, color: "#496f56", ribbon: "#f1d7a0" },
      { x: centerX + spacing, y: floor + 4 * scale, size: 22, color: "#c09151", ribbon: "#fff0ba" },
    ];
    const pen = snowContext;
    pen.save();
    pen.globalAlpha = appear;
    for (const gift of presents) {
      const size = gift.size * scale;
      const x = gift.x - size / 2;
      const y = gift.y - size * 0.73;
      pen.fillStyle = "#020b096b";
      pen.fillRect(x - 3, gift.y - 1, size + 6, 4);
      pen.fillStyle = gift.color;
      pen.fillRect(x, y, size, size * 0.73);
      pen.fillRect(x - 1.5, y - 1, size + 3, size * 0.19);
      pen.fillStyle = gift.ribbon;
      pen.fillRect(gift.x - size * 0.075, y - 1, size * 0.15, size * 0.75);
      pen.strokeStyle = gift.ribbon;
      pen.lineWidth = 1.7 * scale;
      pen.beginPath();
      pen.moveTo(gift.x, y);
      pen.bezierCurveTo(gift.x - size * 0.6, y - size * 0.54, gift.x - size * 0.51, y + size * 0.09, gift.x, y);
      pen.bezierCurveTo(gift.x + size * 0.54, y - size * 0.54, gift.x + size * 0.57, y + size * 0.08, gift.x, y);
      pen.stroke();
    }
    pen.restore();
  }

  function drawForeground(time, snow, progress) {
    snowContext.clearRect(0, 0, width, height);
    drawGifts(progress);
    snowContext.fillStyle = "#f2f6e4";
    const amount = Math.floor(23 + snow * 77);
    for (let index = 0; index < amount; index++) {
      const flake = flakes[index];
      const x = flake.x * (width + 52) - 26 + Math.sin(time * 0.6 + flake.drift) * 17;
      const y = ((flake.y + time * flake.speed) % 1) * height;
      const radius = flake.size * (0.67 + snow * 0.26);
      snowContext.globalAlpha = 0.16 + flake.size * 0.17 + snow * 0.15;
      snowContext.beginPath();
      snowContext.arc(x, y, radius, 0, turn);
      snowContext.fill();
    }
    snowContext.globalAlpha = 1;
  }

  function drawScene(progress, time) {
    const lighting = clamp((progress - lightingStart) / (lightingEnd - lightingStart));
    const snow = ramp(0.1, 0.92, lighting);
    const rotation = 0.25 + (reducedMotion.matches ? 0 : 0.36 * lighting) + yaw;
    context.clearRect(0, 0, width, height);
    context.drawImage(backdrop, 0, 0, width, height);
    drawGround(lighting);
    drawBoughs();
    drawNeedles(rotation);
    if (lighting > 0) {
      drawDecorations(rotation, ramp(0.16, 0.64, lighting));
      drawGarland(time, rotation, lighting, snow);
    }
    if (progress > starArrival) {
      drawStar(centerX, starY(), 17 * scale, time, ramp(starArrival, starArrival + 0.09, progress));
    }
    drawMagic(progress, rotation);
    drawForeground(time, snow, progress);
  }

  function updateFlight(flightProgress, timestamp) {
    const leaving = departureStart !== null;
    const departure = leaving ? (reducedMotion.matches ? 1 : clamp((timestamp - departureStart) / departureDuration)) : 0;
    const sleighVisible = flightProgress >= sleighStart && departure < 1;
    const arrived = flightProgress >= 1;
    canRotate = arrived;
    sleigh.toggleAttribute("hidden", !sleighVisible);
    ornament.toggleAttribute("hidden", !arrived || leaving);
    starEgg.toggleAttribute("hidden", !arrived);
    track.classList.toggle("can-rotate", arrived);
    sleigh.classList.toggle("is-flying", sleighVisible && (!arrived || leaving));

    if (sleighVisible) {
      const pose = leaving ? departurePose(departure) : flightPose(clamp((flightProgress - sleighStart) / (1 - sleighStart)));
      sleigh.style.opacity = pose.opacity;
      sleigh.style.transform = "translate3d(calc(" + pose.x + "px - 50%), calc(" + pose.y
        + "px - 50%), 0) rotate(" + pose.bank + "deg) scale(" + pose.scale + ")";
    }

    progressFill.style.transform = "scaleX(" + flightProgress + ")";
  }

  function animate(timestamp) {
    frame = 0;
    if (flightStart !== null && reducedMotion.matches) {
      flightStart = Math.min(flightStart, timestamp - sceneDuration);
    }
    const progress = flightStart === null ? 0 : clamp((timestamp - flightStart) / sceneDuration);
    updateFlight(progress, timestamp);
    const turning = Math.abs(targetYaw - yaw) > 0.002;
    const elapsed = timestamp - lastFrame;
    if (elapsed >= (turning ? 15 : 30) || reducedMotion.matches) {
      const response = reducedMotion.matches || !turning ? 1 : 1 - Math.exp(-Math.min(elapsed, 55) / 68);
      yaw += (targetYaw - yaw) * response;
      drawScene(progress, reducedMotion.matches ? 0 : timestamp / 1000);
      lastFrame = timestamp;
    }
    if (!reducedMotion.matches) requestPaint();
  }

  function requestPaint() {
    if (visible && width && !frame) frame = requestAnimationFrame(animate);
  }

  function startScene() {
    if (flightStart !== null) return;
    flightStart = performance.now();
    requestPaint();
  }

  ornament.addEventListener("greeting-read", () => {
    departureStart = performance.now();
    requestPaint();
  });

  document.querySelector("#scroll-cue").addEventListener("click", () => {
    flightStart = null;
    departureStart = null;
    gesture = null;
    track.classList.remove("is-rotating");
    yaw = targetYaw = 0;
    requestPaint();
  });

  function rotateTree(horizontal, vertical) {
    const distance = Math.abs(horizontal) >= Math.abs(vertical) ? horizontal : vertical;
    targetYaw += distance * 0.0105;
    requestPaint();
  }

  track.addEventListener("wheel", (event) => {
    if (event.ctrlKey) return;
    if (canRotate) {
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
      rotateTree(event.deltaX * unit, event.deltaY * unit);
    } else if (event.deltaY > 0) {
      startScene();
    }
  }, { passive: true });

  track.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0 || event.target.closest("button, a")) return;
    if (!canRotate && event.pointerType !== "touch") return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, rotating: canRotate };
    track.setPointerCapture(event.pointerId);
    if (gesture.rotating) track.classList.add("is-rotating");
  });
  track.addEventListener("pointermove", (event) => {
    if (gesture?.id !== event.pointerId || !gesture.rotating) return;
    rotateTree(event.clientX - gesture.x, event.clientY - gesture.y);
    gesture.x = event.clientX;
    gesture.y = event.clientY;
  });
  track.addEventListener("pointerup", (event) => {
    if (gesture?.id !== event.pointerId) return;
    if (!gesture.rotating && gesture.y - event.clientY >= 24) startScene();
    gesture = null;
    track.classList.remove("is-rotating");
  });
  track.addEventListener("lostpointercapture", (event) => {
    if (gesture?.id !== event.pointerId) return;
    gesture = null;
    track.classList.remove("is-rotating");
  });

  const arrowDeltas = {
    ArrowLeft: [-30, 0],
    ArrowRight: [30, 0],
    ArrowUp: [0, -35],
    ArrowDown: [0, 35],
  };
  document.addEventListener("keydown", (event) => {
    if (document.querySelector("dialog[open]")) return;
    const delta = arrowDeltas[event.key];
    if (canRotate && delta) {
      event.preventDefault();
      rotateTree(...delta);
      return;
    }
    if (!["ArrowDown", "PageDown", " "].includes(event.key)) return;
    if (event.key === " " && event.target.closest("a, button")) return;
    event.preventDefault();
    startScene();
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
  reducedMotion.addEventListener("change", requestPaint);
  updateSize();
})();

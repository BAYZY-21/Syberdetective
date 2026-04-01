const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ─── Resize ───────────────────────────────────────────────────────────────────
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ─── Pointer (mouse + touch) ──────────────────────────────────────────────────
const pointer = { x: canvas.width / 2, y: canvas.height / 2 };

window.addEventListener('mousemove', e => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});
window.addEventListener('touchmove', e => {
  e.preventDefault();
  pointer.x = e.touches[0].clientX;
  pointer.y = e.touches[0].clientY;
}, { passive: false });
window.addEventListener('touchstart', e => {
  pointer.x = e.touches[0].clientX;
  pointer.y = e.touches[0].clientY;
}, { passive: false });

// ─── Stars ────────────────────────────────────────────────────────────────────
const STAR_COUNT = 180;
const stars = Array.from({ length: STAR_COUNT }, () => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  r: Math.random() * 1.4 + 0.3,
  a: Math.random(),
  da: (Math.random() - 0.5) * 0.012,
}));

function drawStars() {
  stars.forEach(s => {
    s.a += s.da;
    if (s.a <= 0 || s.a >= 1) s.da *= -1;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.a})`;
    ctx.fill();
  });
}

// ─── Spider ───────────────────────────────────────────────────────────────────
const spider = {
  x: canvas.width  / 2,
  y: canvas.height / 2,
  vx: 0,
  vy: 0,

  // 8 legs, each with 3 joints: shoulder → knee → foot
  legs: Array.from({ length: 8 }, (_, i) => {
    const baseAngle = (i / 8) * Math.PI * 2;
    return {
      baseAngle,
      // foot target (world coords)
      fx: canvas.width  / 2 + Math.cos(baseAngle) * 55,
      fy: canvas.height / 2 + Math.sin(baseAngle) * 55,
      stepTimer: Math.floor(Math.random() * 30),
    };
  }),

  bodyRadius: 10,
  legLength1: 28,   // shoulder → knee
  legLength2: 30,   // knee → foot
  stepDist: 35,     // how far foot drifts before stepping
  stepSpeed: 0.28,  // lerp speed of foot toward target
  bodySpeed: 0.10,  // lerp speed of body toward pointer
};

// Solve 2-bone IK; returns knee position
function solveIK(ox, oy, tx, ty, l1, l2) {
  const dx = tx - ox;
  const dy = ty - oy;
  let dist = Math.sqrt(dx * dx + dy * dy);
  dist = Math.min(dist, l1 + l2 - 0.1);

  const cosA = (dist * dist + l1 * l1 - l2 * l2) / (2 * dist * l1);
  const a = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const baseAngle = Math.atan2(dy, dx);

  // alternate knee direction per leg
  return {
    kx: ox + Math.cos(baseAngle + a) * l1,
    ky: oy + Math.sin(baseAngle + a) * l1,
  };
}

function updateSpider() {
  // Body follows pointer smoothly
  spider.vx = (pointer.x - spider.x) * spider.bodySpeed;
  spider.vy = (pointer.y - spider.y) * spider.bodySpeed;
  spider.x += spider.vx;
  spider.y += spider.vy;

  spider.legs.forEach((leg, i) => {
    // Ideal resting foot position relative to body
    const angle = leg.baseAngle + Math.atan2(spider.vy, spider.vx + 0.001) * 0.3;
    const restX = spider.x + Math.cos(angle) * (spider.legLength1 + spider.legLength2) * 0.85;
    const restY = spider.y + Math.sin(angle) * (spider.legLength1 + spider.legLength2) * 0.85;

    const dx = restX - leg.fx;
    const dy = restY - leg.fy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    leg.stepTimer--;
    if (dist > spider.stepDist || leg.stepTimer <= 0) {
      leg.fx += (restX - leg.fx) * spider.stepSpeed;
      leg.fy += (restY - leg.fy) * spider.stepSpeed;
      if (leg.stepTimer <= 0) leg.stepTimer = 12 + Math.floor(Math.random() * 8);
    }
  });
}

function drawSpider() {
  ctx.shadowColor = 'rgba(255,255,255,0.55)';
  ctx.shadowBlur  = 8;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth   = 1.4;
  ctx.lineCap     = 'round';

  spider.legs.forEach(leg => {
    const { kx, ky } = solveIK(
      spider.x, spider.y,
      leg.fx,   leg.fy,
      spider.legLength1, spider.legLength2
    );

    ctx.beginPath();
    ctx.moveTo(spider.x, spider.y);
    ctx.quadraticCurveTo(kx, ky, leg.fx, leg.fy);
    ctx.stroke();
  });

  // Body circle
  ctx.beginPath();
  ctx.arc(spider.x, spider.y, spider.bodyRadius, 0, Math.PI * 2);
  ctx.fillStyle   = 'rgba(255,255,255,0.95)';
  ctx.fill();

  // Abdomen
  ctx.beginPath();
  ctx.arc(
    spider.x - Math.cos(Math.atan2(spider.vy, spider.vx)) * 14,
    spider.y - Math.sin(Math.atan2(spider.vy, spider.vx)) * 14,
    7, 0, Math.PI * 2
  );
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  ctx.fill();

  ctx.shadowBlur = 0;
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStars();
  updateSpider();
  drawSpider();
  requestAnimationFrame(loop);
}

loop();

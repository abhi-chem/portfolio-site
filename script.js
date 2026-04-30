document.addEventListener('DOMContentLoaded', () => {

  /* ── Page Fade-In ── */
  const overlay = document.querySelector('.page-transition');
  if (overlay) setTimeout(() => overlay.classList.add('loaded'), 80);

  /* ── Page Fade-Out on nav clicks ── */
  document.querySelectorAll('a[href]').forEach(link => {
    if (
      link.hostname === window.location.hostname &&
      !link.target &&
      !link.hasAttribute('download') &&
      !link.href.startsWith('mailto:')
    ) {
      link.addEventListener('click', e => {
        const dest = link.href;
        if (dest === window.location.href) return;
        e.preventDefault();
        if (overlay) {
          overlay.classList.remove('loaded');
          setTimeout(() => { window.location.href = dest; }, 380);
        } else {
          window.location.href = dest;
        }
      });
    }
  });

  /* ── Active Nav Link ── */
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });

  /* ── Scroll Reveal ── */
  const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));

  /* ────────────────────────────────────────────
     MOLECULAR BACKGROUND ANIMATION
  ──────────────────────────────────────────── */
  const canvas = document.getElementById('mol-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Molecular templates — chemistry / perovskite motifs
  const TEMPLATES = [
    // Benzene / aromatic hexagonal ring
    {
      atoms: [
        { x: 0, y: -48 }, { x: 41, y: -24 }, { x: 41, y: 24 },
        { x: 0, y: 48 }, { x: -41, y: 24 }, { x: -41, y: -24 }
      ],
      bonds: [[0,1,1],[1,2,2],[2,3,1],[3,4,2],[4,5,1],[5,0,2]],
      radii: [6, 6, 6, 6, 6, 6],
    },
    // Perovskite octahedral — MX6 motif (BaZrS3)
    {
      atoms: [
        { x: 0, y: 0 },    // center (Zr)
        { x: 60, y: 0 },   // right (S)
        { x: -60, y: 0 },  // left (S)
        { x: 0, y: 60 },   // bottom (S)
        { x: 0, y: -60 },  // top (S)
        { x: 42, y: -42 }, // corner (S)
        { x: -42, y: 42 }, // corner (S)
      ],
      bonds: [[0,1,1],[0,2,1],[0,3,1],[0,4,1],[0,5,1],[0,6,1]],
      radii: [9, 6, 6, 6, 6, 6, 6],
    },
    // Water molecule (H2O)
    {
      atoms: [{ x: 0, y: 0 }, { x: 32, y: 26 }, { x: -32, y: 26 }],
      bonds: [[0,1,1],[0,2,1]],
      radii: [7, 4, 4],
    },
    // Linear double-bond (CO2 / S=C=S)
    {
      atoms: [{ x: -55, y: 0 }, { x: 0, y: 0 }, { x: 55, y: 0 }],
      bonds: [[0,1,2],[1,2,2]],
      radii: [6, 7, 6],
    },
    // Tetrahedral molecule (BaS4 motif)
    {
      atoms: [
        { x: 0, y: 0 },
        { x: 0, y: -55 },
        { x: 47, y: 27 },
        { x: -47, y: 27 },
      ],
      bonds: [[0,1,1],[0,2,1],[0,3,1]],
      radii: [9, 5, 5, 5],
    },
    // Chain (polymer segment)
    {
      atoms: [
        { x: -66, y: -20 }, { x: -22, y: 0 }, { x: 22, y: 0 }, { x: 66, y: -20 }
      ],
      bonds: [[0,1,1],[1,2,2],[2,3,1]],
      radii: [5, 7, 7, 5],
    },
    // Branched molecule
    {
      atoms: [
        { x: -45, y: 0 }, { x: 0, y: 0 }, { x: 45, y: 0 }, { x: 0, y: -45 }, { x: 0, y: 45 }
      ],
      bonds: [[0,1,1],[1,2,1],[1,3,1],[1,4,1]],
      radii: [5, 9, 5, 5, 5],
    },
  ];

  // Color palette matching site accent
  const ATOM_COLOR  = 'rgba(14, 165, 233, VAL)';  // cyan
  const ATOM_COLOR2 = 'rgba(124, 58, 237, VAL)';  // purple
  const BOND_COLOR  = 'rgba(14, 165, 233, VAL)';
  const BOND_COLOR2 = 'rgba(124, 58, 237, VAL)';

  let W, H, molecules = [];
  const MOL_COUNT = 18;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function createMolecule() {
    const tpl = pick(TEMPLATES);
    const useAlt = Math.random() > 0.6;
    return {
      tpl,
      x: rnd(0, W),
      y: rnd(0, H),
      vx: rnd(-0.22, 0.22),
      vy: rnd(-0.18, 0.18),
      angle: rnd(0, Math.PI * 2),
      omega: rnd(-0.003, 0.003),  // rotation speed
      scale: rnd(0.6, 1.1),
      alpha: rnd(0.10, 0.20),
      atomColor: useAlt ? ATOM_COLOR2 : ATOM_COLOR,
      bondColor: useAlt ? BOND_COLOR2 : BOND_COLOR,
    };
  }

  function init() {
    resize();
    molecules = Array.from({ length: MOL_COUNT }, createMolecule);
  }

  function drawMolecule(m) {
    const { tpl, x, y, angle, scale, alpha, atomColor, bondColor } = m;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    // Draw bonds
    tpl.bonds.forEach(([i, j, order]) => {
      const a = tpl.atoms[i], b = tpl.atoms[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      const nx = -dy / len, ny = dx / len; // normal

      const bAlpha = alpha * 0.7;
      ctx.strokeStyle = bondColor.replace('VAL', bAlpha);
      ctx.lineCap = 'round';

      if (order === 2) {
        // Draw two parallel lines
        const offset = 3.5;
        for (let s of [-1, 1]) {
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(a.x + nx * offset * s, a.y + ny * offset * s);
          ctx.lineTo(b.x + nx * offset * s, b.y + ny * offset * s);
          ctx.stroke();
        }
      } else {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    });

    // Draw atoms
    tpl.atoms.forEach((a, idx) => {
      const r = (tpl.radii ? tpl.radii[idx] : 6);
      // Outer glow
      const glow = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, r * 2.2);
      glow.addColorStop(0, atomColor.replace('VAL', alpha * 0.5));
      glow.addColorStop(1, atomColor.replace('VAL', 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(a.x, a.y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Core atom circle
      ctx.fillStyle = atomColor.replace('VAL', alpha);
      ctx.beginPath();
      ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = atomColor.replace('VAL', alpha * 0.5);
      ctx.beginPath();
      ctx.arc(a.x - r * 0.25, a.y - r * 0.25, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);

    molecules.forEach(m => {
      drawMolecule(m);

      // Update position & rotation
      m.x += m.vx;
      m.y += m.vy;
      m.angle += m.omega;

      // Wrap around edges with padding
      const pad = 120;
      if (m.x < -pad) m.x = W + pad;
      if (m.x > W + pad) m.x = -pad;
      if (m.y < -pad) m.y = H + pad;
      if (m.y > H + pad) m.y = -pad;
    });

    requestAnimationFrame(loop);
  }

  init();
  loop();
  window.addEventListener('resize', () => resize());
});
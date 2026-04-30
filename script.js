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

  /* ── Hero Canvas Particle Network ── */
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  const COUNT = 70;
  const MAX_DIST = 130;
  const SPEED = 0.4;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function randomParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r: Math.random() * 2.5 + 1.5
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: COUNT }, randomParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * 0.25;
          ctx.strokeStyle = `rgba(14, 165, 233, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(14, 165, 233, 0.5)';
      ctx.fill();

      // Move
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });

    requestAnimationFrame(draw);
  }

  init();
  draw();
  window.addEventListener('resize', () => { resize(); });
});
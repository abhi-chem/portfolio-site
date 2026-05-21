/**
 * R&D Lab Dashboard - Interactive Science Simulations
 * Abhishek Anand | Energy Materials Scientist
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // Custom DPI Scaler for Crisp Canvas Graphics
  function initCanvas(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    
    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.restore();
      ctx.save();
      ctx.scale(dpr, dpr);
    }
    
    resize();
    // Return canvas, context, and a function to fetch live dimensions
    return {
      canvas,
      ctx,
      resize,
      get width() { return canvas.parentElement.getBoundingClientRect().width; },
      get height() { return canvas.parentElement.getBoundingClientRect().height; }
    };
  }

  // Handle window resizing for all active simulators
  const activeResizers = [];
  window.addEventListener('resize', () => {
    activeResizers.forEach(r => r());
  });

  /* ──────────────────────────────────────────────────────────
     1. GOLDSCHMIDT TOLERANCE FACTOR CALCULATOR
     ────────────────────────────────────────────────────────── */
  const IONIC_RADII = {
    // A-site cations (in Angstroms)
    Cs: 1.88,
    MA: 2.17,
    FA: 2.53,
    Rb: 1.72,
    K: 1.64,
    // B-site Divalent (Single)
    Pb2: 1.19,
    Sn2: 1.10,
    Ge2: 0.73,
    Mn2: 0.83,
    // B'-site Monovalent (Double)
    Na: 1.02,
    Ag: 1.15,
    Au: 1.37,
    Cu: 0.77,
    // B''-site Trivalent (Double)
    In3: 0.80,
    Bi3: 1.03,
    Sb3: 0.76,
    Fe3: 0.645,
    // B-site Tetravalent (Vacancy-Ordered)
    Sn4: 0.69,
    Ti4: 0.605,
    Zr4: 0.72,
    Pt4: 0.625,
    Pd4: 0.615,
    // X-site anions
    I: 2.20,
    Br: 1.96,
    Cl: 1.81,
    F: 1.33
  };

  const latticeObj = initCanvas('lattice-canvas');
  const stabilityMapObj = initCanvas('stability-map-canvas');
  if (latticeObj) activeResizers.push(latticeObj.resize);
  if (stabilityMapObj) activeResizers.push(stabilityMapObj.resize);

  let currentStructureType = 'single';

  // Helper: Draw 3D-effect glossy spheres
  function drawGlossySphere(ctx, x, y, r, baseColor) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    const grad = ctx.createRadialGradient(
      x - r * 0.3, y - r * 0.3, r * 0.05,
      x, y, r
    );

    if (baseColor === 'cyan') {
      grad.addColorStop(0, '#e0f2fe');
      grad.addColorStop(0.2, '#0ea5e9');
      grad.addColorStop(0.8, '#0369a1');
      grad.addColorStop(1, '#0c4a6e');
    } else if (baseColor === 'gold') {
      grad.addColorStop(0, '#fef3c7');
      grad.addColorStop(0.25, '#d97706');
      grad.addColorStop(0.8, '#78350f');
      grad.addColorStop(1, '#451a03');
    } else if (baseColor === 'purple') {
      grad.addColorStop(0, '#fae8ff');
      grad.addColorStop(0.25, '#c084fc');
      grad.addColorStop(0.8, '#6b21a8');
      grad.addColorStop(1, '#4c1d95');
    } else if (baseColor === 'purple-A') {
      grad.addColorStop(0, '#ede9fe');
      grad.addColorStop(0.25, '#8b5cf6');
      grad.addColorStop(0.8, '#5b21b6');
      grad.addColorStop(1, '#3b0764');
    } else if (baseColor === 'gray') {
      grad.addColorStop(0, '#f8fafc');
      grad.addColorStop(0.25, '#64748b');
      grad.addColorStop(0.8, '#334155');
      grad.addColorStop(1, '#0f172a');
    } else {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, baseColor);
      grad.addColorStop(0.8, '#000000');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Helper: Draw metallic cylinders as bonds
  function drawGlossyBond(ctx, x1, y1, x2, y2, thickness = 5) {
    ctx.save();
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);

    const px = -Math.sin(angle) * (thickness / 2);
    const py = Math.cos(angle) * (thickness / 2);

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const grad = ctx.createLinearGradient(
      midX - px, midY - py,
      midX + px, midY + py
    );
    grad.addColorStop(0, '#e2e8f0');
    grad.addColorStop(0.3, '#ffffff');
    grad.addColorStop(0.7, '#cbd5e1');
    grad.addColorStop(1, '#94a3b8');

    ctx.strokeStyle = grad;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();
  }

  function calculateGoldschmidt() {
    const divB = document.getElementById('group-b-divalent');
    const divMono = document.getElementById('group-b-monovalent');
    const divTri = document.getElementById('group-b-trivalent');
    const divTetra = document.getElementById('group-b-tetravalent');

    if (currentStructureType === 'single') {
      if (divB) divB.style.display = 'flex';
      if (divMono) divMono.style.display = 'none';
      if (divTri) divTri.style.display = 'none';
      if (divTetra) divTetra.style.display = 'none';
    } else if (currentStructureType === 'double') {
      if (divB) divB.style.display = 'none';
      if (divMono) divMono.style.display = 'flex';
      if (divTri) divTri.style.display = 'flex';
      if (divTetra) divTetra.style.display = 'none';
    } else if (currentStructureType === 'vacancy') {
      if (divB) divB.style.display = 'none';
      if (divMono) divMono.style.display = 'none';
      if (divTri) divTri.style.display = 'none';
      if (divTetra) divTetra.style.display = 'flex';
    }

    const rA_id = document.getElementById('cation-a').value;
    const rX_id = document.getElementById('anion-x').value;

    const rA = IONIC_RADII[rA_id];
    const rX = IONIC_RADII[rX_id];

    let rB = 0;
    let rB_prime = 0;
    let rB_double_prime = 0;
    let t = 0;
    let mu = 0;

    if (currentStructureType === 'single') {
      const rB_id = document.getElementById('cation-b-divalent').value;
      rB = IONIC_RADII[rB_id];
      t = (rA + rX) / (Math.sqrt(2) * (rB + rX));
      mu = rB / rX;
      
      document.getElementById('goldschmidt-formula-display').innerHTML = '$$t = \\frac{r_A + r_X}{\\sqrt{2}(r_B + r_X)}$$';
    } else if (currentStructureType === 'double') {
      const rB_prime_id = document.getElementById('cation-b-monovalent').value;
      const rB_double_prime_id = document.getElementById('cation-b-trivalent').value;
      rB_prime = IONIC_RADII[rB_prime_id];
      rB_double_prime = IONIC_RADII[rB_double_prime_id];
      
      rB = (rB_prime + rB_double_prime) / 2;
      t = (rA + rX) / (Math.sqrt(2) * (rB + rX));
      mu = rB / rX;

      document.getElementById('goldschmidt-formula-display').innerHTML = '$$t = \\frac{r_A + r_X}{\\sqrt{2}(\\langle r_B \\rangle + r_X)}, \\quad \\langle r_B \\rangle = \\frac{r_{B\'} + r_{B\'\'}}{2}$$';
    } else if (currentStructureType === 'vacancy') {
      const rB_id = document.getElementById('cation-b-tetravalent').value;
      rB = IONIC_RADII[rB_id];
      t = (rA + rX) / (Math.sqrt(2) * (rB + rX));
      mu = rB / rX;

      document.getElementById('goldschmidt-formula-display').innerHTML = '$$t = \\frac{r_A + r_X}{\\sqrt{2}(r_B + r_X)} \\quad \\text{with vacancy } \\square$$';
    }

    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([document.getElementById('goldschmidt-formula-display')]).catch((err) => console.log(err));
    }

    let phase = 'Non-Perovskite';
    let badgeClass = 'phase-unstable';

    if (currentStructureType === 'vacancy') {
      if (t >= 0.85 && t <= 1.05) {
        phase = 'Cubic Antifluorite (Stable)';
        badgeClass = 'phase-stable';
      } else if (t >= 0.70 && t < 0.85) {
        phase = 'Tilted/Distorted Monoclinic';
        badgeClass = 'phase-distorted';
      } else {
        phase = 'Unstable defect phase';
        badgeClass = 'phase-unstable';
      }
    } else {
      if (t > 1.05) {
        phase = 'Hexagonal / Unstable';
        badgeClass = 'phase-unstable';
      } else if (t >= 0.90 && t <= 1.05) {
        phase = 'Cubic (Stable & Symm.)';
        badgeClass = 'phase-stable';
      } else if (t >= 0.75 && t < 0.90) {
        phase = 'Orthorhombic (Stable/Distorted)';
        badgeClass = 'phase-distorted';
      } else {
        phase = 'Non-Perovskite (Unstable)';
        badgeClass = 'phase-unstable';
      }
    }

    document.getElementById('t-factor-val').textContent = t.toFixed(3);
    document.getElementById('oct-factor-val').textContent = mu.toFixed(3);
    const badge = document.getElementById('predicted-phase-val');
    badge.textContent = phase;
    badge.className = `phase-badge ${badgeClass}`;

    drawLattice(t, rA, rB, rX, rB_prime, rB_double_prime);
    drawStabilityMap(mu, t);
  }

  function drawLattice(t, rA, rB, rX, rB_prime, rB_double_prime) {
    if (!latticeObj) return;
    const { ctx, width, height } = latticeObj;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    let tiltAngle = 0;
    if (t < 0.90) {
      tiltAngle = Math.min(18, (0.90 - t) * 60);
    }
    const rad = (tiltAngle * Math.PI) / 180;

    const scale = 50; 
    const rB_px = rB * scale * 0.45;
    const rX_px = rX * scale * 0.45;
    const rA_px = rA * scale * 0.45;

    const corners = [
      [22, 22], [width - 22, 22],
      [22, height - 22], [width - 22, height - 22]
    ];
    corners.forEach(([cx, cy]) => {
      drawGlossySphere(ctx, cx, cy, rA_px, 'purple-A');
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('A', cx, cy);
    });

    const gridSize = Math.min(width, height) * 0.32;
    const cellCoords = [
      [-gridSize/2, -gridSize/2], [gridSize/2, -gridSize/2],
      [-gridSize/2, gridSize/2], [gridSize/2, gridSize/2]
    ];

    cellCoords.forEach(([ox, oy], idx) => {
      const cx = centerX + ox;
      const cy = centerY + oy;
      
      const dir = (idx === 0 || idx === 3) ? 1 : -1;
      const currentRad = rad * dir;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(currentRad);

      if (currentStructureType === 'vacancy' && (idx === 1 || idx === 2)) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        
        ctx.beginPath();
        ctx.moveTo(-gridSize/2, 0); ctx.lineTo(gridSize/2, 0);
        ctx.moveTo(0, -gridSize/2); ctx.lineTo(0, gridSize/2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(0, 0, rB_px * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('□', 0, 0);
      } else {
        drawGlossyBond(ctx, -gridSize/2, 0, gridSize/2, 0, 5);
        drawGlossyBond(ctx, 0, -gridSize/2, 0, gridSize/2, 5);

        const xPositions = [
          [-gridSize/2, 0], [gridSize/2, 0],
          [0, -gridSize/2], [0, gridSize/2]
        ];
        xPositions.forEach(([xx, xy]) => {
          drawGlossySphere(ctx, xx, xy, rX_px, 'cyan');
        });

        if (currentStructureType === 'single') {
          drawGlossySphere(ctx, 0, 0, rB_px, 'gold');
        } else if (currentStructureType === 'double') {
          const isBPrime = (idx === 0 || idx === 3);
          const currentR = isBPrime ? (rB_prime * scale * 0.45) : (rB_double_prime * scale * 0.45);
          drawGlossySphere(ctx, 0, 0, currentR, isBPrime ? 'gold' : 'purple');
        } else if (currentStructureType === 'vacancy') {
          drawGlossySphere(ctx, 0, 0, rB_px, 'gray');
        }
      }

      ctx.restore();
    });

    if (t < 0.70 || t > 1.05) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(10, 10, width - 20, height - 20);
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('LATTICE UNSTABLE', centerX, height - 20);
    }
  }

  function drawStabilityMap(mu, t) {
    if (!stabilityMapObj) return;
    const { ctx, width, height } = stabilityMapObj;
    ctx.clearRect(0, 0, width, height);

    const mapX = (val) => ((val - 0.3) / 0.6) * width;
    const mapY = (val) => height - ((val - 0.6) / 0.6) * height;

    ctx.fillStyle = 'rgba(34, 197, 94, 0.12)'; 
    ctx.fillRect(mapX(0.41), mapY(1.05), mapX(0.75) - mapX(0.41), mapY(0.82) - mapY(1.05));
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX(0.41), mapY(1.05), mapX(0.75) - mapX(0.41), mapY(0.82) - mapY(1.05));

    ctx.fillStyle = '#64748b';
    ctx.font = '7px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Stable Zone', mapX(0.44), mapY(0.95));

    const cx = mapX(mu);
    const cy = mapY(t);

    const clampedCx = Math.max(5, Math.min(width - 5, cx));
    const clampedCy = Math.max(5, Math.min(height - 5, cy));

    ctx.strokeStyle = '#ef4444'; 
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(clampedCx - 6, clampedCy); ctx.lineTo(clampedCx + 6, clampedCy);
    ctx.moveTo(clampedCx, clampedCy - 6); ctx.lineTo(clampedCx, clampedCy + 6);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(clampedCx, clampedCy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Bind events for Goldschmidt type buttons
  const typeButtons = document.querySelectorAll('#perovskite-type-group button');
  typeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      typeButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentStructureType = e.target.getAttribute('data-type');
      calculateGoldschmidt();
    });
  });

  // Bind events for Goldschmidt selectors
  const idList = ['cation-a', 'cation-b-divalent', 'cation-b-monovalent', 'cation-b-trivalent', 'cation-b-tetravalent', 'anion-x'];
  idList.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', calculateGoldschmidt);
  });


  /* ──────────────────────────────────────────────────────────
     2. SPIN-SELECTIVE PEC SPLITTING SIMULATOR
     ────────────────────────────────────────────────────────── */
  const pecPartObj = initCanvas('pec-particles-canvas');
  const pecJvObj = initCanvas('pec-jv-canvas');
  if (pecPartObj) activeResizers.push(pecPartObj.resize);
  if (pecJvObj) activeResizers.push(pecJvObj.resize);

  let magneticField = 0;
  let chiralFilterActive = true;
  let pecParticles = [];
  let bubbleParticles = [];

  // Particle constructor
  function createCarrier(type, x, y) {
    // type: 'electron' (e-) or 'hole' (h+)
    // spin: 1 (Up) or -1 (Down)
    const spin = Math.random() > 0.5 ? 1 : -1;
    return {
      type,
      x,
      y,
      spin,
      vx: type === 'electron' ? -rnd(0.5, 1.2) : rnd(0.5, 1.2),
      vy: rnd(-0.5, 0.5),
      radius: type === 'electron' ? 4 : 5,
      alpha: 1.0
    };
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function loopPecParticles() {
    if (!pecPartObj) return;
    const { ctx, width, height } = pecPartObj;
    ctx.clearRect(0, 0, width, height);

    const boundaryX = width * 0.65; // Interface separating perovskite and electrolyte

    // Calculate spin alignment ratio based on Magnetic Field and Chiral filter
    // Saturates around 2500 G
    const alignmentRatio = chiralFilterActive ? (magneticField * magneticField) / (magneticField * magneticField + 600 * 600) : 0;
    
    // 1. Draw solid phases
    // Perovskite layer
    ctx.fillStyle = 'rgba(15, 23, 42, 0.05)';
    ctx.fillRect(0, 0, boundaryX, height);
    // Catalyst/Electrolyte layer
    ctx.fillStyle = 'rgba(14, 165, 233, 0.04)';
    ctx.fillRect(boundaryX, 0, width - boundaryX, height);

    // Border line
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.3)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(boundaryX, 0); ctx.lineTo(boundaryX, height);
    ctx.stroke();

    // Text labels
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px Inter';
    ctx.fillText('PEROVSKITE PHOTOANODE', 12, 18);
    ctx.fillText('AQUEOUS ELECTROLYTE', boundaryX + 10, 18);

    // 2. Generate carriers
    if (Math.random() < 0.12 && pecParticles.length < 35) {
      // Spawn pairs in bulk
      const sy = rnd(30, height - 30);
      pecParticles.push(createCarrier('electron', boundaryX * 0.4, sy));
      pecParticles.push(createCarrier('hole', boundaryX * 0.4, sy));
    }

    // 3. Process carriers
    for (let i = pecParticles.length - 1; i >= 0; i--) {
      const p = pecParticles[i];

      // Under magnetic field, align spins
      if (Math.random() < alignmentRatio * 0.1) {
        p.spin = 1; // Align to magnetic vector (spin Up)
      }

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Vertical bounce
      if (p.y < 10 || p.y > height - 10) p.vy = -p.vy;

      // Left boundary (electrons collection at back contact)
      if (p.x < 10) {
        pecParticles.splice(i, 1);
        continue;
      }

      // Recombination logic: Collide e- and h+ in Perovskite
      let recombined = false;
      if (p.type === 'hole') {
        for (let j = 0; j < pecParticles.length; j++) {
          const other = pecParticles[j];
          if (other.type === 'electron') {
            const dx = p.x - other.x;
            const dy = p.y - other.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 12) {
              // Spin check: Aligned spins CANNOT recombine easily (spin-forbidden)
              if (p.spin === other.spin && Math.random() < 0.85) {
                // Bounce away (suppressed recombination)
                p.vx = -p.vx;
                other.vx = -other.vx;
              } else {
                // Spin-allowed recombination
                // Draw collision flash
                ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 14, 0, Math.PI*2);
                ctx.fill();

                // Remove both
                pecParticles.splice(Math.max(i, j), 1);
                pecParticles.splice(Math.min(i, j), 1);
                recombined = true;
                break;
              }
            }
          }
        }
      }

      if (recombined) continue;

      // Interface reaction: holes crossing boundary to split water
      if (p.type === 'hole' && p.x >= boundaryX) {
        // Successful solar fuel reaction!
        // Spawn oxygen bubble
        if (Math.random() < 0.5) {
          bubbleParticles.push({
            x: p.x,
            y: p.y,
            vx: rnd(-0.2, 0.2),
            vy: rnd(-0.6, -1.5),
            radius: rnd(2, 5),
            alpha: 0.8
          });
        }
        pecParticles.splice(i, 1);
        continue;
      }

      // Draw carrier
      ctx.fillStyle = p.type === 'electron' ? 'rgba(239, 68, 68, 0.85)' : 'rgba(34, 197, 94, 0.85)'; // red e-, green h+
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw spin arrow overlay
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (p.spin === 1) {
        // Spin UP arrow
        ctx.moveTo(p.x, p.y + p.radius * 0.5);
        ctx.lineTo(p.x, p.y - p.radius * 0.5);
        ctx.lineTo(p.x - 2, p.y - p.radius * 0.1);
        ctx.moveTo(p.x, p.y - p.radius * 0.5);
        ctx.lineTo(p.x + 2, p.y - p.radius * 0.1);
      } else {
        // Spin DOWN arrow
        ctx.moveTo(p.x, p.y - p.radius * 0.5);
        ctx.lineTo(p.x, p.y + p.radius * 0.5);
        ctx.lineTo(p.x - 2, p.y + p.radius * 0.1);
        ctx.moveTo(p.x, p.y + p.radius * 0.5);
        ctx.lineTo(p.x + 2, p.y + p.radius * 0.1);
      }
      ctx.stroke();
    }

    // 4. Process bubbles (O2 evolution)
    for (let k = bubbleParticles.length - 1; k >= 0; k--) {
      const b = bubbleParticles[k];
      b.x += b.vx;
      b.y += b.vy;
      b.alpha -= 0.005;

      ctx.fillStyle = `rgba(14, 165, 233, ${b.alpha})`;
      ctx.strokeStyle = `rgba(2, 132, 199, ${b.alpha})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();

      if (b.y < 10 || b.alpha <= 0) {
        bubbleParticles.splice(k, 1);
      }
    }

    requestAnimationFrame(loopPecParticles);
  }

  // Draw JV characteristics curves dynamically
  function drawPecJv() {
    if (!pecJvObj) return;
    const { ctx, width, height } = pecJvObj;
    ctx.clearRect(0, 0, width, height);

    const padLeft = 40;
    const padRight = 20;
    const padTop = 15;
    const padBottom = 30;

    const graphW = width - padLeft - padRight;
    const graphH = height - padTop - padBottom;

    // Grid coordinates helper
    const getX = (v) => padLeft + ((v - 0.2) / 1.4) * graphW; // V from 0.2 to 1.6 V
    const getY = (j) => padBottom + graphH - (j / 18) * graphH; // J from 0 to 18 mA/cm2

    // 1. Draw axes and grids
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // vertical grid
    for (let v = 0.4; v <= 1.6; v += 0.3) {
      ctx.moveTo(getX(v), padTop);
      ctx.lineTo(getX(v), padTop + graphH);
    }
    // horizontal grid
    for (let j = 3; j <= 18; j += 3) {
      ctx.moveTo(padLeft, getY(j));
      ctx.lineTo(padLeft + graphW, getY(j));
    }
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '9px Inter';
    ctx.fillText('0.2', getX(0.2) - 8, padTop + graphH + 12);
    ctx.fillText('0.8', getX(0.8) - 8, padTop + graphH + 12);
    ctx.fillText('1.4', getX(1.4) - 8, padTop + graphH + 12);
    ctx.fillText('V (V vs RHE)', padLeft + graphW/2 - 25, padTop + graphH + 26);

    ctx.save();
    ctx.translate(12, padTop + graphH/2 + 20);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('J (mA/cm²)', 0, 0);
    ctx.restore();

    // 2. Base Curve (0 G)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let v = 0.2; v <= 1.6; v += 0.05) {
      const baseJ = 12 * (1 / (1 + Math.exp(-(v - 0.85) / 0.16)));
      if (v === 0.2) ctx.moveTo(getX(v), getY(baseJ));
      else ctx.lineTo(getX(v), getY(baseJ));
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Active Curve (with B field enhancement)
    const alignmentRatio = chiralFilterActive ? (magneticField * magneticField) / (magneticField * magneticField + 600 * 600) : 0;
    const jMultiplier = 1.0 + 0.16 * alignmentRatio;

    ctx.strokeStyle = '#0ea5e9'; // Cyan
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let v = 0.2; v <= 1.6; v += 0.05) {
      const activeJ = 12 * (1 / (1 + Math.exp(-(v - 0.85) / 0.16))) * jMultiplier;
      if (v === 0.2) ctx.moveTo(getX(v), getY(activeJ));
      else ctx.lineTo(getX(v), getY(activeJ));
    }
    ctx.stroke();

    // 4. Highlight operating point (V = 1.23 V for water splitting)
    const opV = 1.23;
    const opJ = 12 * (1 / (1 + Math.exp(-(opV - 0.85) / 0.16))) * jMultiplier;

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(getX(opV), getY(opJ), 5, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label value
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 9px Inter';
    ctx.fillText(`${opJ.toFixed(2)} mA/cm²`, getX(opV) + 8, getY(opJ) - 5);
  }

  // Update UI values for PEC
  function updatePecDashboard() {
    magneticField = parseInt(document.getElementById('magnetic-field-slider').value);
    document.getElementById('magnetic-field-val').textContent = magneticField;

    const alignmentRatio = chiralFilterActive ? (magneticField * magneticField) / (magneticField * magneticField + 600 * 600) : 0;
    const alignPercent = Math.round(alignmentRatio * 100);
    const lifeMult = 1.0 + 0.5 * alignmentRatio;
    const J_increase = 16 * alignmentRatio;

    document.getElementById('spin-align-percent').textContent = `${alignPercent}% Aligned`;
    document.getElementById('carrier-lifetime-val').textContent = `${lifeMult.toFixed(2)}x Extension`;
    document.getElementById('photocurrent-increase-val').textContent = `+${J_increase.toFixed(1)}%`;

    drawPecJv();
  }

  // Event handlers
  const pecSlider = document.getElementById('magnetic-field-slider');
  if (pecSlider) {
    pecSlider.addEventListener('input', updatePecDashboard);
  }

  const btnSpinOn = document.getElementById('btn-spin-on');
  const btnSpinOff = document.getElementById('btn-spin-off');

  if (btnSpinOn && btnSpinOff) {
    btnSpinOn.addEventListener('click', () => {
      chiralFilterActive = true;
      btnSpinOn.classList.add('active');
      btnSpinOff.classList.remove('active');
      updatePecDashboard();
    });
    btnSpinOff.addEventListener('click', () => {
      chiralFilterActive = false;
      btnSpinOff.classList.add('active');
      btnSpinOn.classList.remove('active');
      updatePecDashboard();
    });
  }


  /* ──────────────────────────────────────────────────────────
     3. BATTERY EIS DIAGNOSTICS & FORENSICS SIMULATOR
     ────────────────────────────────────────────────────────── */
  const nyquistObj = initCanvas('nyquist-canvas');
  const forensicsObj = initCanvas('forensics-canvas');
  if (nyquistObj) activeResizers.push(nyquistObj.resize);
  if (forensicsObj) activeResizers.push(forensicsObj.resize);

  let cycleCount = 0;
  let cellTemp = 25;

  function updateBatteryDashboard() {
    cycleCount = parseInt(document.getElementById('battery-cycles-slider').value);
    cellTemp = parseInt(document.getElementById('battery-temp-slider').value);

    document.getElementById('battery-cycles-val').textContent = cycleCount;
    document.getElementById('battery-temp-val').textContent = cellTemp;

    // Resistances:
    // Temperature effect uses Arrhenius form: lower temp = higher resistance
    const tempFact = Math.exp(1200 * (1 / (cellTemp + 273) - 1 / 298));

    const R_b = 5.0 + 0.002 * cycleCount + 2 * Math.max(1, tempFact - 0.5);
    const R_sei = (2.0 + 0.012 * cycleCount) * Math.min(2.5, Math.max(1, tempFact * 0.7));
    const R_ct = (10.0 + 0.025 * cycleCount) * tempFact;

    // SoH Calculation (Linear decay plus accelerating aging)
    const SoH = Math.max(0, 100 - (0.025 * cycleCount) - 0.000015 * cycleCount * cycleCount);
    
    // Update labels
    document.getElementById('r-bulk-val').textContent = `${R_b.toFixed(2)} Ω`;
    document.getElementById('r-sei-val').textContent = `${R_sei.toFixed(2)} Ω`;
    document.getElementById('r-ct-val').textContent = `${R_ct.toFixed(2)} Ω`;
    
    const sohVal = document.getElementById('soh-val');
    sohVal.textContent = `${SoH.toFixed(1)}%`;
    if (SoH > 80) {
      sohVal.style.color = 'var(--accent-green)';
    } else if (SoH > 60) {
      sohVal.style.color = 'var(--accent-yellow)';
    } else {
      sohVal.style.color = '#ef4444';
    }

    drawNyquist(R_b, R_sei, R_ct);
    drawForensics(cycleCount, SoH);
  }

  // Renders coordinate grids and double-semicircle plots
  function drawNyquist(R_b, R_sei, R_ct) {
    if (!nyquistObj) return;
    const { ctx, width, height } = nyquistObj;
    ctx.clearRect(0, 0, width, height);

    const padL = 35;
    const padR = 15;
    const padB = 25;
    const padT = 15;

    const plotW = width - padL - padR;
    const plotH = height - padB - padT;

    // Max real impedance is roughly Rb + Rsei + Rct + WarburgTail (capped at 120 ohms)
    const maxVal = 120; 

    const getX = (val) => padL + (val / maxVal) * plotW;
    const getY = (val) => padB + plotH - (val / (maxVal * 0.5)) * plotH;

    // 1. Draw grids
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 20; x < maxVal; x += 20) {
      ctx.moveTo(getX(x), padT);
      ctx.lineTo(getX(x), padT + plotH);
    }
    for (let y = 10; y < maxVal * 0.5; y += 10) {
      ctx.moveTo(padL, getY(y));
      ctx.lineTo(padL + plotW, getY(y));
    }
    ctx.stroke();

    // 2. Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH);
    ctx.moveTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    // Axis values
    ctx.fillStyle = '#64748b';
    ctx.font = '8px Inter';
    ctx.fillText('0', padL - 10, padT + plotH + 12);
    ctx.fillText('60', getX(60) - 5, padT + plotH + 12);
    ctx.fillText('120', getX(120) - 8, padT + plotH + 12);
    ctx.fillText("Z' (Real, Ω)", padL + plotW/2 - 25, padT + plotH + 20);

    ctx.save();
    ctx.translate(10, padT + plotH/2 + 20);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("-Z'' (Imag, Ω)", 0, 0);
    ctx.restore();

    // 3. Mathematical plot coordinates (Randles double semicircle)
    ctx.strokeStyle = '#059669'; // Green theme for battery
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    // Rb translation
    ctx.moveTo(getX(0), getY(0));
    ctx.lineTo(getX(R_b), getY(0));

    // Semi 1: SEI (Frequency sweep simulation)
    // Formula: Z_sei(w) = Rsei / (1 + j*w*C)
    // Graphically, a circle of diameter Rsei resting on X-axis from Rb to Rb+Rsei
    const c1_x = R_b + R_sei/2;
    const c1_r = R_sei/2;
    for (let theta = Math.PI; theta >= 0; theta -= 0.05) {
      const zx = c1_x + c1_r * Math.cos(theta);
      const zy = c1_r * Math.sin(theta);
      ctx.lineTo(getX(zx), getY(zy));
    }

    // Semi 2: Charge Transfer
    const c2_x = R_b + R_sei + R_ct/2;
    const c2_r = R_ct/2;
    for (let theta = Math.PI; theta >= 0; theta -= 0.05) {
      const zx = c2_x + c2_r * Math.cos(theta);
      const zy = c2_r * Math.sin(theta);
      ctx.lineTo(getX(zx), getY(zy));
    }

    // Warburg Tail: 45 degree diffusion tail at low frequency
    const tailStartX = R_b + R_sei + R_ct;
    ctx.lineTo(getX(tailStartX + 20), getY(20));

    ctx.stroke();

    // Label resistance intercepts
    ctx.fillStyle = '#059669';
    ctx.beginPath();
    ctx.arc(getX(R_b), getY(0), 4, 0, Math.PI*2);
    ctx.arc(getX(R_b + R_sei + R_ct), getY(0), 4, 0, Math.PI*2);
    ctx.fill();
  }

  // Draw battery particle forensics under degradation
  function drawForensics(cycles, SoH) {
    if (!forensicsObj) return;
    const { ctx, width, height } = forensicsObj;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    const baseRadius = Math.min(width, height) * 0.22;

    // SEI layer thickness based on cycle count (scales up)
    const seiThickness = 2.5 + (cycles / 1000) * 16; // 2px to 18px

    // 1. Draw graphite core (shrinks slightly as active lithium is lost)
    const coreRadius = baseRadius * (0.6 + 0.4 * (SoH / 100));

    // Core glow/gradient
    const coreGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, coreRadius);
    coreGrad.addColorStop(0, '#475569');
    coreGrad.addColorStop(1, '#0f172a');
    
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label Core
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 8px Inter';
    ctx.fillText('Active C', centerX - 18, centerY + 3);

    // 2. Draw SEI passivation layer around core
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)'; // Yellowish orange
    ctx.lineWidth = seiThickness;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius + seiThickness/2, 0, Math.PI*2);
    ctx.stroke();

    // 3. SEI Cracking visual overlay (when aged > 500 cycles)
    if (cycles > 450) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)'; // Red cracks
      ctx.lineWidth = 1.8;
      
      const numCracks = Math.floor((cycles - 400) / 100) + 1;
      for (let i = 0; i < numCracks; i++) {
        const angle = (i * Math.PI * 2) / numCracks;
        const x1 = centerX + coreRadius * Math.cos(angle);
        const y1 = centerY + coreRadius * Math.sin(angle);
        const x2 = centerX + (coreRadius + seiThickness + 6) * Math.cos(angle + 0.05);
        const y2 = centerY + (coreRadius + seiThickness + 6) * Math.sin(angle + 0.05);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo((x1+x2)/2 + rnd(-3, 3), (y1+y2)/2 + rnd(-3, 3));
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // 4. Lithium plating (metallic grey dots on the outer surface for low temp or extreme cycles)
    if (cellTemp < 10 || cycles > 700) {
      const platingCount = Math.floor((10 - cellTemp) * 2) + Math.floor(cycles / 120);
      ctx.fillStyle = '#94a3b8'; // Metallic grey
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.5;

      for (let i = 0; i < platingCount; i++) {
        const angle = rnd(0, Math.PI * 2);
        const rPlat = coreRadius + seiThickness + rnd(0.5, 4);
        const px = centerX + rPlat * Math.cos(angle);
        const py = centerY + rPlat * Math.sin(angle);

        ctx.beginPath();
        ctx.arc(px, py, rnd(1.5, 3), 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
      }
      
      // Text notice
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px Inter';
      ctx.fillText('LITHIUM PLATING DETECTED', centerX - 60, height - 12);
    }
  }

  // Event bindings for battery
  const batterySliders = ['battery-cycles-slider', 'battery-temp-slider'];
  batterySliders.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateBatteryDashboard);
  });


  /* ──────────────────────────────────────────────────────────
     4. PEROVSKITE BANDGAP ML PREDICTOR
     ────────────────────────────────────────────────────────── */
  const crystalObj = initCanvas('crystal-glow-canvas');
  if (crystalObj) activeResizers.push(crystalObj.resize);

  let compositionX = 0; // x from 0 to 1
  let crystalRot = 0;

  function updateBandgapDashboard() {
    compositionX = parseFloat(document.getElementById('composition-slider').value);
    document.getElementById('composition-val').textContent = compositionX.toFixed(2);
    document.getElementById('bi-fraction-val').textContent = (1 - compositionX).toFixed(2);

    // Vegard's law with bowing: Eg = 1.90*(1-x) + 4.00*x - 0.85*x*(1-x)
    const eg = 1.90 * (1 - compositionX) + 4.00 * compositionX - 0.85 * compositionX * (1 - compositionX);
    document.getElementById('pred-bandgap-val').textContent = `${eg.toFixed(2)} eV`;

    // peak PL wavelength: wl = 1239.8 / Eg
    const wl = 1239.8 / eg;
    document.getElementById('pred-wavelength-val').textContent = `${Math.round(wl)} nm`;

    // Octahedral tilt is proportional to local mismatch (highest in intermediate x compositions)
    const tilt = 18.0 * compositionX * (1 - compositionX);
    document.getElementById('oct-tilt-val').textContent = `${tilt.toFixed(1)}° (${tilt > 0.5 ? 'Tilted' : 'Cubic'})`;
  }

  // Wavelength to RGB color mapping for crystal photoluminescence glow
  function wlToRgb(wl) {
    if (wl >= 615) {
      // Red
      return { r: 239, g: 68, b: 68 };
    } else if (wl >= 575) {
      // Yellow-Orange
      const f = (wl - 575) / 40;
      return { r: 245, g: Math.round(158 * f + 100 * (1-f)), b: 11 };
    } else if (wl >= 495) {
      // Green
      const f = (wl - 495) / 80;
      return { r: Math.round(34 * (1-f)), g: Math.round(197 * f + 150 * (1-f)), b: Math.round(94 * f) };
    } else if (wl >= 400) {
      // Blue
      const f = (wl - 400) / 95;
      return { r: Math.round(99 * (1-f)), g: Math.round(102 * (1-f)), b: 241 };
    } else {
      // Near UV (Faint violet-white glow)
      return { r: 224, g: 231, b: 255 };
    }
  }

  function loopCrystal() {
    if (!crystalObj) return;
    const { ctx, width, height } = crystalObj;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    const eg = 1.90 * (1 - compositionX) + 4.00 * compositionX - 0.85 * compositionX * (1 - compositionX);
    const wl = 1239.8 / eg;
    const rgb = wlToRgb(wl);

    // Draw glowing environment (PL photoluminescence glow)
    // Pulsing alpha
    const time = Date.now() * 0.003;
    const glowIntensity = 0.35 + 0.15 * Math.sin(time);
    
    const glowRadius = Math.min(width, height) * 0.38;
    const radialGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, glowRadius);
    radialGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowIntensity})`);
    radialGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowIntensity * 0.35})`);
    radialGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

    ctx.fillStyle = radialGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, glowRadius, 0, Math.PI*2);
    ctx.fill();

    // Draw rotating 3D projected Octahedron representing the perovskite cage
    crystalRot += 0.012; // Rotate spin rate
    const size = Math.min(width, height) * 0.18;

    // Node 3D points
    const nodes = [
      { x: 0, y: -size, z: 0 }, // Top
      { x: 0, y: size, z: 0 },  // Bottom
      { x: -size, y: 0, z: -size }, // Front-Left
      { x: size, y: 0, z: -size },  // Front-Right
      { x: size, y: 0, z: size },   // Back-Right
      { x: -size, y: 0, z: size }   // Back-Left
    ];

    // Project nodes with rotation
    const cosR = Math.cos(crystalRot);
    const sinR = Math.sin(crystalRot);
    const cosPitch = Math.cos(0.4); // Constant camera pitch
    const sinPitch = Math.sin(0.4);

    const projected = nodes.map(n => {
      // Y-axis rotation
      let rx = n.x * cosR - n.z * sinR;
      let rz = n.x * sinR + n.z * cosR;
      let ry = n.y;

      // X-axis pitch rotation (3D perspective tilt)
      let finalY = ry * cosPitch - rz * sinPitch;
      let finalZ = ry * sinPitch + rz * cosPitch;
      let finalX = rx;

      // Simple perspective
      const scale = 1.0 / (1.0 + finalZ * 0.001);
      return {
        x: centerX + finalX * scale,
        y: centerY + finalY * scale,
        z: finalZ
      };
    });

    // Outer bonds mapping (faces of double octahedra)
    const faces = [
      [0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 2], // Top pyramid
      [1, 2, 3], [1, 3, 4], [1, 4, 5], [1, 5, 2]  // Bottom pyramid
    ];

    // Draw lines/bonds with depth sorting
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    faces.forEach(([i, j, k]) => {
      // Simple lighting based on normal projection
      const avgZ = (projected[i].z + projected[j].z + projected[k].z) / 3;
      
      // Face coloring (semi-translucent metallic overlay)
      const depthAlpha = 0.15 + (avgZ / size) * 0.05;
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${depthAlpha})`;
      
      ctx.beginPath();
      ctx.moveTo(projected[i].x, projected[i].y);
      ctx.lineTo(projected[j].x, projected[j].y);
      ctx.lineTo(projected[k].x, projected[k].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Draw atoms at vertices (Chlorides)
    ctx.fillStyle = '#10b981'; // Green halide atoms
    projected.forEach((p, idx) => {
      const atomSize = idx < 2 ? 8 : 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, atomSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#065f46';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw central cation core (In/Bi mixture center)
    ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    requestAnimationFrame(loopCrystal);
  }

  // Bind events for ML bandgap
  const compSlider = document.getElementById('composition-slider');
  if (compSlider) {
    compSlider.addEventListener('input', updateBandgapDashboard);
  }


  /* ──────────────────────────────────────────────────────────
     5. SIMULATORS INITIALIZATION WAKE-UP
     ────────────────────────────────────────────────────────── */
  
  // Goldschmidt init
  calculateGoldschmidt();

  // PEC init
  updatePecDashboard();
  loopPecParticles();

  // Battery init
  updateBatteryDashboard();

  // ML bandgap init
  updateBandgapDashboard();
  loopCrystal();
  
});

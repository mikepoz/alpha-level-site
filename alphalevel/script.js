
(function(){
  const W = 1180, H = 664;
  const outer = document.getElementById('alvPipelineOuter');
  const stage = document.getElementById('alvPipelineStage');
  const canvas = document.getElementById('alvPipelineCanvas');
  if (!outer || !stage || !canvas) return;

  const SPEED = 1, DENSITY = 1;
  let ctx, raf, last, tA = 0, tB = 0, redActive = false, redCd = 0;
  let parts = [], pulses = [];
  let pathA, pathB, redPath, gatesA, gatesB;

  function fit(){ stage.style.transform = 'scale(' + (outer.clientWidth / W) + ')'; }
  function initCanvas(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }
  function mkPath(pts){
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum[i] = cum[i-1] + Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]);
    return { pts, cum, total: cum[cum.length-1] };
  }
  function setupPaths(){
    const A = [[138,200],[210,200],[320,200],[435,200],[500,200],[500,335],[515,335],[655,335],[780,335],[885,335],[955,335]];
    const B = [[138,470],[210,470],[320,470],[435,470],[500,470],[500,335],[515,335],[655,335],[780,335],[885,335],[955,335]];
    pathA = mkPath(A); pathB = mkPath(B); redPath = mkPath([[1022,335],[1116,335]]);
    gatesA = { 1:{keep:0.06, kind:'noise'}, 6:{keep:0.5, kind:'dedup'} };
    gatesB = { 1:{keep:0.10, kind:'hunt'}, 6:{keep:0.5, kind:'dedup'} };
  }
  function posAt(path, d){
    const { pts, cum } = path;
    if (d <= 0) return [pts[0][0], pts[0][1], 0];
    for (let i = 1; i < pts.length; i++){
      if (d <= cum[i]){
        const seg = cum[i] - cum[i-1];
        const t = seg ? (d - cum[i-1]) / seg : 0;
        return [pts[i-1][0] + (pts[i][0]-pts[i-1][0])*t, pts[i-1][1] + (pts[i][1]-pts[i-1][1])*t, i];
      }
    }
    const L = pts.length - 1;
    return [pts[L][0], pts[L][1], L];
  }
  function spawn(stream){
    const path = stream === 'A' ? pathA : pathB;
    const base = stream === 'A' ? 165 : 145;
    parts.push({
      path, gates: stream === 'A' ? gatesA : gatesB, d: 0,
      jitter: Math.random()*16 - 8,
      speed: base * (0.85 + Math.random()*0.3),
      r: 2.3 + Math.random()*1.1,
      color: stream === 'A' ? '#3FC5EA' : '#5BD0F0',
      passed: {}, state: 'flow', alpha: 1, gold: false
    });
  }
  function spawnRed(){
    parts.push({ path: redPath, gates: {}, d: 0, jitter: 0, speed: 80, r: 4.4, color: '#FF4D4D', passed: {}, state: 'flow', alpha: 1, gold: false, red: true });
  }
  function update(dt){
    if (redCd > 0) redCd -= dt;
    const keep = [];
    for (const p of parts){
      if (p.state === 'flow'){
        p.d += p.speed * dt;
        for (const gi in p.gates){
          if (!p.passed[gi] && p.d >= p.path.cum[gi]){
            p.passed[gi] = true;
            const g = p.gates[gi];
            if (Math.random() > g.keep){
              p.state = 'die';
              p.dieX = p.path.pts[gi][0];
              p.dieY = p.path.pts[gi][1] + p.jitter*0.4;
              p.vx = Math.random()*18 - 9;
              p.vy = 18 + Math.random()*38;
              p.life = 0; p.maxLife = 0.5 + Math.random()*0.3;
              p.dieColor = '#3C5878';
              break;
            } else if (g.kind === 'hunt'){
              p.gold = true; p.color = '#F2A93B'; p.r = Math.max(p.r, 3.1);
            } else if (g.kind === 'dedup'){
              p.r = Math.max(p.r, 3.3); p.color = '#9CEBFF';
            }
          }
        }
        if (p.state === 'flow' && p.d >= p.path.total){
          if (p.red){
            pulses.push({ x: 1116, y: 335, rr: 34, a: 0.95, c: '255,77,77' });
            redActive = false; redCd = 0.9;
          } else {
            pulses.push({ x: 955, y: 335, rr: 72, a: 0.85, c: '156,235,255' });
            if (!redActive && redCd <= 0){ redActive = true; spawnRed(); }
          }
          continue;
        }
        if (p.state === 'flow') keep.push(p);
      } else {
        p.life += dt;
        p.dieX += p.vx*dt; p.dieY += p.vy*dt; p.vy += 55*dt;
        p.alpha = 1 - p.life/p.maxLife;
        if (p.life < p.maxLife) keep.push(p);
      }
    }
    parts = keep;
    for (const pu of pulses){ pu.rr += 115*dt; pu.a -= 1.25*dt; }
    pulses = pulses.filter(pu => pu.a > 0);
  }
  function hexA(hex, a){
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n>>16)&255) + ',' + ((n>>8)&255) + ',' + (n&255) + ',' + a + ')';
  }
  function roundRect(c, x, y, w, h, r){
    c.beginPath(); c.moveTo(x+r, y);
    c.arcTo(x+w, y, x+w, y+h, r); c.arcTo(x+w, y+h, x, y+h, r);
    c.arcTo(x, y+h, x, y, r); c.arcTo(x, y, x+w, y, r); c.closePath();
  }
  function chevron(c, x, y){
    const w = 22, h = 20;
    c.fillStyle = '#0E2438'; c.strokeStyle = 'rgba(63,197,234,0.5)'; c.lineWidth = 1.5;
    roundRect(c, x-w/2, y-h/2, w, h, 5); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x-3, y-5); c.lineTo(x+4, y); c.lineTo(x-3, y+5);
    c.strokeStyle = '#5BD0F0'; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke();
  }
  function drawConnectors(c){
    c.lineWidth = 2; c.strokeStyle = 'rgba(40,74,112,0.55)';
    for (const path of [pathA, pathB, redPath]){
      const pts = path.pts;
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.stroke();
    }
    for (const ch of [[170,200],[170,470],[478,335],[850,335],[1058,335]]) chevron(c, ch[0], ch[1]);
  }
  function draw(){
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    drawConnectors(ctx);
    for (const pu of pulses){
      ctx.beginPath(); ctx.arc(pu.x, pu.y, pu.rr, 0, 7);
      ctx.strokeStyle = 'rgba(' + pu.c + ',' + Math.max(0,pu.a) + ')';
      ctx.lineWidth = 2; ctx.stroke();
    }
    for (const p of parts){
      let x, y;
      if (p.state === 'flow'){ const pa = posAt(p.path, p.d); x = pa[0]; y = pa[1] + p.jitter; }
      else { x = p.dieX; y = p.dieY; }
      const a = p.state === 'die' ? Math.max(0, p.alpha) : 1;
      const col = p.state === 'die' ? p.dieColor : p.color;
      ctx.beginPath(); ctx.arc(x, y, p.r*2.6, 0, 7);
      ctx.fillStyle = hexA(col, 0.13*a); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, 7);
      ctx.fillStyle = hexA(col, a); ctx.fill();
    }
  }
  function loop(now){
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    tA += dt*1000*SPEED*DENSITY; tB += dt*1000*SPEED*DENSITY;
    const iaA = 48, iaB = 108;
    while (tA >= iaA){ tA -= iaA; spawn('A'); }
    while (tB >= iaB){ tB -= iaB; spawn('B'); }
    update(dt*SPEED); draw();
    raf = requestAnimationFrame(loop);
  }
  function start(){
    setupPaths(); fit();
    new ResizeObserver(fit).observe(outer);
    initCanvas();
    last = performance.now();
    for (let i = 0; i < 60; i++){ spawn('A'); spawn(i % 2 ? 'B' : 'A'); update(0.05); }
    raf = requestAnimationFrame(loop);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();

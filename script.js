/* ===== CONFIGURAÇÃO (edite aqui) ===== */
const CFG = {
  detectDist: 110,        // distância (px) para o NÃO fugir
  confettiCount: 160,
  typeSpeed: 35,          // ms por letra
  walkSpeed: 0.6,         // velocidade dos personagens (px/frame)
  pauseWin: 3500,         // ms da tela de vitória antes da cutscene
  loadingMs: 2200,
  noMessages: ['ERRO!','QUASE!','TENTE NOVAMENTE!','OPÇÃO INDISPONÍVEL!','NÃO TÃO FÁCIL!'],
  q1: 'TENHO UMA PERGUNTA PARA VOCÊ.',
  q2: 'VOCÊ ACEITA IR À MISSA COMIGO?',
  npc: 'DA PRIMEIRA VEZ VOCÊ CONSEGUIU ESCAPAR, MAS VÊ SE CONSEGUE CLICAR NO NÃO KKKK',
  // Cores dos personagens (ajuste conforme as fotos de referência)
  male:   {skin:'#e0a878', hair:'#2b1b12', beard:true,  shirt:'#2f5fd0', pants:'#222a44'},
  female: {skin:'#e8b890', hair:'#4a2a18', beard:false, shirt:'#f2f4fa', pants:'#8a5a9a', longHair:true}
};
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
let soundOn = true, ctx = null, won = false;

/* ===== SOM 8-BIT (só após interação) ===== */
function beep(f = 440, d = 0.08, type = 'square', vol = 0.05) {
  if (!soundOn) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = vol;
    o.connect(g); g.connect(ctx.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d); o.stop(ctx.currentTime + d);
  } catch (e) {}
}
const jingle = () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, .15), i * 140));

/* ===== DIGITAÇÃO ===== */
function typeText(el, text, done) {
  el.textContent = ''; let i = 0;
  const t = setInterval(() => {
    el.textContent += text[i++]; if (i % 2) beep(300, .02, 'square', .02);
    if (i >= text.length) { clearInterval(t); done && done(); }
  }, CFG.typeSpeed);
}

/* ===== INÍCIO E ABAS ===== */
$('#btnStart').onclick = () => {
  beep(660); $('#start').hidden = true; $('#game').hidden = false; showTab('missao');
};
function showTab(id) {
  $$('.tab').forEach(t => t.classList.toggle('on', t.id === id));
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === id));
  $('#nav').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false');
  if (id !== 'missao') $('#btnNo').style.visibility = 'hidden'; else $('#btnNo').style.visibility = '';
  if (id === 'missao') askQuestion();
  if (id === 'detalhe') typeText($('#npc'), CFG.npc);
  beep(520, .05);
}
$$('[data-tab]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
$('#burger').onclick = () => {
  const o = $('#nav').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o);
};
$('#optCrt').onclick = e => { const on = document.body.classList.toggle('crt'); e.target.textContent = 'CRT: ' + (on ? 'ON' : 'OFF'); };
$('#optSnd').onclick = e => { soundOn = !soundOn; e.target.textContent = 'SOUND: ' + (soundOn ? 'ON' : 'OFF'); };

let asked = false;
function askQuestion() {
  if (asked) return; asked = true;
  typeText($('#q1'), CFG.q1, () => setTimeout(() => {
    $('#q2box').style.visibility = 'visible'; typeText($('#q2'), CFG.q2);
  }, 500));
}

/* ===== BOTÕES SIM: reagem ao mouse, sempre clicáveis ===== */
$$('.sim').forEach(b => {
  b.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    b.style.transform = `translate(${(Math.random() * 12 - 6) | 0}px,-4px)`;
    setTimeout(() => b.style.transform = '', 160);
  });
  b.addEventListener('click', victory);
});

/* ===== BOTÃO NÃO: foge e nunca é clicado ===== */
const no = $('#btnNo');
let lastFlee = 0;
function flee() {
  const now = Date.now(); if (now - lastFlee < 150) return; lastFlee = now;
  const w = no.offsetWidth, h = no.offsetHeight, pad = 8;
  const avoid = [...$$('.sim'), $('#nav'), $('.hud'), $('#burger')].map(e => e.getBoundingClientRect());
  const top0 = $('header').getBoundingClientRect().bottom + pad;
  no.classList.add('fled');
  let best = null;
  for (let i = 0; i < 40; i++) {
    const x = pad + Math.random() * (innerWidth - w - 2 * pad);
    const y = top0 + Math.random() * Math.max(1, innerHeight - h - top0 - pad);
    const clear = avoid.every(r => x + w < r.left || x > r.right || y + h < r.top || y > r.bottom);
    if (clear) { best = [x, y]; break; }
    best = best || [x, y];
  }
  no.style.left = best[0] + 'px'; no.style.top = best[1] + 'px';
  beep(180, .1, 'sawtooth');
  $('#msg').textContent = CFG.noMessages[Math.random() * CFG.noMessages.length | 0];
}
document.addEventListener('pointermove', e => {
  if (!$('#missao').classList.contains('on') || e.pointerType === 'touch') return;
  const r = no.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  if (Math.hypot(e.clientX - cx, e.clientY - cy) < CFG.detectDist + r.width / 3) flee();
});
['pointerdown', 'touchstart', 'mousedown'].forEach(ev =>
  no.addEventListener(ev, e => { e.preventDefault(); flee(); }, { passive: false }));
no.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); flee(); });
addEventListener('resize', () => { if (no.classList.contains('fled')) flee(); });

/* ===== VITÓRIA ===== */
const fx = $('#fx'), fctx = fx.getContext('2d'); let parts = [], fxOn = false;
function sizeFx() { fx.width = innerWidth; fx.height = innerHeight; }
addEventListener('resize', sizeFx); sizeFx();
function burst(x, y) {
  const c = ['#f5c518', '#3ddc57', '#2f5fd0', '#f2f4fa'][Math.random() * 4 | 0];
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * 6.28, s = 1 + Math.random() * 4;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 60, c });
  }
  beep(120 + Math.random() * 100, .2, 'sawtooth');
}
function loopFx() {
  fctx.clearRect(0, 0, fx.width, fx.height);
  parts = parts.filter(p => p.life > 0);
  parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .06; p.life--; fctx.fillStyle = p.c; fctx.fillRect(p.x | 0, p.y | 0, 4, 4); });
  if (fxOn || parts.length) requestAnimationFrame(loopFx);
}
function victory() {
  if (won) return; won = true;
  $('#status').textContent = 'MISSION COMPLETE'; $('#score').textContent = '999999';
  $('#flash').classList.add('on'); jingle();
  confetti({ particleCount: CFG.confettiCount, spread: 90, origin: { y: .6 }, shapes: ['square'], colors: ['#f5c518', '#3ddc57', '#2f5fd0', '#f2f4fa'] });
  fxOn = true; loopFx();
  const iv = setInterval(() => burst(innerWidth * (.15 + Math.random() * .7), innerHeight * (.15 + Math.random() * .4)), 450);
  $('#win').hidden = false; $('#winT').textContent = 'MISSION COMPLETE!';
  $('#winS').innerHTML = 'SCORE: 999999<br>BONUS +1000<br>STAGE CLEAR!';
  setTimeout(() => { $('#winT').textContent = 'YOU WIN!'; }, 1600);
  setTimeout(() => { clearInterval(iv); fxOn = false; startCut(); }, CFG.pauseWin);
}

/* ===== CUTSCENE ===== */
function startCut() {
  $('#win').hidden = true; $('#game').hidden = true; $('#cut').hidden = false;
  $('#loading').hidden = false; $('#scene').style.display = 'none';
  setTimeout(() => { $('#loading').hidden = true; $('#scene').style.display = 'block'; runScene(); }, CFG.loadingMs);
}
function runScene() {
  const cv = $('#scene'), g = cv.getContext('2d'), W = 420;
  let f = 0, man = 10, wom = 400, door = 0, hidden = false, phase = 1, said = false;
  const DOORX = 340, MEET = 160;
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w, h); };
  function person(x, y, s, fr, alpha) {
    g.globalAlpha = alpha; const b = fr % 2;
    R(x - 1, y + 21, 10, 2, 'rgba(0,0,0,.35)');                      // sombra
    if (s.longHair) R(x - 1, y - 1, 10, 14, s.hair);
    R(x, y, 8, 8, s.skin); R(x, y - 1, 8, 3, s.hair);                // cabeça + cabelo
    if (s.beard) R(x, y + 5, 8, 3, s.hair);
    R(x + 1, y + 3, 1, 1, '#000'); R(x + 5, y + 3, 1, 1, '#000');
    R(x, y + 8, 8, 8, s.shirt); R(x - 2, y + 8 + b * 2, 2, 6, s.shirt); R(x + 8, y + 10 - b * 2, 2, 6, s.shirt);
    R(x + (b ? 0 : 1), y + 16, 3, 5, s.pants); R(x + (b ? 5 : 4), y + 16, 3, 5, s.pants);
    g.globalAlpha = 1;
  }
  function church() {
    for (let y = 70; y < 150; y += 10) for (let x = 300; x < 400; x += 10) {          // blocos
      R(x, y, 10, 10, (x + y) % 20 ? '#8a93a6' : '#a7afc0'); R(x + 2, y, 2, 2, '#d5dae6');  // pinos
    }
    for (let y = 30; y < 70; y += 10) for (let x = 300; x < 330; x += 10) { R(x, y, 10, 10, '#a7afc0'); R(x + 2, y, 2, 2, '#d5dae6'); }
    R(311, 6, 4, 22, '#f5c518'); R(305, 12, 16, 4, '#f5c518');                       // cruz
    R(340, 85, 10, 14, '#f5c518'); R(370, 85, 10, 14, '#f5c518'); R(310, 45, 10, 10, '#f5c518');
    R(DOORX - 4, 112, 20, 38, '#2b1b12');                                           // porta
    if (door > 0) R(DOORX - 4, 112, 20, 38, '#f5c518');                              // luz de dentro
    R(DOORX - 4, 112, 20 * (1 - door), 38, '#5a3a22');                               // folha da porta
  }
  function draw() {
    const cam = Math.max(0, Math.min(W - 320, (man + wom) / 2 - 140));
    R(0, 0, 320, 180, '#0d1b3a');
    for (let i = 0; i < 20; i++) R((i * 53) % 320, (i * 29) % 70, 2, 2, '#f2f4fa');   // estrelas
    g.save(); g.translate(-cam | 0, 0);
    R(0, 150, W, 30, '#1f6b2f'); R(0, 150, W, 4, '#3ddc57');
    for (let x = 0; x < W; x += 30) R(x + 20, 120, 12, 30, '#16233f');                // prédios
    church();
    const walking = phase < 4, fr = f / 8 | 0;
    person(man, 129, CFG.male, walking ? fr : 0, hidden ? 0 : 1);
    person(wom, 129, CFG.female, walking ? fr + 1 : 0, hidden ? 0 : 1);
    if (walking && f % 12 < 2) { R(man - 3, 148, 3, 2, '#c9b38a'); R(wom + 10, 148, 3, 2, '#c9b38a'); } // poeira
    g.restore();
  }
  function step() {
    f++; const v = CFG.walkSpeed;
    if (phase === 1) { man += v; wom -= v; if (f % 16 === 0) beep(90, .03, 'square', .03); if (wom - man < 24) phase = 2; }
    else if (phase === 2) { man += v; wom += v; if (f % 16 === 0) beep(90, .03, 'square', .03); if (wom > DOORX - 20) { phase = 3; } }
    else if (phase === 3) {
      door = Math.min(1, door + .02); if (door === 1) beep(200, .2, 'triangle');
      if (door >= 1) { man += v; wom += v; if (man > DOORX + 4) { hidden = true; phase = 4; setTimeout(() => phase = 5, 600); } }
    } else if (phase === 5) {
      door = Math.max(0, door - .015);
      if (door <= 0 && !said) { said = true; beep(110, .3, 'triangle'); ending(); }
    }
  }
  function loop() { step(); draw(); if (!said || f < 1e5) requestAnimationFrame(loop); }
  loop();
  function ending() {
    $('#cutT').textContent = 'NEXT MISSION:\nMISSA'; jingle();
    setTimeout(() => { $('#cutT').textContent = 'SEE YOU THERE.'; }, 2500);
  }
}

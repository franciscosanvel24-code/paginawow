const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Entrada de elementos al hacer scroll */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.14 });
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

/* Formulario */
const form = document.getElementById('contactForm');
const note = document.getElementById('formNote');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    note.textContent = 'Revisa los campos indicados para continuar.';
    return;
  }
  note.textContent = 'Tus datos están completos. El envío se habilitará cuando conectemos el formulario con el canal de contacto de WOW Marketing.';
});

/* Isotipo que rebota entre las paredes del recuadro de contacto */
(() => {
  const box = document.getElementById('bounceBox');
  const iso = document.getElementById('bounceIso');
  if (!box || !iso) return;
  const colors = ['assets/wow-isotipo-trazo.png', 'assets/wow-iso-amarillo.png', 'assets/wow-iso-blanco.png'];
  let colorIndex = 0;
  let x = 40, y = 40, vx = 1.6, vy = 1.25, rot = -12, running = false, last = 0;

  const bounceColor = () => {
    colorIndex = (colorIndex + 1) % colors.length;
    iso.src = colors[colorIndex];
  };

  const step = (t) => {
    if (!running) return;
    const dt = last ? Math.min((t - last) / 16.67, 3) : 1;
    last = t;
    const maxX = box.clientWidth - iso.offsetWidth;
    const maxY = box.clientHeight - iso.offsetHeight;
    x += vx * dt; y += vy * dt; rot += 0.15 * dt;
    if (x <= 0 || x >= maxX) { vx *= -1; x = Math.max(0, Math.min(x, maxX)); bounceColor(); }
    if (y <= 0 || y >= maxY) { vy *= -1; y = Math.max(0, Math.min(y, maxY)); bounceColor(); }
    iso.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
    requestAnimationFrame(step);
  };

  if (reduceMotion) {
    iso.style.transform = 'translate(24px, 24px) rotate(-12deg)';
    return;
  }
  /* Solo se anima cuando el recuadro está en pantalla */
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) { running = true; last = 0; requestAnimationFrame(step); }
    else if (!entry.isIntersecting) running = false;
  }).observe(box);
})();

/* Tarjetas de Co-Founders: inclinación 3D y brillo que siguen al cursor */
document.querySelectorAll('[data-tilt]').forEach((card) => {
  const inner = card.querySelector('.founder-inner');
  const reset = () => {
    card.classList.remove('is-active');
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  };
  if (reduceMotion) return;
  card.addEventListener('pointermove', (e) => {
    const r = inner.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    card.classList.add('is-active');
    card.style.setProperty('--ry', `${(px - 0.5) * 18}deg`);
    card.style.setProperty('--rx', `${(0.5 - py) * 14}deg`);
    card.style.setProperty('--gx', `${px * 100}%`);
    card.style.setProperty('--gy', `${py * 100}%`);
  });
  card.addEventListener('pointerleave', reset);
  card.addEventListener('pointercancel', reset);
});

/* Co-Founders: cuando data-url tenga la página de trabajo, la tarjeta se vuelve enlace */
document.querySelectorAll('.founder[data-url]').forEach((card) => {
  const url = card.dataset.url.trim();
  if (!url) return;
  const cta = card.querySelector('.founder-cta');
  const name = card.querySelector('h3').textContent;
  const link = document.createElement('a');
  link.className = 'founder-cta';
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Ver su trabajo ↗';
  link.setAttribute('aria-label', `Ver el trabajo de ${name} (se abre en otra pestaña)`);
  cta.replaceWith(link);
  card.classList.add('has-url');
  card.addEventListener('click', (e) => { if (!e.target.closest('a')) window.open(url, '_blank', 'noopener'); });
});

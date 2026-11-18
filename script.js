const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Entrada de elementos al hacer scroll */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.14 });
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

/* El menú adopta el tono opuesto a la sección que pasa por debajo. */
const siteNav = document.querySelector('.nav');
const navSections = [...document.querySelectorAll('main section, footer')];
let navFrame = 0;
const updateNavTone = () => {
  navFrame = 0;
  const probeY = (siteNav?.offsetHeight || 84) + 2;
  const activeSection = navSections.find((section) => {
    const rect = section.getBoundingClientRect();
    return rect.top <= probeY && rect.bottom > probeY;
  });
  siteNav?.classList.toggle('nav-inverted', activeSection?.dataset.navTone === 'color');
};
const requestNavTone = () => {
  if (navFrame) return;
  navFrame = requestAnimationFrame(updateNavTone);
};
updateNavTone();
window.addEventListener('scroll', requestNavTone, { passive: true });
window.addEventListener('resize', requestNavTone);

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

/* Motor de rebote: mueve elementos dentro de su contenedor y los hace rebotar en sus paredes.
   overflow = cuánto puede salirse cada elemento del borde (0 = rebota justo en la pared). */
function makeBouncer(container, items, { overflow = 0, padY = null, speed = 1, onBounce } = {}) {
  const state = items.map((el, n) => {
    const angle = (n * 2.39996) + 0.6;          // direcciones distintas para cada elemento
    const v = (0.9 + (n % 3) * 0.35) * speed;
    return { el, x: el.offsetLeft, y: el.offsetTop, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, rot: -12 };
  });
  state.forEach((s) => { s.el.style.left = '0'; s.el.style.top = '0'; s.el.style.right = 'auto'; s.el.style.bottom = 'auto'; });
  let running = false, last = 0;
  const step = (t) => {
    if (!running) return;
    const dt = last ? Math.min((t - last) / 16.67, 3) : 1;
    last = t;
    const W = container.clientWidth, H = container.clientHeight;
    state.forEach((s) => {
      const w = s.el.offsetWidth, h = s.el.offsetHeight;
      const minX = -w * overflow, maxX = W - w * (1 - overflow);
      /* padY: margen vertical para que una luz nunca toque el borde superior o inferior (evita líneas de corte) */
      const minY = padY === null ? -h * overflow : padY;
      const maxY = padY === null ? H - h * (1 - overflow) : Math.max(padY, H - h - padY);
      s.x += s.vx * dt; s.y += s.vy * dt;
      let hit = false;
      if (s.x <= minX || s.x >= maxX) { s.vx *= -1; s.x = Math.max(minX, Math.min(s.x, maxX)); hit = true; }
      if (s.y <= minY || s.y >= maxY) { s.vy *= -1; s.y = Math.max(minY, Math.min(s.y, maxY)); hit = true; }
      if (hit && onBounce) onBounce(s);
      if (onBounce) { s.rot += 0.15 * dt; s.el.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.rot}deg)`; }
      else s.el.style.transform = `translate(${s.x}px, ${s.y}px)`;
    });
    requestAnimationFrame(step);
  };
  /* Solo se anima mientras el contenedor está en pantalla */
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) { running = true; last = 0; requestAnimationFrame(step); }
    else if (!entry.isIntersecting) running = false;
  }).observe(container);
}

if (!reduceMotion) {
  /* Luces del fondo: rebotan entre las paredes de cada sección */
  /* Luces del fondo: se mueven a una capa común sobre los fondos de las secciones y
     rebotan dentro de su sección y la mitad de las vecinas, así cruzan cada salto de página. */
  const main = document.querySelector('main');
  const layer = document.createElement('div');
  layer.className = 'capa-luces';
  layer.setAttribute('aria-hidden', 'true');
  main.prepend(layer);
  const lights = [...main.querySelectorAll('.blob, .luz')].filter((el) => !el.closest('.capa-luces'));
  const state = lights.map((el, n) => {
    const origin = el.closest('.zona-luces') || el.closest('section');
    const r = el.getBoundingClientRect(), m = main.getBoundingClientRect();
    const angle = n * 2.39996 + 0.6, v = 0.9 + (n % 3) * 0.35;
    layer.appendChild(el);
    return { el, origin, x: r.left - m.left, y: r.top - m.top, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v };
  });
  let bounds = [];
  const measure = () => {
    const mTop = main.getBoundingClientRect().top;
    bounds = state.map((s) => {
      const o = s.origin.getBoundingClientRect();
      const prev = s.origin.previousElementSibling, next = s.origin.nextElementSibling;
      const reachUp = prev && prev.getBoundingClientRect ? Math.min(prev.getBoundingClientRect().height * 0.5, 420) : 0;
      const reachDown = next && next.getBoundingClientRect ? Math.min(next.getBoundingClientRect().height * 0.5, 420) : 0;
      return { top: o.top - mTop - reachUp, bottom: o.bottom - mTop + reachDown };
    });
  };
  measure();
  /* posición inicial de cada luz (antes de animarse) para que ninguna se quede arriba a la izquierda */
  state.forEach((s) => { s.el.style.transform = `translate(${s.x}px, ${s.y}px)`; });
  window.addEventListener('resize', measure);
  let last = 0;
  const tick = (t) => {
    const dt = last ? Math.min((t - last) / 16.67, 3) : 1;
    last = t;
    const W = main.clientWidth, H = main.clientHeight;
    const viewTop = window.scrollY - main.offsetTop - 600, viewBottom = viewTop + window.innerHeight + 1200;
    state.forEach((s, i) => {
      const b = bounds[i];
      if (b.bottom < viewTop || b.top > viewBottom) return;   // fuera de pantalla: no se calcula
      const w = s.el.offsetWidth, h = s.el.offsetHeight;
      const minX = -w * 0.45, maxX = W - w * 0.55;
      const minY = Math.max(-h * 0.3, b.top), maxY = Math.min(H - h * 0.7, b.bottom - h);
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.x <= minX || s.x >= maxX) { s.vx *= -1; s.x = Math.max(minX, Math.min(s.x, maxX)); }
      if (s.y <= minY || s.y >= maxY) { s.vy *= -1; s.y = Math.max(minY, Math.min(s.y, maxY)); }
      s.el.style.transform = `translate(${s.x}px, ${s.y}px)`;
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  /* Caras WOW en el recuadro de contacto: rebotan y cambian de color en cada choque */
  const box = document.getElementById('bounceBox');
  if (box) {
    const colors = ['assets/wow-isotipo.svg', 'assets/wow-isotipo-amarillo.svg', 'assets/wow-isotipo-blanco.svg'];
    colors.forEach((src) => { const pre = new Image(); pre.src = src; });
    const faces = [...box.querySelectorAll('.bounce-iso')];
    faces.forEach((f, n) => { f.style.left = `${10 + n * 17}%`; f.style.top = `${8 + (n * 23) % 70}%`; });
    makeBouncer(box, faces, {
      speed: 1.5,
      onBounce: (s) => {
        const next = (colors.indexOf(s.el.getAttribute('src')) + 1) % colors.length;
        s.el.src = colors[next];
      },
    });
  }
} else {
  document.querySelectorAll('.bounce-iso').forEach((f, n) => { f.style.transform = `translate(${24 + n * 60}px, ${24 + n * 40}px) rotate(-12deg)`; });
}

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

/* Redes de clientes: un botón con data-url vacío se muestra como pendiente; con URL se activa */
document.querySelectorAll('.social-link[data-url]').forEach((link) => {
  const url = link.dataset.url.trim();
  if (url) { link.href = url; link.classList.remove('social-pending'); }
  else { link.setAttribute('aria-disabled', 'true'); link.title = 'Enlace próximamente'; }
});

/* Redes de WOW: quedan listas para activarse al pegar las URLs reales en data-url. */
document.querySelectorAll('.footer-social[data-url]').forEach((link) => {
  const url = link.dataset.url.trim();
  if (url) {
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.classList.remove('is-pending');
    link.removeAttribute('aria-disabled');
    link.removeAttribute('title');
  } else {
    link.addEventListener('click', (event) => event.preventDefault());
  }
});

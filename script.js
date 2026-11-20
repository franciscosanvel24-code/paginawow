const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Entrada de elementos al hacer scroll */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.14 });
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

/* Menú móvil accesible */
const header = document.querySelector('[data-header]') || document.querySelector('.nav');
const menuToggle = document.querySelector('.menu-toggle');
const closeMenu = () => {
  header?.classList.remove('menu-active');
  document.body.classList.remove('menu-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', 'Abrir menú');
};
menuToggle?.addEventListener('click', () => {
  const open = !header.classList.contains('menu-active');
  header.classList.toggle('menu-active', open);
  document.body.classList.toggle('menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
});
header?.querySelectorAll('a[href*="#"]').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('resize', () => { if (window.innerWidth > 1120) closeMenu(); });

/* Formulario preparado: valida, filtra spam y no simula un envío sin destino */
const form = document.getElementById('contactForm');
const note = document.getElementById('formNote');
let validating = false;
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (validating) return;
  const honeypot = form.elements.website;
  if (honeypot && honeypot.value) return;
  if (!form.checkValidity()) {
    form.reportValidity();
    note.textContent = 'Revisa los campos indicados para continuar.';
    return;
  }
  validating = true;
  note.textContent = 'El formulario está listo. El envío se activará cuando definamos el correo o CRM de destino.';
  window.setTimeout(() => { validating = false; }, 1800);
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
  if (main) {
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
  }

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

/* ---------- Avance por secciones (un giro de rueda = siguiente apartado) ----------
   Cada apartado se centra en el espacio visible bajo el menú, según el tamaño de la pantalla.
   Si un apartado no cabe, se alinea arriba, se recorre normal y al terminar salta al siguiente. */
(() => {
  const desktop = window.matchMedia('(pointer: fine) and (min-width: 901px)');
  if (reduceMotion) return;
  const sections = [...document.querySelectorAll('main > section, main > .zona-luces > section, footer')];
  const navH = () => (document.querySelector('.nav')?.offsetHeight || 0);
  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
  const clamp = (v) => Math.max(0, Math.min(maxScroll(), Math.round(v)));
  /* Límites reales del contenido visible de cada apartado (sin luces ni marcas de agua) */
  const contentBox = (sec) => {
    const kids = [...sec.children].filter((el) => !el.matches('.blob, .luz, .marca-agua, [hidden], .ticker') && el.offsetHeight > 0);
    if (!kids.length) { const r = sec.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }
    let top = Infinity, bottom = -Infinity;
    kids.forEach((k) => { const r = k.getBoundingClientRect(); top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom); });
    return { top, bottom };
  };
  let stops = [];
  const measure = () => {
    const vh = window.innerHeight, nh = navH(), area = vh - nh, gap = 28;
    stops = sections.map((sec, i) => {
      if (i === 0) return { sec, start: 0, end: 0 };
      const b = contentBox(sec), top = b.top + window.scrollY, bottom = b.bottom + window.scrollY, h = bottom - top;
      if (h <= area - 8) {
        const y = clamp(top - nh - (area - h) / 2);          // centrado en el espacio bajo el menú
        return { sec, start: y, end: y };
      }
      const start = clamp(top - nh - gap), end = clamp(bottom + gap - vh);   // no cabe: arriba y luego recorrido
      return { sec, start, end: Math.max(start, end) };
    });
  };
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  new ResizeObserver(() => measure()).observe(document.body);

  /* Indicador de puntos a la derecha */
  const dots = document.createElement('nav');
  dots.className = 'snap-dots';
  dots.setAttribute('aria-label', 'Apartados de la página');
  sections.forEach((sec, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    const label = sec.dataset.escena || sec.querySelector('h1, h2')?.textContent.trim().slice(0, 40) || `Apartado ${i + 1}`;
    b.dataset.nombre = label;
    b.setAttribute('aria-label', label);
    b.title = label;
    b.addEventListener('click', () => goTo(stops[i].start));
    dots.appendChild(b);
  });
  document.body.appendChild(dots);

  let locked = false, acc = 0, accTimer;
  const goTo = (y) => {
    locked = true;
    window.scrollTo({ top: clamp(y), behavior: 'smooth' });
    window.setTimeout(() => { locked = false; acc = 0; }, 850);
  };
  const activeIndex = () => {
    const y = window.scrollY;
    let best = 0, dist = Infinity;
    stops.forEach((s, i) => {
      const d = y < s.start ? s.start - y : (y > s.end ? y - s.end : 0);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  };
  const updateDots = () => { const a = activeIndex(); [...dots.children].forEach((d, i) => d.classList.toggle('activo', i === a)); };
  window.addEventListener('scroll', updateDots, { passive: true });
  updateDots();

  /* true = el gesto lo resuelve el scroll normal (estás dentro de un apartado alto) */
  const insideTall = (dir) => {
    const y = window.scrollY, tol = window.innerHeight * 0.15;
    return stops.some((s) => s.end > s.start && (dir > 0 ? (y >= s.start - 4 && y < s.end - tol) : (y > s.start + tol && y <= s.end + 4)));
  };
  const step = (dir) => {
    const y = window.scrollY;
    if (dir > 0) {
      const next = stops.flatMap((s) => [s.start, s.end]).filter((v) => v > y + 6).sort((a, b) => a - b)[0];
      if (next !== undefined) goTo(next);
    } else {
      const prev = stops.flatMap((s) => [s.start, s.end]).filter((v) => v < y - 6).sort((a, b) => b - a)[0];
      goTo(prev ?? 0);
    }
  };

  window.addEventListener('wheel', (event) => {
    if (!desktop.matches || event.ctrlKey || document.body.classList.contains('menu-open')) return;
    if (event.target.closest('textarea, input, select')) return;
    if (locked) { event.preventDefault(); return; }
    const dir = Math.sign(event.deltaY);
    if (!dir || insideTall(dir)) return;
    event.preventDefault();
    acc += event.deltaY;                                     /* junta los movimientos cortos del trackpad */
    clearTimeout(accTimer);
    accTimer = setTimeout(() => { acc = 0; }, 180);
    if (Math.abs(acc) < 40) return;
    acc = 0;
    step(dir);
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (!desktop.matches || locked || event.target.closest('input, textarea, select, button, [contenteditable]')) return;
    const down = ['PageDown', 'ArrowDown', ' '].includes(event.key) && !event.shiftKey;
    const up = ['PageUp', 'ArrowUp'].includes(event.key) || (event.key === ' ' && event.shiftKey);
    if ((down || up) && !insideTall(down ? 1 : -1)) { event.preventDefault(); step(down ? 1 : -1); }
  });
})();

/* ---------- Cambio de escena: el fondo toma el color de la escena que cruza el centro de la pantalla ---------- */
(() => {
  const scenes = [...document.querySelectorAll('[data-color]')];
  if (!scenes.length) return;
  const set = (color) => { if (document.body.dataset.escenaColor !== color) document.body.dataset.escenaColor = color; };
  set(scenes[0].dataset.color);
  const pick = () => {
    const mid = window.innerHeight * 0.5;
    let best = scenes[0];
    scenes.forEach((s) => { const r = s.getBoundingClientRect(); if (r.top <= mid) best = s; });
    /* al final de la página la última escena (Cierre) no llega al centro: se activa al tocar fondo */
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) best = scenes[scenes.length - 1];
    set(best.dataset.color);
  };
  window.addEventListener('scroll', pick, { passive: true });
  window.addEventListener('resize', pick);
  pick();
})();

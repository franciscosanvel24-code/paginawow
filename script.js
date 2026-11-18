const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Apariciones discretas */
if (reduceMotion || !('IntersectionObserver' in window)) {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
}

/* Header sticky: adapta contraste a la sección visible */
const header = document.querySelector('[data-header]');
const toneSections = [...document.querySelectorAll('[data-nav-tone]')];
const setHeaderTone = (tone) => {
  header.classList.toggle('nav-on-dark', tone === 'dark');
  header.classList.toggle('nav-on-light', tone !== 'dark');
};
if ('IntersectionObserver' in window) {
  const toneObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting)
      .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
    if (visible[0]) setHeaderTone(visible[0].target.dataset.navTone);
  }, { rootMargin: '-18% 0px -70% 0px', threshold: 0 });
  toneSections.forEach((section) => toneObserver.observe(section));
}

/* Menú móvil accesible */
const menuToggle = document.querySelector('.menu-toggle');
const closeMenu = () => {
  header.classList.remove('menu-active');
  document.body.classList.remove('menu-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Abrir menú');
};
menuToggle?.addEventListener('click', () => {
  const open = !header.classList.contains('menu-active');
  header.classList.toggle('menu-active', open);
  document.body.classList.toggle('menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
});
header?.querySelectorAll('a[href*="#"]').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('resize', () => { if (window.innerWidth > 1100) closeMenu(); });

/* Formulario preparado: valida, evita duplicados y no simula un envío sin destino */
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

/* Profundidad ligera en las tarjetas del equipo */
if (!reduceMotion) {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    const inner = card.querySelector('.founder-inner');
    const reset = () => {
      card.classList.remove('is-active');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    };
    card.addEventListener('pointermove', (event) => {
      const rect = inner.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.classList.add('is-active');
      card.style.setProperty('--ry', `${(x - .5) * 12}deg`);
      card.style.setProperty('--rx', `${(.5 - y) * 10}deg`);
      card.style.setProperty('--gx', `${x * 100}%`);
      card.style.setProperty('--gy', `${y * 100}%`);
    });
    card.addEventListener('pointerleave', reset);
    card.addEventListener('pointercancel', reset);
  });
}

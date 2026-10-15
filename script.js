/* =========================================================
   Dugi's Burger – skripty
   ========================================================= */

// Otevírací doba pro výběr času rezervace (0 = neděle … 6 = sobota)
// ZMĚŇ podle skutečné otevírací doby. Poslední rezervace = hodinu před zavřením.
const OPEN_HOURS = {
  0: ['12:00', '20:00'],
  1: ['11:00', '21:00'],
  2: ['11:00', '21:00'],
  3: ['11:00', '21:00'],
  4: ['11:00', '21:00'],
  5: ['11:00', '22:00'],
  6: ['11:00', '22:00'],
};
const SLOT_MINUTES = 30;

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Navigace ---------- */
const nav = document.getElementById('nav');
const toggle = document.getElementById('navToggle');
const links = document.getElementById('navLinks');

const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

toggle.addEventListener('click', () => {
  const open = links.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', open);
  document.body.style.overflow = open ? 'hidden' : '';
});
links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  links.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}));

/* ---------- Animace při scrollu ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('is-visible');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ---------- Záložky menu + posuvný zlatý jezdec ---------- */
const tabs = document.querySelectorAll('.tab');
const tabsWrap = document.querySelector('.tabs');
const pill = document.createElement('span');
pill.className = 'tabs__pill';
pill.setAttribute('aria-hidden', 'true');
tabsWrap.prepend(pill);
tabsWrap.classList.add('has-pill');

function movePill() {
  const active = tabsWrap.querySelector('.tab.is-active');
  if (!active) return;
  pill.style.width = active.offsetWidth + 'px';
  pill.style.height = active.offsetHeight + 'px';
  pill.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
}
movePill();
window.addEventListener('resize', movePill);
document.fonts?.ready.then(movePill);

tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(t => {
    t.classList.remove('is-active');
    t.setAttribute('aria-selected', 'false');
  });
  tab.classList.add('is-active');
  tab.setAttribute('aria-selected', 'true');
  movePill();

  document.querySelectorAll('.menu__panel').forEach(p => {
    const show = p.id === tab.dataset.tab;
    p.hidden = !show;
    p.classList.toggle('is-active', show);
  });
}));

/* ---------- Vlnka po kliknutí na tlačítka ---------- */
document.querySelectorAll('.btn, .nav__cta, .tab').forEach(btn => {
  btn.addEventListener('pointerdown', e => {
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const wave = document.createElement('span');
    wave.className = 'ripple';
    wave.style.width = wave.style.height = size + 'px';
    wave.style.left = (e.clientX - rect.left - size / 2) + 'px';
    wave.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove());
  });
});

/* ---------- Reflektor u položek menu (sleduje kurzor) ---------- */
document.querySelectorAll('.dish, .drink').forEach(item => {
  item.addEventListener('pointermove', e => {
    const r = item.getBoundingClientRect();
    const offset = item.classList.contains('dish--hero') ? 0 : 18; // .dish::before přesahuje o 18 px
    item.style.setProperty('--x', (e.clientX - r.left + offset) + 'px');
    item.style.setProperty('--y', (e.clientY - r.top) + 'px');
  });
});

/* ---------- Rezervace: datum a časy ---------- */
const dateInput = document.getElementById('r-date');
const timeSelect = document.getElementById('r-time');

const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const toTime = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const today = new Date();
dateInput.min = isoDate(today);
const maxDate = new Date(today);
maxDate.setDate(maxDate.getDate() + 60);
dateInput.max = isoDate(maxDate);

function fillTimes() {
  timeSelect.innerHTML = '';
  if (!dateInput.value) {
    timeSelect.add(new Option('Nejdřív vyber datum', '', true, true));
    timeSelect.options[0].disabled = true;
    return;
  }
  const d = new Date(dateInput.value + 'T00:00');
  const hours = OPEN_HOURS[d.getDay()];
  if (!hours) {
    timeSelect.add(new Option('V tento den máme zavřeno', '', true, true));
    timeSelect.options[0].disabled = true;
    return;
  }
  let start = toMin(hours[0]);
  const end = toMin(hours[1]) - 60;

  // Dnes nabízíme jen časy alespoň hodinu od teď
  if (dateInput.value === isoDate(new Date())) {
    const now = new Date();
    const earliest = now.getHours() * 60 + now.getMinutes() + 60;
    start = Math.max(start, Math.ceil(earliest / SLOT_MINUTES) * SLOT_MINUTES);
  }

  const placeholder = new Option('Vyber čas', '', true, true);
  placeholder.disabled = true;
  timeSelect.add(placeholder);

  let count = 0;
  for (let m = start; m <= end; m += SLOT_MINUTES) {
    timeSelect.add(new Option(toTime(m), toTime(m)));
    count++;
  }
  if (!count) {
    timeSelect.innerHTML = '';
    const o = new Option('Na dnešek už volné časy nejsou', '', true, true);
    o.disabled = true;
    timeSelect.add(o);
  }
}
dateInput.addEventListener('change', fillTimes);
fillTimes();

/* ---------- Odesílání formulářů ---------- */
function validate(form) {
  let ok = true;
  form.querySelectorAll('[required]').forEach(el => {
    const field = el.closest('.field');
    const valid = el.checkValidity() && el.value.trim() !== '';
    field.classList.toggle('has-error', !valid);
    if (!valid) ok = false;
  });
  return ok;
}

function handleForm(form, successText) {
  const status = form.querySelector('.form__status');
  const button = form.querySelector('button[type="submit"]');
  const original = button.textContent;

  form.addEventListener('input', e => e.target.closest('.field')?.classList.remove('has-error'));

  // Zatřesení tlačítkem při chybě
  const shake = () => {
    button.classList.remove('is-shake');
    void button.offsetWidth; // restart animace
    button.classList.add('is-shake');
  };
  button.addEventListener('animationend', () => button.classList.remove('is-shake', 'is-done'));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    status.className = 'form__status';
    if (!validate(form)) {
      status.textContent = 'Zkontroluj prosím červeně označená pole.';
      status.classList.add('err');
      shake();
      return;
    }

    button.disabled = true;
    button.classList.add('is-loading');
    button.textContent = 'Odesílám';
    status.textContent = '';

    let serverError = '';
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form) });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        serverError = data.error || '';
        throw new Error('server');
      }
      status.textContent = successText;
      status.classList.add('ok');
      form.reset();
      if (form.id === 'reserveForm') fillTimes();

      button.classList.remove('is-loading');
      button.textContent = '✓ Odesláno';
      button.classList.add('is-done');
      setTimeout(() => {
        button.textContent = original;
        button.disabled = false;
      }, 2500);
    } catch {
      status.textContent = serverError || 'Odeslání se nepovedlo. Zkus to prosím znovu, nebo nám zavolej.';
      status.classList.add('err');
      button.classList.remove('is-loading');
      button.textContent = original;
      button.disabled = false;
      shake();
    }
  });
}

handleForm(document.getElementById('reserveForm'), 'Díky! Rezervaci jsme přijali, brzy ti ji potvrdíme.');
handleForm(document.getElementById('contactForm'), 'Díky za zprávu! Ozveme se co nejdřív.');

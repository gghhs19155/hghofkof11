/* script.js — CLEAN BUILD (menu + cart + phone mask + fx + sidebar) */
(() => {
  'use strict';

  /* ============= HELPERS ============= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt); // ← ДОБАВЬ ЭТУ СТРОЧКУ

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============= MOBILE MENU (<details id="mobile-menu">) ============= */
  (function mobileMenu(){
    const menu = $('#mobile-menu');
    if (!menu) return;
    const summary = menu.querySelector('summary');
    const list    = menu.querySelector('ul');
    if (!summary || !list) return;

    const setAria = () => summary.setAttribute('aria-expanded', menu.open ? 'true' : 'false');
    setAria();

    on(summary, 'click', (e) => {
      // управляем вручную — предотвращаем «гонки» событий
      e.preventDefault();
      menu.open = !menu.open;
      setAria();

      if (menu.open && !reduceMotion) {
        list.style.willChange = 'opacity,transform';
        list.style.opacity = '0';
        list.style.transform = 'translateY(8px) scale(.985)';
        requestAnimationFrame(() => {
          list.style.transition = 'opacity .26s ease, transform .32s cubic-bezier(.22,.61,.36,1)';
          list.style.opacity = '1';
          list.style.transform = 'translateY(0) scale(1)';
        });
        // каскад пунктов
        [...list.children].forEach((li, i) => {
          li.style.opacity = '0';
          li.style.transform = 'translateY(8px)';
          requestAnimationFrame(() => {
            const d = 60 + i*40;
            li.style.transition = `opacity .26s ease ${d}ms, transform .32s cubic-bezier(.22,.61,.36,1) ${d}ms`;
            li.style.opacity = '1';
            li.style.transform = 'translateY(0)';
          });
        });
      }
    });

    // клик-вне, Esc, клик по ссылке — закрыть
    on(document, 'pointerdown', (e) => { if (menu.open && !menu.contains(e.target)) { menu.open = false; setAria(); }});
    on(document, 'keydown', (e) => { if (e.key === 'Escape' && menu.open){ menu.open = false; setAria(); }});
    on(list, 'click', (e) => { if (e.target.closest('a') && menu.open){ menu.open = false; setAria(); }});
  })();

  /* ============= CART (drawer + FAB + localStorage + focus trap) ============= */
  (function cartModule(){
    const drawer   = $('#cart-drawer');
    const backdrop = $('.cart-backdrop');
    const closeBtn = drawer?.querySelector('.cart-close');
    const tbody    = drawer?.querySelector('#cart-items');
    const totalEl  = drawer?.querySelector('#cart-total');
    const fab      = $('.cart-entry.fab');

    if (!drawer || !backdrop || !tbody || !totalEl || !fab) return;

    const STORAGE_KEY = 'shashlyklab.cart.v1';
    const fmt = (n) => String(n); // можно заменить на локаль, если потребуется

    // ---------- state ----------
    const items = new Map(); // key=name -> {name, price, qty}
    const save = () => {
      const arr = [...items.values()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    };
    const load = () => {
      try {
        const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        items.clear();
        arr.forEach(it => {
          if (it && it.name && Number.isFinite(+it.price) && Number.isFinite(+it.qty) && it.qty>0) {
            items.set(it.name, { name: it.name, price: +it.price, qty: +it.qty });
          }
        });
      } catch {}
    };

    // ---------- rendering ----------
    const qtyTotal = () => [...items.values()].reduce((s, it) => s + it.qty, 0);
    const sumTotal = () => [...items.values()].reduce((s, it) => s + it.qty * it.price, 0);

    function render(){
      if (items.size === 0){
        tbody.innerHTML = `<tr><td colspan="4"><em>Корзина пуста. Нажмите «Добавить в корзину» у нужных блюд.</em></td></tr>`;
      } else {
        tbody.innerHTML = [...items.values()].map(it => `
          <tr data-item="${encodeURIComponent(it.name)}">
            <td>${it.name}</td>
            <td>
              <button class="qty" data-act="minus" aria-label="Уменьшить количество">−</button>
              <span class="qty-val" aria-live="polite">${it.qty}</span>
              <button class="qty" data-act="plus" aria-label="Увеличить количество">+</button>
              <button class="remove" data-act="remove" aria-label="Удалить из корзины" title="Удалить">✕</button>
            </td>
            <td>${fmt(it.price)} р</td>
            <td>${fmt(it.price * it.qty)} р</td>
          </tr>
        `).join('');
      }
      totalEl.textContent = fmt(sumTotal());
      toggleFab();
      save();
    }

    // ---------- drawer open/close + focus trap ----------
    let lastFocused = null;

    function trapFocus(e){
      const focusables = $$('a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])', drawer)
        .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0], last = focusables[focusables.length-1];
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }

    function openCart(){
  lastFocused = document.activeElement;
  drawer.hidden = false;
  backdrop.hidden = false;
  requestAnimationFrame(() => {
    drawer.classList.add('is-open');
    backdrop.classList.add('is-open');
  });
  document.documentElement.setAttribute('data-cart-open','1');
  fab.classList.remove('is-visible');
  drawer.addEventListener('keydown', trapFocus);
  // фокус на заголовок или крестик
  (drawer.querySelector('.cart-close') || drawer).focus({ preventScroll:true });
}

    function closeCart(){
      if (drawer.hidden) return;
      drawer.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      document.documentElement.removeAttribute('data-cart-open');
      drawer.removeEventListener('keydown', trapFocus);
      setTimeout(() => {
        drawer.hidden = true;
        backdrop.hidden = true;
        // вернуть фокус
        if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus({ preventScroll:true });
        toggleFab();
      }, 200);
    }

    const isOpen = () => !drawer.hidden && drawer.classList.contains('is-open');

    // ---------- FAB show/hide ----------
function toggleFab() {
  const totalQty = qtyTotal();
  // Показываем FAB только если в корзине есть товары И корзина закрыта
  if (totalQty > 0 && !isOpen()) {
    fab.hidden = false;
    // Используем requestAnimationFrame для плавного появления
    requestAnimationFrame(() => fab.classList.add('is-visible'));
    fab.setAttribute('aria-label', `Открыть корзину, товаров: ${totalQty}`);
  } else {
    // Скрываем FAB, если корзина пуста или открыта
    fab.classList.remove('is-visible');
    // Задержка перед скрытием элемента нужна для завершения анимации
    setTimeout(() => { fab.hidden = true; }, 200);
  }
}

    // ---------- events ----------
    on(fab, 'click', (e) => { e.preventDefault(); openCart(); });
    on(closeBtn, 'click', closeCart);
    on(backdrop, 'click', closeCart);
    on(document, 'keydown', (e) => { if (e.key === 'Escape') closeCart(); });

    // add-to-cart
    on(document, 'click', (e) => {
      const add = e.target.closest('[data-add]');
      if (!add) return;
      e.preventDefault();

      const name  = add.getAttribute('data-name') || 'Товар';
      const price = parseInt(add.getAttribute('data-price') || '0', 10);
      if (!Number.isFinite(price) || price <= 0) { /* можно показать тост об ошибке цены */ return; }

      const ex = items.get(name) || { name, price, qty: 0 };
      ex.qty += 1;
      items.set(name, ex);
      render();
      openCart();
    });

    // +/-/remove внутри корзины
    on(document, 'click', (e) => {
      const btn = e.target.closest('#cart-drawer [data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      const row = btn.closest('tr');
      const key = row ? decodeURIComponent(row.dataset.item || '') : '';
      const it = items.get(key);
      if (!it) return;

      if (act === 'plus') it.qty += 1;
      if (act === 'minus') it.qty -= 1;
      if (act === 'remove' || it.qty <= 0) items.delete(key);
      render();
      if (items.size === 0) closeCart();
    });

    // init
    load();
    render();
  })();
// === Phone mask: +7 (XXX) XXX-XX-XX — caret-preserving ===
(() => {
  const inputs = document.querySelectorAll('input[data-phone-mask]');
  if (!inputs.length) return;

  inputs.forEach((el) => {
    const digitsOnly = (s) => String(s).replace(/\D/g,'');
    const normalize  = (d) => {
      if (d.startsWith('8')) d = '7' + d.slice(1);
      if (!d.startsWith('7')) d = '7' + d;
      return d.slice(0, 11);
    };
    const format = (d) => {
      let res = '+7';
      const a = d.slice(1,4), b = d.slice(4,7), c = d.slice(7,9), f = d.slice(9,11);
      if (a) res += ' (' + a;
      if (a.length === 3) res += ')';
      if (b) res += (a.length === 3 ? ' ' : '') + b;
      if (c) res += '-' + c;
      if (f) res += '-' + f;
      return res;
    };
    const countDigits = (str, upto) => {
      let n = 0;
      for (let i = 0; i < (upto ?? str.length); i++) if (/\d/.test(str[i])) n++;
      return n;
    };
    const posFromDigitIndex = (formatted, idx) => {
      // idx = сколько цифр слева от каретки (включая ведущую '7')
      if (idx <= 1) {
        let i = formatted.indexOf('+7');
        if (i === -1) return 0;
        i += 2;                 // после '+7'
        if (formatted[i] === ' ') i++; // после пробела, если он есть
        return i;
      }
      let count = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          count++;
          if (count >= idx) return i + 1;
        }
      }
      return formatted.length;
    };

    if (!el.value.trim()) el.value = '+7 ';

    el.addEventListener('input', () => {
      // сколько цифр находится слева от текущей каретки
      const caret = el.selectionStart ?? el.value.length;
      const digitIdx = countDigits(el.value, caret);

      // форматируем заново
      const d = normalize(digitsOnly(el.value));
      const newVal = format(d);
      el.value = newVal;

      // возвращаем каретку к той же «n-й цифре»
      const newPos = posFromDigitIndex(newVal, digitIdx);
      el.setSelectionRange(newPos, newPos);
    });

    el.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text') || '';
      const d = normalize(digitsOnly(text));
      const newVal = format(d);
      el.value = newVal;
      el.setSelectionRange(newVal.length, newVal.length);
    });

    el.addEventListener('blur', () => {
      const d = digitsOnly(el.value);
      if (!d || d === '7') el.value = '';
      else el.value = format(normalize(d));
    });
  });
})();

  /* ============= FX BACKGROUND (cheap canvas) ============= */
  (function fxBackground(){
    if (reduceMotion) return;

    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d', { alpha:true });
    Object.assign(cvs.style, { position:'fixed', inset:'0', width:'100%', height:'100%', zIndex:'0', pointerEvents:'none' });
    document.body.prepend(cvs);

    // подстраховка слоёв
    [['.site-header','1'],['main','1'],['.site-footer','1'],['.cart-drawer','1002'],['.cart-backdrop','1000']].forEach(([sel,z])=>{
      $$(sel).forEach(el => {
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        const cur = +(getComputedStyle(el).zIndex || 0);
        if (cur < +z) el.style.zIndex = z;
      });
    });

    let DPR=1, W=0, H=0;
    const fit = () => {
      DPR = Math.min(devicePixelRatio || 1, 2);
      W = cvs.clientWidth; H = cvs.clientHeight;
      cvs.width = Math.round(W*DPR); cvs.height = Math.round(H*DPR);
      ctx.setTransform(DPR,0,0,DPR,0,0);
    };
    fit(); on(window, 'resize', fit, { passive:true });

    const SPRITES = [
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='36' r='22' fill='%23e01022'/><path d='M22 20c4 2 7 2 10-2 3 4 6 4 10 2-4 4-7 6-10 6s-6-2-10-6z' fill='%2385c757'/></svg>",
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='32' r='26' fill='%231f8a46'/><circle cx='32' cy='32' r='18' fill='%2332b561'/><g fill='%23c7f3d8'><circle cx='32' cy='18' r='2.4'/><circle cx='44' cy='26' r='2.4'/><circle cx='44' cy='38' r='2.4'/><circle cx='32' cy='46' r='2.4'/><circle cx='20' cy='38' r='2.4'/><circle cx='20' cy='26' r='2.4'/></g></svg>",
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='1' x2='0' y2='0'><stop offset='0' stop-color='%23e01022'/><stop offset='.6' stop-color='%23ff8a00'/><stop offset='1' stop-color='%23ffd86b'/></linearGradient></defs><path d='M32 60c14 0 20-10 18-20-2-9-10-10-8-20-6 3-10 9-10 14-6-2-10-8-10-14C14 24 8 30 8 40c0 12 10 20 24 20z' fill='url(%23g)'/></svg>",
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 24'><rect x='2' y='11' width='92' height='2' rx='1' fill='%23a08a7a'/><g><rect x='14' y='6' width='10' height='12' rx='3' fill='%23c56a2d'/><rect x='30' y='6' width='10' height='12' rx='3' fill='%238c3f23'/><rect x='46' y='6' width='10' height='12' rx='3' fill='%23cfa850'/><rect x='62' y='6' width='10' height='12' rx='3' fill='%238c3f23'/></g></svg>",
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='32' r='22' fill='%23dca9ff'/><circle cx='32' cy='32' r='14' fill='%23b678ff'/><circle cx='32' cy='32' r='6' fill='%238a49e6'/></svg>"
    ].map(src => { const img = new Image(); img.decoding='async'; img.loading='eager'; img.src = src; return img; });

    const rand = (a,b)=>a+Math.random()*(b-a);
    const particles = [];
    const make = () => {
      const img = SPRITES[Math.floor(Math.random()*SPRITES.length)];
      const depth = rand(.35, 1);
      const base  = rand(28, 80) * depth;
      return { img, x:rand(-.15*W, 1.15*W), y:rand(-.15*H, 1.15*H), vx:rand(-.9,.9)*depth, vy:rand(-.9,.9)*depth, a:rand(0,Math.PI*2), w:base, h:base, depth, rot:rand(-.015,.015), r:rand(-Math.PI,Math.PI), alpha:.18 + .18*(1-depth) };
    };
    const seed = () => { particles.length = 0; const MAX = Math.round(Math.min(40, Math.max(18, Math.hypot(W,H)/15))); for (let i=0;i<MAX;i++) particles.push(make()); };
    seed(); on(window,'resize',()=>{ fit(); seed(); },{passive:true});

    let pointerX=0, pointerY=0, px=0, py=0;
    const onMove = (e) => {
      const t = 'touches' in e ? e.touches[0] : e;
      pointerX = (t.clientX / innerWidth)  * 2 - 1;
      pointerY = (t.clientY / innerHeight) * 2 - 1;
    };
    on(window,'pointermove',onMove,{passive:true});
    on(window,'touchmove',onMove,{passive:true});

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      px += (pointerX - px)*.06;
      py += (pointerY - py)*.06;
      ctx.clearRect(0,0,W,H);

      for (const p of particles){
        p.x += p.vx + Math.sin(p.a)*.09*p.depth;
        p.y += p.vy + Math.cos(p.a)*.09*p.depth;
        p.a += .01*p.depth;
        p.r += p.rot;

        const cx = (px*.5 + .5)*W, cy = (py*.5 + .5)*H;
        const dx = p.x-cx, dy=p.y-cy, d2 = dx*dx+dy*dy;
        if (d2<16000){ p.x += dx*.006; p.y += dy*.006; }

        if (p.x < -.2*W) p.x = 1.2*W; if (p.x > 1.2*W) p.x = -.2*W;
        if (p.y < -.2*H) p.y = 1.2*H; if (p.y > 1.2*H) p.y = -.2*H;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.drawImage(p.img, -p.w/2, -p.h/2, p.w, p.h);
        ctx.restore();
      }

      const heroInner = $('.hero .hero-inner');
      if (heroInner){
        heroInner.style.transform = `translate3d(${px*10}px, ${py*8}px, 0) rotateX(${-py*3}deg) rotateY(${px*4.5}deg)`;
      }
    };
    loop();
    on(document,'visibilitychange',()=>{ if (document.hidden) cancelAnimationFrame(raf); else loop(); });
  })();

  /* ============= REVEAL + TILT (cheap) ============= */
  (function revealTilt(){
    // reveal
    if (!reduceMotion && 'IntersectionObserver' in window){
      const io = new IntersectionObserver((entries,obs)=>{
        for (const en of entries) if (en.isIntersecting){ en.target.classList.add('in'); obs.unobserve(en.target); }
      }, { rootMargin:'0px 0px -55% 0px', threshold:.01 });
      $$('.section .container, .menu .list > li').forEach((el,i)=>{ el.classList.add('reveal'); el.style.setProperty('--d', `${(i%6)*40}ms`); io.observe(el); });
    } else {
      $$('.section .container, .menu .list > li').forEach(el=>el.classList.add('in'));
    }

    // tilt (desktop only)
    if (reduceMotion || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    $$('.menu .list > li').forEach(card => {
      let raf=0, active=false;
      const enter=()=>{ active=true; };
      const leave=()=>{ active=false; card.style.transform=''; const img=$('figure.ph img',card); if (img) img.style.transform=''; };
      const move=(e)=>{
        if (!active) return;
        const r = card.getBoundingClientRect();
        const p = 'touches' in e ? e.touches[0] : e;
        const x = (p.clientX - r.left)/r.width - .5;
        const y = (p.clientY - r.top )/r.height - .5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(()=>{
          card.style.transform = `translateY(-3px) rotateX(${-y*8}deg) rotateY(${x*10}deg)`;
          const img = $('figure.ph img', card);
          if (img) img.style.transform = 'translateZ(18px) scale(1.02)';
        });
      };
      on(card,'pointerenter',enter);
      on(card,'pointerleave',leave);
      on(card,'pointermove',move,{passive:true});
    });
  })();

  /* ============= SIDEBAR + STRICT SINGLE-OPEN ACCORDION (desktop & mobile) ============= */
  (function sidebarAccordion(){
    const wrap = $('.menu .container');
    if (!wrap) return;

    const cats = $$('details[id]', wrap);
    if (!cats.length) return;

    // build sidebar if missing
    let side = $('nav.menu-side', wrap);
    if (!side){
      side = document.createElement('nav');
      side.className = 'menu-side';
      side.setAttribute('aria-label','Категории');
      const ul = document.createElement('ul');
      cats.forEach(d=>{
        const li = document.createElement('li');
        const a  = document.createElement('a');
        a.href = `#${d.id}`;
        a.textContent = (d.querySelector('summary')?.textContent || '').trim();
        li.appendChild(a); ul.appendChild(li);
      });
      side.appendChild(ul);
      wrap.prepend(side);
    }
    const links = $$('a', side);

    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;

    const highlight = (id) => links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));

    const scrollToCat = (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - (headerH + 12);
      window.scrollTo({ top: y, behavior: 'smooth' });
    };

    const openOnly = (id, doScroll) => {
      cats.forEach(d => d.open = (d.id === id));
      highlight(id);
      if (doScroll) scrollToCat(id);
    };

    // init: by hash or first
    cats.forEach(d => d.open = false);
    const initId = (location.hash && cats.some(d => d.id === location.hash.slice(1)))
      ? location.hash.slice(1) : cats[0]?.id;
    if (initId) openOnly(initId, false);

    // sidebar clicks
    on(side, 'click', (e) => {
      const a = e.target.closest('a'); if (!a) return;
      e.preventDefault();
      const id = a.getAttribute('href').slice(1);
      openOnly(id, true);
      history.replaceState(null, '', `#${id}`);
    });

    // click on summary: strict single-open
    // внутри sidebarAccordion()
    const isDesktop = () => matchMedia('(min-width:960px)').matches;

    cats.forEach(d => {
      const sum = d.querySelector('summary');
      on(sum, 'click', (e) => {
        if (!isDesktop()) {
          // Мобильный: позволяем нативному поведению <details>
          return;
        }
        // Десктоп: держим «один открыт»
        e.preventDefault();
        openOnly(d.id, true);
        history.replaceState(null, '', `#${d.id}`);
      });
    });

    // hashchange support (deep links)
    on(window, 'hashchange', () => {
      const id = location.hash.replace('#','');
      if (cats.some(d => d.id === id)) openOnly(id, true);
    });

    // highlight on scroll
    if ('IntersectionObserver' in window){
      const io = new IntersectionObserver((entries)=>{
        let best=null;
        entries.forEach(en => { if (en.isIntersecting && (!best || en.boundingClientRect.top < best.boundingClientRect.top)) best=en; });
        if (best) highlight(best.target.id);
      }, { rootMargin: `-${headerH+16}px 0px -70% 0px`, threshold:[0,.25,.5,1] });
      cats.forEach(d => io.observe(d));
    }
  })();

})();



(() => {
  const prefersReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const h1   = document.querySelector('.type-hero');
  const hero = h1?.closest('.hero');
  const part1 = h1?.querySelector('.type-metal');
  const part2 = h1?.querySelector('.type-gold');
  if (!h1 || !part1 || !part2) return;

  const t1 = (part1.textContent || part1.dataset.text || "").trimEnd();
  const t2 = (part2.textContent || part2.dataset.text || "").trim();

  if (prefersReduce) { // без анимаций — сразу показать
    part1.textContent = t1;
    part2.textContent = t2;
    hero?.classList.add('done');
    return;
  }

  // подготовка
  hero?.classList.add('typing');
  h1.classList.add('is-typing');
  part1.textContent = '';
  part2.textContent = '';

  let i = 0, j = 0;
  const base = 28;   // скорость (мс/символ)
  const jitter = 18; // разброс для «живости»

  const typeSecond = () => {
    if (j <= t2.length) {
      part2.textContent = t2.slice(0, j++);
      setTimeout(typeSecond, Math.max(8, base + (Math.random()*jitter - jitter/2)));
    } else {
      // конец — эффекты
      h1.classList.remove('is-typing');
      hero?.classList.remove('typing');
      hero?.classList.add('done');
      h1.classList.add('glow','sweep');
      setTimeout(() => h1.classList.remove('glow'), 600);
      setTimeout(() => h1.classList.remove('sweep'), 1200);
    }
  };

  const typeFirst = () => {
    if (i <= t1.length) {
      part1.textContent = t1.slice(0, i++);
      setTimeout(typeFirst, Math.max(8, base + (Math.random()*jitter - jitter/2)));
    } else {
      typeSecond();
    }
  };

  setTimeout(typeFirst, 120); // короткая пауза перед стартом
})();



(() => {
  const btn = document.querySelector('.hero-cta a');
  if (!btn) return;

  const noFX = matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(hover: none)').matches;
  if (noFX) return;

  let raf = 0, tx = 0, ty = 0;
  const LIM = 6; // макс. сдвиг в px

  btn.addEventListener('pointermove', (e) => {
    const r = btn.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width/2)) / (r.width/2);
    const y = (e.clientY - (r.top + r.height/2)) / (r.height/2);
    tx = (Math.max(-1, Math.min(1, x)) * LIM).toFixed(2) + 'px';
    ty = (Math.max(-1, Math.min(1, y)) * LIM).toFixed(2) + 'px';

    if (!raf) raf = requestAnimationFrame(() => {
      btn.style.setProperty('--tx', tx);
      btn.style.setProperty('--ty', ty);
      raf = 0;
    });
  }, {passive:true});

  btn.addEventListener('pointerleave', () => {
    btn.style.setProperty('--tx','0px');
    btn.style.setProperty('--ty','0px');
  }, {passive:true});
})();

(() => {
  const BOT_TOKEN = '8296388199:AAH5yprH4HWeWRk-XRmI_DLifyibj5zXxsg';    
  const CHAT_ID   = '7817184940'; 
  const FORM = document.querySelector('.order-form') || document.forms[0];
  if (!FORM) return;
  const statusEl = FORM.querySelector('.status');

  // --- корзина из таблицы или из localStorage ---
  function getCartFromTable() {
    const rows = document.querySelectorAll('.cart-table tbody tr');
    return Array.from(rows).map(r => {
      const txt = sel => r.querySelector(sel)?.textContent?.trim() || '';
      const name  = txt('td:nth-child(1)');
      const qty   = parseInt(txt('td:nth-child(2)').replace(/\D+/g,''),10) || 1;
      const price = Number(txt('td:nth-child(3)').replace(/\D+/g,'')) || 0;
      const sum   = Number(txt('td:nth-child(4)').replace(/\D+/g,'')) || (price*qty);
      return name ? {name, qty, price, sum} : null;
    }).filter(Boolean);
  }
  function getCart() {
    const dom = getCartFromTable();
    if (dom.length) return dom;
    try {
      const raw = localStorage.getItem('cart') || localStorage.getItem('basket') || '[]';
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  const money = n => (Number(n)||0).toLocaleString('ru-RU');

  // --- собираем текст сообщения для Telegram (с адресом!) ---
  function buildMessage({ phone, address, comment, cart }) {
    const lines = [];
    lines.push('🧾 Новая заявка');
    if (phone)   lines.push(`Телефон: ${phone}`);
    if (address) lines.push(`Адрес: ${address}`);
    if (comment) lines.push(`Комментарий: ${comment}`);

    if (cart.length) {
      lines.push('Товары:');
      let total = 0;
      for (const i of cart) {
        const qty   = Number(i.qty||i.quantity||1);
        const price = Number(i.price||0);
        const sum   = Number(i.sum||price*qty||0);
        total += sum;
        lines.push(`• ${i.name||i.title||'Товар'} × ${qty}`
          + (price ? ` — ${money(price)}₽` : ``)
          + (sum   ? ` (итого ${money(sum)}₽)` : ``));
      }
      lines.push(`\nИтого: ${money(total)}₽`);
    } else {
      lines.push('Товары: нет данных');
    }

    let text = lines.join('\n');
    if (text.length > 3900) text = text.slice(0, 3900) + '\n…';
    return text;
  }

  // --- отправка в Telegram (прямой вызов Bot API) ---
  async function sendToTelegram(message) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?`
              + `chat_id=${encodeURIComponent(CHAT_ID)}`
              + `&text=${encodeURIComponent(message)}`;
    try {
      await fetch(url, { method:'GET', mode:'no-cors', keepalive:true });
      return true; // ответа не увидим (opaque), но запрос уйдёт
    } catch (e) {
      console.error('Telegram fetch error:', e);
      return false;
    }
  }

  // --- обработчик отправки формы ---
  FORM.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn       = FORM.querySelector('button[type="submit"]');
    const phoneEl   = FORM.querySelector('input[name="phone"], input[type="tel"], [data-phone-mask]');
    const addressEl = FORM.querySelector('input[name="address"], textarea[name="address"]');
    const commentEl = FORM.querySelector('textarea[name="comment"], textarea[name="comments"], textarea');

    const phone   = phoneEl?.value?.trim() || '';
    const address = addressEl?.value?.trim() || '';
    const comment = commentEl?.value?.trim() || '';
    const cart    = getCart();

    if (!phone.replace(/\D+/g,'')) {
      statusEl && (statusEl.textContent = 'Введите номер телефона');
      phoneEl?.focus();
      return;
    }
    if (!address) {
      statusEl && (statusEl.textContent = 'Введите адрес доставки');
      addressEl?.focus();
      return;
    }

    btn?.setAttribute('disabled','disabled');
    statusEl && (statusEl.textContent = 'Отправляем…');

    const ok = await sendToTelegram(buildMessage({ phone, address, comment, cart }));

    if (ok) {
      statusEl && (statusEl.textContent = 'Готово! Заявка отправлена.');
      FORM.reset();
      // Если корзина хранится в LS — можешь очистить:
      // localStorage.removeItem('cart');
    } else {
      statusEl && (statusEl.textContent = 'Не удалось отправить. Попробуйте ещё раз.');
    }

    btn?.removeAttribute('disabled');
  }, { passive:false });
})();





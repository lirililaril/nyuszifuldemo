(() => {
  'use strict';
  const base = document.body.dataset.base || './';
  const CART_KEY = 'nyusziful.cart.v1';
  const EDIT_KEY = 'nyusziful.products.v1';
  const original = window.NYUSZIFUL_PRODUCTS || [];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  let storageFailed = false;
  const save = (key, value) => { try {localStorage.setItem(key, JSON.stringify(value)); return true;} catch {storageFailed = true; return false;} };
  const money = value => value === null ? 'Ár hamarosan' : new Intl.NumberFormat('hu-HU', {style:'currency',currency:'HUF',maximumFractionDigits:0}).format(value);
  const quantity = value => Math.min(99, Math.max(1, Math.trunc(Number(value)) || 1));
  function getProducts() {
    const overrides = read(EDIT_KEY, []);
    return original.map(p => {
      const edit = Array.isArray(overrides) ? overrides.find(o => o && o.id === p.id) : null;
      if (!edit) return {...p};
      return {...p,
        name: typeof edit.name === 'string' && edit.name.trim() ? edit.name.trim().slice(0, 120) : p.name,
        description: typeof edit.description === 'string' ? edit.description.slice(0, 2000) : p.description,
        price: edit.price === null ? null : Number.isInteger(edit.price) && edit.price >= 0 && edit.price <= 10000000 ? edit.price : p.price
      };
    });
  }
  let products = getProducts();
  function normalizeCart(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
    const result = {};
    for (const p of original) if (Number.isFinite(input[p.id]) && input[p.id] > 0) result[p.id] = quantity(input[p.id]);
    return result;
  }
  let cart = normalizeCart(read(CART_KEY, {}));
  const drawer = document.getElementById('cart-drawer');
  let lastFocus = null;
  let toastTimer;
  function toast(message) {
    const box = document.getElementById('toast');
    box.textContent = message; box.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('visible'), 3000);
  }
  const productLink = id => `${base}termekek/${id}/`;
  function emptyCart() {
    return `<div class="empty-state"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 7h12l1 14H5L6 7ZM9 8V6a3 3 0 0 1 6 0v2"/></svg><h2>A kosarad még üres</h2><p>Nézz körül a farm lakói között.</p><a class="button button-outline" href="${base}termekek/">Megnézem a termékeket <span aria-hidden="true">→</span></a></div>`;
  }
  function cartLine(p, count) {
    return `<article class="cart-line"><a href="${productLink(p.id)}"><img src="${base}assets/images/${p.images[0]}-480.webp" width="92" height="115" alt="${esc(p.name)}"></a><div class="cart-line-info"><h3><a href="${productLink(p.id)}">${esc(p.name)}</a></h3><p>${p.price === null ? 'Ár hamarosan' : `${money(p.price)} / db · ${money(p.price * count)}`}</p><div class="cart-line-controls"><div class="quantity-control"><button data-cart-minus="${p.id}" aria-label="${esc(p.name)} mennyiségének csökkentése" ${count === 1 ? 'disabled' : ''}>−</button><input type="number" min="1" max="99" value="${count}" data-cart-quantity="${p.id}" aria-label="${esc(p.name)} mennyisége"><button data-cart-plus="${p.id}" aria-label="${esc(p.name)} mennyiségének növelése" ${count === 99 ? 'disabled' : ''}>+</button></div><button class="remove-item" data-remove="${p.id}" aria-label="${esc(p.name)} eltávolítása a kosárból">Eltávolítás</button></div></div></article>`;
  }
  function renderCart() {
    const entries = products.filter(p => cart[p.id]);
    const count = entries.reduce((sum, p) => sum + cart[p.id], 0);
    const missing = entries.some(p => p.price === null);
    const total = entries.reduce((sum, p) => sum + (p.price || 0) * cart[p.id], 0);
    document.querySelectorAll('[data-count]').forEach(el => el.textContent = count);
    document.querySelectorAll('[data-cart-items]').forEach(el => el.innerHTML = entries.length ? entries.map(p => cartLine(p, cart[p.id])).join('') : emptyCart());
    document.querySelectorAll('[data-cart-total]').forEach(el => el.textContent = !entries.length ? money(0) : missing ? 'Még nincs megadva' : money(total));
    document.querySelectorAll('[data-price-note]').forEach(el => el.textContent = missing ? 'Egy vagy több termék ára még nincs megadva.' : entries.length ? 'A termékek összege, szállítás nélkül. Demó árak.' : 'A kosár jelenleg üres.');
    document.querySelectorAll('[data-checkout-items]').forEach(el => el.innerHTML = entries.length ? entries.map(p => `<div class="checkout-mini"><a href="${productLink(p.id)}"><img src="${base}assets/images/${p.images[0]}-480.webp" alt="${esc(p.name)}" width="54" height="67"></a><div><strong>${esc(p.name)}</strong><small>${cart[p.id]} db</small></div><span>${p.price === null ? 'Ár hamarosan' : money(p.price * cart[p.id])}</span></div>`).join('') : '<p class="muted small">A kosarad még üres. Válassz terméket a demó kipróbálásához.</p>');
    document.querySelectorAll(`a[href="${base}penztar/"]`).forEach(el => {
      el.setAttribute('aria-disabled', String(!entries.length));
      el.classList.toggle('is-disabled', !entries.length);
    });
  }
  function updateCart() {
    save(CART_KEY, cart); renderCart();
    if (storageFailed) toast('A böngésző nem engedi a mentést. A kosár csak ezen az oldalon marad meg.');
  }
  function openCart() { if (!drawer.open) {lastFocus = document.activeElement; drawer.showModal();} }
  function closeCart() {drawer.close();}
  drawer.addEventListener('close', () => { if (lastFocus?.isConnected) lastFocus.focus(); });
  drawer.addEventListener('click', event => { if (event.target === drawer) {const r=drawer.getBoundingClientRect(); if (event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) closeCart();} });
  document.addEventListener('click', event => {
    const target = event.target.closest('button, a'); if (!target) return;
    if (target.matches('[aria-disabled="true"]')) {event.preventDefault();toast('A kosarad még üres.');return;}
    if (target.hasAttribute('data-open-cart')) openCart();
    if (target.hasAttribute('data-close-cart')) closeCart();
    if (target.dataset.add) {
      const id = target.dataset.add; if (!products.some(p => p.id === id)) return;
      const amount = target.hasAttribute('data-use-quantity') ? quantity(document.getElementById('detail-quantity')?.value) : 1;
      cart[id] = quantity((cart[id] || 0) + amount); updateCart(); openCart();
    }
    if (target.dataset.cartPlus || target.dataset.cartMinus) {
      const id = target.dataset.cartPlus || target.dataset.cartMinus;
      const region = target.closest('[data-cart-items]');
      const attr = target.dataset.cartPlus ? 'data-cart-plus' : 'data-cart-minus';
      cart[id] = quantity((cart[id] || 1) + (target.dataset.cartPlus ? 1 : -1)); updateCart();
      const button = region?.querySelector(`[${attr}="${id}"]`);
      if (button && !button.disabled) button.focus(); else region?.querySelector(`[data-cart-quantity="${id}"]`)?.focus();
    }
    if (target.dataset.remove) {
      const id = target.dataset.remove;
      const region = target.closest('[data-cart-items]');
      delete cart[id]; updateCart();
      region?.querySelector('button:not(:disabled), a')?.focus();
    }
    if (target.hasAttribute('data-detail-plus') || target.hasAttribute('data-detail-minus')) {
      const input = document.getElementById('detail-quantity');
      input.value = quantity(Number(input.value) + (target.hasAttribute('data-detail-plus') ? 1 : -1));
    }
    if (target.dataset.image) {
      const image = document.querySelector('.detail-image');
      image.src = `${base}assets/images/${target.dataset.image}-960.webp`;
      image.srcset = `${base}assets/images/${target.dataset.image}-480.webp 480w, ${base}assets/images/${target.dataset.image}-960.webp 960w`;
      image.alt = target.dataset.alt;
      document.querySelectorAll('.gallery-thumb').forEach(el => el.setAttribute('aria-pressed', String(el === target)));
    }
  });
  document.addEventListener('change', event => {
    const input = event.target;
    if (input.matches('[data-cart-quantity]')) {
      const id = input.dataset.cartQuantity; const region = input.closest('[data-cart-items]');
      cart[id] = quantity(input.value); updateCart(); region?.querySelector(`[data-cart-quantity="${id}"]`)?.focus();
    }
    if (input.id === 'detail-quantity') input.value = quantity(input.value);
  });
  const menu = document.querySelector('.menu-toggle');
  menu?.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') === 'true';
    menu.setAttribute('aria-expanded', String(!expanded));
    menu.setAttribute('aria-label', expanded ? 'Menü megnyitása' : 'Menü bezárása');
    document.getElementById('mobile-nav').hidden = expanded;
  });
  document.addEventListener('keydown', event => {if(event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {menu.click();menu.focus();}});
  const grid = document.getElementById('catalog-grid');
  let category = 'Összes';
  const search = document.getElementById('product-search');
  const sort = document.getElementById('product-sort');
  const normalize = s => s.toLocaleLowerCase('hu').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  function filterProducts() {
    if (!grid) return;
    const query = normalize(search.value.trim());
    const cards = [...grid.querySelectorAll('[data-product-card]')];
    cards.sort((a,b) => {
      const pa = products.find(p => p.id === a.dataset.id), pb = products.find(p => p.id === b.dataset.id);
      if (sort.value === 'name') return pa.name.localeCompare(pb.name, 'hu');
      if (sort.value.startsWith('price')) {
        if (pa.price === null) return pb.price === null ? 0 : 1;
        if (pb.price === null) return -1;
        return (pa.price-pb.price)*(sort.value === 'price-up'?1:-1);
      }
      return products.indexOf(pa)-products.indexOf(pb);
    });
    let count = 0;
    cards.forEach(card => {
      const p = products.find(p => p.id === card.dataset.id);
      card.hidden = !((category === 'Összes' || p.category === category) && normalize(p.name+' '+p.subtitle+' '+p.category).includes(query));
      if (!card.hidden) count++;
      grid.append(card);
    });
    document.getElementById('result-count').textContent = `${count} termék`;
    document.getElementById('no-results').hidden = count !== 0;
  }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(el => el.setAttribute('aria-pressed',String(el === button)));
    filterProducts();
  }));
  search?.addEventListener('input', filterProducts); sort?.addEventListener('change', filterProducts);
  document.getElementById('reset-filters')?.addEventListener('click',()=>{search.value='';sort.value='default';document.querySelector('[data-filter="Összes"]').click();search.focus();});
  function refreshProductCopy() {
    document.querySelectorAll('[data-price]').forEach(el => {const p=products.find(p=>p.id===el.dataset.price);if(p)el.textContent=money(p.price);});
    document.querySelectorAll('[data-product-card]').forEach(card => {
      const p = products.find(p => p.id === card.dataset.id); if (!p) return;
      card.querySelector('h3 a').textContent = p.name;
      card.querySelector('[data-add]')?.setAttribute('aria-label',p.name+' kosárba');
    });
    if (document.body.dataset.page === 'product') {
      const id = document.querySelector('[data-use-quantity]')?.dataset.add;
      const p = products.find(p => p.id === id);
      if (p) {
        document.querySelector('.detail-copy h1').textContent = p.name;
        const copy = document.querySelector('.detail-price + p'); if(copy)copy.textContent=p.description;
      }
    }
  }
  document.getElementById('checkout-form')?.addEventListener('submit', event => event.preventDefault());
  document.querySelectorAll('input[name="delivery"]').forEach(input => input.addEventListener('change', () => {
    const home = input.value === 'home';
    document.getElementById('address-fields').hidden = !home;
    document.getElementById('pickup-note').hidden = home;
  }));
  const editor = document.getElementById('editor-form');
  function renderEditor() {
    if (!editor) return;
    document.getElementById('editor-fields').innerHTML = products.map(p => `<div class="editor-card" data-editor-id="${p.id}"><img src="${base}assets/images/${p.images[0]}-480.webp" alt="${esc(p.name)}" width="80" height="100"><div class="editor-fields"><label>Név<input data-edit-name maxlength="120" required value="${esc(p.name)}"></label><label>Ár (Ft)<input data-edit-price type="number" min="0" max="10000000" step="1" value="${p.price ?? ''}" placeholder="Ár hamarosan"></label><label class="span-2">Leírás<textarea data-edit-description maxlength="2000" rows="3">${esc(p.description)}</textarea></label></div></div>`).join('');
  }
  function collectEdits() {
    return original.map(p => {
      const row=editor.querySelector(`[data-editor-id="${p.id}"]`);
      const value=row.querySelector('[data-edit-price]').value;
      return {...p,name:row.querySelector('[data-edit-name]').value.trim(),description:row.querySelector('[data-edit-description]').value.trim(),price:value===''?null:Number(value)};
    });
  }
  editor?.addEventListener('submit', event => {
    event.preventDefault(); if(!editor.reportValidity())return;
    const ok=save(EDIT_KEY,collectEdits());products=getProducts();refreshProductCopy();renderCart();
    document.getElementById('editor-status').textContent=ok?'Előnézet mentve ebben a böngészőben. A végleges oldalak frissítéséhez exportálj és építsd újra a projektet.':'A böngésző nem engedi a helyi mentést. Exportáld a JSON-fájlt.';
  });
  document.getElementById('export-products')?.addEventListener('click',()=>{
    if(!editor.reportValidity())return;
    const blob = new Blob([JSON.stringify(collectEdits(),null,2)+'\n'],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='products.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    document.getElementById('editor-status').textContent='A products.json export elkészült. Ezzel cseréld le a data/products.json fájlt, majd futtasd: npm run build.';
  });
  document.getElementById('reset-products')?.addEventListener('click',()=>{
    try{localStorage.removeItem(EDIT_KEY);}catch{}products=getProducts();renderEditor();refreshProductCopy();renderCart();document.getElementById('editor-status').textContent='Az előnézet visszaállt a projektben tárolt adatokra.';
  });
  window.addEventListener('storage',event=>{
    if(event.key===CART_KEY || event.key===null){cart=normalizeCart(read(CART_KEY,{}));renderCart();}
    if(event.key===EDIT_KEY || event.key===null){products=getProducts();refreshProductCopy();renderCart();filterProducts();renderEditor();}
  });
  refreshProductCopy();renderCart();renderEditor();filterProducts();
})();

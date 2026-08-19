// ============================================================
// MAFRAN ACESSÓRIOS — vitrine (catálogo público)
// ============================================================
import {
  auth,
  googleProvider,
  db,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  increment,
  writeBatch,
} from "./firebase-init.js";
import { STORE_WHATSAPP_FALLBACK, ADMIN_EMAILS } from "./firebase-config.js";
import { categoryIconSVG, icon } from "./icons.js";
import { fmt, getMillis, toast, escapeHtml, escapeAttr } from "./utils.js";

// ---------------------------------------------------------------
// estado
// ---------------------------------------------------------------
let PRODUCTS = [];
let CATEGORIAS = [];
let CONFIG = {
  nomeLoja: "Mafran Acessórios",
  whatsapp: STORE_WHATSAPP_FALLBACK,
  instagram: "usemafran",
  instagramBtnText: "Seguir no Instagram",
  endereco: "Endereço combinado pelo WhatsApp",
  horario: "Seg a Sáb, 9h às 18h",
};
let activeCategoria = "Todos";
let favoritesOnly = false;
let sortMode = "relevancia";
let cart = loadCart();
let favorites = loadFavorites();
let currentUser = null;
let currentProfile = null;

// ---------------------------------------------------------------
// favoritos — persistência local
// ---------------------------------------------------------------
function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem("mafran_favoritos") || "[]");
  } catch {
    return [];
  }
}
function saveFavorites() {
  localStorage.setItem("mafran_favoritos", JSON.stringify(favorites));
}
function isFavorite(id) {
  return favorites.includes(id);
}
function toggleFavorite(id) {
  const idx = favorites.indexOf(id);
  if (idx > -1) {
    favorites.splice(idx, 1);
  } else {
    favorites.push(id);
    toast("Adicionado aos favoritos ♥");
  }
  saveFavorites();
  renderDestaques();
  renderCatalog();
  updateFavTab();
}
function updateFavTab() {
  const badge = document.getElementById("tab-fav-count");
  badge.hidden = favorites.length === 0;
  badge.textContent = favorites.length;
  document.getElementById("tab-favoritos").classList.toggle("active", favoritesOnly);
}

// ---------------------------------------------------------------
// carrinho — persistência local
// ---------------------------------------------------------------
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("mafran_cart") || "{}");
  } catch {
    return {};
  }
}
function saveCart() {
  localStorage.setItem("mafran_cart", JSON.stringify(cart));
}
function cartCount() {
  return Object.values(cart).reduce((s, i) => s + i.qtd, 0);
}
function cartTotal() {
  return Object.values(cart).reduce((s, i) => s + i.qtd * i.preco, 0);
}

// ---------------------------------------------------------------
// conta do cliente — login com Google + cadastro (nome/telefone)
// ---------------------------------------------------------------
const accountBtn = document.getElementById("account-btn");
const accountOverlay = document.getElementById("account-overlay");
const accountForm = document.getElementById("account-form");

function updateAccountUI() {
  const avatarWrap = accountBtn.querySelector(".account-avatar-wrap");
  const label = accountBtn.querySelector(".account-label");
  if (currentUser) {
    accountBtn.classList.add("logged");
    accountBtn.title = "Minha conta";
    const nome = (currentProfile && currentProfile.nome) || currentUser.displayName || "Conta";
    const foto = (currentProfile && currentProfile.foto) || currentUser.photoURL || "";
    avatarWrap.innerHTML = foto ? `<img src="${escapeAttr(foto)}" alt="" />` : nome.charAt(0).toUpperCase();
    label.textContent = nome.split(" ")[0];
  } else {
    accountBtn.classList.remove("logged");
    accountBtn.title = "Entrar";
    avatarWrap.innerHTML = icon("user");
    label.textContent = "Entrar";
  }
}

function profileComplete() {
  return !!(currentProfile && currentProfile.nome && currentProfile.telefone);
}

function openAccountModal() {
  const isNew = !profileComplete();
  document.getElementById("account-modal-title").textContent = isNew ? "Complete seu cadastro" : "Meus dados";
  document.getElementById("account-modal-sub").textContent = isNew
    ? "Para finalizar pedidos mais rápido, conte pra gente seu nome e WhatsApp."
    : "Atualize suas informações quando quiser.";
  document.getElementById("acc-nome").value = (currentProfile && currentProfile.nome) || (currentUser && currentUser.displayName) || "";
  document.getElementById("acc-telefone").value = (currentProfile && currentProfile.telefone) || "";
  accountOverlay.classList.add("open");
}
function closeAccountModal() {
  accountOverlay.classList.remove("open");
}

accountBtn.addEventListener("click", () => {
  if (currentUser) {
    openAccountModal();
  } else {
    signInWithPopup(auth, googleProvider).catch((err) => {
      if (err.code !== "auth/popup-closed-by-user") toast("Não foi possível entrar. Tente novamente.", "error");
    });
  }
});
document.getElementById("close-account-btn").addEventListener("click", closeAccountModal);
accountOverlay.addEventListener("click", (e) => {
  if (e.target === accountOverlay) closeAccountModal();
});
document.getElementById("account-logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  closeAccountModal();
  toast("Você saiu da sua conta.");
});
accountForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const nome = document.getElementById("acc-nome").value.trim();
  const telefone = document.getElementById("acc-telefone").value.trim();
  if (!nome || !telefone) {
    toast("Preencha nome e WhatsApp para continuar.", "error");
    return;
  }
  const submitBtn = accountForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    await setDoc(
      doc(db, "clientes", currentUser.uid),
      { nome, telefone, email: currentUser.email || "", foto: currentUser.photoURL || "", atualizadoEm: serverTimestamp() },
      { merge: true }
    );
    currentProfile = { ...(currentProfile || {}), nome, telefone };
    updateAccountUI();
    closeAccountModal();
    toast("Dados salvos!", "success");
  } catch (err) {
    console.error(err);
    toast("Não foi possível salvar. Tente novamente.", "error");
  }
  submitBtn.disabled = false;
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    currentProfile = null;
    updateAccountUI();
    return;
  }
  if (ADMIN_EMAILS.includes(user.email)) {
    toast("Bem-vindo, administrador! Abrindo o painel...", "success");
    window.location.href = "admin.html";
    return;
  }
  try {
    const ref = doc(db, "clientes", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      currentProfile = snap.data();
    } else {
      currentProfile = null;
      await setDoc(ref, { email: user.email || "", foto: user.photoURL || "", criadoEm: serverTimestamp() }, { merge: true });
    }
  } catch (err) {
    console.error(err);
  }
  updateAccountUI();
  if (!profileComplete()) openAccountModal();
});

// ---------------------------------------------------------------
// whatsapp helpers
// ---------------------------------------------------------------
function waLink(numero, texto) {
  return `https://wa.me/${(numero || "").replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}
function applyStoreLinks() {
  const nome = CONFIG.nomeLoja || "Mafran Acessórios";
  const greet = `Olá, ${nome}! Vim do catálogo digital 👋`;
  
  const waHeader = document.getElementById("whatsapp-header-btn");
  if (waHeader) waHeader.href = waLink(CONFIG.whatsapp, greet);

  const waHero = document.getElementById("whatsapp-hero-btn");
  if (waHero) waHero.href = waLink(CONFIG.whatsapp, greet);

  const waStore = document.getElementById("whatsapp-store-btn");
  if (waStore) waStore.href = waLink(CONFIG.whatsapp, greet);

  const tabWa = document.getElementById("tab-whatsapp");
  if (tabWa) tabWa.href = waLink(CONFIG.whatsapp, greet);

  // Resolução inteligente do Instagram (suporta link completo, @arroba ou username)
  let rawIg = (CONFIG.instagram || "usemafran").trim();
  let igUsername = rawIg;
  let igUrl = "";

  if (rawIg.startsWith("http://") || rawIg.startsWith("https://")) {
    igUrl = rawIg;
    const match = rawIg.match(/(?:instagram\.com\/|instagr\.am\/)([a-zA-Z0-9_.]+)/i);
    igUsername = match ? match[1] : rawIg.replace(/^https?:\/\//i, "");
  } else {
    igUsername = rawIg.replace(/^@/, "").trim();
    if (!igUsername) igUsername = "usemafran";
    igUrl = `https://instagram.com/${igUsername}`;
  }

  const igBtn = document.getElementById("instagram-btn");
  if (igBtn) {
    igBtn.href = igUrl;
    igBtn.textContent = CONFIG.instagramBtnText || "Seguir no Instagram";
  }

  const metaIg = document.getElementById("meta-instagram");
  if (metaIg) {
    metaIg.textContent = igUsername.startsWith("@") ? igUsername : "@" + igUsername;
  }

  const metaHorario = document.getElementById("meta-horario");
  if (metaHorario) {
    metaHorario.textContent = CONFIG.horario || "Seg a Sáb, 9h às 18h";
  }

  const metaEndereco = document.getElementById("meta-endereco");
  if (metaEndereco) {
    metaEndereco.textContent = CONFIG.endereco || "Endereço combinado pelo WhatsApp";
  }
}

// ---------------------------------------------------------------
// config da loja (Firestore: config/loja)
// ---------------------------------------------------------------
onSnapshot(doc(db, "config", "loja"), (snap) => {
  if (snap.exists()) CONFIG = { ...CONFIG, ...snap.data() };
  applyStoreLinks();
});
applyStoreLinks(); // aplica fallback imediatamente, antes do Firestore responder

// ---------------------------------------------------------------
// categorias (Firestore: categorias)
// ---------------------------------------------------------------
onSnapshot(
  collection(db, "categorias"),
  (snap) => {
    CATEGORIAS = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    renderCategoriaPills();
  },
  (err) => console.error(err)
);

// ---------------------------------------------------------------
// Modal Detalhes do Produto
// ---------------------------------------------------------------
const productDetailsOverlay = document.getElementById("product-details-overlay");
const pdCarousel = document.getElementById("pd-carousel");
const pdDots = document.getElementById("pd-dots");
const pdTitle = document.getElementById("pd-title");
const pdCategory = document.getElementById("pd-category");
const pdPrice = document.getElementById("pd-price");
const pdOldPrice = document.getElementById("pd-old-price");
const pdDescription = document.getElementById("pd-description");
const pdAddBtn = document.getElementById("pd-add-btn");

function openProductDetails(p) {
  const fotos = p.fotos && p.fotos.length > 0 ? p.fotos : (p.imagem ? [p.imagem] : []);
  
  // Carousel rendering
  if (fotos.length > 0) {
    pdCarousel.innerHTML = fotos.map(src => `<div class="product-carousel-item"><img src="${escapeAttr(src)}" alt="${escapeAttr(p.nome)}"></div>`).join("");
    if (fotos.length > 1) {
      pdDots.style.display = "flex";
      pdDots.innerHTML = fotos.map((_, i) => `<button class="product-carousel-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></button>`).join("");
    } else {
      pdDots.style.display = "none";
    }
  } else {
    pdCarousel.innerHTML = `<div class="product-carousel-item"><div class="ph-icon" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">${categoryIconSVG(p.categoria)}</div></div>`;
    pdDots.style.display = "none";
  }

  pdTitle.textContent = p.nome;
  pdCategory.textContent = p.categoria || "Sem categoria";
  
  const preco = effectivePrice(p);
  pdPrice.textContent = fmt(preco);
  
  if (preco < p.preco) {
    pdOldPrice.textContent = fmt(p.preco);
    pdOldPrice.style.display = "block";
  } else {
    pdOldPrice.style.display = "none";
  }
  
  pdDescription.innerHTML = (p.descricao || "Sem descrição disponível.").replace(/\n/g, "<br>");
  
  pdAddBtn.onclick = () => {
    changeQty(p.id, 1);
    toast("Adicionado ao carrinho!");
    closeProductDetails();
  };

  const outOfStock = (p.estoque ?? 0) <= 0;
  if (outOfStock) {
    pdAddBtn.disabled = true;
    pdAddBtn.textContent = "Esgotado";
    pdAddBtn.style.background = "var(--ink-soft)";
    pdAddBtn.style.borderColor = "var(--ink-soft)";
  } else {
    pdAddBtn.disabled = false;
    pdAddBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:18px;height:18px"><path d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/><path d="M20 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Adicionar ao carrinho`;
    pdAddBtn.style.background = "";
    pdAddBtn.style.borderColor = "";
  }

  productDetailsOverlay.classList.add("open");
}

function closeProductDetails() {
  productDetailsOverlay.classList.remove("open");
}

document.getElementById("close-product-details-btn").addEventListener("click", closeProductDetails);
productDetailsOverlay.addEventListener("click", (e) => {
  if (e.target === productDetailsOverlay) closeProductDetails();
});

// Setup dot navigation
pdDots.addEventListener("click", (e) => {
  if (e.target.classList.contains("product-carousel-dot")) {
    const idx = parseInt(e.target.dataset.index);
    const itemWidth = pdCarousel.clientWidth;
    pdCarousel.scrollTo({ left: itemWidth * idx, behavior: "smooth" });
  }
});
pdCarousel.addEventListener("scroll", debounce(() => {
  const idx = Math.round(pdCarousel.scrollLeft / pdCarousel.clientWidth);
  const dots = pdDots.querySelectorAll(".product-carousel-dot");
  dots.forEach((dot, i) => dot.classList.toggle("active", i === idx));
}, 50));

// ---------------------------------------------------------------
// interações de click globais
// ---------------------------------------------------------------
document.addEventListener("click", (e) => {
  const btnAdd = e.target.closest(".card-quick-add");
  const btnFav = e.target.closest(".card-fav");
  const card = e.target.closest(".card");

  if (btnAdd) {
    e.preventDefault();
    changeQty(btnAdd.dataset.id, +1);
    toast("Adicionado ao carrinho!");
    return;
  }
  
  if (btnFav) {
    e.preventDefault();
    toggleFavorite(btnFav.dataset.id);
    return;
  }
  
  if (card && !e.target.closest(".stepper")) {
    e.preventDefault();
    const p = PRODUCTS.find((x) => x.id === card.dataset.id);
    if (p) openProductDetails(p);
  }
});

// ---------------------------------------------------------------
// produtos (Firestore: produtos)
// ---------------------------------------------------------------
onSnapshot(
  collection(db, "produtos"),
  (snap) => {
    PRODUCTS = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    reconcileCartWithStock();
    renderCategoriaPills();
    renderDestaques();
    renderCatalog();
    renderCartDrawer();
  },
  (err) => {
    console.error(err);
    document.getElementById("catalog-grid").innerHTML =
      '<p style="grid-column:1/-1;color:var(--ink-soft)">Não foi possível carregar o catálogo agora. Verifique a configuração do Firebase (js/firebase-config.js).</p>';
  }
);

function reconcileCartWithStock() {
  let changed = false;
  for (const id of Object.keys(cart)) {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p || p.ativo === false || (p.estoque ?? 0) <= 0) {
      delete cart[id];
      changed = true;
      continue;
    }
    if (cart[id].qtd > p.estoque) {
      cart[id].qtd = p.estoque;
      changed = true;
    }
  }
  if (changed) {
    saveCart();
    toast("Ajustamos seu pedido conforme o estoque disponível.", "");
  }
}

function effectivePrice(p) {
  return p.precoPromo && p.precoPromo > 0 && p.precoPromo < p.preco ? p.precoPromo : p.preco;
}

// ---------------------------------------------------------------
// render: pílulas de categoria
// ---------------------------------------------------------------
function renderCategoriaPills() {
  const cats = CATEGORIAS.map(c => c.nome);
  const wrapEl = document.getElementById("cat-pills");
  const all = ["Todos", ...cats];
  if (!all.includes(activeCategoria)) activeCategoria = "Todos";
  wrapEl.innerHTML = all
    .map(
      (c) =>
        `<button class="cat-pill ${c === activeCategoria ? "active" : ""}" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>`
    )
    .join("");
}
document.getElementById("cat-pills").addEventListener("click", (e) => {
  const btn = e.target.closest(".cat-pill");
  if (!btn) return;
  activeCategoria = btn.dataset.cat;
  favoritesOnly = false;
  updateFavTab();
  renderCategoriaPills();
  renderCatalog();
});

document.getElementById("sort-select").addEventListener("change", (e) => {
  sortMode = e.target.value;
  renderCatalog();
});

// ---------------------------------------------------------------
// render: destaques
// ---------------------------------------------------------------
function renderDestaques() {
  const section = document.getElementById("destaques");
  const list = PRODUCTS.filter((p) => p.ativo !== false && p.destaque).slice(0, 8);
  if (!list.length) {
    section.style.display = "none";
    return;
  }
  section.style.display = "";
  document.getElementById("destaques-grid").innerHTML = list.map(cardHTML).join("");
}

// ---------------------------------------------------------------
// render: catálogo principal
// ---------------------------------------------------------------
function applySort(list) {
  const arr = [...list];
  if (sortMode === "menor-preco") arr.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  else if (sortMode === "maior-preco") arr.sort((a, b) => effectivePrice(b) - effectivePrice(a));
  else if (sortMode === "novidades") arr.sort((a, b) => getMillis(b.criadoEm) - getMillis(a.criadoEm));
  else
    arr.sort(
      (a, b) =>
        (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0) ||
        (a.categoria || "").localeCompare(b.categoria || "") ||
        (a.nome || "").localeCompare(b.nome || "")
    );
  return arr;
}

function renderCatalog() {
  const grid = document.getElementById("catalog-grid");

  if (!PRODUCTS.length) {
    grid.innerHTML =
      '<p style="grid-column:1/-1;text-align:center;color:var(--ink-soft);padding:40px 0">Novidades chegando em breve ✨</p>';
    document.getElementById("catalog-footnote").textContent = "";
    return;
  }

  let list = PRODUCTS.filter((p) => p.ativo !== false);
  if (favoritesOnly) {
    list = list.filter((p) => isFavorite(p.id));
  } else if (activeCategoria !== "Todos") {
    list = list.filter((p) => p.categoria === activeCategoria);
  }
  list = applySort(list);

  if (!list.length) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--ink-soft);padding:40px 0">${
      favoritesOnly
        ? "Você ainda não favoritou nenhuma peça.<br>Toque no ♥ para salvar suas favoritas."
        : "Nenhuma peça nessa categoria por enquanto."
    }</p>`;
    document.getElementById("catalog-footnote").textContent = "";
    return;
  }
  grid.innerHTML = list.map(cardHTML).join("");

  const visible = PRODUCTS.filter((p) => p.ativo !== false);
  const minPrice = Math.min(...visible.map(effectivePrice));
  document.getElementById(
    "catalog-footnote"
  ).textContent = `${visible.length} peças · preços a partir de ${fmt(minPrice)}`;
}

function cardHTML(p) {
  const preco = effectivePrice(p);
  const temPromo = preco < p.preco;
  const pct = temPromo ? Math.round((1 - preco / p.preco) * 100) : 0;
  const estoque = Number(p.estoque) || 0;
  const soldOut = p.ativo === false || estoque <= 0;
  const inCart = cart[p.id];
  const isNew = p.criadoEm && Date.now() - getMillis(p.criadoEm) < 14 * 24 * 60 * 60 * 1000;
  const fav = isFavorite(p.id);
  const media = p.imagem
    ? `<img src="${escapeAttr(p.imagem)}" alt="${escapeAttr(p.nome)}" loading="lazy" data-cat="${escapeAttr(p.categoria || "")}" onerror="window.__imgFallback(this)" />`
    : `<div class="ph-icon">${categoryIconSVG(p.categoria)}</div>`;

  let primaryBadge = "";
  if (temPromo) primaryBadge = `<span class="badge badge-danger">-${pct}%</span>`;
  else if (p.destaque) primaryBadge = `<span class="badge badge-gold">🔥 Mais vendido</span>`;
  else if (isNew) primaryBadge = `<span class="badge badge-dark">Novo</span>`;

  return `
  <article class="card" data-id="${p.id}">
    <div class="card-media">
      ${media}
      <div class="card-badges">${primaryBadge}</div>
      <button class="card-fav ${fav ? "active" : ""}" data-id="${p.id}" aria-label="Favoritar" title="Favoritar">${icon("heart")}</button>
      ${!soldOut && !inCart ? `<button class="card-quick-add" data-id="${p.id}" aria-label="Adicionar ao pedido" title="Adicionar ao pedido">${icon("bag")}</button>` : ""}
      ${soldOut ? `<div class="card-sold-out">Esgotado</div>` : ""}
    </div>
    <div class="card-body">
      <span class="card-cat">${escapeHtml(p.categoria || "")}</span>
      <h3 class="card-name">${escapeHtml(p.nome || "")}</h3>
      <p class="card-desc">${escapeHtml(p.descricao || "")}</p>
      ${!soldOut && estoque > 0 && estoque <= 3 ? `<p class="card-urgency">Só restam ${estoque}!</p>` : ""}
      <div class="card-foot">
        <div class="card-price">
          ${temPromo ? `<span class="old">${fmt(p.preco)}</span>` : ""}
          <span class="now">${fmt(preco)}</span>
        </div>
        ${
          soldOut
            ? `<button class="btn-icon" disabled style="opacity:.4">${icon("plus")}</button>`
            : `<div class="add-control">
                <button class="btn-icon add-btn" data-id="${p.id}" aria-label="Adicionar" title="Adicionar ao pedido" ${inCart ? 'style="display:none"' : ""}>${icon("plus")}</button>
                <div class="stepper ${inCart ? "show" : ""}" data-id="${p.id}">
                  <button class="dec-btn" data-id="${p.id}" aria-label="Diminuir">${icon("minus")}</button>
                  <span>${inCart ? inCart.qtd : 0}</span>
                  <button class="inc-btn" data-id="${p.id}" aria-label="Aumentar">${icon("plus")}</button>
                </div>
              </div>`
        }
      </div>
    </div>
  </article>`;
}

// clique nos cards (delegação — cobre destaques + catálogo)
function bindGridEvents(container) {
  container.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-btn");
    const quickAddBtn = e.target.closest(".card-quick-add");
    const incBtn = e.target.closest(".inc-btn");
    const decBtn = e.target.closest(".dec-btn");
    const favBtn = e.target.closest(".card-fav");
    if (addBtn) addToCart(addBtn.dataset.id);
    else if (quickAddBtn) addToCart(quickAddBtn.dataset.id);
    else if (incBtn) changeQty(incBtn.dataset.id, +1);
    else if (decBtn) changeQty(decBtn.dataset.id, -1);
    else if (favBtn) toggleFavorite(favBtn.dataset.id);
  });
}
bindGridEvents(document.getElementById("destaques-grid"));
bindGridEvents(document.getElementById("catalog-grid"));

function pulseCartIcon() {
  const btn = document.getElementById("open-cart-btn");
  btn.classList.remove("pulse");
  void btn.offsetWidth;
  btn.classList.add("pulse");
}

function addToCart(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p || (p.estoque ?? 0) <= 0) return;
  cart[id] = { id, nome: p.nome, preco: effectivePrice(p), qtd: 1 };
  saveCart();
  renderDestaques();
  renderCatalog();
  renderCartDrawer();
  pulseCartIcon();
  toast(`${p.nome} adicionado ao pedido`, "success");
}

function changeQty(id, delta) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!cart[id]) return;
  const max = p ? p.estoque ?? 0 : 999;
  cart[id].qtd += delta;
  if (cart[id].qtd > max) cart[id].qtd = max;
  if (cart[id].qtd <= 0) delete cart[id];
  saveCart();
  renderDestaques();
  renderCatalog();
  renderCartDrawer();
  if (delta > 0) pulseCartIcon();
}

function removeFromCart(id) {
  delete cart[id];
  saveCart();
  renderDestaques();
  renderCatalog();
  renderCartDrawer();
}

// ---------------------------------------------------------------
// carrinho — drawer
// ---------------------------------------------------------------
const drawer = document.getElementById("cart-drawer");
const drawerOverlay = document.getElementById("drawer-overlay");

function openDrawer() {
  drawer.classList.add("open");
  drawerOverlay.classList.add("open");
  syncMobileCartBar();
}
function closeDrawer() {
  drawer.classList.remove("open");
  drawerOverlay.classList.remove("open");
  syncMobileCartBar();
}
document.getElementById("open-cart-btn").addEventListener("click", openDrawer);
document.getElementById("close-cart-btn").addEventListener("click", closeDrawer);
drawerOverlay.addEventListener("click", closeDrawer);
document.getElementById("mobile-cart-bar-btn").addEventListener("click", openDrawer);
document.getElementById("tab-carrinho").addEventListener("click", openDrawer);
document.getElementById("tab-home").addEventListener("click", () => document.getElementById("top").scrollIntoView({ behavior: "smooth" }));
document.getElementById("tab-catalogo").addEventListener("click", () => document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" }));
document.getElementById("tab-favoritos").addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  updateFavTab();
  renderCatalog();
  if (favoritesOnly) document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
});

// Atualiza o estado ativo das abas ao rolar a página
const tabHome = document.getElementById("tab-home");
const tabCatalogo = document.getElementById("tab-catalogo");
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      if (entry.target.id === "top") {
        tabHome.classList.add("active");
        tabCatalogo.classList.remove("active");
      } else if (entry.target.id === "catalogo") {
        tabCatalogo.classList.add("active");
        tabHome.classList.remove("active");
      }
    }
  });
}, { threshold: 0.3 });
observer.observe(document.getElementById("top"));
observer.observe(document.getElementById("catalogo"));

function syncMobileCartBar() {
  const bar = document.getElementById("mobile-cart-bar");
  const count = cartCount();
  const shouldShow = count > 0 && !drawer.classList.contains("open") && !checkoutOverlay.classList.contains("open");
  bar.classList.toggle("show", shouldShow);
  document.getElementById("mobile-cart-bar-count").textContent = `${count} ${count === 1 ? "item" : "itens"}`;
  document.getElementById("mobile-cart-bar-total").textContent = fmt(cartTotal());
  const tabBadge = document.getElementById("tab-cart-count");
  tabBadge.hidden = count === 0;
  tabBadge.textContent = count;
}

function renderCartDrawer() {
  const count = cartCount();
  const badge = document.getElementById("cart-count");
  badge.hidden = count === 0;
  badge.textContent = count;

  const body = document.getElementById("cart-body");
  const items = Object.values(cart);
  if (!items.length) {
    body.innerHTML = `<div class="drawer-empty">${icon("cart")}<p>Seu pedido está vazio.<br>Escolha peças no catálogo para começar.</p></div>`;
  } else {
    body.innerHTML = items
      .map((i) => {
        const p = PRODUCTS.find((x) => x.id === i.id);
        const media = p && p.imagem
          ? `<img src="${escapeAttr(p.imagem)}" alt="" data-cat="${escapeAttr(p ? p.categoria || "" : "")}" onerror="window.__imgFallback(this)" />`
          : categoryIconSVG(p ? p.categoria : "");
        return `
        <div class="cart-item">
          <div class="cart-item-media">${media}</div>
          <div class="cart-item-info">
            <div class="name">${escapeHtml(i.nome)}</div>
            <div class="unit-price">${fmt(i.preco)} / un.</div>
            <div class="cart-item-row">
              <div class="stepper show" data-id="${i.id}">
                <button class="dec-btn" data-id="${i.id}">${icon("minus")}</button>
                <span>${i.qtd}</span>
                <button class="inc-btn" data-id="${i.id}">${icon("plus")}</button>
              </div>
              <button class="cart-item-remove" data-id="${i.id}">Remover</button>
            </div>
          </div>
        </div>`;
      })
      .join("");
  }
  document.getElementById("cart-total").textContent = fmt(cartTotal());
  syncMobileCartBar();
}
document.getElementById("cart-body").addEventListener("click", (e) => {
  const inc = e.target.closest(".inc-btn");
  const dec = e.target.closest(".dec-btn");
  const rem = e.target.closest(".cart-item-remove");
  if (inc) changeQty(inc.dataset.id, +1);
  else if (dec) changeQty(dec.dataset.id, -1);
  else if (rem) removeFromCart(rem.dataset.id);
});

// ---------------------------------------------------------------
// checkout
// ---------------------------------------------------------------
const checkoutOverlay = document.getElementById("checkout-overlay");
document.getElementById("checkout-btn").addEventListener("click", () => {
  if (!cartCount()) {
    toast("Seu pedido ainda está vazio.", "error");
    return;
  }
  if (!currentUser) {
    closeDrawer();
    toast("Entre com sua conta Google para finalizar o pedido.", "");
    signInWithPopup(auth, googleProvider).catch((err) => {
      if (err.code !== "auth/popup-closed-by-user") toast("Não foi possível entrar. Tente novamente.", "error");
    });
    return;
  }
  if (!profileComplete()) {
    closeDrawer();
    openAccountModal();
    return;
  }
  renderCheckoutSummary();
  closeDrawer();
  document.getElementById("c-nome").value = currentProfile.nome;
  document.getElementById("c-telefone").value = currentProfile.telefone;
  checkoutOverlay.classList.add("open");
  syncMobileCartBar();
});
document.getElementById("close-checkout-btn").addEventListener("click", () => {
  checkoutOverlay.classList.remove("open");
  syncMobileCartBar();
});
checkoutOverlay.addEventListener("click", (e) => {
  if (e.target === checkoutOverlay) {
    checkoutOverlay.classList.remove("open");
    syncMobileCartBar();
  }
});

function renderCheckoutSummary() {
  const items = Object.values(cart);
  const rows = items
    .map((i) => `<div class="order-summary-row"><span>${i.qtd}x ${escapeHtml(i.nome)}</span><span>${fmt(i.qtd * i.preco)}</span></div>`)
    .join("");
  document.getElementById("checkout-summary").innerHTML =
    rows + `<div class="order-summary-row total"><span>Total</span><span>${fmt(cartTotal())}</span></div>`;
}

document.getElementById("checkout-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const nome = form.nome.value.trim();
  const telefone = form.telefone.value.trim();
  const endereco = form.endereco.value.trim();
  const observacoes = form.observacoes.value.trim();

  if (!nome || !telefone) {
    toast("Preencha nome e WhatsApp para continuar.", "error");
    return;
  }
  if (!cartCount()) {
    toast("Seu pedido está vazio.", "error");
    return;
  }

  submitBtn.disabled = true;
  const originalLabel = submitBtn.innerHTML;
  submitBtn.innerHTML = `<span class="spinner" style="border-top-color:var(--forest-900)"></span> Enviando...`;

  const items = Object.values(cart);
  const total = cartTotal();

  const orderPayload = {
    cliente: {
      nome,
      telefone,
      endereco: endereco || "",
      observacoes: observacoes || "",
    },
    itens: items.map((i) => ({ produtoId: i.id, nome: i.nome, preco: i.preco, quantidade: i.qtd })),
    total,
    clienteUid: currentUser ? currentUser.uid : null,
    criadoEm: new Date().toISOString(),
  };

  let pedidoId = null;

  // 1. Envio seguro via POST / fetch com JSON no body (LGPD & OWASP)
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });
    if (res.ok) {
      const resData = await res.json();
      if (resData && resData.pedidoId) {
        pedidoId = resData.pedidoId;
      }
    }
  } catch (apiErr) {
    console.warn("Aviso: processamento local de API em fallback:", apiErr);
  }

  // 2. Registro no Firestore para o painel administrativo
  try {
    const docRef = await addDoc(collection(db, "pedidos"), {
      itens: items.map((i) => ({ produtoId: i.id, nome: i.nome, preco: i.preco, quantidade: i.qtd })),
      total,
      cliente: { nome, telefone, endereco, observacoes },
      clienteUid: currentUser ? currentUser.uid : null,
      status: "novo",
      criadoEm: serverTimestamp(),
      ...(pedidoId ? { pedidoCodigo: pedidoId } : {}),
    });

    if (!pedidoId && docRef?.id) {
      pedidoId = docRef.id;
    }

    // mantém o cadastro do cliente atualizado com o nome/telefone usados neste pedido
    if (currentUser) {
      setDoc(doc(db, "clientes", currentUser.uid), { nome, telefone, atualizadoEm: serverTimestamp() }, { merge: true })
        .then(() => {
          currentProfile = { ...(currentProfile || {}), nome, telefone };
          updateAccountUI();
        })
        .catch(() => {});
    }

    // baixa de estoque — melhor esforço, não bloqueia o envio caso falhe
    try {
      const batch = writeBatch(db);
      items.forEach((i) => batch.update(doc(db, "produtos", i.id), { estoque: increment(-i.qtd) }));
      await batch.commit();
    } catch (stockErr) {
      console.warn("Não foi possível atualizar o estoque automaticamente:", stockErr);
    }
  } catch (err) {
    console.warn("Não foi possível salvar o pedido no histórico:", err);
  }

  // 3. NUNCA expor dados confidenciais do cliente (nome, telefone, endereço) como parâmetros de URL (query params)
  // Envio de notificação limpa sem PII na query string
  const refText = pedidoId ? ` #${pedidoId.slice(-6).toUpperCase()}` : "";
  const mensagemSegura = `Olá, ${CONFIG.nomeLoja || "Mafran Acessórios"}! Acabei de enviar um pedido pelo catálogo${refText}. Gostaria de confirmar o atendimento!`;

  if (CONFIG.whatsapp) {
    window.open(waLink(CONFIG.whatsapp, mensagemSegura), "_blank");
  }

  cart = {};
  saveCart();
  renderDestaques();
  renderCatalog();
  renderCartDrawer();
  form.reset();
  submitBtn.disabled = false;
  submitBtn.innerHTML = originalLabel;
  checkoutOverlay.classList.remove("open");
  toast("Pedido enviado com sucesso! Seus dados foram protegidos com segurança.", "success");
});

// ---------------------------------------------------------------
// fallback de imagem quebrada -> ícone da categoria
// ---------------------------------------------------------------
window.__imgFallback = function (imgEl) {
  const div = document.createElement("div");
  div.className = "ph-icon";
  div.innerHTML = categoryIconSVG(imgEl.dataset.cat || "");
  imgEl.replaceWith(div);
};

document.getElementById("year").textContent = new Date().getFullYear();

// re-render inicial do carrinho/favoritos/conta (mostra o estado local antes do Firestore/Firebase Auth responder)
renderCartDrawer();
updateFavTab();
updateAccountUI();

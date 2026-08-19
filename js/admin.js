// ============================================================
// MAFRAN ACESSÓRIOS — painel administrativo
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
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  increment,
  writeBatch,
} from "./firebase-init.js";
import { ADMIN_EMAILS, STORE_WHATSAPP_FALLBACK } from "./firebase-config.js";
import { SEED_PRODUCTS } from "./seed-data.js";
import { categoryIconSVG, icon } from "./icons.js";
import { fmt, fmtDate, toast, escapeHtml, debounce, optimizeImageFile } from "./utils.js";

// ---------------------------------------------------------------
// AUTENTICAÇÃO — só entram e-mails da lista ADMIN_EMAILS.
// A segurança "de verdade" está nas regras do Firestore (firestore.rules);
// isto aqui é só a experiência de tela.
// ---------------------------------------------------------------
const gate = document.getElementById("gate");
const gateLogin = document.getElementById("gate-login");
const gateDenied = document.getElementById("gate-denied");
const gateStatus = document.getElementById("gate-status");
const adminShell = document.getElementById("admin-shell");

document.getElementById("google-login-btn").addEventListener("click", async () => {
  gateStatus.hidden = false;
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    console.error(err);
    gateStatus.hidden = true;
    if (err.code !== "auth/popup-closed-by-user") toast("Não foi possível entrar. Tente novamente.", "error");
  }
});
document.getElementById("switch-account-btn").addEventListener("click", async () => {
  await signOut(auth);
  gateDenied.classList.remove("show");
  gateLogin.style.display = "";
});
document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  gateStatus.hidden = true;
  if (!user) {
    currentUser = null;
    adminShell.classList.remove("show");
    gate.style.display = "flex";
    gateLogin.style.display = "";
    gateDenied.classList.remove("show");
    return;
  }
  if (!ADMIN_EMAILS.includes(user.email)) {
    currentUser = null;
    adminShell.classList.remove("show");
    gate.style.display = "flex";
    gateLogin.style.display = "none";
    gateDenied.classList.add("show");
    document.getElementById("denied-email").textContent = user.email;
    return;
  }
  currentUser = user;
  gate.style.display = "none";
  adminShell.classList.add("show");
  document.getElementById("user-photo").src = user.photoURL || "";
  document.getElementById("user-name").textContent = user.displayName || "Administrador";
  document.getElementById("user-email").textContent = user.email;
  startAdminData();
});

// ---------------------------------------------------------------
// NAVEGAÇÃO (sidebar / painéis)
// ---------------------------------------------------------------
const sidebar = document.getElementById("admin-sidebar");
const scrim = document.getElementById("sidebar-scrim");
document.getElementById("open-sidebar-btn").addEventListener("click", () => {
  sidebar.classList.add("open");
  scrim.classList.add("show");
});
scrim.addEventListener("click", () => {
  sidebar.classList.remove("open");
  scrim.classList.remove("show");
});
document.getElementById("admin-nav").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-panel]");
  if (!btn) return;
  document.querySelectorAll("#admin-nav button").forEach((b) => b.classList.toggle("active", b === btn));
  document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + btn.dataset.panel));
  sidebar.classList.remove("open");
  scrim.classList.remove("show");
});

// ---------------------------------------------------------------
// DADOS — inicia as subscrições assim que o admin é autenticado
// ---------------------------------------------------------------
let started = false;
let PRODUCTS = [];
let PEDIDOS = [];
let CLIENTES = [];
let CATEGORIAS = [];

function startAdminData() {
  if (started) return;
  started = true;

  onSnapshot(
    collection(db, "produtos"),
    (snap) => {
      PRODUCTS = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderProdutosTable();
      renderOverview();
      populateCategoriaOptions();
    },
    (err) => {
      console.error(err);
      toast("Erro ao carregar produtos. Confira as regras do Firestore.", "error");
    }
  );

  onSnapshot(
    query(collection(db, "pedidos"), orderBy("criadoEm", "desc")),
    (snap) => {
      PEDIDOS = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderPedidos();
      renderOverview();
    },
    (err) => console.error(err)
  );

  onSnapshot(
    query(collection(db, "clientes"), orderBy("criadoEm", "desc")),
    (snap) => {
      CLIENTES = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderClientes();
      renderOverview();
    },
    (err) => console.error(err)
  );

  onSnapshot(
    collection(db, "categorias"),
    (snap) => {
      CATEGORIAS = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      renderCategorias();
      populateCategoriaOptions();
    },
    (err) => console.error(err)
  );

  onSnapshot(doc(db, "config", "loja"), (snap) => {
    const c = snap.exists()
      ? snap.data()
      : {
          nomeLoja: "Mafran Acessórios",
          whatsapp: STORE_WHATSAPP_FALLBACK,
          instagram: "usemafran",
          instagramBtnText: "Seguir no Instagram",
          endereco: "Endereço combinado pelo WhatsApp",
          horario: "Seg a Sáb, 9h às 18h",
        };
    const form = document.getElementById("config-form");
    if (!form) return;
    form.nomeLoja.value = c.nomeLoja || "";
    form.whatsapp.value = c.whatsapp || "";
    form.instagram.value = c.instagram || "";
    if (form.instagramBtnText) form.instagramBtnText.value = c.instagramBtnText || "";
    form.endereco.value = c.endereco || "";
    form.horario.value = c.horario || "";
  });
}

// ---------------------------------------------------------------
// VISÃO GERAL
// ---------------------------------------------------------------
function renderOverview() {
  const ativos = PRODUCTS.filter((p) => p.ativo !== false);
  const totalEstoque = ativos.reduce((s, p) => s + (Number(p.estoque) || 0), 0);
  const esgotados = ativos.filter((p) => (Number(p.estoque) || 0) <= 0).length;
  const novos = PEDIDOS.filter((p) => (p.status || "novo") === "novo").length;

  document.getElementById("stat-ativos").textContent = ativos.length;
  document.getElementById("stat-estoque").textContent = totalEstoque;
  document.getElementById("stat-esgotado").textContent = esgotados;
  document.getElementById("stat-pedidos").textContent = novos;
  document.getElementById("stat-clientes").textContent = CLIENTES.length;

  document.getElementById("seed-banner").style.display = PRODUCTS.length ? "none" : "flex";

  const low = ativos
    .filter((p) => (Number(p.estoque) || 0) > 0 && Number(p.estoque) <= 5)
    .sort((a, b) => a.estoque - b.estoque)
    .slice(0, 6);
  const tbody = document.getElementById("low-stock-tbody");
  tbody.innerHTML = low.length
    ? low
        .map(
          (p) => `<tr>
            <td class="p-name-cell"><span class="p-name">${escapeHtml(p.nome)}</span> <span class="p-cat">${escapeHtml(p.categoria || "")}</span></td>
            <td><span class="badge badge-warn">${p.estoque} un.</span></td>
          </tr>`
        )
        .join("")
    : `<tr><td style="color:var(--ink-soft);padding:16px 18px">Nenhum produto com estoque baixo. 🎉</td></tr>`;
}

// ---------------------------------------------------------------
// PRODUTOS — tabela, filtros, seed
// ---------------------------------------------------------------
function populateCategoriaOptions() {
  const filterSel = document.getElementById("filter-categoria");
  const pCategoria = document.getElementById("p-categoria");
  const currentFilter = filterSel.value;
  const currentPCat = pCategoria ? pCategoria.value : "";
  
  const optionsHtml = CATEGORIAS.map((c) => `<option value="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}</option>`).join("");
  
  filterSel.innerHTML = '<option value="">Todas categorias</option>' + optionsHtml;
  filterSel.value = currentFilter;

  if (pCategoria) {
    pCategoria.innerHTML = '<option value="">Selecione uma categoria</option>' + optionsHtml;
    pCategoria.value = currentPCat;
  }
}

function getFilteredProducts() {
  const term = document.getElementById("search-input").value.trim().toLowerCase();
  const cat = document.getElementById("filter-categoria").value;
  const status = document.getElementById("filter-status").value;
  return PRODUCTS.filter((p) => {
    if (term && !(p.nome || "").toLowerCase().includes(term)) return false;
    if (cat && p.categoria !== cat) return false;
    if (status === "ativo" && p.ativo === false) return false;
    if (status === "inativo" && p.ativo !== false) return false;
    if (status === "esgotado" && (Number(p.estoque) || 0) > 0) return false;
    return true;
  }).sort((a, b) => (a.categoria || "").localeCompare(b.categoria || "") || (a.nome || "").localeCompare(b.nome || ""));
}

function renderProdutosTable() {
  const list = getFilteredProducts();
  const tbody = document.getElementById("produtos-tbody");
  document.getElementById("produtos-empty").style.display = list.length ? "none" : "block";

  tbody.innerHTML = list
    .map((p) => {
      const preco = p.precoPromo && p.precoPromo > 0 && p.precoPromo < p.preco ? p.precoPromo : p.preco;
      const temPromo = preco < p.preco;
      const media = p.imagem
        ? `<img src="${escapeHtml(p.imagem)}" alt="" data-cat="${escapeHtml(p.categoria || "")}" onerror="window.__adminImgFallback(this)" />`
        : categoryIconSVG(p.categoria);
      const estoque = Number(p.estoque) || 0;
      let statusBadge = `<span class="badge badge-success">Ativo</span>`;
      if (p.ativo === false) statusBadge = `<span class="badge badge-muted">Inativo</span>`;
      else if (estoque <= 0) statusBadge = `<span class="badge badge-danger">Esgotado</span>`;

      return `
      <tr data-id="${p.id}">
        <td>
          <div class="p-row-media">
            <div class="p-thumb">${media}</div>
            <div class="p-name-cell">
              <div class="p-name">${escapeHtml(p.nome || "")}</div>
              <div class="p-cat">${escapeHtml(p.categoria || "")}</div>
            </div>
          </div>
        </td>
        <td>
          ${temPromo ? `<span style="text-decoration:line-through;color:var(--ink-soft);font-size:.76rem;display:block">${fmt(p.preco)}</span>` : ""}
          <strong>${fmt(preco)}</strong>
        </td>
        <td>
          <div class="stock-adjust">
            <button class="dec-stock" data-id="${p.id}">${icon("minus")}</button>
            <span class="n">${estoque}</span>
            <button class="inc-stock" data-id="${p.id}">${icon("plus")}</button>
          </div>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div class="p-actions">
            <button class="icon-btn edit-btn" data-id="${p.id}" title="Editar">${icon("edit")}</button>
            <button class="icon-btn danger del-btn" data-id="${p.id}" title="Excluir">${icon("trash")}</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");
}
window.__adminImgFallback = function (imgEl) {
  const div = document.createElement("div");
  div.className = "ph-icon";
  div.style.cssText = "width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff";
  div.innerHTML = categoryIconSVG(imgEl.dataset.cat || "");
  imgEl.replaceWith(div);
};

document.getElementById("search-input").addEventListener("input", debounce(renderProdutosTable, 200));
["filter-categoria", "filter-status"].forEach((id) =>
  document.getElementById(id).addEventListener("input", renderProdutosTable)
);

document.getElementById("produtos-tbody").addEventListener("click", async (e) => {
  const id = e.target.closest("[data-id]")?.dataset.id;
  if (!id) return;
  const p = PRODUCTS.find((x) => x.id === id);
  if (e.target.closest(".edit-btn")) openProductModal(p);
  else if (e.target.closest(".del-btn")) confirmDeleteProduct(p);
  else if (e.target.closest(".inc-stock")) updateDoc(doc(db, "produtos", id), { estoque: increment(1) });
  else if (e.target.closest(".dec-stock")) {
    if ((p?.estoque || 0) <= 0) return;
    updateDoc(doc(db, "produtos", id), { estoque: increment(-1) });
  }
});

async function confirmDeleteProduct(p) {
  if (!confirm(`Excluir "${p.nome}"? Essa ação não pode ser desfeita.`)) return;
  try {
    await deleteDoc(doc(db, "produtos", p.id));
    toast("Produto excluído.", "success");
  } catch (err) {
    console.error(err);
    toast("Não foi possível excluir. Tente novamente.", "error");
  }
}

// seed
document.getElementById("seed-btn").addEventListener("click", async () => {
  if (!confirm(`Isso vai adicionar ${SEED_PRODUCTS.length} produtos de exemplo à sua loja. Continuar?`)) return;
  const btn = document.getElementById("seed-btn");
  btn.disabled = true;
  btn.textContent = "Carregando...";
  try {
    const batch = writeBatch(db);
    SEED_PRODUCTS.forEach((p) => {
      const ref = doc(collection(db, "produtos"));
      batch.set(ref, { ...p, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
    });
    await batch.commit();
    toast("Produtos de exemplo carregados!", "success");
  } catch (err) {
    console.error(err);
    toast("Não foi possível carregar os produtos de exemplo.", "error");
  }
  btn.disabled = false;
  btn.textContent = "Carregar produtos de exemplo";
});

// ---------------------------------------------------------------
// MODAL DE PRODUTO (criar / editar) E UPLOAD DE IMAGEM
// ---------------------------------------------------------------
const productModal = document.getElementById("product-modal");
const productForm = document.getElementById("product-form");
const imageZone = document.getElementById("p-image-zone");
const imageFileInput = document.getElementById("p-image-file");
const imageEmptyBox = document.getElementById("p-image-empty");
const imagePreviewBox = document.getElementById("p-image-preview");
const imagePreviewImg = document.getElementById("p-image-preview-img");
let currentFotos = [];

function renderFotos() {
  imagePreviewBox.innerHTML = "";
  if (currentFotos.length > 0) {
    imageEmptyBox.style.display = "none";
    imagePreviewBox.style.display = "flex";
    
    currentFotos.forEach((src, index) => {
      const wrap = document.createElement("div");
      wrap.style.position = "relative";
      wrap.style.width = "70px";
      wrap.style.height = "70px";
      wrap.style.borderRadius = "6px";
      wrap.style.overflow = "hidden";
      wrap.style.border = "1px solid var(--line)";
      
      const img = document.createElement("img");
      img.src = src;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      
      const rmBtn = document.createElement("button");
      rmBtn.innerHTML = "&times;";
      rmBtn.style.position = "absolute";
      rmBtn.style.top = "2px";
      rmBtn.style.right = "2px";
      rmBtn.style.background = "rgba(0,0,0,0.6)";
      rmBtn.style.color = "white";
      rmBtn.style.border = "none";
      rmBtn.style.borderRadius = "50%";
      rmBtn.style.width = "20px";
      rmBtn.style.height = "20px";
      rmBtn.style.cursor = "pointer";
      rmBtn.style.display = "flex";
      rmBtn.style.alignItems = "center";
      rmBtn.style.justifyContent = "center";
      rmBtn.style.fontSize = "14px";
      
      rmBtn.onclick = (e) => {
        e.stopPropagation();
        currentFotos.splice(index, 1);
        renderFotos();
      };
      
      wrap.appendChild(img);
      wrap.appendChild(rmBtn);
      imagePreviewBox.appendChild(wrap);
    });
  } else {
    imageEmptyBox.style.display = "flex";
    imagePreviewBox.style.display = "none";
  }
}

async function handleFileSelection(files) {
  if (!files || files.length === 0) return;
  
  let loader = imageZone.querySelector(".image-upload-loading");
  if (!loader) {
    loader = document.createElement("div");
    loader.className = "image-upload-loading";
    loader.innerHTML = '<span class="spinner"></span><span>Otimizando imagens...</span>';
    imageZone.appendChild(loader);
  }
  loader.style.display = "flex";

  try {
    for (let i = 0; i < files.length; i++) {
      if (currentFotos.length >= 4) {
        toast("Limite máximo de 4 fotos atingido.", "warn");
        break;
      }
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await optimizeImageFile(file, 1000, 1000, 0.82);
      currentFotos.push(dataUrl);
    }
    renderFotos();
    if (urlInput) urlInput.value = "";
    toast("Fotos processadas!", "success");
  } catch (err) {
    console.error(err);
    toast(err.message || "Erro ao processar imagens.", "error");
  } finally {
    loader.style.display = "none";
  }
}

// Eventos de clique e drag/drop na área de upload
imageZone.addEventListener("click", (e) => {
  if (e.target.closest("button")) return;
  if (currentFotos.length >= 4) {
    toast("Você já adicionou 4 fotos. Remova alguma para adicionar outra.", "warn");
    return;
  }
  imageFileInput.click();
});
imageFileInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFileSelection(e.target.files);
  }
});

// Drag and drop
imageZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  imageZone.classList.add("dragover");
});
imageZone.addEventListener("dragleave", () => {
  imageZone.classList.remove("dragover");
});
imageZone.addEventListener("drop", (e) => {
  e.preventDefault();
  imageZone.classList.remove("dragover");
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFileSelection(e.dataTransfer.files);
  }
});

// Colar imagem da área de transferência (Ctrl+V) dentro do modal
productModal.addEventListener("paste", (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  const files = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith("image/")) {
      const file = items[i].getAsFile();
      if (file) files.push(file);
    }
  }
  if (files.length > 0) handleFileSelection(files);
});

// Toggle URL opcional
toggleUrlBtn.addEventListener("click", () => {
  const isOpen = urlCollapse.style.display !== "none";
  urlCollapse.style.display = isOpen ? "none" : "block";
  if (urlToggleArrow) {
    urlToggleArrow.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
  }
});
urlInput.addEventListener("input", debounce(() => {
  const val = urlInput.value.trim();
  if (val) {
    const urls = val.split(",").map(u => u.trim()).filter(Boolean);
    urls.forEach(u => {
      if (currentFotos.length < 4) {
        currentFotos.push(u);
      }
    });
    renderFotos();
    urlInput.value = "";
  }
}, 300));

function openProductModal(p = null) {
  productForm.reset();
  document.getElementById("p-id").value = p?.id || "";
  document.getElementById("product-modal-title").textContent = p ? "Editar produto" : "Novo produto";
  document.getElementById("delete-product-btn").style.display = p ? "" : "none";
  document.getElementById("p-nome").value = p?.nome || "";
  document.getElementById("p-categoria").value = p?.categoria || "";
  document.getElementById("p-estoque").value = p?.estoque ?? 0;
  document.getElementById("p-preco").value = p?.preco ?? "";
  document.getElementById("p-preco-promo").value = p?.precoPromo ?? "";
  document.getElementById("p-descricao").value = p?.descricao || "";
  document.getElementById("p-destaque").checked = !!p?.destaque;
  document.getElementById("p-ativo").checked = p?.ativo !== false;

  // Imagem
  currentFotos = p?.fotos ? [...p.fotos] : (p?.imagem ? [p.imagem] : []);
  renderFotos();
  urlInput.value = "";
  urlCollapse.style.display = "none";
  if (urlToggleArrow) urlToggleArrow.style.transform = "rotate(0deg)";

  productModal.classList.add("open");
}
document.getElementById("new-product-btn").addEventListener("click", () => openProductModal());
document.getElementById("close-product-modal").addEventListener("click", () => productModal.classList.remove("open"));
productModal.addEventListener("click", (e) => {
  if (e.target === productModal) productModal.classList.remove("open");
});

document.getElementById("delete-product-btn").addEventListener("click", () => {
  const id = document.getElementById("p-id").value;
  const p = PRODUCTS.find((x) => x.id === id);
  if (p) confirmDeleteProduct(p).then(() => productModal.classList.remove("open"));
});

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("p-id").value;
  const precoPromoVal = document.getElementById("p-preco-promo").value;
  const payload = {
    nome: document.getElementById("p-nome").value.trim(),
    categoria: document.getElementById("p-categoria").value.trim(),
    estoque: Math.max(0, parseInt(document.getElementById("p-estoque").value, 10) || 0),
    preco: parseFloat(document.getElementById("p-preco").value) || 0,
    precoPromo: precoPromoVal ? parseFloat(precoPromoVal) : null,
    fotos: currentFotos,
    imagem: currentFotos.length > 0 ? currentFotos[0] : "", // fallback property
    descricao: document.getElementById("p-descricao").value.trim(),
    destaque: document.getElementById("p-destaque").checked,
    ativo: document.getElementById("p-ativo").checked,
    atualizadoEm: serverTimestamp(),
  };

  const submitBtn = productForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    if (id) {
      await updateDoc(doc(db, "produtos", id), payload);
      toast("Produto atualizado.", "success");
    } else {
      payload.criadoEm = serverTimestamp();
      await addDoc(collection(db, "produtos"), payload);
      toast("Produto criado.", "success");
    }
    productModal.classList.remove("open");
  } catch (err) {
    console.error(err);
    toast("Não foi possível salvar. Tente novamente.", "error");
  }
  submitBtn.disabled = false;
});

// ---------------------------------------------------------------
// PEDIDOS
// ---------------------------------------------------------------
function renderPedidos() {
  const statusFilter = document.getElementById("filter-pedido-status").value;
  const list = PEDIDOS.filter((p) => !statusFilter || (p.status || "novo") === statusFilter);
  const wrapEl = document.getElementById("pedidos-list");
  document.getElementById("pedidos-empty").style.display = list.length ? "none" : "block";

  const statusLabel = { novo: "Novo", andamento: "Em andamento", concluido: "Concluído" };
  const statusBadgeClass = { novo: "badge-warn", andamento: "badge-dark", concluido: "badge-success" };

  wrapEl.innerHTML = list
    .map((ped) => {
      const st = ped.status || "novo";
      const itensHtml = (ped.itens || [])
        .map((i) => `<li><span>${i.quantidade}x ${escapeHtml(i.nome)}</span><span>${fmt(i.quantidade * i.preco)}</span></li>`)
        .join("");
      const cli = ped.cliente || {};
      const waNumero = (cli.telefone || "").replace(/\D/g, "");
      return `
      <div class="order-card">
        <div class="order-card-head">
          <div>
            <div class="who">${escapeHtml(cli.nome || "Cliente")}</div>
            <div class="when">${fmtDate(ped.criadoEm)} · ${escapeHtml(cli.telefone || "")}</div>
            ${cli.endereco ? `<div class="when">${escapeHtml(cli.endereco)}</div>` : ""}
            ${cli.observacoes ? `<div class="when">Obs: ${escapeHtml(cli.observacoes)}</div>` : ""}
          </div>
          <span class="badge ${statusBadgeClass[st] || "badge-warn"}">${statusLabel[st] || "Novo"}</span>
        </div>
        <ul class="order-items">${itensHtml}</ul>
        <div class="order-foot">
          <div class="order-total">${fmt(ped.total || 0)}</div>
          <div style="display:flex;gap:8px;align-items:center">
            ${waNumero ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://wa.me/${waNumero}">Abrir WhatsApp</a>` : ""}
            <select class="status-select" data-id="${ped.id}">
              <option value="novo" ${st === "novo" ? "selected" : ""}>Novo</option>
              <option value="andamento" ${st === "andamento" ? "selected" : ""}>Em andamento</option>
              <option value="concluido" ${st === "concluido" ? "selected" : ""}>Concluído</option>
            </select>
          </div>
        </div>
      </div>`;
    })
    .join("");
}
document.getElementById("filter-pedido-status").addEventListener("change", renderPedidos);
document.getElementById("pedidos-list").addEventListener("change", (e) => {
  const sel = e.target.closest(".status-select");
  if (!sel) return;
  updateDoc(doc(db, "pedidos", sel.dataset.id), { status: sel.value }).catch(() => toast("Não foi possível atualizar o status.", "error"));
});

// ---------------------------------------------------------------
// CLIENTES — cadastrados via login Google no catálogo
// ---------------------------------------------------------------
function renderClientes() {
  const term = document.getElementById("clientes-search-input").value.trim().toLowerCase();
  const list = CLIENTES.filter(
    (c) => !term || (c.nome || "").toLowerCase().includes(term) || (c.telefone || "").includes(term) || (c.email || "").toLowerCase().includes(term)
  );
  const tbody = document.getElementById("clientes-tbody");
  document.getElementById("clientes-empty").style.display = list.length ? "none" : "block";

  tbody.innerHTML = list
    .map((c) => {
      const waNumero = (c.telefone || "").replace(/\D/g, "");
      const foto = c.foto
        ? `<img src="${escapeHtml(c.foto)}" alt="" />`
        : `<div class="ph-icon" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff">${icon("user")}</div>`;
      return `
      <tr data-id="${c.id}">
        <td>
          <div class="p-row-media">
            <div class="p-thumb">${foto}</div>
            <div class="p-name-cell">
              <div class="p-name">${escapeHtml(c.nome || "Sem nome informado")}</div>
            </div>
          </div>
        </td>
        <td>${waNumero ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://wa.me/${waNumero}">${escapeHtml(c.telefone)}</a>` : `<span style="color:var(--ink-soft)">—</span>`}</td>
        <td>${escapeHtml(c.email || "—")}</td>
        <td>${fmtDate(c.criadoEm)}</td>
        <td>
          <div class="p-actions">
            <button class="icon-btn edit-cliente-btn" data-id="${c.id}" title="Editar">${icon("edit")}</button>
            <button class="icon-btn danger del-cliente-btn" data-id="${c.id}" title="Excluir cadastro">${icon("trash")}</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");
}
document.getElementById("clientes-search-input").addEventListener("input", debounce(renderClientes, 200));
document.getElementById("clientes-tbody").addEventListener("click", async (e) => {
  const id = e.target.closest("[data-id]")?.dataset.id;
  if (!id) return;
  const c = CLIENTES.find((x) => x.id === id);
  if (e.target.closest(".edit-cliente-btn")) {
    openClientModal(c);
    return;
  }
  if (!e.target.closest(".del-cliente-btn")) return;
  if (!confirm(`Excluir o cadastro de "${c?.nome || "este cliente"}"? Essa ação não pode ser desfeita.`)) return;
  try {
    await deleteDoc(doc(db, "clientes", id));
    toast("Cadastro excluído.", "success");
  } catch (err) {
    console.error(err);
    toast("Não foi possível excluir. Tente novamente.", "error");
  }
});

// ---------------------------------------------------------------
// MODAL DE CLIENTE (cadastro manual / edição pelo admin)
// ---------------------------------------------------------------
const clientModal = document.getElementById("client-modal");
const clientForm = document.getElementById("client-form");

function openClientModal(c = null) {
  clientForm.reset();
  document.getElementById("c-id").value = c?.id || "";
  document.getElementById("client-modal-title").textContent = c ? "Editar cliente" : "Novo cliente";
  document.getElementById("delete-client-btn").style.display = c ? "" : "none";
  document.getElementById("c-nome").value = c?.nome || "";
  document.getElementById("c-telefone").value = c?.telefone || "";
  document.getElementById("c-email").value = c?.email || "";
  clientModal.classList.add("open");
}
document.getElementById("new-client-btn").addEventListener("click", () => openClientModal());
document.getElementById("close-client-modal").addEventListener("click", () => clientModal.classList.remove("open"));
clientModal.addEventListener("click", (e) => {
  if (e.target === clientModal) clientModal.classList.remove("open");
});

document.getElementById("delete-client-btn").addEventListener("click", async () => {
  const id = document.getElementById("c-id").value;
  const c = CLIENTES.find((x) => x.id === id);
  if (!c) return;
  if (!confirm(`Excluir o cadastro de "${c.nome || "este cliente"}"? Essa ação não pode ser desfeita.`)) return;
  try {
    await deleteDoc(doc(db, "clientes", id));
    toast("Cadastro excluído.", "success");
    clientModal.classList.remove("open");
  } catch (err) {
    console.error(err);
    toast("Não foi possível excluir. Tente novamente.", "error");
  }
});

clientForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("c-id").value;
  const payload = {
    nome: document.getElementById("c-nome").value.trim(),
    telefone: document.getElementById("c-telefone").value.trim(),
    email: document.getElementById("c-email").value.trim(),
    atualizadoEm: serverTimestamp(),
  };

  const submitBtn = clientForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    if (id) {
      await updateDoc(doc(db, "clientes", id), payload);
      toast("Cliente atualizado.", "success");
    } else {
      payload.criadoEm = serverTimestamp();
      await addDoc(collection(db, "clientes"), payload);
      toast("Cliente cadastrado.", "success");
    }
    clientModal.classList.remove("open");
  } catch (err) {
    console.error(err);
    toast("Não foi possível salvar. Tente novamente.", "error");
  }
  submitBtn.disabled = false;
});

// ---------------------------------------------------------------
// CONFIGURAÇÕES DA LOJA
// ---------------------------------------------------------------
document.getElementById("config-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  const data = {
    nomeLoja: form.nomeLoja.value.trim(),
    whatsapp: form.whatsapp.value.replace(/\D/g, ""),
    instagram: form.instagram.value.trim(),
    instagramBtnText: form.instagramBtnText ? form.instagramBtnText.value.trim() : "",
    endereco: form.endereco.value.trim(),
    horario: form.horario.value.trim(),
  };

  try {
    await setDoc(doc(db, "config", "loja"), data, { merge: true });
    toast("Configurações salvas com sucesso.", "success");
  } catch (err) {
    console.error(err);
    toast("Não foi possível salvar as configurações.", "error");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

// ---------------------------------------------------------------
// CATEGORIAS — CRUD
// ---------------------------------------------------------------
function renderCategorias() {
  const tbody = document.getElementById("categorias-tbody");
  document.getElementById("categorias-empty").style.display = CATEGORIAS.length ? "none" : "block";

  tbody.innerHTML = CATEGORIAS
    .map((c) => {
      return `
      <tr data-id="${c.id}">
        <td><strong>${escapeHtml(c.nome || "")}</strong></td>
        <td>
          <div class="p-actions">
            <button class="icon-btn edit-categoria-btn" data-id="${c.id}" title="Editar">${icon("edit")}</button>
            <button class="icon-btn danger del-categoria-btn" data-id="${c.id}" title="Excluir">${icon("trash")}</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");
}

document.getElementById("categorias-tbody").addEventListener("click", async (e) => {
  const id = e.target.closest("[data-id]")?.dataset.id;
  if (!id) return;
  const c = CATEGORIAS.find((x) => x.id === id);
  if (e.target.closest(".edit-categoria-btn")) {
    openCategoriaModal(c);
    return;
  }
  if (!e.target.closest(".del-categoria-btn")) return;
  if (!confirm(`Excluir a categoria "${c?.nome || ""}"? Essa ação não apaga os produtos, mas eles ficarão sem categoria correspondente.`)) return;
  try {
    await deleteDoc(doc(db, "categorias", id));
    toast("Categoria excluída.", "success");
  } catch (err) {
    console.error(err);
    toast("Não foi possível excluir. Tente novamente.", "error");
  }
});

const categoriaModal = document.getElementById("categoria-modal");
const categoriaForm = document.getElementById("categoria-form");

function openCategoriaModal(c = null) {
  categoriaForm.reset();
  document.getElementById("cat-id").value = c?.id || "";
  document.getElementById("categoria-modal-title").textContent = c ? "Editar categoria" : "Nova categoria";
  document.getElementById("delete-categoria-btn").style.display = c ? "" : "none";
  document.getElementById("cat-nome").value = c?.nome || "";
  categoriaModal.classList.add("open");
}
document.getElementById("new-category-btn").addEventListener("click", () => openCategoriaModal());
document.getElementById("close-categoria-modal").addEventListener("click", () => categoriaModal.classList.remove("open"));
categoriaModal.addEventListener("click", (e) => {
  if (e.target === categoriaModal) categoriaModal.classList.remove("open");
});

document.getElementById("delete-categoria-btn").addEventListener("click", async () => {
  const id = document.getElementById("cat-id").value;
  const c = CATEGORIAS.find((x) => x.id === id);
  if (!c) return;
  if (!confirm(`Excluir a categoria "${c.nome}"?`)) return;
  try {
    await deleteDoc(doc(db, "categorias", id));
    toast("Categoria excluída.", "success");
    categoriaModal.classList.remove("open");
  } catch (err) {
    console.error(err);
    toast("Erro ao excluir.", "error");
  }
});

categoriaForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("cat-id").value;
  const nome = document.getElementById("cat-nome").value.trim();
  const oldCat = CATEGORIAS.find((x) => x.id === id);
  
  const submitBtn = categoriaForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    if (id) {
      await updateDoc(doc(db, "categorias", id), { nome, atualizadoEm: serverTimestamp() });
      toast("Categoria atualizada.", "success");
      
      // Update all products with this category
      if (oldCat && oldCat.nome !== nome) {
        const batch = writeBatch(db);
        let updatedCount = 0;
        PRODUCTS.filter(p => p.categoria === oldCat.nome).forEach(p => {
          batch.update(doc(db, "produtos", p.id), { categoria: nome });
          updatedCount++;
        });
        if (updatedCount > 0) {
          await batch.commit();
          toast(`${updatedCount} produtos atualizados para a nova categoria.`, "success");
        }
      }
    } else {
      await addDoc(collection(db, "categorias"), { nome, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
      toast("Categoria criada.", "success");
    }
    categoriaModal.classList.remove("open");
  } catch (err) {
    console.error(err);
    toast("Não foi possível salvar. Tente novamente.", "error");
  }
  submitBtn.disabled = false;
});


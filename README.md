# Mafran Acessórios — Catálogo Digital

Catálogo digital responsivo para a Mafran Acessórios, com painel administrativo
protegido por login Google, controle de estoque em tempo real (Firestore) e
finalização de pedido direto pelo WhatsApp — sem cadastro, sem complicação
para o cliente.

Feito em HTML/CSS/JS puro (sem build, sem Node necessário para rodar) usando o
Firebase (Authentication + Firestore + Hosting), no estilo visual da
identidade Mafran: verde floresta, creme, tipografia serifada elegante.

## Estrutura do projeto

```
catalogo/
├── index.html          → vitrine pública (catálogo)
├── admin.html           → painel administrativo
├── css/
│   ├── base.css          → tokens de design, reset, componentes comuns
│   ├── site.css           → estilos da vitrine
│   └── admin.css          → estilos do painel
├── js/
│   ├── firebase-config.js  → SUAS chaves do Firebase + lista de admins (edite este arquivo)
│   ├── firebase-init.js     → inicialização do Firebase (não precisa mexer)
│   ├── seed-data.js          → 15 produtos de exemplo para popular o catálogo
│   ├── icons.js                → ícones SVG usados no site
│   ├── site.js                   → lógica da vitrine (carrinho, checkout, WhatsApp)
│   └── admin.js                    → lógica do painel (CRUD, estoque, pedidos)
├── firestore.rules      → regras de segurança (só os e-mails autorizados escrevem)
├── firebase.json         → configuração do Firebase Hosting
└── .firebaserc             → ID do seu projeto Firebase
```

## 1. Criar o projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e clique em **Criar projeto**.
2. Dê um nome (ex: `mafran-catalogo`) e conclua a criação.
3. No menu lateral, vá em **Build → Authentication → Sign-in method** e ative o provedor **Google**.
4. Ainda no menu, vá em **Build → Firestore Database → Criar banco de dados**.
   - Escolha o modo **produção** (as regras de segurança do projeto já cuidam do resto).
   - Escolha a região mais próxima de você (ex: `southamerica-east1`).
5. Em **Configurações do projeto** (ícone de engrenagem) → aba **Geral** → role até
   "Seus aplicativos" → clique no ícone **`</>`** (Web) → dê um apelido (ex: `catalogo-web`)
   → **não** marque Hosting agora → clique em **Registrar app**.
6. O Firebase vai mostrar um objeto `firebaseConfig`. Copie os valores.

## 2. Configurar o projeto

Abra **`js/firebase-config.js`** e cole seus valores:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

Nesse mesmo arquivo confira a lista `ADMIN_EMAILS` — já vem com:

```js
export const ADMIN_EMAILS = ["soumafran@gmail.com", "brisasofc@gmail.com"];
```

Se precisar adicionar/remover um administrador, edite **os dois lugares**:
este arquivo (`js/firebase-config.js`) **e** o arquivo `firestore.rules`
(a lista dentro da função `isAdmin()`). O arquivo `firebase-config.js`
só controla a tela; quem realmente barra o acesso é o `firestore.rules`.

## 3. Publicar as regras de segurança

Você precisa do [Node.js](https://nodejs.org) instalado (só para rodar o CLI do Firebase).

```powershell
npm install -g firebase-tools
firebase login
```

Edite o arquivo **`.firebaserc`** trocando `SEU-PROJETO-ID` pelo ID real do seu
projeto (aparece em Configurações do projeto → Geral → "ID do projeto").

Depois, na pasta do projeto:

```powershell
firebase deploy --only firestore:rules
```

Isso publica o `firestore.rules`, que é o que de fato impede qualquer pessoa
fora da lista `ADMIN_EMAILS` de criar, editar ou apagar produtos, pedidos e
configurações — mesmo que tente burlar a interface.

## 4. Rodar localmente

Como o site usa `type="module"`, ele precisa ser aberto por um servidor local
(não funciona com duplo clique no arquivo, por causa de restrições do navegador
a `file://`). Duas opções simples:

**Com o CLI do Firebase:**
```powershell
firebase serve
```
Abra `http://localhost:5000` (vitrine) e `http://localhost:5000/admin.html` (painel).

**Ou com a extensão "Live Server" do VS Code**, clicando com o botão direito em
`index.html` → "Open with Live Server".

## 5. Publicar (deploy)

Você pode publicar tanto no **Firebase Hosting** quanto na **Vercel** — o
projeto é HTML/CSS/JS puro, então funciona nos dois sem alterações. O único
serviço que continua sendo o Firebase é o banco de dados (Firestore) e o
login (Authentication); o Hosting é só onde os arquivos ficam publicados.

**Opção A — Firebase Hosting:**
```powershell
firebase deploy
```
Ao final o terminal mostra a URL pública (algo como `https://mafran-catalogo.web.app`).

**Opção B — Vercel** (já vem com `vercel.json` configurado, inclusive o
atalho `/admin` → `admin.html`):
```powershell
npm install -g vercel
vercel --prod
```
Ou, se preferir, suba a pasta para um repositório Git e importe o projeto pelo
painel da Vercel (vercel.com/new) — o deploy passa a ser automático a cada push.

Compartilhe o link publicado com o cliente; o painel fica em `/admin.html` (ou `/admin`).

### ⚠️ Passo obrigatório ao trocar de domínio (Vercel, domínio próprio, etc.)

O login com Google só funciona em domínios que o Firebase reconhece. Sempre
que publicar em um domínio novo (ex: `catalogo-mafran.vercel.app`, ou um
domínio próprio depois), vá em **Firebase Console → Authentication →
Settings → Authorized domains → Add domain** e cadastre esse domínio. Sem
esse passo, o botão "Entrar com Google" do painel abre o popup e fecha
sozinho com erro, mesmo com tudo o mais configurado certo.

## 6. Primeiro acesso ao painel

1. Acesse `/admin.html`, clique em **Entrar com Google** e use um dos e-mails
   autorizados (`soumafran@gmail.com` ou `brisasofc@gmail.com`).
2. Na aba **Visão geral**, clique em **"Carregar produtos de exemplo"** para
   popular o catálogo com 15 peças de exemplo (colares, pulseiras, brincos,
   anéis, relógios) — edite ou apague o que quiser depois.
3. Vá em **Configurações** e confira o número de **WhatsApp da loja** — já
   vem pré-preenchido com `55 71 99600-3444`, mas você pode trocar a
   qualquer momento por aqui. Preencha também Instagram, endereço e horário
   — esses dados aparecem automaticamente na vitrine.
4. Em **Produtos & estoque** você cadastra/edita peças (nome, categoria,
   preço, preço promocional, estoque, imagem por URL, descrição) e ajusta o
   estoque com os botões +/- direto na tabela.
5. Em **Pedidos** você acompanha os pedidos feitos pelos clientes (nome,
   telefone, itens, total) e pode marcar o status como *Em andamento* ou
   *Concluído*, além de abrir o WhatsApp do cliente com um clique.

## Contas de cliente (botão "Entrar")

A vitrine agora tem um botão **"Entrar"** no cabeçalho, separado do login do
painel administrativo:

- Se a pessoa entrar com um e-mail que está em `ADMIN_EMAILS`
  (`soumafran@gmail.com` ou `brisasofc@gmail.com`), ela é automaticamente
  redirecionada para o painel (`admin.html`) — é o mesmo login, só que
  disparado a partir da vitrine.
- Qualquer outro e-mail é tratado como **cliente**: após entrar com Google,
  é pedido nome completo e WhatsApp (isso fica salvo na coleção `clientes`
  do Firestore, visível na aba **Clientes** do painel). Da segunda visita em
  diante, o login já vem preenchido automaticamente.
- É preciso estar logado (e com nome/WhatsApp preenchidos) para finalizar um
  pedido — ao clicar em "Finalizar pedido" sem estar logado, o site pede o
  login antes de continuar. Isso também faz o formulário de checkout vir
  pré-preenchido com os dados salvos.

Como as regras do Firestore mudaram (nova coleção `clientes`), lembre de
publicar novamente depois de qualquer alteração:
```powershell
firebase deploy --only firestore:rules
```

## Como funciona o pedido pelo WhatsApp

O cliente escolhe as peças no catálogo (o estoque cadastrado limita a
quantidade disponível de cada uma), abre o carrinho, preenche nome e
WhatsApp (endereço e observações são opcionais) e clica em **"Enviar pedido
pelo WhatsApp"**. O site:

1. Salva uma cópia do pedido no Firestore (aba **Pedidos** do painel).
2. Dá baixa automática no estoque das peças pedidas.
3. Abre o WhatsApp (app ou web) já com uma mensagem pronta, contendo a lista
   de itens, valores, total e os dados do cliente, endereçada ao número
   configurado em **Configurações**.

## Experiência de compra (estilo "app de moda")

Além do catálogo básico, a vitrine tem alguns recursos pensados para deixar a
navegação rápida e viciante, no estilo de apps como Shein/Shopee:

- **Barra de categorias fixa** — a lista de categorias e o menu de ordenação
  (Relevância / Novidades / Menor preço / Maior preço) ficam grudados no topo
  conforme o cliente rola a página, sem precisar voltar ao início.
- **Adição rápida pela foto** — cada peça tem um botão de sacola direto sobre
  a imagem, além do "+" tradicional, para adicionar com um toque só.
- **Favoritos** — o coração no canto da foto salva a peça na lista de
  favoritos do navegador do cliente (sem precisa de login); a aba
  "Favoritos" da barra inferior (celular) filtra só o que ele curtiu.
- **Selos automáticos** — "Novo" (peças cadastradas nos últimos 14 dias),
  "🔥 Mais vendido" (produtos marcados como destaque no painel) e o
  percentual de desconto aparecem sozinhos, sem trabalho manual.
- **Aviso de estoque baixo** — quando restam 3 unidades ou menos, a peça
  mostra "Só restam X!" para gerar senso de urgência real (baseado no
  estoque de verdade, não é enfeite).
- **Barra flutuante de carrinho + menu inferior (celular)** — assim que o
  cliente adiciona algo, uma barra com o total e "Ver pedido" aparece fixa
  na tela; o menu inferior (Início, Catálogo, Favoritos, Pedido, Fale) deixa
  a navegação com cara de aplicativo.

## Imagens dos produtos

Para manter o projeto simples (sem precisar configurar Firebase Storage), as
imagens são cadastradas por **URL**. Você pode subir as fotos em qualquer
serviço de hospedagem de imagem (ex: [imgbb.com](https://imgbb.com), Google
Drive com link público, ou o próprio Firebase Storage se preferir configurar)
e colar o link no campo "URL da imagem" ao cadastrar o produto. Se o campo
ficar em branco (ou o link quebrar), o catálogo mostra automaticamente um
ícone ilustrativo da categoria no lugar da foto.

## Personalizar cores e fontes

As cores e fontes ficam centralizadas em `css/base.css`, no bloco `:root`
(procure por `--forest-900`, `--cream-100`, `--gold-400`, `--font-display`,
`--font-body`). Alterar esses valores muda o visual do site inteiro.

// ============================================================
// MAFRAN ACESSÓRIOS — configuração do Firebase
// ============================================================
// 1. Crie um projeto em https://console.firebase.google.com
// 2. Ative: Authentication > Sign-in method > Google
// 3. Ative: Firestore Database (modo produção)
// 4. Em "Configurações do projeto > Geral > Seus apps", crie um app Web
//    e cole aqui o objeto de configuração que o Firebase gerar.
// (Passo a passo completo no README.md deste projeto)
// ============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyCcywu4FtAz-Ly_eOOsxp_neyMGjLooH74",
  authDomain: "mafran---cliente.firebaseapp.com",
  projectId: "mafran---cliente",
  storageBucket: "mafran---cliente.firebasestorage.app",
  messagingSenderId: "873471710437",
  appId: "1:873471710437:web:83577bb95448e3a7c8700c",
  measurementId: "G-XZSDTJDSBH",
};

// E-mails autorizados a acessar o painel administrativo.
// A regra "de verdade" (a que garante a segurança) vive em firestore.rules —
// esta lista aqui serve só para a interface reagir sem precisar recarregar.
// Mantenha as duas listas sempre iguais.
export const ADMIN_EMAILS = ["soumafran@gmail.com", "brisasofc@gmail.com", "isaacbomfim.00@gmail.com"];

// Número de WhatsApp da loja para onde os pedidos serão enviados.
// Formato: código do país + DDD + número, só dígitos. Ex: 5511987654321
// Pode ser atualizado a qualquer momento pela aba "Configurações" do painel
// (o valor salvo lá tem prioridade sobre este aqui).
export const STORE_WHATSAPP_FALLBACK = "5571996003444";

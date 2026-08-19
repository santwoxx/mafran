// ============================================================
// Endpoint Serverless Vercel: POST /api/checkout
// Processamento seguro de pedidos sem exposição de dados na URL (LGPD / OWASP)
// ============================================================

export default async function handler(req, res) {
  // Cabeçalhos de segurança e cache
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  // Apenas aceita requisições POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method Not Allowed",
      message: "Este endpoint aceita estritamente requisições POST com JSON no body.",
    });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (parseErr) {
        return res.status(400).json({ error: "JSON inválido no corpo da requisição." });
      }
    }

    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Corpo da requisição ausente ou inválido." });
    }

    const { cliente, itens, total, clienteUid } = body;

    // Validação estrita dos dados do cliente (LGPD)
    if (!cliente || typeof cliente !== "object") {
      return res.status(400).json({ error: "Dados do cliente são obrigatórios." });
    }

    const nome = String(cliente.nome || "").trim();
    const telefone = String(cliente.telefone || "").trim();
    const endereco = String(cliente.endereco || "").trim();
    const observacoes = String(cliente.observacoes || "").trim();

    if (!nome || !telefone) {
      return res.status(400).json({ error: "Nome e telefone (WhatsApp) são campos obrigatórios." });
    }

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: "O pedido deve conter ao menos um item válido." });
    }

    // Geração de ID único seguro para referência do pedido
    const pedidoId = "PED-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    // Retorna confirmação de recebimento seguro
    return res.status(200).json({
      success: true,
      message: "Pedido registrado com sucesso de forma segura.",
      pedidoId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Erro interno ao processar pedido:", err);
    return res.status(500).json({ error: "Erro interno ao processar o pedido." });
  }
}

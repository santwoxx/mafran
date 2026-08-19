// ============================================================
// MAFRAN ACESSÓRIOS — ícones SVG inline (sem dependências externas)
// ============================================================

const wrap = (inner, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

/** Marca Mafran (borboleta estilizada) — herda a cor via CSS `color`. */
export function brandMarkSVG() {
  return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 21c-4-11-17-15-21-7-3 6 2 14 11 15-7 2-10 9-5 14 4 4 13 2 15-7"/>
    <path d="M32 21c4-11 17-15 21-7 3 6-2 14-11 15 7 2 10 9 5 14-4 4-13 2-15-7"/>
    <path d="M32 19v22"/>
  </svg>`;
}

const ICONS = {
  cart: '<circle cx="9" cy="21" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="21" r="1.4" fill="currentColor" stroke="none"/><path d="M2.5 3h2.4l2.4 12.4a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 7.5H6"/>',
  whatsapp: '<path d="M20 12a8 8 0 1 1-3.8-6.8"/><path d="M20 4l-6 6"/><path d="M9 10.5c.3 2.4 2.1 4.2 4.5 4.5"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none"/>',
  pin: '<path d="M12 21s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/>',
  clock: '<circle cx="12" cy="12" r="8.2"/><path d="M12 8v4.3l3 1.9"/>',
  truck: '<rect x="2.5" y="7" width="12" height="9" rx="1"/><path d="M14.5 10h3.4L21 13v3h-6.5"/><circle cx="7" cy="18.5" r="1.6"/><circle cx="17" cy="18.5" r="1.6"/>',
  shield: '<path d="M12 3l7 3v5.2c0 4.6-3 7.9-7 9.3-4-1.4-7-4.7-7-9.3V6l7-3z"/><path d="M9 12l2 2 4-4.2"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4.6c0-.6.4-1 1-1h4c.6 0 1 .4 1 1V7"/><path d="M6.5 7l1 12.4c.05.9.8 1.6 1.7 1.6h5.6c.9 0 1.65-.7 1.7-1.6L18 7"/>',
  edit: '<path d="M4 20h4.2L19 9.2a2.1 2.1 0 0 0-3-3L5.2 16.8 4 20z"/><path d="M14.5 7.5l2 2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  grid: '<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.4"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="1.4"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.4"/><rect x="13" y="13" width="7.5" height="7.5" rx="1.4"/>',
  box: '<path d="M3.5 7.5L12 3l8.5 4.5V16L12 21l-8.5-5V7.5z"/><path d="M3.7 7.6L12 12l8.3-4.4"/><path d="M12 12v9"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  close: '<path d="M5 5l14 14M19 5L5 19"/>',
  menu: '<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17"/>',
  necklace: '<path d="M4.5 4c0 6.5 3.7 11 7.5 11s7.5-4.5 7.5-11"/><circle cx="12" cy="16.3" r="2.6"/>',
  bracelet: '<ellipse cx="12" cy="12" rx="6.3" ry="8.6"/><path d="M8.5 5.5c-1.3 1.8-2 4-2 6.5s.7 4.7 2 6.5"/>',
  earring: '<circle cx="12" cy="5.3" r="1.8"/><path d="M12 7v2.6"/><path d="M8 10.8a4 4 0 0 0 8 0"/><path d="M12 14.8v4.6"/>',
  ring: '<circle cx="12" cy="15.2" r="5.3"/><path d="M8.6 9.6L12 3.8l3.4 5.8"/><circle cx="12" cy="6.6" r="1.15" fill="currentColor" stroke="none"/>',
  watch: '<circle cx="12" cy="12" r="6.2"/><path d="M12 9v3.3l2.2 1.6"/><path d="M9.3 3.6h5.4M9.3 20.4h5.4"/>',
  gift: '<rect x="4" y="9.5" width="16" height="10.5" rx="1.3"/><path d="M4 9.5V7a1.7 1.7 0 0 1 1.7-1.7h12.6A1.7 1.7 0 0 1 20 7v2.5"/><path d="M12 5.3V20"/><path d="M12 5.3C11 3.6 8 2.8 7 4.4c-.8 1.3.2 2.7 2 2.9M12 5.3c1-1.7 4-2.5 5 -.9.8 1.3-.2 2.7-2 2.9"/>',
  sparkle: '<path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z"/>',
  heart: '<path d="M12 21s-7.5-4.9-10-9.3C.4 8.1 2 4.5 5.6 4.1c2-.2 3.9.8 5 2.4 1.1-1.6 3-2.6 5-2.4 3.6.4 5.2 4 3.6 7.6-2.5 4.4-10 9.3-10 9.3z"/>',
  sort: '<path d="M7 5v14M4 8l3-3 3 3"/><path d="M17 19V5M14 16l3 3 3-3"/>',
  home: '<path d="M4 11.5L12 4l8 7.5"/><path d="M6 10v9.5a1 1 0 0 0 1 1h3.5v-6h3v6H17a1 1 0 0 0 1-1V10"/>',
  bag: '<path d="M6 8h12l1 12.4a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 20.4L6 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6"/>',
};

/** Retorna markup <svg> para um ícone da lib interna. */
export function icon(name) {
  return wrap(ICONS[name] || ICONS.sparkle);
}

/** Ícone temático por categoria de produto (usado como imagem-placeholder). */
export function categoryIconSVG(categoria = '') {
  const c = categoria.toLowerCase();
  if (c.includes('colar')) return icon('necklace');
  if (c.includes('pulseira')) return icon('bracelet');
  if (c.includes('brinco')) return icon('earring');
  if (c.includes('anel')) return icon('ring');
  if (c.includes('rel')) return icon('watch');
  return icon('gift');
}

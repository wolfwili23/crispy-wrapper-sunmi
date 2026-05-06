const STORAGE_KEY = 'crispy_receipt_config_v1';

export const DEFAULT_RECEIPT_CONFIG = {
  restaurantName: 'CRISPY',
  tagline: 'crispyparma.it',
  logoUrl: 'https://media.base44.com/images/public/69cfa945a182b6ae303e88a8/dc4cad41d_Senzatitolo-2.png',
  showLogo: true,
  footerLine1: 'Grazie per aver scelto CRISPY!',
  footerLine2: 'Scontrino non fiscale',
  showPhone: true,
  showAddress: true,
  showOrderNumber: true,
  showDateTime: true,
  showCoupon: true,
  accentChar: '-',      // separatore: '-', '=', '*'
  paperWidth: 80,       // 80 | 57 mm
};

export function getReceiptConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULT_RECEIPT_CONFIG, ...saved };
  } catch {
    return { ...DEFAULT_RECEIPT_CONFIG };
  }
}

export function saveReceiptConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
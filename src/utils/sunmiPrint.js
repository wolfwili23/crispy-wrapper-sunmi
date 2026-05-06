/**
 * Sunmi Bridge Integration — Compatibile T3 Pro (Android 13, 80mm) + V2 (Android 7, 58mm)
 *
 * Fix applicati rispetto alla versione precedente:
 *   1. printerInit() — reset buffer OBBLIGATORIO prima di ogni job
 *   2. printText(text) — NO secondo argomento null (crash silenzioso su Android 13)
 *   3. bold via setFontWeight(bool) con fallback setBold(0/1) per V2
 *   4. feed via lineWrap(n) con fallback lineFeed(n) per V2
 *   5. Colonne adattive: 32 col (58mm/V2) vs 48 col (80mm/T3 Pro)
 */

const BRIDGE_NAMES = [
  'SunmiInnerPrinter', 'sunmiInnerPrinter',
  'SunmiPrinter', 'sunmiPrinter',
  'PrinterBridge', 'printerBridge',
  'Android', 'printer',
];

export function isSunmiAvailable() {
  if (typeof window === 'undefined') return false;
  return BRIDGE_NAMES.some(n => window[n] && typeof window[n].printText === 'function');
}

export function getSunmiBridge() {
  for (const name of BRIDGE_NAMES) {
    const obj = window[name];
    if (obj && typeof obj === 'object' && typeof obj.printText === 'function') return obj;
  }
  return null;
}

/**
 * Helper che normalizza le API bridge per V2 e T3 Pro.
 * Ritorna { bold, feed, print, COLS }
 */
function getHelper(p) {
  const ua = navigator.userAgent || '';
  const is58mm = /V2|V1s|P1|P2mini/i.test(ua);
  const COLS = is58mm ? 32 : 48;

  const bold = (on) => {
    if (typeof p.setFontWeight === 'function') p.setFontWeight(on);
    else if (typeof p.setBold === 'function') p.setBold(on ? 1 : 0);
  };

  const feed = (n = 1) => {
    if (typeof p.lineWrap === 'function') p.lineWrap(n);
    else if (typeof p.lineFeed === 'function') p.lineFeed(n);
  };

  // NON passare null come secondo arg — crash silenzioso su Android 13
  const print = (text) => p.printText(text);

  return { bold, feed, print, COLS };
}

/**
 * Stampa un ordine formattato sulla stampante Sunmi interna.
 * Compatibile T3 Pro (80mm, Android 13) e V2 (58mm, Android 7).
 */
export function stampaScontrino_Ordine(order) {
  const p = getSunmiBridge();
  if (!p) {
    console.warn('[Sunmi] Bridge non disponibile');
    return false;
  }

  try {
    // STEP 1: reset buffer — evita output spazzatura da job precedenti
    if (typeof p.printerInit === 'function') p.printerInit();

    const { bold, feed, print, COLS } = getHelper(p);

    const pad = (l, r, w = COLS) => l + ' '.repeat(Math.max(1, w - l.length - r.length)) + r;
    const sep = (char = '-') => char.repeat(COLS) + '\n';

    const now = order.created_date
      ? new Date(order.created_date).toLocaleString('it-IT', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : new Date().toLocaleString('it-IT');

    const payLabel = {
      cash: 'CONTANTI', card: 'CARTA / POS',
      card_online: 'CARTA ONLINE', satispay: 'SATISPAY',
    }[order.payment_method] || (order.payment_method || '');

    // ── Intestazione
    p.setAlignment(1);
    bold(true);  print('CRISPY PARMA\n');
    bold(false); print('Via G. Carducci, 30a - Parma\n');
    feed(1);

    bold(true);  print(`ORDINE #${(order.id || '').slice(-6)}\n`);
    bold(false); print(`${now}\n`);
    feed(1);

    // ── Cliente
    p.setAlignment(0);
    print(sep());
    print(`Cliente: ${order.customer_name || '-'}\n`);
    if (order.customer_phone) print(`Tel: ${order.customer_phone}\n`);
    print(sep());

    // ── Consegna
    bold(true); print('CONSEGNA:\n'); bold(false);
    print(`${order.delivery_address || '-'}\n`);
    print(sep());

    // ── Articoli
    bold(true); print('ARTICOLI\n'); bold(false);
    for (const item of (order.items || [])) {
      const qty  = item.quantity || 1;
      const base = item.base_price || 0;
      const extP = (item.extras || []).reduce((s, e) => s + (e.price || 0), 0);
      const choP = (item.required_choices || []).reduce((s, c) => s + (c.price || 0), 0);
      const tot  = ((base + extP + choP) * qty).toFixed(2);

      bold(true);  print(pad(`${qty}x ${item.name}`, `EU${tot}`) + '\n');
      bold(false);

      for (const c of (item.required_choices || [])) {
        print(`  > ${c.group_name}: ${c.selected}\n`);
      }
      for (const e of (item.extras || [])) {
        print(`  + ${e.name} (+EU${(e.price || 0).toFixed(2)})\n`);
      }
      if (item.removals?.length) print(`  Senza: ${item.removals.join(', ')}\n`);
      if (item.notes) print(`  Nota: ${item.notes}\n`);
    }

    // ── Totali
    print(sep('='));
    print(pad('Subtotale:', `EU${(order.subtotal || 0).toFixed(2)}`) + '\n');
    print(pad('Consegna:', `EU${(order.delivery_fee || 0).toFixed(2)}`) + '\n');
    if (order.coupon_discount > 0) {
      print(pad(`Coupon ${order.coupon_code || ''}:`, `-EU${order.coupon_discount.toFixed(2)}`) + '\n');
    }
    print(sep('='));
    bold(true);
    print(pad('TOTALE:', `EU${(order.total || 0).toFixed(2)}`) + '\n');
    bold(false);

    feed(1);
    p.setAlignment(1);
    bold(true); print(`[ ${payLabel} ]\n`); bold(false);

    if (order.notes) {
      p.setAlignment(0);
      print(sep());
      print(`NOTE: ${order.notes}\n`);
    }

    // ── Footer
    feed(1);
    p.setAlignment(1);
    print('Grazie per aver scelto CRISPY PARMA!\n');
    print('Scontrino non fiscale\n');
    feed(4);
    if (typeof p.cutPaper === 'function') p.cutPaper();

    return true;
  } catch (e) {
    console.error('[Sunmi] Errore stampa ordine:', e);
    return false;
  }
}

// Esponi globalmente per uso da console / debug
if (typeof window !== 'undefined') {
  window.stampaScontrino_Ordine = stampaScontrino_Ordine;
}
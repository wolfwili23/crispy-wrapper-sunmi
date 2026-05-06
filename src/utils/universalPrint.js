/**
 * universalPrint.js — Modulo di stampa universale per Crispy Parma
 *
 * Priorità automatica:
 *   1. Sunmi InnerPrinter (API nativa Android Sunmi)
 *   2. Bluetooth SPP (Web Bluetooth API — Chrome/Android)
 *   3. Web USB ESC/POS (Chrome)
 *   4. Android .bin fallback (Intent sistema)
 *   5. Finestra browser (fallback universale)
 *
 * Mappa campi DB → stampa:
 *   order.id                  → N. ordine (slice -6)
 *   order.customer_name       → Nome cliente
 *   order.customer_phone      → Telefono
 *   order.delivery_address    → Indirizzo consegna
 *   order.items[].name        → Nome articolo
 *   order.items[].quantity    → Quantità
 *   order.items[].base_price  → Prezzo base
 *   order.items[].extras[]    → Extra (nome + prezzo)
 *   order.items[].removals[]  → Ingredienti rimossi
 *   order.items[].required_choices[] → Scelte obbligatorie
 *   order.items[].notes       → Note articolo
 *   order.subtotal            → Subtotale
 *   order.delivery_fee        → Costo consegna
 *   order.coupon_code         → Codice coupon
 *   order.coupon_discount     → Sconto coupon
 *   order.total               → Totale finale
 *   order.payment_method      → Metodo pagamento
 *   order.notes               → Note speciali
 *   order.created_date        → Data/ora
 */

import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { getActivePrinterDevice } from '@/utils/printerStore';
import { getReceiptConfig } from '@/utils/receiptConfig';

// ─────────────────────────────────────────────────────────────────────────────
// COSTANTI ESC/POS
// ─────────────────────────────────────────────────────────────────────────────
const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

const CMD = {
  INIT:            [ESC, 0x40],                    // ESC @ — reset stampante
  ALIGN_LEFT:      [ESC, 0x61, 0x00],              // ESC a 0
  ALIGN_CENTER:    [ESC, 0x61, 0x01],              // ESC a 1
  ALIGN_RIGHT:     [ESC, 0x61, 0x02],              // ESC a 2
  BOLD_ON:         [ESC, 0x45, 0x01],              // ESC E 1
  BOLD_OFF:        [ESC, 0x45, 0x00],              // ESC E 0
  FONT_LARGE:      [ESC, 0x21, 0x30],              // ESC ! 48 (double width+height)
  FONT_NORMAL:     [ESC, 0x21, 0x00],              // ESC ! 0
  CUT_PAPER:       [GS,  0x56, 0x42, 0x00],        // GS V 66 0 — taglio parziale
  FEED_LINE:       [LF],
};

// Bluetooth SPP Service UUID (Serial Port Profile)
const BT_SPP_SERVICE     = '00001101-0000-1000-8000-00805f9b34fb';
// Stampanti termiche generiche (es. Xprinter, Epson, Star)
const BT_PRINTER_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb';
// Caratteristica write comune per le stampanti BT
const BT_WRITE_CHAR      = '00002af1-0000-1000-8000-00805f9b34fb';

// ─────────────────────────────────────────────────────────────────────────────
// BUILDER ESC/POS
// ─────────────────────────────────────────────────────────────────────────────

class EscPosBuilder {
  constructor() {
    this._bytes = [];
  }

  _push(...cmds) {
    cmds.forEach(c => this._bytes.push(...c));
    return this;
  }

  init()         { return this._push(CMD.INIT); }
  alignLeft()    { return this._push(CMD.ALIGN_LEFT); }
  alignCenter()  { return this._push(CMD.ALIGN_CENTER); }
  alignRight()   { return this._push(CMD.ALIGN_RIGHT); }
  boldOn()       { return this._push(CMD.BOLD_ON); }
  boldOff()      { return this._push(CMD.BOLD_OFF); }
  fontLarge()    { return this._push(CMD.FONT_LARGE); }
  fontNormal()   { return this._push(CMD.FONT_NORMAL); }
  cut()          { return this._push(CMD.CUT_PAPER); }

  feed(n = 1) {
    for (let i = 0; i < n; i++) this._push(CMD.FEED_LINE);
    return this;
  }

  text(str) {
    const encoded = new TextEncoder().encode(str);
    this._bytes.push(...encoded);
    return this;
  }

  line(str = '') {
    return this.text(str + '\n');
  }

  divider(char = '-', width = 32) {
    return this.line(char.repeat(width));
  }

  // Riga sinistra + destra padding (es. "Pizza   €12.00")
  padRow(left, right, width = 32) {
    const gap = Math.max(1, width - left.length - right.length);
    return this.line(left + ' '.repeat(gap) + right);
  }

  build() {
    return new Uint8Array(this._bytes);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTAZIONE ORDINE → ESC/POS
// ─────────────────────────────────────────────────────────────────────────────
function buildOrderEscPos(order, paperWidth = 48) {
  const COLS = paperWidth;
  const date = order.created_date
    ? format(new Date(order.created_date), 'dd/MM/yyyy HH:mm', { locale: it })
    : format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it });

  const paymentLabel = {
    cash:        'DA PAGARE',
    card:        'DA PAGARE',
    card_online: 'PREPAGATO',
    satispay:    'PREPAGATO',
  }[order.payment_method] || 'DA PAGARE';

  const b = new EscPosBuilder();

  // ── Logo / Intestazione
  b.init()
   .alignCenter()
   .fontLarge().boldOn()
   .line('CRISPY')
   .fontNormal().boldOff()
   .line('crispyparma.it')
   .line(`#${order.id?.slice(-6)}`)
   .feed(1);

  // ── Data + cliente
  b.alignLeft()
   .divider('-', COLS)
   .line(date)
   .line(`Cliente: ${order.customer_name || '-'}`)
   .line(`Tel: ${order.customer_phone || '-'}`)
   .divider('-', COLS);

  // ── Pagamento (box)
  b.alignCenter()
   .boldOn().line(`[ ${paymentLabel} ]`).boldOff()
   .feed(1);

  // ── Indirizzo consegna
  b.alignLeft()
   .boldOn().line('Consegna:').boldOff()
   .line(order.delivery_address || '-')
   .line(`${(order.items || []).length} Articolo/i`)
   .divider('-', COLS);

  // ── Articoli
  (order.items || []).forEach(item => {
    const qty  = item.quantity || 1;
    const unit = item.base_price || 0;
    const extrasPrice  = (item.extras || []).reduce((s, e) => s + (e.price || 0), 0);
    const choicesPrice = (item.required_choices || []).reduce((s, c) => s + (c.price || 0), 0);
    const lineTotal    = ((unit + extrasPrice + choicesPrice) * qty).toFixed(2);

    b.padRow(`${qty} x ${item.name}`, `${lineTotal} EU`, COLS);

    (item.required_choices || []).forEach(c => {
      b.line(`  ${c.group_name}: ${c.selected}`);
    });
    (item.extras || []).forEach(e => {
      b.line(`  + ${e.name}`);
    });
    if (item.removals?.length > 0) b.line(`  Senza: ${item.removals.join(', ')}`);
    if (item.notes) b.line(`  Nota: ${item.notes}`);
  });

  // ── Subtotale + Totale
  b.divider('-', COLS)
   .padRow('Subtotale', `${(order.subtotal || 0).toFixed(2)} EU`, COLS)
   .padRow('Consegna', `${(order.delivery_fee || 0).toFixed(2)} EU`, COLS);

  if (order.coupon_discount > 0) {
    b.padRow(`Coupon ${order.coupon_code || ''}`, `-${order.coupon_discount.toFixed(2)} EU`, COLS);
  }

  b.divider('-', COLS)
   .feed(1)
   .alignCenter()
   .fontLarge().boldOn()
   .line('Totale')
   .line(`${(order.total || 0).toFixed(2)} EU`)
   .fontNormal().boldOff()
   .feed(1);

  // ── Note
  if (order.notes) {
    b.alignLeft()
     .divider('-', COLS)
     .line(`Note: ${order.notes}`);
  }

  // ── Footer
  b.feed(1)
   .alignCenter()
   .line('Grazie per aver scelto CRISPY!')
   .line('Scontrino non fiscale')
   .feed(3)
   .cut();

  return b.build();
}

// ─────────────────────────────────────────────────────────────────────────────
// RILEVAMENTO BRIDGE — stesso identico elenco usato in PrinterDiag
// ─────────────────────────────────────────────────────────────────────────────
const BRIDGE_NAMES = [
  'SunmiInnerPrinter','sunmiInnerPrinter',
  'SunmiPrinter','sunmiPrinter',
  'PrinterBridge','printerBridge',
  'Android','printer',
];

function detectSunmiBridge() {
  for (const name of BRIDGE_NAMES) {
    const obj = window[name];
    if (obj && typeof obj === 'object' && typeof obj.printText === 'function') {
      return obj;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANALI DI STAMPA
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: normalizza le chiamate bridge per compatibilità T3 Pro (Android 13)
// e V2 (Android 7). Differenze chiave:
//   - printerInit(): resetta il buffer — OBBLIGATORIO prima di stampare
//   - setBold(1/0) vs setFontWeight(true/false): entrambi supportati ma V2 ha solo setBold
//   - lineFeed(n) vs lineWrap(n): V2 usa lineFeed, T3 usa lineWrap (entrambi esposti)
//   - printText(text): NON passare mai un secondo argomento null/undefined — crasha su Android 13
//   - paper width: V2 = 58mm (32 col), T3 Pro = 80mm (48 col)
// ─────────────────────────────────────────────────────────────────────────────
function getSunmiHelper(p) {
  // Rileva larghezza carta: cerca il metodo getPaperWidth o usa UA come fallback
  // Sunmi V2 UA contiene "V2", T3 contiene "T3"
  const ua = navigator.userAgent || '';
  const is58mm = /V2|V1s|P1|P2mini/i.test(ua);
  const COLS = is58mm ? 32 : 48;

  // Bold: prova setFontWeight (T3/moderni), fallback setBold (V2/vecchi)
  const bold = (on) => {
    if (typeof p.setFontWeight === 'function') p.setFontWeight(on);
    else if (typeof p.setBold === 'function') p.setBold(on ? 1 : 0);
  };

  // Feed: prova lineWrap (T3), fallback lineFeed (V2)
  const feed = (n = 1) => {
    if (typeof p.lineWrap === 'function') p.lineWrap(n);
    else if (typeof p.lineFeed === 'function') p.lineFeed(n);
  };

  // printText: NON passare null come secondo argomento — causa crash silenzioso su Android 13
  const print = (text) => p.printText(text);

  return { bold, feed, print, COLS };
}

// 1. Sunmi InnerPrinter — compatibile T3 Pro (80mm, Android 13) + V2 (58mm, Android 7)
function printViaSunmi(order) {
  const p = detectSunmiBridge();
  if (!p) throw new Error('Bridge Sunmi non disponibile');

  // STEP 1: reset buffer — obbligatorio, evita output spazzatura da job precedenti
  if (typeof p.printerInit === 'function') p.printerInit();

  const { bold, feed, print, COLS } = getSunmiHelper(p);

  const date = order.created_date
    ? format(new Date(order.created_date), 'dd/MM/yyyy HH:mm', { locale: it })
    : format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it });

  const paymentLabel = {
    cash: 'CONTANTI', card: 'CARTA / POS',
    card_online: 'CARTA ONLINE', satispay: 'SATISPAY',
  }[order.payment_method] || 'N/D';

  const pad = (l, r, w = COLS) => l + ' '.repeat(Math.max(1, w - l.length - r.length)) + r;
  const sep = (char = '-') => char.repeat(COLS) + '\n';

  // ── Intestazione
  p.setAlignment(1);
  bold(true);
  print('CRISPY PARMA\n');
  bold(false);
  print('crispyparma.it\n');
  feed(1);

  bold(true);
  print(`ORDINE #${order.id?.slice(-6)}\n`);
  bold(false);
  print(`${date}\n`);
  feed(1);

  // ── Cliente
  p.setAlignment(0);
  print(sep());
  if (order.customer_name)  print(`Cliente : ${order.customer_name}\n`);
  if (order.customer_phone) print(`Tel     : ${order.customer_phone}\n`);
  print(sep());

  // ── Consegna
  bold(true); print('CONSEGNA:\n'); bold(false);
  print(`${order.delivery_address || '-'}\n`);
  print(sep());

  // ── Articoli
  bold(true); print('ARTICOLI\n'); bold(false);
  (order.items || []).forEach(item => {
    const qty = item.quantity || 1;
    const unit = item.base_price || 0;
    const extP = (item.extras || []).reduce((s, e) => s + (e.price || 0), 0);
    const choP = (item.required_choices || []).reduce((s, c) => s + (c.price || 0), 0);
    const total = ((unit + extP + choP) * qty).toFixed(2);
    bold(true); print(pad(`${qty}x ${item.name}`, `EU${total}`) + '\n'); bold(false);
    (item.required_choices || []).forEach(c => print(`  > ${c.group_name}: ${c.selected}\n`));
    (item.extras || []).forEach(e => print(`  + ${e.name} (+EU${(e.price||0).toFixed(2)})\n`));
    if (item.removals?.length) print(`  Senza: ${item.removals.join(', ')}\n`);
    if (item.notes) print(`  Nota: ${item.notes}\n`);
  });

  // ── Totali
  print(sep('='));
  print(pad('Subtotale:', `EU${(order.subtotal||0).toFixed(2)}`) + '\n');
  print(pad('Consegna:', `EU${(order.delivery_fee||0).toFixed(2)}`) + '\n');
  if (order.coupon_discount > 0) print(pad(`Coupon ${order.coupon_code||''}:`, `-EU${order.coupon_discount.toFixed(2)}`) + '\n');
  print(sep('='));
  bold(true); print(pad('TOTALE:', `EU${(order.total||0).toFixed(2)}`) + '\n'); bold(false);

  feed(1);
  p.setAlignment(1);
  bold(true); print(`[ ${paymentLabel} ]\n`); bold(false);

  if (order.notes) {
    p.setAlignment(0); print(sep()); print(`NOTE: ${order.notes}\n`);
  }

  // ── Footer
  feed(1);
  p.setAlignment(1);
  print('Grazie per aver scelto CRISPY PARMA!\n');
  print('Scontrino non fiscale\n');
  feed(4);

  // cutPaper — V2 non ha il tagliacarta fisico, ma la chiamata è sicura (no-op)
  if (typeof p.cutPaper === 'function') p.cutPaper();
}

// 2. Bluetooth SPP — usa dispositivo già connesso (passato come parametro)
async function printViaBluetooth(order, gattDevice) {
  if (!gattDevice?.gatt?.connected) throw new Error('Dispositivo BT non connesso');

  const data = buildOrderEscPos(order);
  const server = gattDevice.gatt;

  // Tenta SPP, poi fallback su servizio generico stampanti
  let service;
  try {
    service = await server.getPrimaryService(BT_SPP_SERVICE);
  } catch {
    service = await server.getPrimaryService(BT_PRINTER_SERVICE);
  }

  const characteristics = await service.getCharacteristics();
  const writable = characteristics.find(c =>
    c.properties.write || c.properties.writeWithoutResponse
  );
  if (!writable) throw new Error('Caratteristica di scrittura non trovata');

  // Invia in chunk da 512 byte (limite BLE)
  const CHUNK = 512;
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK);
    if (writable.properties.writeWithoutResponse) {
      await writable.writeValueWithoutResponse(chunk);
    } else {
      await writable.writeValue(chunk);
    }
  }
}

// 3. Web USB ESC/POS
async function printViaUsb(order, usbDevice) {
  if (!usbDevice) throw new Error('Dispositivo USB non connesso');
  const data = buildOrderEscPos(order);

  let endpoint = null;
  for (const iface of usbDevice.configuration.interfaces) {
    for (const alt of iface.alternates) {
      for (const ep of alt.endpoints) {
        if (ep.direction === 'out') endpoint = ep;
      }
    }
  }
  if (!endpoint) throw new Error('Endpoint USB non trovato');
  await usbDevice.transferOut(endpoint.endpointNumber, data);
}

// 4. Fallback Android .bin (Intent sistema)
async function printViaAndroidFallback(order) {
  const data = buildOrderEscPos(order);
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ordine_${order.id?.slice(-6)}_${Date.now()}.bin`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONNESSIONE BLUETOOTH — selezione dispositivo
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// CONNESSIONE WEB SERIAL — porta seriale interna Sunmi o stampante seriale
// ─────────────────────────────────────────────────────────────────────────────
export async function connectSerialPrinter() {
  if (!navigator.serial) throw new Error('Web Serial non supportato. Usa Google Chrome.');
  // Mostra il popup di sistema per scegliere la porta seriale
  const port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });
  return port;
}

export async function disconnectSerialPrinter(port) {
  if (port) {
    try {
      if (port.writable) await port.writable.getWriter().releaseLock?.();
      await port.close();
    } catch {}
  }
}

export async function printViaSerial(order, port) {
  if (!port) throw new Error('Porta seriale non connessa');
  const data = buildOrderEscPos(order);
  const writer = port.writable.getWriter();
  try {
    const CHUNK = 512;
    for (let i = 0; i < data.length; i += CHUNK) {
      await writer.write(data.slice(i, i + CHUNK));
    }
  } finally {
    writer.releaseLock();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONNESSIONE BLUETOOTH — filtri per UUID print_service e SPP
// ─────────────────────────────────────────────────────────────────────────────
export async function connectBluetoothPrinter() {
  if (!navigator.bluetooth) throw new Error('Web Bluetooth non supportato. Usa Google Chrome su Android o Desktop.');

  let device;
  try {
    // Cerca stampanti con servizio print_service (UUID specifico) o SPP
    device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [BT_PRINTER_SERVICE] },
        { services: [BT_SPP_SERVICE] },
      ],
      optionalServices: [BT_PRINTER_SERVICE, BT_SPP_SERVICE],
    });
  } catch {
    // Fallback: alcuni browser non supportano filtri multipli
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [BT_SPP_SERVICE, BT_PRINTER_SERVICE],
    });
  }

  await device.gatt.connect();
  return device;
}

export async function disconnectBluetoothPrinter(device) {
  if (device?.gatt?.connected) device.gatt.disconnect();
}

// ─────────────────────────────────────────────────────────────────────────────
// PUNTO DI INGRESSO UNIVERSALE
// Usa il canale migliore disponibile in automatico.
//
// Parametri:
//   order       — oggetto ordine dal DB
//   options     — { btDevice, usbDevice, androidFallback }
//
// Esempio dal pulsante "Stampa":
//   import { printUniversal } from '@/utils/universalPrint';
//   await printUniversal(order, { btDevice: myBtDevice });
// ─────────────────────────────────────────────────────────────────────────────
export async function printUniversal(order, options = {}) {
  // Legge i device dal singleton se non passati esplicitamente
  const stored = getActivePrinterDevice();
  const btDevice    = options.btDevice    ?? stored.btDevice;
  const usbDevice   = options.usbDevice   ?? stored.usbDevice;
  const serialPort  = options.serialPort  ?? stored.serialPort;
  const androidFallback = options.androidFallback ?? false;

  // 1. Sunmi Bridge (qualsiasi nome: SunmiInnerPrinter, PrinterBridge, ecc.)
  if (detectSunmiBridge()) {
    printViaSunmi(order);
    return { channel: 'sunmi' };
  }

  // 1b. Web Serial — porta seriale (Sunmi interno o stampante seriale)
  if (serialPort?.writable) {
    await printViaSerial(order, serialPort);
    return { channel: 'serial' };
  }

  // 2. Bluetooth SPP
  if (btDevice?.gatt?.connected) {
    await printViaBluetooth(order, btDevice);
    return { channel: 'bluetooth' };
  }

  // 3. Web USB
  if (usbDevice) {
    await printViaUsb(order, usbDevice);
    return { channel: 'usb' };
  }

  // 4. Android .bin fallback (opzionale)
  if (androidFallback || /Android/i.test(navigator.userAgent)) {
    await printViaAndroidFallback(order);
    return { channel: 'android_fallback' };
  }

  // 5. Browser window.print()
  printReceiptBrowser(order);
  return { channel: 'browser' };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT buildOrderEscPos per usi avanzati
// ─────────────────────────────────────────────────────────────────────────────
export { buildOrderEscPos };

// Comando apertura cassetto contanti
export function openCashDrawer() {
  return new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
}

// ─────────────────────────────────────────────────────────────────────────────
// BROWSER FALLBACK (HTML window.print)
// ─────────────────────────────────────────────────────────────────────────────
export function printReceiptBrowser(order) {
  const cfg = getReceiptConfig();
  const LOGO_URL = cfg.logoUrl;

  const date = order.created_date
    ? format(new Date(order.created_date), 'dd/MM/yyyy HH:mm', { locale: it })
    : format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it });

  const paymentLabel = {
    cash:        'DA PAGARE',
    card:        'DA PAGARE',
    card_online: 'PREPAGATO',
    satispay:    'PREPAGATO',
  }[order.payment_method] || 'DA PAGARE';

  const itemsHtml = (order.items || []).map(item => {
    const qty = item.quantity || 1;
    const unit = item.base_price || 0;
    const extP = (item.extras || []).reduce((s, e) => s + (e.price || 0), 0);
    const choP = (item.required_choices || []).reduce((s, c) => s + (c.price || 0), 0);
    const lineTotal = ((unit + extP + choP) * qty).toFixed(2);

    const detailsHtml = [
      ...(item.required_choices || []).map(c => `<div class="detail">${c.group_name}: ${c.selected}</div>`),
      ...(item.extras || []).map(e => `<div class="detail">+ ${e.name}</div>`),
      ...(item.removals?.length ? [`<div class="detail">Senza: ${item.removals.join(', ')}</div>`] : []),
      ...(item.notes ? [`<div class="detail">Nota: ${item.notes}</div>`] : []),
    ].join('');

    return `<div class="item">
      <div class="row"><span>${qty} x ${item.name}</span><span>${lineTotal} &euro;</span></div>
      ${detailsHtml}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Crispy #${order.id?.slice(-6)}</title>
  <style>
    @page{margin:0;size:80mm auto}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:14px;width:80mm;padding:4mm 5mm 10mm;color:#000;background:#fff}
    .header{text-align:center;padding-bottom:4mm;border-bottom:2px solid #000;margin-bottom:4mm}
    .header img{width:55mm;display:block;margin:0 auto 2mm auto}
    .header .order-num{font-size:22px;font-weight:bold}
    .info-block{margin-bottom:4mm;padding-bottom:4mm;border-bottom:1px solid #000;font-size:13px;line-height:1.7}
    .payment-badge{border:3px solid #000;text-align:center;font-weight:bold;font-size:16px;letter-spacing:2px;padding:4px 12px;display:inline-block}
    .badge-wrap{text-align:center;margin-bottom:4mm}
    .section-title{font-weight:bold;font-size:13px;margin-bottom:2mm}
    .item{margin-bottom:4mm;padding-bottom:3mm;border-bottom:1px dashed #aaa;font-size:13px}
    .item:last-child{border-bottom:none}
    .row{display:flex;justify-content:space-between;font-size:14px;font-weight:bold}
    .detail{font-size:11px;color:#444;padding-left:4mm;margin-top:2px;line-height:1.5}
    .divider{border-top:2px solid #000;margin:4mm 0}
    .totals{font-size:13px;line-height:2}
    .totals .row{font-weight:normal;font-size:13px}
    .total-final{display:flex;justify-content:space-between;font-size:26px;font-weight:bold;margin-top:4mm;margin-bottom:20mm}
    .footer{text-align:center;font-size:10px;color:#555;line-height:1.8}
  </style></head><body>

  <div class="header">
    ${cfg.showLogo && cfg.logoUrl ? `<img src="${LOGO_URL}" alt="logo" onerror="this.style.display='none'"/>` : ''}
    <div class="order-num">${cfg.restaurantName || 'CRISPY'}</div>
    ${cfg.tagline ? `<div style="font-size:11px;color:#555">${cfg.tagline}</div>` : ''}
    ${cfg.showOrderNumber ? `<div style="font-size:18px;font-weight:bold;margin-top:4px">#${order.id?.slice(-6)}</div>` : ''}
  </div>

  <div class="info-block">
    ${cfg.showDateTime ? `<div>${date}</div>` : ''}
    <div>Cliente: <strong>${order.customer_name || '-'}</strong></div>
    ${cfg.showPhone && order.customer_phone ? `<div>Tel: ${order.customer_phone}</div>` : ''}
  </div>

  <div class="badge-wrap">
    <span class="payment-badge">${paymentLabel}</span>
  </div>

  ${cfg.showAddress ? `<div class="info-block">
    <div class="section-title">Consegna:</div>
    <div>${order.delivery_address || '-'}</div>
    <div style="color:#555;font-size:11px">${(order.items || []).length} Articolo/i</div>
  </div>` : ''}

  ${itemsHtml}

  <div class="divider"></div>
  <div class="totals">
    <div class="row"><span>Subtotale</span><span>${(order.subtotal||0).toFixed(2)} &euro;</span></div>
    <div class="row"><span>Consegna</span><span>${(order.delivery_fee||0).toFixed(2)} &euro;</span></div>
    ${cfg.showCoupon && order.coupon_discount > 0 ? `<div class="row" style="color:green"><span>Coupon ${order.coupon_code||''}</span><span>-${order.coupon_discount.toFixed(2)} &euro;</span></div>` : ''}
  </div>
  <div class="divider"></div>
  <div class="total-final"><span>Totale</span><span>${(order.total||0).toFixed(2)} &euro;</span></div>

  ${order.notes ? `<div style="margin-bottom:3mm;font-size:12px"><strong>Note:</strong> ${order.notes}</div>` : ''}

  <div class="footer">${cfg.footerLine1 || ''}${cfg.footerLine1 && cfg.footerLine2 ? '<br/>' : ''}${cfg.footerLine2 || ''}</div>
  </body></html>`;

  const win = window.open('', '_blank', 'width=302,height=800,toolbar=0,menubar=0');
  if (!win) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    setTimeout(() => { iframe.contentWindow.print(); document.body.removeChild(iframe); }, 600);
    return;
  }
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 800);
}
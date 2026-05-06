/**
 * PrinterSettings — Gestione stampante Sunmi InnerPrinter + Bluetooth ESC/POS
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Printer, CheckCircle2, AlertCircle, Palette, ExternalLink,
  DollarSign, RefreshCw, Bug, ChevronDown, ChevronUp,
  FlaskConical, Bluetooth, BluetoothOff, BluetoothSearching,
} from 'lucide-react';
import { toast } from 'sonner';
import { setPrinterDevice, getPrinterDevice } from '@/utils/printerStore';

const TEST_ORDER = {
  id: 'TEST000001',
  created_date: new Date().toISOString(),
  customer_name: 'Test Cliente',
  customer_phone: '+39 333 1234567',
  delivery_address: 'Via Roma 1, 43121 Parma (PR)',
  items: [
    { name: 'Chicken Burger', quantity: 2, base_price: 9.50, extras: [{ name: 'Salsa BBQ', price: 0.50 }], removals: [], required_choices: [], notes: 'Senza cipolla' },
    { name: 'Patatine Fritte', quantity: 1, base_price: 3.50, extras: [], removals: [], required_choices: [] },
  ],
  subtotal: 23.00, delivery_fee: 2.99, total: 25.99, payment_method: 'cash',
  notes: 'Test stampa',
};

const BRIDGE_NAMES = [
  'SunmiInnerPrinter', 'sunmiInnerPrinter',
  'SunmiPrinter', 'sunmiPrinter',
  'PrinterBridge', 'printerBridge',
  'Android', 'printer',
];

const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb';
const BT_PRINTER_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb';

function detectSunmiBridge() {
  for (const name of BRIDGE_NAMES) {
    const obj = window[name];
    if (obj && typeof obj === 'object' && typeof obj.printText === 'function') {
      return { name, obj };
    }
  }
  return null;
}

function getSunmiHelper(p) {
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
  const print = (text) => p.printText(text);
  return { bold, feed, print, COLS };
}

function printViaSunmi(p, order, addLog) {
  if (typeof p.printerInit === 'function') {
    p.printerInit();
    addLog('printerInit() → buffer resettato', 'ok');
  } else {
    addLog('printerInit non disponibile (bridge vecchio)', 'warn');
  }

  const { bold, feed, print, COLS } = getSunmiHelper(p);
  const pad = (l, r, w = COLS) => l + ' '.repeat(Math.max(1, w - l.length - r.length)) + r;
  const sep = (c = '-') => c.repeat(COLS) + '\n';
  const now = new Date(order.created_date || Date.now())
    .toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const payLabel = { cash: 'CONTANTI', card: 'CARTA/POS', card_online: 'CARTA ONLINE', satispay: 'SATISPAY' }[order.payment_method] || '';

  p.setAlignment(1);
  bold(true);  print('CRISPY PARMA\n');
  bold(false); print('crispyparma.it\n');
  feed(1);
  bold(true);  print(`ORDINE #${(order.id || '').slice(-6)}\n`);
  bold(false); print(`${now}\n`);
  feed(1);

  p.setAlignment(0);
  print(sep());
  if (order.customer_name)  print(`Cliente : ${order.customer_name}\n`);
  if (order.customer_phone) print(`Tel     : ${order.customer_phone}\n`);
  print(sep());

  bold(true); print('ARTICOLI\n'); bold(false);
  for (const item of (order.items || [])) {
    const qty  = item.quantity || 1;
    const unit = item.base_price || 0;
    const extP = (item.extras || []).reduce((s, e) => s + (e.price || 0), 0);
    const choP = (item.required_choices || []).reduce((s, c) => s + (c.price || 0), 0);
    const tot  = ((unit + extP + choP) * qty).toFixed(2);
    bold(true);  print(pad(`${qty}x ${item.name}`, `EU${tot}`) + '\n');
    bold(false);
    (item.required_choices || []).forEach(c => print(`  > ${c.group_name}: ${c.selected}\n`));
    (item.extras || []).forEach(e => print(`  + ${e.name}\n`));
    if (item.removals?.length) print(`  Senza: ${item.removals.join(', ')}\n`);
    if (item.notes) print(`  Nota: ${item.notes}\n`);
  }

  print(sep('='));
  print(pad('Subtotale:', `EU${(order.subtotal || 0).toFixed(2)}`) + '\n');
  print(pad('Consegna:', `EU${(order.delivery_fee || 0).toFixed(2)}`) + '\n');
  if (order.coupon_discount > 0)
    print(pad(`Coupon ${order.coupon_code || ''}:`, `-EU${order.coupon_discount.toFixed(2)}`) + '\n');
  print(sep('='));
  bold(true); print(pad('TOTALE:', `EU${(order.total || 0).toFixed(2)}`) + '\n'); bold(false);
  feed(1);
  p.setAlignment(1);
  bold(true); print(`[ ${payLabel} ]\n`); bold(false);

  if (order.notes) { p.setAlignment(0); print(sep()); print(`NOTE: ${order.notes}\n`); }

  feed(1);
  p.setAlignment(1);
  print('Grazie per aver scelto CRISPY PARMA!\n');
  print('Scontrino non fiscale\n');
  feed(4);
  if (typeof p.cutPaper === 'function') p.cutPaper();
}

function buildEscPosTicket(order, cols = 48) {
  const enc = new TextEncoder();
  const ESC = 0x1b, GS = 0x1d, LF = 0x0a;
  const bytes = [];
  const push = (...b) => b.forEach(x => bytes.push(x));
  const text = (s) => enc.encode(s).forEach(b => bytes.push(b));
  const line = (s = '') => { text(s); push(LF); };
  const sep = (c = '-') => line(c.repeat(cols));
  const pad = (l, r, w = cols) => l + ' '.repeat(Math.max(1, w - l.length - r.length)) + r;

  push(ESC, 0x40); // INIT
  push(ESC, 0x61, 0x01); // CENTER
  push(ESC, 0x45, 0x01); line('CRISPY PARMA'); push(ESC, 0x45, 0x00);
  line('crispyparma.it');
  push(LF);
  push(ESC, 0x45, 0x01);
  line(`ORDINE #${(order.id || '').slice(-6)}`);
  push(ESC, 0x45, 0x00);
  const now = new Date(order.created_date || Date.now())
    .toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  line(now);
  push(LF);
  push(ESC, 0x61, 0x00); // LEFT
  sep();
  if (order.customer_name)  line(`Cliente : ${order.customer_name}`);
  if (order.customer_phone) line(`Tel     : ${order.customer_phone}`);
  sep();
  push(ESC, 0x45, 0x01); line('ARTICOLI'); push(ESC, 0x45, 0x00);

  for (const item of (order.items || [])) {
    const qty  = item.quantity || 1;
    const unit = item.base_price || 0;
    const extP = (item.extras || []).reduce((s, e) => s + (e.price || 0), 0);
    const choP = (item.required_choices || []).reduce((s, c) => s + (c.price || 0), 0);
    const tot  = ((unit + extP + choP) * qty).toFixed(2);
    push(ESC, 0x45, 0x01); line(pad(`${qty}x ${item.name}`, `EU${tot}`)); push(ESC, 0x45, 0x00);
    (item.required_choices || []).forEach(c => line(`  > ${c.group_name}: ${c.selected}`));
    (item.extras || []).forEach(e => line(`  + ${e.name}`));
    if (item.removals?.length) line(`  Senza: ${item.removals.join(', ')}`);
    if (item.notes) line(`  Nota: ${item.notes}`);
  }

  sep('=');
  line(pad('Subtotale:', `EU${(order.subtotal || 0).toFixed(2)}`));
  line(pad('Consegna:', `EU${(order.delivery_fee || 0).toFixed(2)}`));
  if (order.coupon_discount > 0)
    line(pad(`Coupon ${order.coupon_code || ''}:`, `-EU${order.coupon_discount.toFixed(2)}`));
  sep('=');
  push(ESC, 0x45, 0x01);
  const payLabel = { cash: 'CONTANTI', card: 'CARTA/POS', card_online: 'CARTA ONLINE', satispay: 'SATISPAY' }[order.payment_method] || '';
  line(pad('TOTALE:', `EU${(order.total || 0).toFixed(2)}`));
  push(ESC, 0x45, 0x00);
  push(LF);
  push(ESC, 0x61, 0x01);
  push(ESC, 0x45, 0x01); line(`[ ${payLabel} ]`); push(ESC, 0x45, 0x00);
  if (order.notes) { push(ESC, 0x61, 0x00); sep(); line(`NOTE: ${order.notes}`); }
  push(LF);
  push(ESC, 0x61, 0x01);
  line('Grazie per aver scelto CRISPY PARMA!');
  line('Scontrino non fiscale');
  for (let i = 0; i < 4; i++) push(LF);
  push(GS, 0x56, 0x42, 0x00);

  return new Uint8Array(bytes);
}

async function printViaBluetooth(btDevice, order, addLog) {
  if (!btDevice?.gatt?.connected) {
    addLog('GATT non connesso — riconnessione...', 'warn');
    await btDevice.gatt.connect();
    addLog('GATT riconnesso', 'ok');
  }
  const data = buildEscPosTicket(order, 48);
  let service;
  try {
    service = await btDevice.gatt.getPrimaryService(SPP_UUID);
    addLog(`Service SPP trovato`, 'ok');
  } catch {
    service = await btDevice.gatt.getPrimaryService(BT_PRINTER_SERVICE);
    addLog(`Service PrinterService trovato`, 'ok');
  }
  const chars = await service.getCharacteristics();
  const writable = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
  if (!writable) throw new Error('Caratteristica di scrittura non trovata nel device BT');
  const CHUNK = 512;
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK);
    if (writable.properties.writeWithoutResponse) {
      await writable.writeValueWithoutResponse(chunk);
    } else {
      await writable.writeValue(chunk);
    }
  }
  addLog(`Inviati ${data.length} byte ESC/POS`, 'ok');
}

export default function PrinterSettings() {
  const [sunmiBridge, setSunmiBridge] = useState(null);
  const [btDevice, setBtDevice] = useState(null);
  const [btConnecting, setBtConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showDiag, setShowDiag] = useState(false);
  const [log, setLog] = useState([]);
  const pollRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    setLog(prev => [...prev.slice(-29), { msg, type, t: new Date().toLocaleTimeString('it-IT') }]);
  };

  const scanBridge = () => {
    const found = detectSunmiBridge();
    setSunmiBridge(found);
    return found;
  };

  useEffect(() => {
    scanBridge();
    pollRef.current = setInterval(() => {
      const found = detectSunmiBridge();
      if (found) {
        setSunmiBridge(found);
        clearInterval(pollRef.current);
        addLog(`Bridge rilevato: window.${found.name}`, 'ok');
        toast.success('🖨️ Stampante Sunmi connessa!');
      }
    }, 3000);
    const stored = getPrinterDevice('btDevice');
    if (stored?.gatt?.connected) setBtDevice(stored);
    return () => clearInterval(pollRef.current);
  }, []);

  const handleTestSunmi = () => {
    const found = scanBridge();
    if (!found) { toast.error('Bridge Sunmi non trovato'); addLog('Nessun bridge trovato', 'err'); return; }
    setTesting(true);
    setShowDiag(true);
    addLog(`Stampa su window.${found.name}`, 'info');
    try {
      printViaSunmi(found.obj, TEST_ORDER, addLog);
      addLog('✅ Job inviato', 'ok');
      toast.success('Stampa inviata!');
    } catch (e) {
      addLog(`❌ ${e.message}`, 'err');
      toast.error('Errore: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  const handleCashDrawer = () => {
    const found = scanBridge();
    if (!found) { toast.error('Bridge Sunmi non disponibile'); return; }
    try {
      if (typeof found.obj.openCashDrawer === 'function') {
        found.obj.openCashDrawer();
        addLog('openCashDrawer() chiamato', 'ok');
        toast.success('💰 Cassetto aperto!');
      } else {
        addLog('openCashDrawer non disponibile', 'warn');
        toast.error('openCashDrawer non supportato');
      }
    } catch (e) {
      addLog(`❌ ${e.message}`, 'err');
    }
  };

  const handleConnectBluetooth = async () => {
    if (!navigator.bluetooth) {
      toast.error('Web Bluetooth non supportato — usa Chrome su Android o Desktop');
      addLog('Web Bluetooth API non disponibile', 'err');
      return;
    }
    setBtConnecting(true);
    setShowDiag(true);
    addLog('Avvio discovery Bluetooth...', 'info');
    try {
      let device;
      try {
        device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [SPP_UUID] }, { services: [BT_PRINTER_SERVICE] }],
          optionalServices: [SPP_UUID, BT_PRINTER_SERVICE],
        });
      } catch {
        addLog('Filtro multiplo non supportato, uso acceptAllDevices', 'warn');
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [SPP_UUID, BT_PRINTER_SERVICE],
        });
      }
      addLog(`Device: ${device.name || device.id}`, 'info');
      await device.gatt.connect();
      addLog('GATT connesso ✅', 'ok');
      setBtDevice(device);
      setPrinterDevice('btDevice', device);
      device.addEventListener('gattserverdisconnected', () => {
        setBtDevice(null);
        setPrinterDevice('btDevice', null);
        addLog('Device BT disconnesso', 'warn');
        toast.info('Stampante BT disconnessa');
      });
      toast.success(`BT connessa: ${device.name || device.id}`);
    } catch (e) {
      const msg = e.name === 'NotFoundError' ? 'Nessun device trovato / selezione annullata'
        : e.name === 'SecurityError' ? 'Permesso Bluetooth negato' : e.message;
      addLog(`❌ BT: ${msg}`, 'err');
      toast.error(msg);
    } finally {
      setBtConnecting(false);
    }
  };

  const handleDisconnectBluetooth = () => {
    if (btDevice?.gatt?.connected) btDevice.gatt.disconnect();
    setBtDevice(null);
    setPrinterDevice('btDevice', null);
    addLog('Device BT disconnesso manualmente', 'warn');
    toast.info('Bluetooth disconnesso');
  };

  const handleTestBluetooth = async () => {
    if (!btDevice) { toast.error('Nessuna stampante BT connessa'); return; }
    setTesting(true);
    setShowDiag(true);
    addLog(`Stampa BT su "${btDevice.name || btDevice.id}"...`, 'info');
    try {
      await printViaBluetooth(btDevice, TEST_ORDER, addLog);
      addLog('✅ Job ESC/POS inviato', 'ok');
      toast.success('Stampa BT inviata!');
    } catch (e) {
      addLog(`❌ BT: ${e.message}`, 'err');
      toast.error('Errore BT: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  const logColor = { ok: 'text-green-400', err: 'text-red-400', warn: 'text-amber-400', info: 'text-foreground' };

  return (
    <div className="p-6 max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-bold mb-1">Stampante</h1>
        <p className="text-sm text-muted-foreground">Sunmi InnerPrinter (AIDL) · Bluetooth ESC/POS</p>
      </div>

      {/* Banner istruzioni apertura corretta */}
      {!sunmiBridge && (
        <div className="rounded-2xl border border-sky-700/50 bg-sky-950/30 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="font-bold text-sky-300 text-sm">Come abilitare la stampa sul Sunmi</p>
              <p className="text-xs text-sky-400/80 mt-1">
                L'app installata non può accedere alla stampante interna. Per stampare devi aprire questa pagina <strong>dal browser Chrome</strong> del device Sunmi:
              </p>
            </div>
          </div>
          <ol className="text-xs text-sky-300/90 space-y-2 list-none">
            <li className="flex gap-2.5"><span className="bg-sky-800/60 text-sky-200 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold text-[10px]">1</span><span>Apri <strong>Chrome</strong> sul device Sunmi (non l'app installata)</span></li>
            <li className="flex gap-2.5"><span className="bg-sky-800/60 text-sky-200 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold text-[10px]">2</span><span>Vai su <strong>crispyparma.base44.app</strong> e fai login</span></li>
            <li className="flex gap-2.5"><span className="bg-sky-800/60 text-sky-200 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold text-[10px]">3</span><span>Aggiungi alla schermata Home: menu Chrome → <em>"Aggiungi a schermata Home"</em></span></li>
            <li className="flex gap-2.5"><span className="bg-sky-800/60 text-sky-200 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold text-[10px]">4</span><span>Verifica che <strong>Sunmi Inner Printer Service</strong> sia abilitato in Impostazioni → App</span></li>
          </ol>
          <p className="text-[11px] text-sky-500 border-t border-sky-800/40 pt-2">
            Il bridge stampante viene iniettato dal sistema Sunmi <em>solo</em> quando la WebView è aperta da Chrome o da un'app con permesso <code>INNERPRINTER</code>.
          </p>
        </div>
      )}

      {/* Sunmi */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">1 — Sunmi InnerPrinter</h2>
        <div className={`rounded-2xl border p-5 flex items-center gap-4 ${sunmiBridge ? 'bg-green-950/30 border-green-700/50' : 'bg-amber-950/20 border-amber-700/40'}`}>
          {sunmiBridge
            ? <CheckCircle2 className="w-9 h-9 text-green-400 shrink-0" />
            : <AlertCircle className="w-9 h-9 text-amber-400 animate-pulse shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">
              {sunmiBridge ? `window.${sunmiBridge.name}` : 'Bridge non rilevato (polling 3s)'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sunmiBridge
                ? `Metodi: ${['printerInit','printText','setAlignment','setFontWeight','setBold','lineWrap','lineFeed','cutPaper'].filter(m => typeof sunmiBridge.obj[m] === 'function').join(', ')}`
                : 'Apri l\'app dal browser interno del Sunmi'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { scanBridge(); addLog('Bridge ri-scansionato', 'info'); }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <Button onClick={handleTestSunmi} disabled={testing} className="w-full h-12 gap-2 font-semibold">
          <Printer className="w-5 h-5" />
          {testing ? 'Stampa in corso...' : 'Stampa scontrino di prova (Sunmi)'}
        </Button>
        <Button onClick={handleCashDrawer} disabled={!sunmiBridge} variant="outline" className="w-full h-11 gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          Apri cassetto contanti
        </Button>
      </div>

      {/* Bluetooth */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">2 — Bluetooth ESC/POS (esterno)</h2>
        <div className={`rounded-2xl border p-5 flex items-center gap-4 ${btDevice ? 'bg-blue-950/30 border-blue-700/50' : 'bg-muted/20 border-border'}`}>
          {btDevice
            ? <Bluetooth className="w-9 h-9 text-blue-400 shrink-0" />
            : <BluetoothOff className="w-9 h-9 text-muted-foreground shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">
              {btDevice ? `${btDevice.name || btDevice.id}` : 'Nessuna stampante BT connessa'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {btDevice ? 'GATT connesso — UUID SPP' : 'Premi "Connetti" per avviare il pairing (Chrome/Android)'}
            </p>
          </div>
          {btDevice && (
            <Button variant="ghost" size="icon" onClick={handleDisconnectBluetooth}>
              <BluetoothOff className="w-4 h-4 text-red-400" />
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleConnectBluetooth} disabled={btConnecting || !!btDevice} variant="outline" className="flex-1 h-11 gap-2">
            <BluetoothSearching className={`w-5 h-5 ${btConnecting ? 'animate-pulse text-blue-400' : ''}`} />
            {btConnecting ? 'Ricerca...' : btDevice ? 'Connessa' : 'Connetti BT'}
          </Button>
          <Button onClick={handleTestBluetooth} disabled={!btDevice || testing} className="flex-1 h-11 gap-2">
            <Printer className="w-4 h-4" />
            Test BT
          </Button>
        </div>
        <div className="bg-muted/30 rounded-xl px-4 py-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Permessi richiesti su Android 12+:</p>
          <p>· BLUETOOTH_SCAN — ricerca dispositivi</p>
          <p>· BLUETOOTH_CONNECT — pairing e connessione</p>
          <p>· ACCESS_FINE_LOCATION — richiesto da Android per BT discovery</p>
          <p className="mt-1 text-amber-400">Assicurati che Chrome abbia i permessi di localizzazione.</p>
        </div>
      </div>

      {/* Log */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <button
          onClick={() => setShowDiag(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Log operazioni ({log.length})</span>
          </div>
          {showDiag ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showDiag && (
          <div className="bg-black/40 px-4 py-3 font-mono text-xs max-h-44 overflow-y-auto space-y-0.5">
            {log.length === 0
              ? <p className="text-muted-foreground italic">Nessuna operazione ancora eseguita.</p>
              : log.map((l, i) => (
                <p key={i} className={logColor[l.type] || 'text-foreground'}>
                  <span className="text-muted-foreground mr-1">[{l.t}]</span>{l.msg}
                </p>
              ))
            }
          </div>
        )}
      </div>

      {/* Links */}
      <Link to="/restaurant/printer-diag" className="flex items-center justify-between bg-card border border-border rounded-2xl px-5 py-4 hover:border-amber-500/50 transition-all group">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Tool Diagnosi Bridge</p>
            <p className="text-xs text-muted-foreground">Testa ogni metodo · ciclo ordine automatizzato</p>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 transition-colors" />
      </Link>

      <Link to="/restaurant/receipt-designer" className="flex items-center justify-between bg-card border border-border rounded-2xl px-5 py-4 hover:border-primary/50 transition-all group">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Grafica Scontrino</p>
            <p className="text-xs text-muted-foreground">Personalizza logo, testi e footer</p>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </Link>
    </div>
  );
}
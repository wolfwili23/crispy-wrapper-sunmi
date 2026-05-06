/**
 * PrinterDiag — Tool diagnosi stampante Sunmi
 * Testa ogni metodo bridge uno alla volta con log granulare.
 * URL: /restaurant/printer-diag
 */
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Printer, Play, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

// ─── tutti i possibili nomi del bridge ───────────────────────────────────────
const BRIDGE_NAMES = [
  'SunmiInnerPrinter','sunmiInnerPrinter',
  'SunmiPrinter','sunmiPrinter',
  'PrinterBridge','printerBridge',
  'Android','printer',
];

// ─── metodi che ci aspettiamo dal bridge ────────────────────────────────────
const EXPECTED_METHODS = [
  'printText','setAlignment','setFontSize','setFontWeight',
  'lineWrap','cutPaper','openCashDrawer','isConnected',
  // metodi alternativi presenti in alcuni bridge
  'setBold','lineFeed','printRawData','sendRAWData',
];

// ─── ordine di prova minimo ──────────────────────────────────────────────────
const TEST_ORDER = {
  id: 'DIAG000001',
  created_date: new Date().toISOString(),
  customer_name: 'Test Cliente',
  customer_phone: '+39 333 0000000',
  delivery_address: 'Via Roma 1, 43121 Parma PR',
  delivery_type: 'delivery',
  items: [
    { name: 'Chicken Burger', quantity: 2, base_price: 9.50, extras: [{ name: 'BBQ', price: 0.50 }], removals: ['cipolla'], required_choices: [], notes: 'Extra croccante' },
    { name: 'Patatine', quantity: 1, base_price: 3.50, extras: [], removals: [], required_choices: [] },
  ],
  subtotal: 23.00, delivery_fee: 2.99, total: 25.99,
  payment_method: 'cash', notes: 'Test diagnostica',
};

function getBridge() {
  for (const name of BRIDGE_NAMES) {
    const obj = window[name];
    if (obj && typeof obj === 'object') {
      const methods = EXPECTED_METHODS.filter(m => typeof obj[m] === 'function');
      if (methods.length > 0) return { name, obj, methods };
    }
  }
  return null;
}

export default function PrinterDiag() {
  const [bridge, setBridge] = useState(null);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const logRef = useRef(null);
  const pollRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    const entry = { id: Date.now() + Math.random(), msg, type, t: new Date().toLocaleTimeString('it-IT') };
    setLog(prev => [...prev, entry]);
    setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }), 50);
    return entry;
  };

  const scan = () => {
    const found = getBridge();
    setBridge(found);
    return found;
  };

  useEffect(() => {
    scan();
    pollRef.current = setInterval(() => {
      const found = getBridge();
      if (found) { setBridge(found); clearInterval(pollRef.current); }
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, []);

  // ── Step: chiama un metodo con try/catch granulare ─────────────────────────
  const step = (label, fn) => {
    try {
      fn();
      addLog(`✓ ${label}`, 'ok');
      return true;
    } catch (e) {
      addLog(`✗ ${label} → ${e.message}`, 'err');
      return false;
    }
  };

  // ── TEST 1: ping ogni metodo ───────────────────────────────────────────────
  const runMethodScan = () => {
    const b = scan();
    if (!b) { addLog('⚠ Bridge non trovato', 'warn'); return; }
    addLog(`━━ SCAN METODI: window.${b.name} ━━`, 'head');
    EXPECTED_METHODS.forEach(m => {
      if (typeof b.obj[m] === 'function') addLog(`✓ ${m}()  disponibile`, 'ok');
      else addLog(`– ${m}()  assente`, 'warn');
    });
    addLog('━━ fine scan ━━', 'head');
  };

  // ── TEST 2: stampa riga singola (senza formattazione) ─────────────────────
  const runMinimalPrint = async () => {
    const b = scan();
    if (!b) { addLog('⚠ Bridge non trovato', 'warn'); return; }
    setRunning(true);
    addLog(`━━ STAMPA MINIMA ━━`, 'head');
    const p = b.obj;

    step('printText("CRISPY DIAG\\n")', () => p.printText('CRISPY DIAG\n'));
    step('printText("Test OK\\n")',      () => p.printText('Test OK\n'));
    step('lineWrap(3)',                  () => p.lineWrap(3));
    step('cutPaper()',                   () => p.cutPaper());

    addLog('━━ fine stampa minima ━━', 'head');
    setRunning(false);
  };

  // ── TEST 3: ciclo completo ordine ─────────────────────────────────────────
  const runFullOrder = async () => {
    const b = scan();
    if (!b) { addLog('⚠ Bridge non trovato', 'warn'); return; }
    setRunning(true);
    addLog(`━━ CICLO ORDINE COMPLETO ━━`, 'head');
    const p = b.obj;
    const o = TEST_ORDER;

    // intestazione
    step('setAlignment(1)',      () => p.setAlignment(1));
    step('setFontWeight(true)',  () => p.setFontWeight(true));
    step('printText(header)',    () => p.printText('CRISPY PARMA\n'));
    step('setFontWeight(false)', () => p.setFontWeight(false));
    step('printText(site)',      () => p.printText('crispyparma.it\n'));
    step('lineWrap(1)',          () => p.lineWrap(1));

    // ordine + cliente
    step('printText(orderId)',   () => p.printText(`ORDINE #${o.id.slice(-6)}\n`));
    step('setAlignment(0)',      () => p.setAlignment(0));
    step('printText(sep)',       () => p.printText('------------------------\n'));
    step('printText(customer)',  () => p.printText(`Cliente: ${o.customer_name}\n`));
    step('printText(phone)',     () => p.printText(`Tel: ${o.customer_phone}\n`));
    step('printText(sep)',       () => p.printText('------------------------\n'));

    // articoli
    for (const item of o.items) {
      const tot = ((item.base_price + (item.extras||[]).reduce((s,e)=>s+(e.price||0),0)) * item.quantity).toFixed(2);
      step(`printText(item: ${item.name})`, () => p.printText(`${item.quantity}x ${item.name}  EUR ${tot}\n`));
      if (item.extras?.length) step('printText(extras)', () => p.printText(`  + ${item.extras.map(e=>e.name).join(', ')}\n`));
      if (item.removals?.length) step('printText(removals)', () => p.printText(`  Senza: ${item.removals.join(', ')}\n`));
      if (item.notes) step('printText(notes)', () => p.printText(`  Nota: ${item.notes}\n`));
    }

    // totali
    step('printText(sep=)',      () => p.printText('========================\n'));
    step('setAlignment(1)',      () => p.setAlignment(1));
    step('setFontWeight(true)',  () => p.setFontWeight(true));
    step('printText(total)',     () => p.printText(`TOTALE EUR ${o.total.toFixed(2)}\n`));
    step('setFontWeight(false)', () => p.setFontWeight(false));
    step('printText(payment)',   () => p.printText('[CONTANTI]\n'));

    // footer
    step('lineWrap(1)',          () => p.lineWrap(1));
    step('printText(thanks)',    () => p.printText('Grazie per aver scelto CRISPY PARMA!\n'));
    step('printText(disclaimer)',() => p.printText('Scontrino non fiscale\n'));
    step('lineWrap(4)',          () => p.lineWrap(4));
    step('cutPaper()',           () => p.cutPaper());

    addLog('━━ fine ciclo ordine ━━', 'head');
    setRunning(false);
  };

  // ── TEST 4: metodi alternativi (setBold / lineFeed) ───────────────────────
  const runAltMethods = () => {
    const b = scan();
    if (!b) { addLog('⚠ Bridge non trovato', 'warn'); return; }
    addLog('━━ TEST METODI ALTERNATIVI ━━', 'head');
    const p = b.obj;

    // prova setBold
    if (typeof p.setBold === 'function') {
      step('setBold(true)',  () => p.setBold(true));
      step('printText("setBold test\\n")', () => p.printText('setBold test\n'));
      step('setBold(false)', () => p.setBold(false));
    } else {
      addLog('– setBold: non presente', 'warn');
    }

    // prova setFontSize
    [20, 24, 28, 32].forEach(sz => {
      step(`setFontSize(${sz})`, () => p.setFontSize(sz));
    });

    // ripristina e stampa
    step('printText("FontSize test\\n")', () => p.printText('FontSize test\n'));
    step('lineWrap(2)', () => p.lineWrap(2));
    step('cutPaper()',  () => p.cutPaper());

    addLog('━━ fine test alternativi ━━', 'head');
  };

  // ── cassetto contanti ─────────────────────────────────────────────────────
  const runCashDrawer = () => {
    const b = scan();
    if (!b) { addLog('⚠ Bridge non trovato', 'warn'); return; }
    addLog('━━ TEST CASSETTO ━━', 'head');
    step('openCashDrawer()', () => b.obj.openCashDrawer());
    addLog('━━ fine test cassetto ━━', 'head');
  };

  const copyLog = () => {
    const text = log.map(l => `[${l.t}] ${l.msg}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Log copiato negli appunti');
  };

  const logColor = { ok: 'text-green-400', err: 'text-red-400', warn: 'text-amber-400', head: 'text-sky-400', info: 'text-foreground' };

  const methodStatus = (m) => {
    if (!bridge) return 'unknown';
    return typeof bridge.obj[m] === 'function' ? 'ok' : 'missing';
  };

  return (
    <div className="p-4 max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display uppercase tracking-wider">🔬 Diagnosi Stampante</h1>
          <p className="text-xs text-muted-foreground">Tool tecnico — testa ogni metodo del bridge Sunmi</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => { scan(); addLog('🔄 Bridge re-scansionato', 'info'); }}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Status bridge */}
      <div className={`rounded-xl border p-4 ${bridge ? 'border-green-700/50 bg-green-950/20' : 'border-amber-700/40 bg-amber-950/10'}`}>
        <div className="flex items-center gap-3 mb-3">
          {bridge
            ? <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
            : <AlertCircle className="w-6 h-6 text-amber-400 animate-pulse shrink-0" />}
          <div>
            <p className="font-bold text-sm">
              {bridge ? `Bridge: window.${bridge.name}` : 'Bridge non rilevato (polling ogni 2s)'}
            </p>
            <p className="text-xs text-muted-foreground">
              {bridge ? `${bridge.methods.length} metodi trovati` : 'Apri dal Sunmi con APK installato'}
            </p>
          </div>
        </div>

        {bridge && (
          <div className="flex flex-wrap gap-1.5">
            {EXPECTED_METHODS.map(m => (
              <span key={m} className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${
                methodStatus(m) === 'ok'
                  ? 'bg-green-950/40 border-green-700/40 text-green-400'
                  : 'bg-muted border-border text-muted-foreground line-through'
              }`}>{m}</span>
            ))}
          </div>
        )}
      </div>

      {/* Pulsanti test */}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={runMethodScan} disabled={!bridge} variant="outline" className="gap-2 h-11">
          <RefreshCw className="w-4 h-4" />Scan metodi
        </Button>
        <Button onClick={runMinimalPrint} disabled={!bridge || running} className="gap-2 h-11">
          <Printer className="w-4 h-4" />Stampa minima
        </Button>
        <Button onClick={runAltMethods} disabled={!bridge || running} variant="outline" className="gap-2 h-11">
          <AlertCircle className="w-4 h-4" />Test setBold/fontSize
        </Button>
        <Button onClick={runCashDrawer} disabled={!bridge || running} variant="outline" className="gap-2 h-11">
          💰 Test cassetto
        </Button>
        <Button
          onClick={runFullOrder}
          disabled={!bridge || running}
          className="col-span-2 gap-2 h-12 font-bold text-base bg-primary"
        >
          <Play className="w-5 h-5" />
          {running ? 'Ciclo in esecuzione...' : 'CICLO ORDINE COMPLETO (automatizzato)'}
        </Button>
      </div>

      {/* Log console */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
          <span className="text-xs font-mono font-bold text-muted-foreground">LOG ({log.length} righe)</span>
          <div className="flex gap-2">
            <button onClick={copyLog} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Copy className="w-3 h-3" />copia
            </button>
            <button onClick={() => setLog([])} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Trash2 className="w-3 h-3" />pulisci
            </button>
          </div>
        </div>
        <div
          ref={logRef}
          className="h-64 overflow-y-auto bg-black/60 p-3 space-y-0.5 font-mono text-xs"
        >
          {log.length === 0
            ? <p className="text-muted-foreground italic">Premi un pulsante per avviare la diagnosi...</p>
            : log.map(l => (
              <p key={l.id} className={logColor[l.type] || 'text-foreground'}>
                <span className="text-muted-foreground mr-2">[{l.t}]</span>{l.msg}
              </p>
            ))
          }
        </div>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 text-[11px] text-muted-foreground">
        <span><span className="text-green-400">✓</span> OK</span>
        <span><span className="text-red-400">✗</span> Errore</span>
        <span><span className="text-amber-400">–</span> Assente</span>
        <span><span className="text-sky-400">━━</span> Sezione</span>
      </div>
    </div>
  );
}
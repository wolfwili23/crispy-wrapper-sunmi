import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Stampa solo quando il pagamento è confermato (status non è più pending_payment)
    if (!data || event.type !== 'update') {
      return Response.json({ ok: true });
    }

    // Triggato solo quando il pagamento passa da pending_payment a pending
    // oppure quando viene accettato direttamente
    const shouldPrint = data.status === 'pending' || data.status === 'accepted';
    if (!shouldPrint) {
      return Response.json({ ok: true });
    }

    console.log(`[autoPrintOrder] Stampa automatica ordine #${data.id.slice(-6)}`);

    // Puoi aggiungere qui una chiamata a un servizio di stampa remoto se necessario
    // Per ora logghiamo solo che l'automazione è stata triggerata correttamente
    return Response.json({ 
      ok: true,
      message: `Ordine #${data.id.slice(-6)} pronto per la stampa`,
      order_id: data.id,
      status: data.status
    });
  } catch (error) {
    console.error('[autoPrintOrder]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
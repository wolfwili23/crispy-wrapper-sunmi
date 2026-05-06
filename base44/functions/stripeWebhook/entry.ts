import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const signature = req.headers.get('stripe-signature');

    if (!webhookSecret || !signature) {
      return Response.json({ error: 'Missing webhook config' }, { status: 400 });
    }

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    const base44 = createClientFromRequest(req);
    const orderId = event.data.object.metadata?.order_id;

    if (!orderId) {
      console.log('No order_id in metadata, skipping');
      return Response.json({ received: true });
    }

    if (event.type === 'payment_intent.succeeded') {
      console.log(`Payment succeeded for order ${orderId}`);

      await base44.asServiceRole.entities.Order.update(orderId, { status: 'pending' });

      // Fetch order to send email
      const order = await base44.asServiceRole.entities.Order.get(orderId);
      if (order) {
        const itemsList = order.items.map(i => `${i.quantity}x ${i.name} — €${(i.item_total).toFixed(2)}`).join('\n');
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: order.customer_email,
          subject: `Ordine confermato #${orderId.slice(-6)} — Crispy Parma`,
          body: `Ciao ${order.customer_name}!\n\nIl tuo pagamento di €${order.total.toFixed(2)} è stato confermato ✅\n\n${itemsList}\n\nGrazie per il tuo ordine!\nCrispy Parma`,
          from_name: 'Crispy Parma',
        });
      }
    } else if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
      console.log(`Payment failed/canceled for order ${orderId}`);
      await base44.asServiceRole.entities.Order.update(orderId, { status: 'cancelled' });
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});
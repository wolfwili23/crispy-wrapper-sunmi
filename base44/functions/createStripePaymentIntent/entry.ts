import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { order_id, total } = await req.json();

    if (!order_id || !total || total <= 0) {
      return Response.json({ error: 'Parametri non validi' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'eur',
      receipt_email: user.email,
      metadata: {
        order_id,
        customer_email: user.email,
        app_id: Deno.env.get('BASE44_APP_ID'),
      },
      payment_method_types: ['card'],
    });

    return Response.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('createStripePaymentIntent error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
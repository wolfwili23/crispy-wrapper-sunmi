import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
    if (!publishableKey) return Response.json({ error: 'STRIPE_PUBLISHABLE_KEY non configurata' }, { status: 500 });

    return Response.json({ publishableKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
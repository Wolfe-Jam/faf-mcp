import Stripe from 'stripe';
import { Request, Response } from 'express';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Create Stripe Checkout Session for token top-up
 * POST /api/create-checkout
 */
export async function createCheckoutSession(req: Request, res: Response) {
  try {
    const { amount, autoReload = false } = req.body;

    // Validate amount
    if (!amount || amount < 10) {
      return res.status(400).json({
        error: 'Invalid amount. Minimum top-up is $10.'
      });
    }

    // Calculate tokens (1 USD = 10,000 tokens)
    const tokens = amount * 10000;

    // Get user ID (TODO: Replace with real auth)
    const userId = req.headers['x-user-id'] || 'demo-user';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'MCPaaS Tokens',
              description: `${tokens.toLocaleString()} tokens for eternal memory`,
              images: ['https://mcpaas.live/logo.png'],
            },
            unit_amount: amount * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.DOMAIN || 'https://mcpaas.live'}/billing?success=true`,
      cancel_url: `${process.env.DOMAIN || 'https://mcpaas.live'}/billing?canceled=true`,
      client_reference_id: userId,
      metadata: {
        userId,
        tokens: tokens.toString(),
        autoReload: autoReload.toString(),
      },
    });

    return res.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session'
    });
  }
}

/**
 * Stripe Webhook Handler
 * POST /api/stripe-webhook
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.userId;
      const tokens = parseInt(session.metadata?.tokens || '0');
      const autoReload = session.metadata?.autoReload === 'true';

      if (!userId || !tokens) {
        console.error('Missing metadata in checkout session');
        return res.status(400).json({ error: 'Invalid session metadata' });
      }

      // Add tokens to user account
      await addTokensToAccount(userId, tokens);

      // Save auto-reload preference
      if (autoReload) {
        await saveAutoReloadPreference(userId, {
          enabled: true,
          threshold: 5000,
          amount: parseInt(session.amount_total?.toString() || '0') / 100,
        });
      }

      console.log(`✅ Added ${tokens} tokens to user ${userId}`);
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.error('❌ Payment failed:', paymentIntent.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return res.json({ received: true });
}

/**
 * Add tokens to user account
 */
async function addTokensToAccount(userId: string, tokens: number): Promise<void> {
  // TODO: Implement real database storage
  // For now, this is a placeholder

  console.log(`Adding ${tokens} tokens to user ${userId}`);

  // Example implementation with KV storage:
  /*
  const currentBalance = await kv.get(`user:${userId}:tokens`) || 0;
  const newBalance = currentBalance + tokens;
  await kv.set(`user:${userId}:tokens`, newBalance);

  // Log transaction
  await kv.lpush(`user:${userId}:transactions`, JSON.stringify({
    type: 'credit',
    tokens,
    timestamp: new Date().toISOString(),
    source: 'stripe_purchase',
  }));
  */
}

/**
 * Save auto-reload preference
 */
async function saveAutoReloadPreference(
  userId: string,
  config: { enabled: boolean; threshold: number; amount: number }
): Promise<void> {
  // TODO: Implement real database storage
  console.log(`Saving auto-reload config for user ${userId}:`, config);

  // Example implementation:
  /*
  await kv.set(`user:${userId}:auto-reload`, JSON.stringify(config));
  */
}

/**
 * Get user token balance
 * GET /api/balance
 */
export async function getBalance(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] || 'demo-user';

    // TODO: Fetch real balance from database
    const balance = 8234; // Placeholder

    // Get free tier usage this month
    const freeTierUsed = 10000; // Placeholder
    const freeTierLimit = 10000;

    // Get usage stats
    const reads = 45123; // Placeholder
    const writes = 1411; // Placeholder

    return res.json({
      balance,
      usd: (balance / 10000).toFixed(2),
      freeTier: {
        used: freeTierUsed,
        limit: freeTierLimit,
        remaining: Math.max(0, freeTierLimit - freeTierUsed),
      },
      usage: {
        reads,
        writes,
        total: reads + (writes * 10),
      },
    });

  } catch (error) {
    console.error('Balance fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch balance' });
  }
}

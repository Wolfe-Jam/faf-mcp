import { Request, Response, NextFunction } from 'express';

/**
 * Token costs for different operations
 */
export const TOKEN_COSTS = {
  READ_SOUL: 1,
  WRITE_SOUL: 10,
  CREATE_SOUL: 100,
  GHOST_REVEAL: 0,
} as const;

/**
 * Free tier limits
 */
export const FREE_TIER = {
  TOKENS_PER_MONTH: 10000,
  RESET_DAY: 1, // Reset on 1st of each month
} as const;

/**
 * Token tracking middleware
 * Deducts tokens for each operation
 */
export async function trackTokens(
  operation: keyof typeof TOKEN_COSTS,
  userId: string
): Promise<{ success: boolean; balance: number; error?: string }> {

  const cost = TOKEN_COSTS[operation];

  if (cost === 0) {
    // Free operation (e.g., Ghost reveal)
    return { success: true, balance: await getUserBalance(userId) };
  }

  // Get current balance
  const currentBalance = await getUserBalance(userId);
  const freeTierRemaining = await getFreeTierRemaining(userId);

  // Check if we can use free tier
  if (freeTierRemaining >= cost) {
    // Deduct from free tier
    await deductFreeTier(userId, cost);
    return {
      success: true,
      balance: currentBalance,
    };
  }

  // Need to use paid balance
  const paidCost = cost - freeTierRemaining;

  if (currentBalance < paidCost) {
    // Insufficient balance
    return {
      success: false,
      balance: currentBalance,
      error: `Insufficient tokens. Need ${cost}, have ${currentBalance + freeTierRemaining}. Top up at /billing`,
    };
  }

  // Deduct remaining free tier (if any)
  if (freeTierRemaining > 0) {
    await deductFreeTier(userId, freeTierRemaining);
  }

  // Deduct from paid balance
  await deductPaidBalance(userId, paidCost);

  const newBalance = await getUserBalance(userId);

  // Check for low balance alert
  if (newBalance < 1000) {
    // TODO: Send low balance notification
    console.warn(`⚠️ Low balance alert for user ${userId}: ${newBalance} tokens remaining`);
  }

  // Check for auto-reload
  const autoReloadConfig = await getAutoReloadConfig(userId);
  if (autoReloadConfig.enabled && newBalance < autoReloadConfig.threshold) {
    await triggerAutoReload(userId, autoReloadConfig.amount);
  }

  return {
    success: true,
    balance: newBalance,
  };
}

/**
 * Express middleware to track tokens
 */
export function tokenMiddleware(operation: keyof typeof TOKEN_COSTS) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    const result = await trackTokens(operation, userId);

    if (!result.success) {
      return res.status(402).json({
        error: result.error,
        balance: result.balance,
        topUpUrl: '/billing',
      });
    }

    // Add balance to response headers
    res.setHeader('X-Token-Balance', result.balance.toString());
    res.setHeader('X-Token-Cost', TOKEN_COSTS[operation].toString());

    next();
  };
}

/**
 * Get user's paid token balance
 */
async function getUserBalance(userId: string): Promise<number> {
  // TODO: Implement real database storage
  // Placeholder: return demo balance
  return 8234;

  // Example implementation:
  /*
  const balance = await kv.get(`user:${userId}:tokens`);
  return balance || 0;
  */
}

/**
 * Get remaining free tier tokens for current month
 */
async function getFreeTierRemaining(userId: string): Promise<number> {
  // TODO: Implement real database storage
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Placeholder
  return 0; // Assuming free tier exhausted

  // Example implementation:
  /*
  const used = await kv.get(`user:${userId}:free-tier:${currentMonth}`) || 0;
  return Math.max(0, FREE_TIER.TOKENS_PER_MONTH - used);
  */
}

/**
 * Deduct tokens from free tier
 */
async function deductFreeTier(userId: string, amount: number): Promise<void> {
  const currentMonth = new Date().toISOString().slice(0, 7);

  // TODO: Implement real database storage
  console.log(`Deducting ${amount} tokens from free tier for user ${userId} (month: ${currentMonth})`);

  // Example implementation:
  /*
  const key = `user:${userId}:free-tier:${currentMonth}`;
  const current = await kv.get(key) || 0;
  await kv.set(key, current + amount);
  */
}

/**
 * Deduct tokens from paid balance
 */
async function deductPaidBalance(userId: string, amount: number): Promise<void> {
  // TODO: Implement real database storage
  console.log(`Deducting ${amount} tokens from paid balance for user ${userId}`);

  // Example implementation:
  /*
  const balance = await kv.get(`user:${userId}:tokens`) || 0;
  const newBalance = Math.max(0, balance - amount);
  await kv.set(`user:${userId}:tokens`, newBalance);

  // Log transaction
  await kv.lpush(`user:${userId}:transactions`, JSON.stringify({
    type: 'debit',
    tokens: amount,
    timestamp: new Date().toISOString(),
  }));
  */
}

/**
 * Get auto-reload configuration
 */
async function getAutoReloadConfig(userId: string): Promise<{
  enabled: boolean;
  threshold: number;
  amount: number;
}> {
  // TODO: Implement real database storage
  return {
    enabled: false,
    threshold: 5000,
    amount: 25,
  };

  // Example implementation:
  /*
  const config = await kv.get(`user:${userId}:auto-reload`);
  return config ? JSON.parse(config) : { enabled: false, threshold: 5000, amount: 25 };
  */
}

/**
 * Trigger auto-reload
 */
async function triggerAutoReload(userId: string, amount: number): Promise<void> {
  console.log(`🔄 Triggering auto-reload for user ${userId}: $${amount}`);

  // TODO: Charge Stripe payment method on file
  // TODO: Add tokens to account after successful charge

  // Example implementation:
  /*
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const customer = await getStripeCustomer(userId);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // cents
    currency: 'usd',
    customer: customer.id,
    payment_method: customer.invoice_settings.default_payment_method,
    off_session: true,
    confirm: true,
    description: `MCPaaS Auto-Reload: ${amount * 10000} tokens`,
  });

  if (paymentIntent.status === 'succeeded') {
    await addTokensToAccount(userId, amount * 10000);
  }
  */
}

/**
 * Reset free tier for all users (run monthly cron)
 */
export async function resetFreeTier(): Promise<void> {
  console.log('🔄 Resetting free tier for all users (monthly cron)');

  // TODO: Implement real database storage
  // Delete all free-tier usage keys for previous month
  // Example:
  /*
  const previousMonth = new Date();
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  const monthKey = previousMonth.toISOString().slice(0, 7);

  const keys = await kv.keys(`user:*:free-tier:${monthKey}`);
  for (const key of keys) {
    await kv.del(key);
  }
  */
}

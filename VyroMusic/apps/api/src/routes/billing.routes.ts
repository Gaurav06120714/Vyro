import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StripeLib = require('stripe');
import type { Stripe as StripeType } from '../../../../node_modules/stripe/cjs/stripe.core';

// ── Plans ─────────────────────────────────────────────────────────────────────
const PLANS = [
  { id: 'free', name: 'Free', price: 0, features: ['Ad-supported', '320kbps', 'Limited skips'] },
  {
    id: 'premium',
    name: 'Premium',
    price: 999,
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    features: ['No ads', 'Unlimited skips', 'Offline mode', 'HiFi audio'],
  },
  {
    id: 'family',
    name: 'Family',
    price: 1499,
    priceId: process.env.STRIPE_FAMILY_PRICE_ID,
    features: ['6 accounts', 'All Premium features', 'Family Mix playlist'],
  },
  {
    id: 'student',
    name: 'Student',
    price: 499,
    priceId: process.env.STRIPE_STUDENT_PRICE_ID,
    features: ['50% off Premium', 'Verify annually'],
  },
] as const;

type PlanId = 'free' | 'premium' | 'family' | 'student';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getStripe(): StripeType | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new StripeLib(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' }) as StripeType;
}

function requireAuth(app: FastifyInstance) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  };
}

// ── Route registration ────────────────────────────────────────────────────────
export async function billingRoutes(app: FastifyInstance) {
  const db = (await import('../db/client')).getDb();

  // ── GET /billing/plans ────────────────────────────────────────────────────
  app.get('/billing/plans', async () => ({ plans: PLANS }));

  // ── POST /billing/create-checkout-session ─────────────────────────────────
  app.post(
    '/billing/create-checkout-session',
    { preHandler: [requireAuth(app)] },
    async (req, reply) => {
      const stripe = getStripe();
      if (!stripe) {
        return reply.status(503).send({ error: 'Billing not configured' });
      }

      const payload = req.user as { sub: string; email: string };
      const { planId } = req.body as { planId: PlanId };

      const plan = PLANS.find(p => p.id === planId);
      if (!plan || plan.id === 'free' || !('priceId' in plan) || !plan.priceId) {
        return reply.status(400).send({ error: 'Invalid plan' });
      }

      try {
        const userRow = await db.query<{ stripe_customer_id: string | null; email: string }>(
          'SELECT stripe_customer_id, email FROM users WHERE id = $1',
          [payload.sub],
        );

        const user = userRow.rows[0];
        if (!user) return reply.status(404).send({ error: 'User not found' });

        let customerId = user.stripe_customer_id;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            metadata: { userId: payload.sub },
          });
          customerId = customer.id;
          await db.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [
            customerId,
            payload.sub,
          ]);
        }

        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: 'subscription',
          line_items: [{ price: plan.priceId, quantity: 1 }],
          success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/upgrade/success`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/upgrade/cancel`,
          metadata: { userId: payload.sub, planId },
        });

        return { url: session.url };
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({ error: 'Failed to create checkout session' });
      }
    },
  );

  // ── POST /billing/create-portal-session ──────────────────────────────────
  app.post(
    '/billing/create-portal-session',
    { preHandler: [requireAuth(app)] },
    async (req, reply) => {
      const stripe = getStripe();
      if (!stripe) {
        return reply.status(503).send({ error: 'Billing not configured' });
      }

      const payload = req.user as { sub: string };

      try {
        const userRow = await db.query<{ stripe_customer_id: string | null }>(
          'SELECT stripe_customer_id FROM users WHERE id = $1',
          [payload.sub],
        );

        const customerId = userRow.rows[0]?.stripe_customer_id;
        if (!customerId) {
          return reply.status(400).send({ error: 'No billing account found' });
        }

        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/upgrade`,
        });

        return { url: session.url };
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({ error: 'Failed to create portal session' });
      }
    },
  );

  // ── POST /billing/webhook ─────────────────────────────────────────────────
  // Stripe requires the raw body to verify signatures.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req: FastifyRequest, body: Buffer, done: (err: Error | null, body?: Buffer) => void) =>
      done(null, body),
  );

  app.post('/billing/webhook', async (req, reply) => {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !webhookSecret) {
      app.log.warn('Stripe webhook received but Stripe is not configured');
      return reply.status(200).send({ received: true });
    }

    const sig = req.headers['stripe-signature'] as string;
    let event: StripeType.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
    } catch (err) {
      app.log.warn({ err }, 'Stripe webhook signature verification failed');
      return reply.status(400).send({ error: 'Invalid signature' });
    }

    try {
      // Log the raw event first
      await db.query(
        `INSERT INTO subscription_events (stripe_event_id, event_type, data)
         VALUES ($1, $2, $3)
         ON CONFLICT (stripe_event_id) DO NOTHING`,
        [event.id, event.type, JSON.stringify(event.data)],
      );

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as StripeType.Checkout.Session;
          const userId = session.metadata?.userId;
          const planId = (session.metadata?.planId as PlanId) || 'premium';
          if (!userId) break;

          let periodEnd: Date | null = null;
          let subscriptionId: string | null = null;

          if (typeof session.subscription === 'string') {
            subscriptionId = session.subscription;
            const sub = await stripe.subscriptions.retrieve(session.subscription) as unknown as StripeType.Subscription & { current_period_end: number };
            periodEnd = new Date(sub.current_period_end * 1000);
          }

          await db.query(
            `UPDATE users SET
               stripe_customer_id = COALESCE($2, stripe_customer_id),
               stripe_subscription_id = $3,
               subscription_tier = $4,
               subscription_status = 'active',
               subscription_period_end = $5
             WHERE id = $1`,
            [
              userId,
              typeof session.customer === 'string' ? session.customer : null,
              subscriptionId,
              planId,
              periodEnd,
            ],
          );

          // Annotate log entry with user_id
          await db.query(
            'UPDATE subscription_events SET user_id = $1 WHERE stripe_event_id = $2',
            [userId, event.id],
          );
          break;
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object as StripeType.Subscription & { current_period_end: number };
          const customerId = typeof sub.customer === 'string' ? sub.customer : null;
          if (!customerId) break;

          const status =
            sub.status === 'active'
              ? 'active'
              : sub.status === 'past_due'
              ? 'past_due'
              : sub.status;
          const periodEnd = new Date(sub.current_period_end * 1000);

          await db.query(
            `UPDATE users SET
               subscription_status = $2,
               subscription_period_end = $3
             WHERE stripe_customer_id = $1`,
            [customerId, status, periodEnd],
          );
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as StripeType.Subscription;
          const customerId = typeof sub.customer === 'string' ? sub.customer : null;
          if (!customerId) break;

          await db.query(
            `UPDATE users SET
               subscription_tier = 'free',
               subscription_status = 'canceled',
               stripe_subscription_id = NULL
             WHERE stripe_customer_id = $1`,
            [customerId],
          );
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as StripeType.Invoice;
          const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;
          if (!customerId) break;

          await db.query(
            `UPDATE users SET
               subscription_tier = 'free',
               subscription_status = 'past_due'
             WHERE stripe_customer_id = $1`,
            [customerId],
          );
          break;
        }

        default:
          break;
      }
    } catch (err) {
      app.log.error({ err, eventType: event.type }, 'Webhook handler error');
      // Return 200 so Stripe does not retry — failure is logged
    }

    return reply.status(200).send({ received: true });
  });
}

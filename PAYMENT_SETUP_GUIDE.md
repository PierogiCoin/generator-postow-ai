# 💳 Payment & Subscription System - Setup Guide

## 🎯 Overview

Complete payment system with:
- ✅ Stripe integration
- ✅ Monthly subscriptions (4 plans)
- ✅ One-time credit packs
- ✅ Usage tracking
- ✅ Automatic billing
- ✅ Customer portal

---

## 📦 What's Included

### **Files Created:**

#### **Backend:**
1. `server/stripe.ts` - Stripe integration & pricing logic
2. `server/routes/payments.ts` - API endpoints
3. `server/middleware/credits.ts` - Credit checking middleware
4. `DATABASE_SCHEMA_PAYMENTS.sql` - Database tables

#### **Frontend:**
5. `components/PricingModal.tsx` - Pricing UI (already exists, needs update)
6. `components/UsageMonitor.tsx` - Usage dashboard

#### **Documentation:**
7. `PAYMENT_SETUP_GUIDE.md` - This file

---

## 💰 Pricing Structure

> Source of truth: `config/pricingMath.ts` + `config/subscriptionPlans.ts` (limits on cards = `usageLimits`).

### **Monthly Subscriptions:**

| Plan | Price (USD / PLN) | Credits | Posts (limit) | Images | Videos |
|------|-------------------|---------|---------------|--------|--------|
| **Free** | $0 | 150 | 15 | 5 | 0 |
| **Creator** | $19 / ~79 zł | 600 | 100 | 20 | 2 |
| **Pro** | $49 | 1,800 | 500 | 100 | 10 |
| **Business** | $99 | 6,000 | 800 | 200 | 50 |
| **Agency** | $249 | 18,000 | 2,000 | 400 | 80 |
| **Enterprise** | $299 | 28,000 | ∞ | ∞ | ∞ |

PLN on the UI is approximate (~4.2 PLN/USD). Stripe charges **USD**.

**Annual billing:** 10× monthly USD (2 months free ≈ −17%). Env: `STRIPE_{PLAN}_YEARLY_PRICE_ID`. UI toggle in `PricingModal`. Run `scripts/stripe-bootstrap.sh` (or live) to create yearly prices.

### **Credit costs**

See `config/creditCosts.ts` (and server equivalent). Typical post ≈ 10 credits.

### **One-Time Credit Packs:**

| Pack | Credits | Price (USD) |
|------|---------|-------------|
| Small | 400 | $9.99 |
| Medium | 1,100 | $24.99 |
| Large | 2,600 | $49.99 |
| Mega | 7,000 | $99.99 |

---

## 🚀 Setup Instructions

### **Step 1: Stripe Account**

1. Create account at [stripe.com](https://stripe.com)
2. Get your API keys from Dashboard
3. Create products and prices

### **Step 2: Create Stripe Products**

#### **A) Create Subscription Plans:**

```bash
# Pro Plan
stripe products create \
  --name "Pro Plan" \
  --description "For serious creators"

stripe prices create \
  --product <PRO_PRODUCT_ID> \
  --unit-amount 2900 \
  --currency usd \
  --recurring interval=month

# Business Plan
stripe products create \
  --name "Business Plan" \
  --description "For growing teams"

stripe prices create \
  --product <BUSINESS_PRODUCT_ID> \
  --unit-amount 9900 \
  --currency usd \
  --recurring interval=month

# Enterprise Plan
stripe products create \
  --name "Enterprise Plan" \
  --description "For large organizations"

stripe prices create \
  --product <ENTERPRISE_PRODUCT_ID> \
  --unit-amount 29900 \
  --currency usd \
  --recurring interval=month
```

#### **B) Create Credit Packs:**

```bash
# Small Pack
stripe products create \
  --name "Small Credit Pack" \
  --description "500 credits"

stripe prices create \
  --product <SMALL_PACK_PRODUCT_ID> \
  --unit-amount 999 \
  --currency usd

# Repeat for Medium, Large, and Mega packs...
```

### **Step 3: Environment Variables**

Add to `server/.env`:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (from Step 2)
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# Credit Pack Price IDs
STRIPE_CREDITS_SMALL_PRICE_ID=price_...
STRIPE_CREDITS_MEDIUM_PRICE_ID=price_...
STRIPE_CREDITS_LARGE_PRICE_ID=price_...
STRIPE_CREDITS_MEGA_PRICE_ID=price_...

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

Add to root `.env.local`:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### **Step 4: Database Setup**

Run the SQL migrations:

```bash
# In Supabase SQL Editor, run:
cat DATABASE_SCHEMA_PAYMENTS.sql
```

This creates:
- Subscription tables
- Credit transaction tracking
- Invoice records
- Payment methods
- Usage tracking
- Notifications

### **Step 5: Install Dependencies**

```bash
# Server
cd server
npm install stripe express-async-handler

# Root (if needed)
npm install @stripe/stripe-js
```

### **Step 6: Stripe Webhooks**

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/payments/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret to `.env`

For local testing:

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3001/api/payments/webhook

# Copy webhook secret to .env
```

---

## 🔧 Implementation

### **1. Protect API Routes with Credit Checks**

```typescript
import { requireCredits, withCreditDeduction } from './middleware/credits';
import { PRICING } from './stripe';

// Option A: Middleware approach
app.post('/api/generate-post', 
  requireAuth,
  requireCredits('generatePost'),
  async (req, res) => {
    // Your logic here
    const result = await generatePost(req.body);
    
    // Deduct credits on success
    await deductCreditsMiddleware(req, res, 'generatePost', {
      postId: result.id
    });
    
    res.json(result);
  }
);

// Option B: Wrapped handler (automatic deduction)
app.post('/api/generate-image',
  requireAuth,
  requireCredits('generateImage'),
  withCreditDeduction('generateImage', async (req, res) => {
    const image = await generateImage(req.body);
    res.json(image);
  })
);
```

### **2. Add Usage Monitor to Dashboard**

```tsx
import { UsageMonitor } from '@/components/UsageMonitor';

function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Your existing dashboard content */}
      
      {/* Add usage monitor */}
      <div className="lg:col-span-1">
        <UsageMonitor />
      </div>
    </div>
  );
}
```

### **3. Show Pricing Modal**

```tsx
import { PricingModal } from '@/components/PricingModal';

function YourComponent() {
  const [showPricing, setShowPricing] = useState(false);

  return (
    <>
      <Button onClick={() => setShowPricing(true)}>
        Upgrade Plan
      </Button>

      <PricingModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        defaultTab="subscriptions"
      />
    </>
  );
}
```

### **4. Check Credits Before Action**

```typescript
// Client-side check (for UX)
async function checkBeforeGenerate() {
  const response = await fetch('/api/payments/check-credits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: 'generateImage' }),
  });

  const data = await response.json();

  if (!data.hasEnough) {
    // Show upgrade modal
    setShowPricing(true);
    return false;
  }

  return true;
}
```

---

## 🎨 UI Integration

### **Add to Navigation/Header:**

```tsx
<div className="flex items-center gap-4">
  <div className="flex items-center gap-2">
    <Zap className="w-4 h-4" />
    <span className="text-sm font-medium">
      {user.credits} credits
    </span>
  </div>
  
  <Button 
    size="sm" 
    variant="outline"
    onClick={() => setShowPricing(true)}
  >
    Upgrade
  </Button>
</div>
```

### **Insufficient Credits UI:**

The system automatically returns 402 status when credits are insufficient. Handle it:

```typescript
try {
  const response = await fetch('/api/generate-post', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (response.status === 402) {
    const error = await response.json();
    
    // Show upgrade prompt
    toast.error(`Not enough credits! Need ${error.required}, have ${error.current}`);
    setShowPricing(true);
    return;
  }

  const result = await response.json();
  // Handle success
} catch (error) {
  // Handle error
}
```

---

## 📊 Usage Analytics

### **Get User Stats:**

```typescript
const response = await fetch('/api/payments/usage?days=30', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const stats = await response.json();
/*
{
  totalCreditsUsed: 450,
  byAction: {
    generatePost: 100,
    generateImage: 250,
    generateVideo: 100
  },
  byDay: {
    '2025-01-01': 50,
    '2025-01-02': 75,
    ...
  }
}
*/
```

### **Database Queries:**

```sql
-- User's credit balance
SELECT credits, plan FROM users WHERE id = 'user-id';

-- Credit transactions (last 30 days)
SELECT * FROM credit_transactions 
WHERE user_id = 'user-id'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Usage by action
SELECT 
  action,
  SUM(credits_used) as total_credits,
  COUNT(*) as times_used
FROM usage_tracking
WHERE user_id = 'user-id'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY action
ORDER BY total_credits DESC;

-- Monthly spending
SELECT 
  DATE_TRUNC('month', created_at) as month,
  SUM(credits_used) as credits_used
FROM usage_tracking
WHERE user_id = 'user-id'
GROUP BY month
ORDER BY month DESC;
```

---

## 🔄 Webhook Events

### **Handled Events:**

#### **1. `checkout.session.completed`**
- User completes checkout
- Credits added (for credit packs)
- Subscription activated (for plans)

#### **2. `customer.subscription.created/updated`**
- New subscription
- Plan upgrade/downgrade
- Credits refilled to plan amount

#### **3. `customer.subscription.deleted`**
- Subscription cancelled
- User downgraded to free plan
- Retains remaining credits

#### **4. `invoice.payment_succeeded`**
- Monthly billing successful
- Credits refilled
- Subscription renewed

#### **5. `invoice.payment_failed`**
- Payment failed
- Notification sent to user
- Grace period before downgrade

---

## 🧪 Testing

### **Test Mode:**

1. Use Stripe test keys: `sk_test_...` and `pk_test_...`
2. Test card: `4242 4242 4242 4242`
3. Any future expiry, any CVC

### **Test Scenarios:**

```bash
# Test subscription
curl -X POST http://localhost:3001/api/payments/checkout/subscription \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan": "pro"}'

# Test credit pack
curl -X POST http://localhost:3001/api/payments/checkout/credits \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pack": "medium"}'

# Check credits
curl -X POST http://localhost:3001/api/payments/check-credits \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "generateImage"}'

# Get usage
curl http://localhost:3001/api/payments/usage?days=30 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📈 Go Live Checklist

- [ ] Switch to Stripe live keys
- [ ] Update webhook endpoint to production URL
- [ ] Test full payment flow
- [ ] Test webhook delivery
- [ ] Set up Stripe billing alerts
- [ ] Configure tax collection (if needed)
- [ ] Add terms of service link
- [ ] Add refund policy
- [ ] Test subscription cancellation
- [ ] Test plan upgrades/downgrades
- [ ] Monitor first transactions

---

## 💡 Tips & Best Practices

### **1. Credit Deduction Strategy:**

- Deduct credits AFTER successful operation
- Use database transactions for atomicity
- Log all credit changes for auditing

### **2. User Experience:**

- Show credit cost before action
- Warn when credits are low (< 100)
- Offer easy upgrade path
- Display usage analytics

### **3. Monitoring:**

```typescript
// Add to server logs
console.log(`[Credits] User ${userId} used ${cost} credits for ${action}`);

// Track in analytics
analytics.track('Credit Usage', {
  userId,
  action,
  cost,
  remainingCredits
});
```

### **4. Handling Edge Cases:**

- What if webhook is delayed?
- What if user cancels mid-generation?
- What if Stripe is down?
- Implement retry logic and fallbacks

### **5. Security:**

- Never trust client-side credit checks
- Always verify on server
- Use webhook signatures
- Rate limit payment endpoints

---

## 🆘 Troubleshooting

### **Webhook Not Working:**

```bash
# Check webhook secret
stripe webhooks list

# Test webhook locally
stripe trigger checkout.session.completed

# Check logs
tail -f server/logs/stripe.log
```

### **Credits Not Deducting:**

- Check `usage_tracking` table
- Verify middleware is called
- Check for errors in logs
- Ensure user has enough credits

### **Subscription Not Activating:**

- Check webhook delivery in Stripe Dashboard
- Verify `handleStripeWebhook` is called
- Check database for subscription record
- Verify user's `plan` field updated

---

## 📚 Resources

- [Stripe Docs](https://stripe.com/docs)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

---

## ✅ Summary

You now have:
- ✅ 4-tier subscription system
- ✅ Credit-based usage tracking
- ✅ One-time credit packs
- ✅ Automatic billing & webhooks
- ✅ Customer portal
- ✅ Usage analytics
- ✅ Full documentation

**Ready to monetize!** 💰🚀

---

**Questions?** Check the code comments or Stripe docs!

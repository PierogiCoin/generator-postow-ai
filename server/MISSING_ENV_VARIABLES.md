# 🔑 MISSING ENVIRONMENT VARIABLES

## ✅ **CO MASZ (Already Set):**

```env
GOOGLE_API_KEY=...                    ✅ Gemini text generation
OPENAI_API_KEY=...                    ✅ DALL-E image generation
STRIPE_SECRET_KEY=...                 ✅ Stripe payments
STRIPE_PUBLISHABLE_KEY=...            ✅ Stripe client-side
STRIPE_WEBHOOK_SECRET=...             ✅ Stripe webhooks
SUPABASE_SERVICE_KEY=...              ✅ Supabase admin access
VITE_SUPABASE_URL=...                 ✅ Supabase URL
VITE_SUPABASE_ANON_KEY=...            ✅ Supabase public key
```

---

## ❌ **CO CI BRAKUJE (Missing Variables):**

### **🎬 1. VIDEO GENERATION APIs**

```env
# Luma AI - Premium video generation (vertical/audio)
# Get from: https://lumalabs.ai/dream-machine/api
LUMA_API_KEY=luma-...

# Replicate - Budget video generation (horizontal)  
# Get from: https://replicate.com/account/api-tokens
REPLICATE_API_TOKEN=r8_...
```

**Gdzie dostać:**
- **Luma AI:** https://lumalabs.ai/dream-machine/api
  - Cost: ~$0.40 per video (5 seconds)
  - Best for: Vertical videos (TikTok, Reels), audio needed
  
- **Replicate:** https://replicate.com/account/api-tokens
  - Cost: ~$0.02 per video (3 seconds)
  - Best for: Horizontal videos, budget option

---

### **💳 2. STRIPE PRICE IDs**

```env
# Subscription Plans (create in Stripe Dashboard)
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# Pause Mode (new psychology tactic)
STRIPE_PAUSE_PRICE_ID=price_...

# White Label Add-on
STRIPE_WHITE_LABEL_ADDON_PRICE_ID=price_...

# One-time Viral Packs
STRIPE_VIRAL_PACK_STARTER_PRICE_ID=price_...    # $5
STRIPE_VIRAL_PACK_PREMIUM_PRICE_ID=price_...    # $15
STRIPE_VIRAL_PACK_BUNDLE_PRICE_ID=price_...     # $39
```

**Jak stworzyć w Stripe:**

1. Go to: https://dashboard.stripe.com/products
2. Click "Add Product" for each:

**Monthly Subscriptions:**
```
Product: Pro Plan
Price: $29/month (recurring)
→ Copy the price_... ID

Product: Business Plan  
Price: $99/month (recurring)
→ Copy the price_... ID

Product: Enterprise Plan
Price: $299/month (recurring)
→ Copy the price_... ID

Product: Pause Mode
Price: $5/month (recurring)
→ Copy the price_... ID

Product: White Label Add-on
Price: $49/month (recurring)
→ Copy the price_... ID
```

**One-time Payments (Viral Packs):**
```
Product: Quick Post Pack
Price: $5 (one-time)
→ Copy the price_... ID

Product: Viral Video Pack
Price: $15 (one-time)
→ Copy the price_... ID

Product: Content Blitz
Price: $39 (one-time)
→ Copy the price_... ID
```

---

### **📱 3. SOCIAL MEDIA APIs (Optional - for publishing)**

```env
# LinkedIn (optional)
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_REDIRECT_URI=http://localhost:5173/auth/linkedin/callback

# Twitter/X (optional)
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
TWITTER_REDIRECT_URI=http://localhost:5173/auth/twitter/callback

# Facebook/Instagram (optional)
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:5173/auth/facebook/callback
```

**Note:** These are only needed if you want users to publish directly to social media from your app. You can skip this for MVP.

---

### **🔐 4. SECURITY & CONFIG (Optional but Recommended)**

```env
# Server Config
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Supabase (you might have these already)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT & Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=7d
BCRYPT_ROUNDS=10

# Storage
STORAGE_BUCKET=generated_content
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
ENABLE_VIDEO_GENERATION=true
ENABLE_SOCIAL_PUBLISHING=false
ENABLE_ANALYTICS=true
ENABLE_AB_TESTING=false

# Logging
LOG_LEVEL=info
```

---

## 🚀 **PRIORITY LEVELS**

### **🔴 MUST HAVE (Critical for MVP):**

```env
# Already have ✅
GOOGLE_API_KEY=...
OPENAI_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
SUPABASE_SERVICE_KEY=...

# Need to add ❌
LUMA_API_KEY=...                      # For video generation
REPLICATE_API_TOKEN=...               # For budget video
STRIPE_PRO_PRICE_ID=...               # For subscriptions
STRIPE_BUSINESS_PRICE_ID=...
```

### **🟡 SHOULD HAVE (Unlock new features):**

```env
STRIPE_ENTERPRISE_PRICE_ID=...        # For enterprise tier
STRIPE_PAUSE_PRICE_ID=...             # For pause mode
STRIPE_WHITE_LABEL_ADDON_PRICE_ID=... # For white label
STRIPE_VIRAL_PACK_STARTER_PRICE_ID=...# For one-time sales
STRIPE_VIRAL_PACK_PREMIUM_PRICE_ID=...
STRIPE_VIRAL_PACK_BUNDLE_PRICE_ID=...
```

### **🟢 NICE TO HAVE (Optional):**

```env
LINKEDIN_CLIENT_ID=...                # Social publishing
TWITTER_CLIENT_ID=...
FACEBOOK_APP_ID=...
JWT_SECRET=...                        # If building auth
SENTRY_DSN=...                        # Error monitoring
```

---

## 📝 **HOW TO ADD THEM**

### **Step 1: Create `.env` with all variables**

```bash
cd /Users/yola/so-main/server
nano .env
```

### **Step 2: Copy your complete `.env`:**

```env
# ============================================
# 🔴 CRITICAL (Must Have)
# ============================================

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-key-here

# AI Generation
GOOGLE_API_KEY=your-google-api-key-here
OPENAI_API_KEY=sk-proj-your-openai-key-here

# Video Generation
LUMA_API_KEY=luma-your-key-here
REPLICATE_API_TOKEN=r8_your-token-here

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_your-key-here
STRIPE_PUBLISHABLE_KEY=pk_test_your-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here

# Stripe Subscription Price IDs
STRIPE_PRO_PRICE_ID=price_your-pro-price-id
STRIPE_BUSINESS_PRICE_ID=price_your-business-price-id
STRIPE_ENTERPRISE_PRICE_ID=price_your-enterprise-price-id

# ============================================
# 🟡 PSYCHOLOGY PRICING (Should Have)
# ============================================

# Pause Mode
STRIPE_PAUSE_PRICE_ID=price_your-pause-price-id

# White Label Add-on
STRIPE_WHITE_LABEL_ADDON_PRICE_ID=price_your-white-label-price-id

# One-time Viral Packs
STRIPE_VIRAL_PACK_STARTER_PRICE_ID=price_your-starter-pack-id
STRIPE_VIRAL_PACK_PREMIUM_PRICE_ID=price_your-premium-pack-id
STRIPE_VIRAL_PACK_BUNDLE_PRICE_ID=price_your-bundle-pack-id

# ============================================
# 🟢 OPTIONAL (Nice to Have)
# ============================================

# Storage
STORAGE_BUCKET=generated_content
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
ENABLE_VIDEO_GENERATION=true
ENABLE_SOCIAL_PUBLISHING=false
ENABLE_ANALYTICS=true
ENABLE_AB_TESTING=false

# Logging
LOG_LEVEL=info

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=7d
BCRYPT_ROUNDS=10
```

---

## 🎯 **QUICK START (Minimum to Run):**

If you want to start **RIGHT NOW**, you only need:

```env
# Existing (already have)
GOOGLE_API_KEY=...
OPENAI_API_KEY=...
STRIPE_SECRET_KEY=...
SUPABASE_SERVICE_KEY=...

# Add these 2 for video:
LUMA_API_KEY=...                 # Get from https://lumalabs.ai/
REPLICATE_API_TOKEN=...          # Get from https://replicate.com/

# Add these for subscriptions:
STRIPE_PRO_PRICE_ID=...          # Create in Stripe dashboard
STRIPE_BUSINESS_PRICE_ID=...
```

Everything else can be added later as you scale! 🚀

---

## 📊 **COST ESTIMATES**

### **API Costs (per generation):**

```
Gemini (text):          $0.0001-0.0005
DALL-E (image):         $0.04
Luma (premium video):   $0.40
Replicate (video):      $0.02
```

### **Monthly Bills (100 users, Pro plan):**

```
Stripe:     3% + $0.30 per transaction = ~$90/month
Supabase:   Free tier (up to 500MB database)
APIs:       $200-400/month (depends on usage)
─────────────────────────────────────────────
Total:      ~$290-490/month
Revenue:    $2,900/month (100 × $29)
Profit:     $2,410-2,610/month (83-90% margin) 💰
```

---

## ✅ **ACTION PLAN:**

### **Right Now (5 minutes):**
1. Sign up for Luma AI: https://lumalabs.ai/
2. Sign up for Replicate: https://replicate.com/
3. Add `LUMA_API_KEY` and `REPLICATE_API_TOKEN` to `.env`

### **Next (10 minutes):**
1. Go to Stripe: https://dashboard.stripe.com/products
2. Create Pro Plan ($29/month) → copy `price_...`
3. Create Business Plan ($99/month) → copy `price_...`
4. Add to `.env`

### **Later (optional):**
1. Create Viral Packs in Stripe ($5, $15, $39 one-time)
2. Create Pause Mode ($5/month)
3. Create White Label add-on ($49/month)

---

## 🚀 **READY TO LAUNCH?**

Once you have these minimum variables:
```
✅ GOOGLE_API_KEY
✅ OPENAI_API_KEY
✅ LUMA_API_KEY (or REPLICATE_API_TOKEN)
✅ STRIPE_SECRET_KEY
✅ STRIPE_PRO_PRICE_ID
✅ SUPABASE_SERVICE_KEY
```

**You're ready to go live!** 🎉

Everything else can be added iteratively as you grow.

---

## 💡 **TIPS:**

1. **Start with Replicate only** (cheaper) - Add Luma later for premium tier
2. **Create only Pro plan first** - Add Business/Enterprise as you get traction
3. **Skip social publishing** initially - Focus on generation quality first
4. **Use Stripe test mode** - Don't go live until you've tested thoroughly

**Prioritize getting something working over getting everything perfect!** 🎯

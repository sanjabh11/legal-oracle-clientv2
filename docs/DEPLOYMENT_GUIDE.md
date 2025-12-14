# Deployment Guide - Legal Oracle Platform

## A. Environment Setup

### 1. Whop Integration Setup

#### Step 1: Create Whop App
1. Go to [Whop Developer Dashboard](https://whop.com/apps)
2. Click "Create App"
3. Fill in app details:
   - Name: "Legal Oracle"
   - Description: "AI-Powered Legal Intelligence Platform"
   - Redirect URI: `https://your-frontend-domain.netlify.app/auth/whop/callback`

#### Step 2: Create Products (Pricing Tiers)
Create three products in your Whop dashboard:

| Product | Price | Billing | ID Variable |
|---------|-------|---------|-------------|
| Starter | $29/mo | Monthly | `WHOP_STARTER_PRODUCT_ID` |
| Professional | $99/mo | Monthly | `WHOP_PROFESSIONAL_PRODUCT_ID` |
| Firm | $299/mo | Monthly | `WHOP_FIRM_PRODUCT_ID` |

#### Step 3: Configure Webhooks
1. In Whop Dashboard → Webhooks
2. Add endpoint: `https://your-backend-domain/api/v1/webhooks/whop`
3. Select events:
   - `membership.went_valid`
   - `membership.went_invalid`
   - `membership.canceled`
   - `payment.succeeded`
   - `payment.failed`
4. Copy webhook secret to `WHOP_WEBHOOK_SECRET`

### 2. CourtListener API Setup

1. Create account at [CourtListener](https://www.courtlistener.com/)
2. Go to Profile → API Keys
3. Generate new API token
4. Copy to `COURTLISTENER_API_TOKEN`

**Rate Limits:**
- Free tier: 5,000 requests/day
- Authenticated: Higher limits available

---

## B. Backend Deployment (Railway)

### Option 1: Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd stub_api
railway init

# Deploy
railway up
```

**Environment Variables in Railway:**
1. Go to project settings → Variables
2. Add all variables from `.env.example`
3. Set `PORT=8080` (Railway default)

### Option 2: Render

1. Connect GitHub repo to Render
2. Create new Web Service
3. Configure:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables

### Verify Backend Deployment

```bash
# Health check
curl https://your-backend-url/api/v1/pricing/tiers

# Expected response:
{
  "tiers": [
    {"id": "guest", "name": "Guest", "price": 0, ...},
    {"id": "starter", "name": "Starter", "price": 29, ...},
    ...
  ]
}
```

---

## C. Frontend Deployment (Netlify)

### Step 1: Update Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables:

```
VITE_API_BASE=https://your-backend-url/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_WHOP_CLIENT_ID=your_whop_client_id
```

### Step 2: Configure Redirects

Create `_redirects` file in `legal-oracle-client/public/`:

```
/* /index.html 200
```

### Step 3: Deploy

```bash
cd legal-oracle-client
npm run build
netlify deploy --prod
```

---

## D. OAuth Flow Testing

### Test Whop OAuth Flow

1. **Start OAuth:**
   Navigate to `/pricing` and click "Get Started" on any tier

2. **Whop Authorization:**
   - User redirected to Whop login
   - User authorizes Legal Oracle app
   - Whop redirects back with `?code=xxx`

3. **Callback Handler:**
   - `/auth/whop/callback` exchanges code for tokens
   - Stores access token in localStorage
   - Verifies membership status
   - Redirects to dashboard

### Test Commands

```bash
# Test OAuth redirect URL construction
curl "https://whop.com/oauth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=read_user%20read_memberships"

# Test token exchange (backend)
curl -X POST https://your-backend/api/v1/webhooks/whop \
  -H "Content-Type: application/json" \
  -d '{"event": "membership.went_valid", "data": {"user_id": "test", "product_id": "prod_xxx"}}'
```

---

## E. Supabase Migration for Production

### Migrate In-Memory Storage to Supabase

#### 1. Docket Subscriptions Table

```sql
CREATE TABLE docket_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    case_id TEXT NOT NULL,
    case_name TEXT,
    court TEXT,
    jurisdiction TEXT,
    docket_number TEXT,
    alert_types TEXT[] DEFAULT '{}',
    delivery_methods TEXT[] DEFAULT '{}',
    webhook_url TEXT,
    game_theory_params JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_checked TIMESTAMPTZ DEFAULT NOW(),
    active BOOLEAN DEFAULT true
);

CREATE INDEX idx_docket_subs_user ON docket_subscriptions(user_id);
CREATE INDEX idx_docket_subs_case ON docket_subscriptions(case_id);
```

#### 2. Docket Alerts Table

```sql
CREATE TABLE docket_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES docket_subscriptions(id),
    user_id TEXT NOT NULL,
    case_id TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    title TEXT NOT NULL,
    message TEXT,
    filing_details JSONB,
    nash_update JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT false,
    delivered BOOLEAN DEFAULT false
);

CREATE INDEX idx_alerts_user ON docket_alerts(user_id);
CREATE INDEX idx_alerts_unread ON docket_alerts(user_id, read) WHERE read = false;
```

#### 3. Community Templates Table

```sql
CREATE TABLE community_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    pricing_model TEXT DEFAULT 'free',
    price DECIMAL(10,2) DEFAULT 0,
    game_matrix JSONB NOT NULL,
    metadata JSONB,
    instructions TEXT,
    sample_scenario TEXT,
    version TEXT DEFAULT '1.0.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    downloads INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    revenue_share DECIMAL(3,2) DEFAULT 0.70
);

CREATE INDEX idx_templates_author ON community_templates(author_id);
CREATE INDEX idx_templates_category ON community_templates(category);
CREATE INDEX idx_templates_status ON community_templates(status);
```

#### 4. User Subscriptions Table (Whop)

```sql
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    whop_user_id TEXT,
    whop_membership_id TEXT,
    tier TEXT DEFAULT 'guest',
    product_id TEXT,
    status TEXT DEFAULT 'active',
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_subs_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subs_whop ON user_subscriptions(whop_user_id);
```

### Run Migrations

```bash
cd stub_api
python run_migrations.py
```

---

## F. Post-Deployment Checklist

- [ ] Backend health check passes
- [ ] Frontend loads without errors
- [ ] Whop OAuth flow works end-to-end
- [ ] Pricing page displays correctly
- [ ] Settlement Calculator computes Nash equilibrium
- [ ] CourtListener search returns results
- [ ] Docket alerts can be created
- [ ] Webhook signature validation works
- [ ] SSL certificates valid
- [ ] Error monitoring configured (Sentry recommended)

---

## G. Monitoring & Maintenance

### Recommended Tools
- **Error Tracking:** Sentry
- **Uptime Monitoring:** UptimeRobot
- **Analytics:** Plausible or PostHog
- **Logging:** Papertrail or Logtail

### Key Metrics to Monitor
- API response times
- Error rates
- CourtListener rate limit usage
- Whop webhook delivery status
- Database connection pool

---

*Last Updated: December 15, 2025*

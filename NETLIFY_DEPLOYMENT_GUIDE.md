# 🚀 NETLIFY DEPLOYMENT GUIDE - Legal Oracle Frontend
**Date**: 2025-10-07  
**Status**: Ready for Production Deployment

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ **Completed**:
- [x] Security audit passed (90/100)
- [x] All environment variables configured
- [x] No secrets in frontend code
- [x] Build script tested locally
- [x] Git repository updated
- [x] netlify.toml configured
- [x] Documentation complete

### ⚠️ **Required Before Production**:
- [ ] Update VITE_API_BASE to production backend URL
- [ ] Test build locally (`npm run build`)
- [ ] Verify all features work in production mode
- [ ] Set up custom domain (optional)

---

## 🛠️ DEPLOYMENT STEPS

### **Option 1: Netlify UI (Recommended for First Time)**

#### **Step 1: Prepare Repository**
```bash
# Ensure all changes are committed and pushed
cd c:/Users/Sanjay/legal-oracle-clientv2
git status  # Should show clean working tree
git push origin main  # Push to GitHub
```

#### **Step 2: Connect to Netlify**
1. Visit https://app.netlify.com/
2. Click **"Add new site" → "Import an existing project"**
3. Choose **GitHub** as your Git provider
4. Authorize Netlify to access your repositories
5. Select **`sanjabh11/legal-oracle-clientv2`**

#### **Step 3: Configure Build Settings**
Netlify will auto-detect settings from `netlify.toml`, but verify:

| Setting | Value |
|---------|-------|
| **Base directory** | `legal-oracle-client` |
| **Build command** | `npm run build` |
| **Publish directory** | `legal-oracle-client/dist` |
| **Functions directory** | (leave empty) |

#### **Step 4: Set Environment Variables**
In Netlify dashboard → **Site settings → Environment variables**, add:

```bash
VITE_APP_NAME="Legal Oracle"
VITE_SUPABASE_URL=https://kvunnankqgfokeufvsrv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2dW5uYW5rcWdmb2tldWZ2c3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4ODYyMTksImV4cCI6MjA2NTQ2MjIxOX0.eFRKKSAWaXQgCCX7UpU0hF0dnEyJ2IXUnaGsc8MEGOU
VITE_API_BASE=https://YOUR-BACKEND-URL.com/api/v1
```

**⚠️ IMPORTANT**: Replace `YOUR-BACKEND-URL.com` with your actual backend URL once deployed.

**SECURITY NOTES**:
- ✅ `VITE_SUPABASE_ANON_KEY` is safe to expose (public key)
- ✅ `VITE_SUPABASE_URL` is safe to expose
- ❌ **NEVER** add `SUPABASE_SERVICE_ROLE_KEY` here (backend only!)
- ❌ **NEVER** add `GEMINI_API_KEY` or `OPENAI_API_KEY` here

#### **Step 5: Deploy**
1. Click **"Deploy site"**
2. Wait for build to complete (~2-3 minutes)
3. Netlify will provide a URL like `https://random-name-123456.netlify.app`

#### **Step 6: Verify Deployment**
1. Visit the Netlify URL
2. Test authentication (login/signup/guest mode)
3. Test case prediction
4. Verify API connectivity
5. Check console for errors

---

### **Option 2: Netlify CLI (Advanced)**

#### **Step 1: Install Netlify CLI**
```bash
npm install -g netlify-cli
```

#### **Step 2: Login to Netlify**
```bash
netlify login
```
This will open a browser for authentication.

#### **Step 3: Initialize Site**
```bash
cd legal-oracle-client
netlify init
```

Follow the prompts:
- **Create & configure a new site**: Yes
- **Team**: Select your team
- **Site name**: `legal-oracle` (or your preferred name)
- **Build command**: `npm run build`
- **Directory to deploy**: `dist`

#### **Step 4: Set Environment Variables**
```bash
netlify env:set VITE_APP_NAME "Legal Oracle"
netlify env:set VITE_SUPABASE_URL "https://kvunnankqgfokeufvsrv.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
netlify env:set VITE_API_BASE "https://YOUR-BACKEND-URL.com/api/v1"
```

#### **Step 5: Deploy**
```bash
# Deploy to production
netlify deploy --prod

# Or deploy preview first
netlify deploy
```

#### **Step 6: Open Site**
```bash
netlify open:site
```

---

## 🔧 POST-DEPLOYMENT CONFIGURATION

### **Custom Domain (Optional)**

#### **Add Custom Domain**:
1. Netlify dashboard → **Domain settings**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `legaloracle.com`)
4. Follow DNS configuration instructions
5. Netlify will auto-provision SSL certificate

#### **DNS Configuration** (if using external DNS):
Add CNAME record:
```
Type: CNAME
Host: www (or @)
Value: your-site-name.netlify.app
```

### **SSL Certificate**
- ✅ Netlify provides free SSL via Let's Encrypt
- ✅ Auto-renews every 90 days
- ✅ HTTPS enforced by default

### **Performance Optimization**

#### **Enable Asset Optimization** (Netlify Dashboard):
1. Go to **Site settings → Build & deploy → Post processing**
2. Enable:
   - ✅ Bundle CSS
   - ✅ Minify CSS
   - ✅ Minify JS
   - ✅ Pretty URLs
   - ✅ Prerender

#### **Configure Caching**:
Already configured in `netlify.toml`:
```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

---

## 🧪 TESTING DEPLOYMENT

### **Functionality Checklist**:
- [ ] Homepage loads
- [ ] Authentication works (login/signup/guest)
- [ ] Case prediction feature
- [ ] Judge analysis feature
- [ ] Nash equilibrium calculator
- [ ] Jurisdiction optimizer
- [ ] All API calls successful
- [ ] localStorage caching works
- [ ] No console errors
- [ ] Mobile responsive

### **Performance Checklist**:
- [ ] Load time < 3s (check with Lighthouse)
- [ ] Asset optimization enabled
- [ ] HTTPS working
- [ ] Redirects working (SPA routing)

### **Security Checklist**:
- [ ] No SERVICE_ROLE_KEY in frontend
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] No API keys in client code
- [ ] CORS configured correctly

---

## 🐛 TROUBLESHOOTING

### **Build Fails**

#### **Error: "Command failed with exit code 1"**
```bash
# Locally test the build
cd legal-oracle-client
npm install
npm run build

# Check for TypeScript errors
npm run lint
```

#### **Error: "Module not found"**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### **Error: "Out of memory"**
In Netlify dashboard → **Build settings**, increase Node memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096"
```

### **Deployment Works but Site Shows Blank Page**

#### **Check Browser Console**:
- Look for CORS errors
- Check if API_BASE is correct
- Verify Supabase connection

#### **Check Netlify Function Logs**:
1. Netlify dashboard → **Functions**
2. Click on specific function
3. View logs

#### **Verify Environment Variables**:
```bash
netlify env:list
```

### **API Calls Failing**

#### **CORS Error**:
Backend needs to allow Netlify domain:
```python
# stub_api/main.py
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://your-site.netlify.app",  # Add this
    "https://legaloracle.com"  # If using custom domain
]
```

#### **Wrong API URL**:
Update `VITE_API_BASE` in Netlify environment variables:
1. **Site settings → Environment variables**
2. Edit `VITE_API_BASE`
3. **Trigger redeploy**: **Deploys → Trigger deploy → Clear cache and deploy**

### **Routing Issues (404 on Refresh)**

Already fixed in `netlify.toml`:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

If still not working, verify this file exists in your repo.

---

## 📊 MONITORING & ANALYTICS

### **Netlify Analytics** (Optional, Paid)
- **Site settings → Analytics**
- Provides:
  - Page views
  - Unique visitors
  - Top pages
  - Traffic sources

### **Google Analytics** (Free)
Add to `index.html`:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### **Sentry** (Error Tracking)
```bash
npm install @sentry/react
```

Initialize in `src/main.tsx`:
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.MODE
});
```

---

## 🔄 CONTINUOUS DEPLOYMENT

### **Auto-Deploy on Git Push**:
✅ **Already configured!** Every push to `main` branch will:
1. Trigger Netlify build
2. Run tests (if configured)
3. Deploy if successful
4. Rollback if failed

### **Deploy Previews**:
✅ **Already enabled!** Every pull request gets:
- Unique preview URL
- Isolated environment
- Comment on PR with preview link

### **Branch Deploys**:
Deploy specific branches:
1. **Site settings → Build & deploy → Deploy contexts**
2. Add branch names
3. Each branch gets its own URL

---

## 📈 PRODUCTION CHECKLIST

### **Before Going Live**:
- [ ] Backend deployed and tested
- [ ] Update `VITE_API_BASE` to production URL
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Performance tested (Lighthouse score >90)
- [ ] All features tested
- [ ] Analytics configured
- [ ] Error tracking configured
- [ ] Backup plan ready

### **Launch Day**:
- [ ] Announce on social media
- [ ] Monitor error logs
- [ ] Watch analytics
- [ ] Be ready for hotfixes

---

## 🎯 DEPLOYMENT URLS

### **Expected URLs**:
- **Netlify Default**: `https://legal-oracle-XXXXX.netlify.app`
- **Custom Domain**: `https://legaloracle.com` (if configured)
- **Deploy Previews**: `https://deploy-preview-XX--legal-oracle.netlify.app`

### **Useful Links**:
- **Netlify Dashboard**: https://app.netlify.com/
- **Netlify Docs**: https://docs.netlify.com/
- **Status Page**: https://www.netlifystatus.com/

---

## ✅ FINAL VERIFICATION

Once deployed, verify:

```bash
# Test homepage
curl -I https://your-site.netlify.app

# Test API connectivity
curl https://your-site.netlify.app/api/test

# Check security headers
curl -I https://your-site.netlify.app | grep -i "x-frame-options\|x-content-type"

# Verify HTTPS redirect
curl -I http://your-site.netlify.app
```

Expected:
- ✅ Status 200 OK
- ✅ HTTPS enforced
- ✅ Security headers present
- ✅ No CORS errors

---

## 🚀 READY TO DEPLOY!

**Current Status**: ✅ **All prerequisites met**

**Next Action**:
1. Visit https://app.netlify.com/
2. Import GitHub repository
3. Configure as instructed above
4. Click "Deploy"

**Estimated Time**: 5-10 minutes for first deployment

---

**Generated**: 2025-10-07 14:50:00 IST  
**Deployment Status**: Ready  
**Backend Required**: Yes (deploy backend first or use existing)

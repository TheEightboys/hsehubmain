# HSE Hub Deployment Guide

## 🚀 Quick Deployment to Vercel (Recommended)

### Step 1: Sign Up for Vercel
1. Go to https://vercel.com/signup
2. Sign up with your GitHub account (click "Continue with GitHub")

### Step 2: Import Your Repository
1. Once logged in, click "Add New..." → "Project"
2. You'll see your GitHub repositories
3. Find "hseautomatemanagement" and click "Import"

### Step 3: Configure Build Settings
Vercel will auto-detect your settings, but verify:
- **Framework Preset**: Vite
- **Root Directory**: ./
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Step 4: Add Environment Variables
Click "Environment Variables" and add:
- **VITE_SUPABASE_URL**: Your Supabase project URL
- **VITE_SUPABASE_ANON_KEY**: Your Supabase anon key

### Step 5: Deploy
1. Click "Deploy"
2. Wait 1-2 minutes
3. You'll get a live URL like: **https://hseautomatemanagement.vercel.app**

### Your Live Link Will Be:
```
https://hseautomatemanagement.vercel.app
```
(or a custom domain if you configure one)

---

## 🔷 Option 2: Deploy to Netlify (Also Free)

### Step 1: Sign Up
1. Go to https://app.netlify.com/signup
2. Sign up with GitHub

### Step 2: Import Repository
1. Click "Add new site" → "Import an existing project"
2. Choose GitHub
3. Select "hseautomatemanagement"

### Step 3: Build Settings
- **Build command**: `npm run build`
- **Publish directory**: `dist`

### Step 4: Environment Variables
Go to Site settings → Environment variables:
- Add `VITE_SUPABASE_URL`
- Add `VITE_SUPABASE_ANON_KEY`

### Step 5: Deploy
Click "Deploy site" - you'll get a URL like:
```
https://hseautomatemanagement.netlify.app
```

---

## 🔶 Option 3: Deploy to GitHub Pages (Free but More Setup)

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Update `package.json`:
```json
{
  "homepage": "https://TheEightboys.github.io/hseautomatemanagement",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. Update `vite.config.ts` - add base:
```typescript
export default defineConfig({
  base: '/hseautomatemanagement/',
  // ... rest of config
})
```

4. Deploy:
```bash
npm run deploy
```

Your link: `https://TheEightboys.github.io/hseautomatemanagement`

---

## 🟢 Option 4: Deploy to Render (Free)

1. Go to https://render.com/
2. Sign up with GitHub
3. New → Static Site
4. Connect your repo
5. Build command: `npm run build`
6. Publish directory: `dist`

---

## ⚡ RECOMMENDED: Use Vercel

**Why Vercel?**
- ✅ Fastest deployment (2 minutes)
- ✅ Automatic HTTPS
- ✅ Free SSL certificate
- ✅ Automatic deployments on every git push
- ✅ Preview deployments for pull requests
- ✅ Excellent performance (global CDN)
- ✅ Perfect for Vite/React apps

---

## 🔐 Important: Environment Variables

Before deploying, you need your Supabase credentials:

### Get Your Supabase URL & Key:
1. Go to your Supabase project
2. Click "Settings" (gear icon) → "API"
3. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

### Add to Deployment Platform:
- **VITE_SUPABASE_URL** = Your project URL
- **VITE_SUPABASE_ANON_KEY** = Your anon key

---

## 📝 After Deployment

Once deployed, you'll get a URL like:
- Vercel: `https://hseautomatemanagement.vercel.app`
- Netlify: `https://hseautomatemanagement.netlify.app`
- GitHub Pages: `https://TheEightboys.github.io/hseautomatemanagement`

### Share Your Link:
```
🌐 HSE Hub Live Demo
https://your-deployment-url.vercel.app

Login with your Supabase credentials to access the app.
```

---

## 🎯 Quick Start (Vercel - 2 Minutes)

1. **Go to**: https://vercel.com/new
2. **Import**: Connect GitHub and select "hseautomatemanagement"
3. **Add env vars**: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
4. **Click Deploy**
5. **Done!** Copy your live URL

Your link will be ready in ~90 seconds! 🚀

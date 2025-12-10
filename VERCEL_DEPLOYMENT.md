# 🚀 Vercel Deployment Guide

## Prerequisites Checklist

✅ All code changes committed
✅ Configuration files ready (next.config.js, vercel.json)
✅ Environment variables documented (.env.example)
✅ Supabase database ready and accessible

---

## 📋 Step-by-Step Deployment

### Step 1: Generate NEXTAUTH_SECRET

Run this command in your terminal to generate a secure secret:

```bash
openssl rand -base64 32
```

Save this value - you'll need it for Vercel environment variables.

---

### Step 2: Prepare Your Repository

1. **Commit all changes:**
```bash
git add .
git commit -m "Configure for Vercel deployment with Prisma and Supabase"
```

2. **Push to GitHub:**
```bash
git push origin cool-albattani
```

Or merge to main branch:
```bash
git checkout main
git merge cool-albattani
git push origin main
```

---

### Step 3: Deploy to Vercel

1. **Go to Vercel**
   - Visit [https://vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: **./** (leave as default)
   - Build Command: Leave as default (vercel.json will override)
   - Output Directory: Leave as default

---

### Step 4: Add Environment Variables

Click "Environment Variables" and add the following:

#### Required Variables:

| Variable Name | Value | Example |
|--------------|-------|---------|
| `DATABASE_URL` | Your Supabase connection string | `postgresql://...@...supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15&sslmode=require` |
| `DIRECT_URL` | Your Supabase direct connection | `postgresql://...@...supabase.com:5432/postgres?sslmode=require` |
| `NEXTAUTH_SECRET` | Generated secret from Step 1 | `abc123...` (32+ characters) |
| `NEXTAUTH_URL` | Your Vercel deployment URL | `https://your-app.vercel.app` |
| `RESEND_API_KEY` | Your Resend API key (optional) | `re_...` |

#### Important Notes:
- ✅ Make sure `DATABASE_URL` includes `pgbouncer=true` for Supabase
- ✅ Use the **pooler connection string** from Supabase for `DATABASE_URL`
- ✅ Use the **direct connection string** from Supabase for `DIRECT_URL`
- ✅ Set all variables for **Production**, **Preview**, and **Development** environments

---

### Step 5: Deploy

1. Click **"Deploy"** button
2. Wait for the build to complete (usually 2-5 minutes)
3. Vercel will automatically:
   - Install dependencies
   - Generate Prisma Client
   - Build Next.js application
   - Deploy to production

---

### Step 6: Update NEXTAUTH_URL

After first deployment:

1. Copy your Vercel deployment URL (e.g., `https://attendance-app-xyz.vercel.app`)
2. Go to Project Settings → Environment Variables
3. Update `NEXTAUTH_URL` with your actual Vercel URL
4. Redeploy (Settings → Deployments → Latest → Redeploy)

---

## 🔍 Post-Deployment Verification

### 1. Check Build Logs
- If build fails, check the build logs in Vercel dashboard
- Common issues:
  - Missing environment variables
  - Database connection errors
  - Prisma generation failures

### 2. Test Your Application
- ✅ Visit your deployed URL
- ✅ Test login functionality
- ✅ Create a test user
- ✅ Test database connectivity
- ✅ Check API routes

### 3. Monitor Performance
- Go to Vercel Dashboard → Analytics
- Monitor response times
- Check for errors

---

## 🐛 Troubleshooting

### Build Fails with "Prisma Generation Error"
**Solution:** Ensure `DATABASE_URL` and `DIRECT_URL` are set correctly in environment variables.

### "NextAuth Configuration Error"
**Solution:**
1. Verify `NEXTAUTH_SECRET` is set
2. Verify `NEXTAUTH_URL` matches your deployment URL
3. Redeploy after updating

### Database Connection Errors
**Solution:**
1. Check Supabase database is running
2. Verify connection strings are correct
3. Ensure IP allowlist in Supabase allows Vercel IPs (or use 0.0.0.0/0)

### 500 Internal Server Error
**Solution:**
1. Check Vercel Function Logs
2. Verify all environment variables are set
3. Check database connectivity

---

## 📊 Vercel Configuration Details

### Build Settings (from vercel.json):
- **Region:** Singapore (sin1) - closest to Supabase AP Southeast
- **Max Function Duration:** 30 seconds for API routes
- **Build Command:** `prisma generate && next build`

### Next.js Configuration (from next.config.js):
- **Output Mode:** Standalone (optimized for serverless)
- **Static Generation Timeout:** 300 seconds
- **Prisma:** Externalized for better performance
- **ISR Memory Cache:** Disabled (0) to prevent database connection issues

---

## 🎯 Performance Optimization Tips

1. **Database Connection Pooling**
   - Already configured with `pgbouncer=true`
   - Recommended: Keep connection timeout at 15 seconds

2. **API Routes**
   - All routes configured as `dynamic`
   - No static generation = faster builds

3. **Caching**
   - Vercel automatically caches static assets
   - API routes are not cached (dynamic rendering)

4. **Monitoring**
   - Enable Vercel Analytics
   - Monitor function execution times
   - Check error rates

---

## 🔐 Security Checklist

- ✅ `NEXTAUTH_SECRET` is strong and unique
- ✅ Environment variables are not committed to Git
- ✅ Database credentials are secure
- ✅ HTTPS is enforced (automatic with Vercel)
- ✅ API routes validate authentication
- ✅ SQL injection protection (Prisma ORM)

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Supabase with Vercel](https://supabase.com/docs/guides/integrations/vercel)

---

## 🆘 Need Help?

If you encounter issues:
1. Check Vercel build logs
2. Verify all environment variables
3. Test database connectivity
4. Check Supabase logs
5. Review Vercel function logs

---

## ✅ Success!

Once deployed successfully, your attendance monitoring application will be:
- 🌍 Globally distributed via Vercel's Edge Network
- ⚡ Fast with optimized serverless functions
- 🔒 Secure with HTTPS and authentication
- 📈 Scalable to handle traffic spikes
- 🔄 Auto-deployed on every git push

---

**Deployment Date:** Ready for deployment
**Last Updated:** December 2025

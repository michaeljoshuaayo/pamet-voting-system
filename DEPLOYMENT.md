# PAMET Voting System - Deployment Guide

## Vercel Deployment Instructions

### Prerequisites
- GitHub repository with your code
- Supabase project set up and configured
- Environment variables configured

### Deployment Steps

1. **Go to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import Project**
   - Click "New Project"
   - Select "Import Git Repository"
   - Choose your `pamet-voting-system` repository

3. **Configure Environment Variables**
   Add these environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://codqdyeuirsfipyfxlgh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZHFkeWV1aXJzZmlweWZ4bGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc9MzI0OTksImV4cCI6MjA3MzUwODQ5OX0.qCgbI_joP4WV_10aw4_WwjcatNualMNGMJAHVPJk-9o
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

5. **Update Supabase Configuration**
   After deployment, update your Supabase settings:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Set Site URL: `https://your-app-name.vercel.app`
   - Add Redirect URL: `https://your-app-name.vercel.app/**`

### Post-Deployment Checklist
- [ ] Application loads correctly
- [ ] User authentication works
- [ ] Voting functionality works
- [ ] Admin dashboard accessible
- [ ] Database operations function properly

### Troubleshooting
- Check Vercel build logs for errors
- Verify environment variables are set correctly
- Ensure Supabase URLs are updated
- Check browser console for JavaScript errors

### Domain Setup (Optional)
To use a custom domain:
1. Go to Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. Update Supabase URL configuration accordingly
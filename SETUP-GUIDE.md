# Winter Arc Tracker — Setup & Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Google OAuth Setup](#google-oauth-setup)
4. [Local Development](#local-development)
5. [Vercel Deployment](#vercel-deployment)
6. [Environment Variables](#environment-variables)
7. [Database Schema](#database-schema)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ installed
- A [GitHub](https://github.com/) account
- A [Supabase](https://supabase.com/) account (free)
- A [Vercel](https://vercel.com/) account (free)
- A [Google Cloud Console](https://console.cloud.google.com/) project (for OAuth)

---

## Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com/) and sign up/log in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `winter-arc-tracker`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you
4. Click **"Create new project"** (takes ~2 minutes)

### Step 2: Run the Database Schema

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the `supabase-schema.sql` file from this project
4. Copy and paste the entire contents into the SQL editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see "Success" — this creates all tables, policies, and triggers

### Step 3: Get Your API Keys

1. Click **"Settings"** (gear icon) → **"API"**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### Step 4: Update Environment Variables

Open `.env.local` in your project and replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"**
3. Name it `winter-arc-tracker`
4. Click **"Create"**

### Step 2: Configure OAuth Consent Screen

1. In your project, go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** and click **"Create"**
3. Fill in:
   - **App name**: `Winter Arc Tracker`
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click **"Save and Continue"**
5. On the **Scopes** page, click **"Save and Continue"**
6. On the **Test users** page, add your email and your friends' emails, then click **"Save and Continue"**

### Step 3: Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Configure:
   - **Application type**: Web application
   - **Name**: `Winter Arc Tracker`
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (for local dev)
     - `https://your-app.vercel.app` (for production — add after deployment)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback` (for local dev)
     - `https://your-project-id.supabase.co/auth/v1/callback` (Supabase callback)
4. Click **"Create"**
5. Copy the **Client ID** and **Client Secret**

### Step 4: Add Google Provider to Supabase

1. In Supabase dashboard, go to **"Authentication"** → **"Providers"**
2. Find **"Google"** and click to expand
3. Toggle **"Enable Google"** to ON
4. Paste your **Client ID** and **Client Secret** from Google Cloud
5. Click **"Save"**

---

## Local Development

### Step 1: Install Dependencies

```bash
cd winter-arc-tracker
npm install
```

### Step 2: Set Environment Variables

Make sure your `.env.local` file has the correct Supabase values (from Step 3 above).

### Step 3: Run the Development Server

```bash
npm run dev
```

### Step 4: Open in Browser

Go to [http://localhost:3000](http://localhost:3000)

You should see the login page with:
- Google sign-in button
- Email/password sign-in

### Step 5: Create Your Account

1. Sign up with Google or email
2. You'll be redirected to the dashboard
3. Go to **Profile** to set your:
   - Display name
   - Avatar color
   - Goal mode (bulk/cut/maintain)
   - Macro targets

---

## Vercel Deployment

### Step 1: Push to GitHub

1. Create a new repository on GitHub
2. In your project folder, run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/winter-arc-tracker.git
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com/) and sign in
2. Click **"Add New"** → **"Project"**
3. Find your `winter-arc-tracker` repository and click **"Import"**
4. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./`
   - **Build Command**: `next build` (default)
   - **Output Directory**: `.next` (default)

### Step 3: Add Environment Variables

In the Vercel deployment settings, add these environment variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |

Click **"Deploy"**

### Step 4: Add Vercel URL to Google OAuth

After deployment, you'll get a URL like `https://winter-arc-tracker.vercel.app`

1. Go back to Google Cloud Console → your project → Credentials
2. Edit your OAuth client ID
3. Add to **Authorized JavaScript origins**:
   - `https://winter-arc-tracker.vercel.app`
4. Add to **Authorized redirect URIs**:
   - `https://your-project-id.supabase.co/auth/v1/callback`
5. Click **"Save"**

### Step 5: Add Vercel URL to Supabase

1. In Supabase dashboard, go to **"Authentication"** → **"URL Configuration"**
2. Add your Vercel URL to **"Site URL"**:
   - `https://winter-arc-tracker.vercel.app`
3. Add to **"Redirect URLs"**:
   - `https://winter-arc-tracker.vercel.app/**`
4. Click **"Save"**

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |

---

## Database Schema

The app uses these tables:

| Table | Purpose |
|-------|---------|
| `profiles` | User profile info, avatar, goals, macro targets |
| `habits` | Custom and default habits for each user |
| `habit_logs` | Daily habit completion tracking |
| `sleep_logs` | Daily sleep hours |
| `macro_logs` | Daily macro intake (protein, carbs, fat, calories) |
| `mood_logs` | Daily energy and mood ratings |
| `weekly_checkins` | Weekly weight, wins, and focus |
| `monthly_reflections` | Monthly win, lesson, improve, next goal |
| `streak_freezes` | Streak freeze usage tracking |
| `badges` | Earned badges and milestones |

---

## Troubleshooting

### "Invalid login credentials"
- Make sure email/password auth is enabled in Supabase → Authentication → Providers
- Check that the user exists in Supabase → Authentication → Users

### "Redirect URL mismatch"
- Make sure your Vercel URL is added to both Google OAuth and Supabase redirect URLs
- Check for trailing slashes — they must match exactly

### "Row-level security error"
- Make sure you ran the `supabase-schema.sql` in the Supabase SQL editor
- Check that RLS policies are created in Supabase → Authentication → Policies

### "Google sign-in not working"
- Make sure Google OAuth is enabled in Supabase → Authentication → Providers
- Verify Client ID and Client Secret are correct
- Check that your email is added as a test user in Google Cloud Console

### Build fails on Vercel
- Make sure all environment variables are set in Vercel
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Look at the Vercel build logs for specific errors

---

## Features

- **Dashboard**: Overview of streak, habits, sleep, and macros
- **Habits**: 90-day grid with 12 habits, streak freeze
- **Macros**: Track protein, carbs, fat, calories with charts
- **Sleep**: Track nightly sleep with trends and distribution
- **Leaderboard**: Compare Arc Scores with friends
- **Profile**: Weekly check-ins and monthly reflections
- **3D Effects**: Snow background, ice crystal logo, glass morphism
- **Badges**: Earn milestones for streaks and achievements

---

## Support

For issues, check:
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)

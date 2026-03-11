# Professor Product Roadmap Design

**Date:** 2026-03-08
**Status:** Approved

## Overview

Professor expands from a CLI-only plugin into a dual-mode product serving both tech users (free CLI + free local web) and non-tech users (paid hosted cloud web). One codebase, two deployment modes, one public repo.

## Target Users

| User Type | Access | Cost | Setup |
|-----------|--------|------|-------|
| Tech user | CLI | Free | Manual (own API key) |
| Tech user | Local web | Free | Manual (own API key) |
| Non-tech user | Cloud web | Paid | Zero setup |

## Feature Tiers

| Feature | CLI (free) | Local Web (free) | Cloud Web (paid) |
|---------|-----------|-----------------|-----------------|
| 14 Socratic commands | Yes | Yes | Yes |
| Own API key required | Yes | Yes | No (included) |
| Manual setup required | Yes | Yes | No |
| Markdown + code rendering | No | Yes | Yes |
| Context-aware command pills | No | Yes | Yes |
| Progress dashboard + charts | No | No | Yes |
| Spaced repetition reminders | No | No | Yes |
| Learning streak | No | No | Yes |
| Mobile friendly | No | Partial | Yes |
| Multi-device sync | No | No | Yes |
| Certificate on completion | No | No | Yes |
| 7-day free trial | — | — | Yes |

## Technical Architecture

```
course-learning-plugin/ (one public repo)
├── agents/                  ← professor agent (shared)
├── commands/                ← command behaviors (shared)
├── hooks/                   ← PreCompact hook (shared)
├── bin/cli.js               ← Free CLI entry point
├── web/                     ← Shared web app (local + cloud)
│   ├── server.js            ← Express server
│   ├── config.js            ← MODE: 'local' | 'cloud'
│   ├── routes/
│   │   ├── chat.js          ← Claude API streaming
│   │   ├── courses.js       ← File-based (local) OR DB (cloud)
│   │   └── auth.js          ← Cloud only
│   └── client/              ← React + Vite
│       └── src/
│           ├── App.jsx
│           └── pages/
│               ├── Learn.jsx        ← Split-pane (core, both modes)
│               ├── Dashboard.jsx    ← Cloud only
│               └── Onboarding.jsx   ← Cloud only
└── cloud/                   ← Cloud-only additions
    ├── db/                  ← Supabase (PostgreSQL + Prisma)
    ├── auth/                ← Clerk (Google + Email)
    └── billing/             ← Stripe (monthly subscription)
```

### Mode Switch Pattern

```js
// web/config.js
export const MODE = process.env.MODE || 'local';
export const isCloud = MODE === 'cloud';
export const isLocal = MODE === 'local';

// Usage in routes/courses.js
if (isCloud) {
  // Read/write from Supabase
} else {
  // Read/write from filesystem (existing behavior)
}
```

### Cloud Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Auth | Clerk | 30-min setup, Google login built-in |
| Database | Supabase (PostgreSQL) | Free tier enough for launch |
| Hosting | Railway | Deploy from GitHub, simple pricing |
| Billing | Stripe | Standard, hosted checkout |
| AI | Anthropic API | Developer manages key, charges users via Stripe |

### Open Source Strategy

Repo stays fully public. Cloud mode only works with secret environment variables:
- `STRIPE_SECRET_KEY`
- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `ANTHROPIC_API_KEY` (developer's key, not user's)

Value is in the hosted service, not the source code. Model: Cal.com, Plausible, Sentry.

## UX Flow — Non-tech User

```
Landing Page
  → "Start Free Trial"
  → Sign up (Email or Google via Clerk)
  → Onboarding Wizard:
      Step 1: "What do you want to learn?" (free text)
      Step 2: "What's your experience level?" (Beginner → Expert slider)
      Step 3: "What do you want to be able to do after this course?" (free text)
  → Professor auto-generates course + syllabus
  → "Here's your learning path — does this look right?"
  → Split-pane Learning UI
      Left: Lecture panel (rendered markdown, syntax highlighted)
      Right: Chat with Professor (streaming, command pills)
  → After 7-day trial: Paywall
      "You've completed X sections. Continue for $X/month"
```

### UX Principles for Non-tech Users

| Problem | Solution |
|---------|----------|
| Don't know commands | Command pills replace all typing |
| Don't know where to start | Onboarding wizard guides them |
| Fear of complex AI | Familiar chat UI (WhatsApp-style) |
| No API key | Cloud handles everything |
| Forget to study | Email + streak notifications |

## Roadmap

### Current: v1.1 Git Worktree Courses (in progress)
Complete before starting web work.

### MVP Launch (~6-8 weeks)

**Week 1-2: Local Web UI**
- Express + React + Vite
- Split-pane layout (lecture panel + chat panel)
- Claude API streaming
- Context-aware command pills
- (Implementation plan already written: docs/plans/2026-03-08-web-ui-implementation.md)

**Week 3-4: Cloud Foundation**
- Clerk auth (Google + Email login)
- Supabase database (users, courses, progress)
- Deploy to Railway
- config.js MODE switch (local vs cloud)
- Course data model in DB

**Week 5-6: Billing + Onboarding**
- Stripe monthly subscription
- 7-day free trial logic
- Onboarding wizard (3 steps)
- Landing page

**Week 7-8: Polish + Launch**
- Mobile responsive layout
- Email reminders (trial ending, streak)
- Beta user feedback loop

### Post-MVP

**v2.0 — Retention**
- Learning streak (GitHub contribution graph)
- Spaced repetition reminders (review after 1/3/7 days)
- Progress dashboard with charts
- Certificate on capstone completion

**v2.1 — Social**
- Public progress sharing (shareable link)
- Community course templates
- Referral program

**v3.0 — Scale**
- Team / organization accounts
- Custom courses (company onboarding use case)
- API for third-party integrations
- Mobile app (React Native)

## Product Summary

```
FREE                              PAID
──────────────────────────────────────────────────
CLI plugin                        Cloud Web App
  Tech users                        Non-tech users
  Own API key                       Zero setup
  File-based storage                Database sync
  All core Socratic features        All core features
                                    Progress dashboard
                                    Streak + reminders
                                    Mobile friendly
                                    Certificate
                                    7-day free trial
                                    $X/month
```

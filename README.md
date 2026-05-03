# PassDMV

> Pass your DMV test on your first try, or get your money back.

A gamified, mobile-first web app that helps teens prepare for their state written driving test. Live at **[passdmv.us](https://passdmv.us)** (planned).

## Project Status

**Phase 0: Web-only MVP** — In planning / scaffolding

- ✅ Product Requirements Document
- ✅ Brand book (colors, typography, tone)
- ✅ Clickable HTML prototypes (mobile + desktop)
- ✅ Question bank schema and sample data
- ⬜ Next.js 15 app scaffold
- ⬜ Auth (Supabase + Google + Facebook)
- ⬜ Question engine
- ⬜ Stripe billing
- ⬜ PostHog analytics

## Repository Structure

```
.
├── PRODUCT_REQUIREMENTS.md   ← Full PRD (v1.2)
├── data/
│   └── questions/            ← JSON question bank (per state)
│       ├── schema.json       ← JSON Schema for validation
│       ├── california.json   ← Sample (20 questions)
│       └── README.md         ← Contribution guide
├── prototype/
│   ├── index.html            ← Mobile clickable prototype
│   └── desktop.html          ← Desktop clickable prototype
└── README.md                 ← You are here
```

## Tech Stack (Planned)

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Auth + DB:** Supabase
- **Billing:** Stripe
- **Analytics:** PostHog
- **i18n:** next-intl (built in for future internationalization)
- **Deploy:** Vercel

## Pricing (Planned)

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | 1 practice test/day, daily challenge, no ads |
| Weekly Pass | $2.99/week | Unlimited tests, all modes, streak freeze |
| Unlimited | $29.99 one-time | Everything + lifetime access |

## Pass Guarantee

Pass your real DMV test on your first try, or get your money back. See `PRODUCT_REQUIREMENTS.md` § 4.7 for eligibility rules.

## Local Development

_(Coming soon — repo will be scaffolded next.)_

## License

Proprietary — all rights reserved.

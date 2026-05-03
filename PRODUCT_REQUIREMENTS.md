# PassDMV - Driving Test Practice LMS

## Product Requirements Document (PRD)

---

## 1. Product Vision

A gamified, mobile-first web app that helps teens (primarily 16-year-olds) prepare for their state written driving test. The experience should feel like a game — not a boring study tool — while delivering real results through adaptive learning.

The app will be embedded into a broader SEO/GEO-optimized marketing website built separately (Lovable or Claude), serving as the core product behind the lead-gen funnel.

### 1.1 Multi-Test-Type Architecture (Future Growth)

The MVP launches with **standard passenger car (Class C) written tests** only. However, the UX and data model must be designed to support additional test types without major refactoring.

| Test Type | Target Audience | Timeline |
|-----------|----------------|----------|
| **Class C — Passenger Car** | Teens (16+), new drivers | **MVP** |
| **CDL — Commercial Driver's License** | Professional truck/bus drivers (18-21+) | v2 |
| **Motorcycle (Class M)** | Motorcycle riders | v2 |
| **Renewal / Senior Re-test** | Older drivers needing renewal | v3 |
| **Rideshare / Taxi** | Uber/Lyft drivers (state-specific) | v3 |

**UX Design Implications:**

- **Test type selector** during onboarding: "What are you preparing for?" (car, motorcycle, CDL) — initially only car is available, others show "Coming soon"
- **Dashboard adapts** to test type — different categories, different passing scores
- **Question bank** is organized by `testType` + `state` (e.g., `data/questions/cdl/california.json`)
- **Separate readiness scores** per test type if a user is studying for multiple
- **URL structure** supports it: `passdmv.us/california/cdl`, `passdmv.us/texas/motorcycle`
- **Pricing** may differ per test type (CDL could be priced higher given the professional audience)

**Data model additions:**

```
Questions file structure (future):
data/questions/
├── car/                  ← Class C (MVP)
│   ├── california.json
│   └── texas.json
├── cdl/                  ← Commercial (v2)
│   ├── california.json
│   └── texas.json
├── motorcycle/           ← Class M (v2)
│   ├── california.json
│   └── texas.json
└── schema.json           ← Shared schema (adds testType field)

User model: add `active_test_type` field (default: "car")
TestSession model: add `test_type` field
```

### 1.2 International Extensibility (Future Growth)

PassDMV starts US-only. Future expansion to international markets should be straightforward.

| Decision | Approach |
|----------|----------|
| **Separate domains per country** | US: `passdmv.us` · UK: `passdriving.co.uk` · Canada: `passdriving.ca` · etc. |
| **Shared codebase** | One Next.js app with country/locale routing. Deploy per-region on Vercel. |
| **Country abstraction layer** | The app never hardcodes "DMV" or "state" — use a config layer: `{ region: "US", subdivisionLabel: "State", testAuthority: "DMV" }` vs `{ region: "UK", subdivisionLabel: "Region", testAuthority: "DVSA" }` |
| **Question bank per country** | `data/questions/{country}/{region}/{test-type}.json` — same schema, different content |
| **i18n from day 1** | Use `next-intl` or similar. All UI strings in translation files, never hardcoded. Even if MVP is English-only, this prevents future rework. |
| **Currency & pricing** | Stripe supports multi-currency natively. Price per country/region. |
| **Legal/compliance** | Each country has different privacy laws (GDPR for EU, etc.). Isolate user data per region. |

**What to build now (MVP) to make this easy later:**

1. Wrap all "state" / "DMV" labels in a config/context — don't hardcode the words
2. Use `next-intl` for all UI strings even if only English is available
3. Keep question schema country-agnostic (the `state` field becomes `region`)
4. Use Stripe's multi-currency support from the start
5. Structure URLs as `/{region}/{test-type}` — already works for US states, extends naturally to countries

---

## 2. Brand Book

### 2.1 Brand Name

| | |
|--------|-----------|
| **Name** | PassDMV |
| **Domain** | passdmv.us |
| **Tagline suggestions** | "Pass your DMV test. First try." / "Your shortcut to the driver's seat." / "Practice. Pass. Drive." |
| **SEO advantage** | "PassDMV" contains two high-intent keywords ("pass" + "DMV"). Naturally ranks for "pass DMV test," "DMV practice test," "how to pass DMV." The `.us` TLD reinforces US-specific authority. |
| **GEO pages** | passdmv.us/california, passdmv.us/texas, etc. |

### 2.2 Brand Personality

- **Clean** — Minimal UI, generous whitespace, no clutter
- **Young** — Speaks the language of Gen Z/Gen Alpha, no corporate tone
- **Joyful** — Celebrates progress, uses micro-animations and confetti moments
- **Confident** — "You've got this" energy throughout the experience

### 2.3 Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Electric Blue | `#3B82F6` | CTAs, primary actions, links |
| Secondary | Bright Green | `#22C55E` | Success states, correct answers, progress |
| Accent | Warm Yellow | `#FACC15` | Badges, streaks, gamification highlights |
| Error | Coral Red | `#EF4444` | Incorrect answers, warnings |
| Background | Off-White | `#FAFAFA` | Page backgrounds |
| Surface | White | `#FFFFFF` | Cards, modals |
| Text Primary | Charcoal | `#1E293B` | Headings, body text |
| Text Secondary | Slate | `#64748B` | Captions, hints |

### 2.4 Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Headings | **Inter** or **Plus Jakarta Sans** | 700 (Bold) | 24-32px |
| Body | **Inter** | 400 (Regular) | 16px |
| Captions | **Inter** | 500 (Medium) | 12-14px |
| Gamification/Badges | **Space Grotesk** | 700 (Bold) | Varies |

### 2.5 Design Principles

1. **Mobile-first** — 80%+ of teen users will be on phones
2. **One action per screen** — Never overwhelm the user
3. **Instant feedback** — Every tap produces a visible result
4. **Progress everywhere** — Users should always see how far they've come
5. **Celebration moments** — Confetti, animations, sound effects on achievements

### 2.6 Iconography & Illustration

- Rounded, friendly icons (Lucide or Phosphor icon set)
- Flat illustration style with soft gradients
- Emoji-style badges and rewards
- Avoid stock photos — use illustrations or abstract shapes

### 2.7 Tone of Voice

| Do | Don't |
|----|-------|
| "Nice work! You nailed that one." | "Correct answer submitted." |
| "Oops, not quite — here's why:" | "Incorrect. The answer is B." |
| "You're on fire! 5 in a row!" | "Streak: 5" |
| "Ready to crush this test?" | "Begin assessment" |

---

## 3. User Personas

### Primary: The First-Time Test Taker
- **Age:** 16
- **Goal:** Pass the DMV written test on the first try
- **Behavior:** Short attention span, motivated by gamification, uses phone for everything
- **Pain point:** Study materials are boring, no idea what to focus on

### Secondary: The Retaker
- **Age:** 16-20
- **Goal:** Pass after a previous failure
- **Behavior:** Anxious, needs targeted practice on weak areas
- **Pain point:** Doesn't know what they got wrong last time

### Tertiary: The New Resident / Immigrant
- **Age:** 18-30
- **Goal:** Get a license in a new state
- **Behavior:** May need language support, unfamiliar with US road rules
- **Pain point:** Overwhelming amount of information, different rules per state

---

## 4. Features & Functional Requirements

### 4.1 Authentication & Onboarding

| Requirement | Details |
|-------------|---------|
| Social login | Google, Facebook (via OAuth 2.0). TikTok login skipped (limited web SDK support). TikTok used for **share cards only** (post results to TikTok story). |
| Email/password | Traditional registration with email verification |
| Onboarding flow | Welcome screen > Select state > Mini assessment (5 questions) > Dashboard |
| Profile | Name, avatar, state, join date, subscription status |
| Age gate | Collect age during signup (for analytics/compliance, not blocking) |

### 4.2 State Selection

| Requirement | Details |
|-------------|---------|
| All 50 states + DC | Each state has its own question bank |
| State-specific rules | Questions tagged by state-specific regulations |
| Switch state | Users can change state anytime from settings |
| State info card | Shows number of questions required to pass, passing score, test format |

### 4.3 Question Bank & Test Engine

| Requirement | Details |
|-------------|---------|
| Question types | Multiple choice (4 options), True/False, Image-based (signs, signals) |
| Question metadata | Category, difficulty (easy/medium/hard), state, explanation, source reference |
| Categories | Road signs, Right of way, Parking, Speed limits, DUI/DWI, Signals, Lane usage, Emergency vehicles, School zones, Insurance & registration |
| Practice modes | **Full Practice Test** — Simulates real DMV test (state-specific question count & time limit) |
| | **Quick Quiz** — 10 random questions, 5 min |
| | **Topic Drill** — Focused practice on a single category |
| | **Weak Spot Review** — AI-selected questions from categories where user scores < 70% |
| | **Daily Challenge** — 5 new questions daily for streak building |
| Adaptive difficulty | As user masters a topic, serve harder questions from that topic |
| Explanations | Every question has a detailed explanation shown after answering |
| Flagging | Users can flag/bookmark questions for later review |

### 4.4 Results & Adaptive Learning

| Requirement | Details |
|-------------|---------|
| Test results screen | Score, pass/fail, time taken, category breakdown |
| Category performance | Radar chart or bar chart showing strength per category |
| Personalized advice | "Focus on Road Signs and Right of Way — you missed 4 out of 6 in these areas" |
| Recommended next step | CTA: "Practice Road Signs" or "Try another full test" |
| Historical performance | Track improvement over time (line chart) |
| Readiness score | Overall "Test Readiness" percentage shown on dashboard |
| Weak topics list | Always visible — sorted by lowest accuracy |

### 4.5 Gamification System

| Feature | Details |
|---------|---------|
| **XP Points** | Earn XP for every correct answer, bonus for streaks and speed |
| **Levels** | Learner Permit > Student Driver > Road Warrior > Test Ace > License Legend |
| **Daily Streaks** | Track consecutive days of practice. Streak freeze available (1 per week) |
| **Badges** | Unlockable achievements (e.g., "Perfect Score", "Speed Demon", "Comeback Kid", "Sign Master") |
| **Challenges** | Weekly challenges (e.g., "Answer 50 sign questions this week") |
| **Progress bar** | Visual progress toward next level always visible |
| **Celebrations** | Confetti animation on perfect scores, level ups, badge unlocks |
| **Hearts/Lives system** | (Optional) Start with 5 hearts per day. Wrong answer = lose a heart. Refill via streak or upgrade to unlimited |

### 4.6 Dashboard

| Element | Details |
|---------|---------|
| Readiness score | Large circular progress indicator |
| Streak counter | Days in a row with fire emoji |
| Quick actions | "Start Practice Test", "Daily Challenge", "Review Weak Spots" |
| Recent activity | Last 3 test results |
| Weak topics | Top 3 categories needing work |
| XP / Level | Current level with progress bar |

### 4.7 Pass Guarantee (Marketing Hook)

A money-back guarantee is the single highest-converting marketing hook in this category. DMV Genie ("97% pass rate guarantee") and Aceable both use it. PassDMV will offer a clearer, simpler version.

**The Guarantee:**

> **"Pass your DMV test on your first try, or get your money back."**

**Eligibility rules** (printed clearly to avoid abuse):

| Rule | Why |
|------|-----|
| User must complete **at least 5 full practice tests** before the real DMV test | Ensures they actually used the product |
| User must score **85%+ on their last 3 practice tests** before requesting refund (this is the "ready" threshold) | Prevents refunds from users who never studied |
| Refund request must be submitted **within 30 days** of failing real DMV test | Prevents stale claims |
| User must provide a **photo of their failed DMV test result slip** | Verification |
| Eligible plans: **Weekly Pass** (after using 4+ weeks) and **Unlimited Access** | Free tier excluded |
| **One refund per user, ever** | Prevents serial abuse |

**Why this works financially:**

- Real DMV pass rates are 50-60% on first try **without** practice
- Pass rates with serious practice (5+ tests, 85%+) are typically 90%+
- The math: even at 10% refund rate, the marketing lift in conversion (typically 2-3×) far outweighs the refund cost
- Refunds become a **support metric to optimize**, not a cost to fear — high refunds = signal that questions are wrong, not that guarantee is bad

**Marketing surfaces (where the guarantee appears):**

- Landing page hero: "Pass your DMV test or get your money back" badge
- Paywall modal: Trust signal next to plan options
- Confirmation email after subscription: Re-affirm the guarantee
- Footer of every page
- App Store / Play Store description (when wrapped)
- All paid Google Ads / social ads creative

**UX implementation:**

- After 5 practice tests + 85% scores, show a **"You're test-ready!" badge** in dashboard
- After user marks "I took my real test" → ask "Did you pass?"
- If "no" → automated refund request flow (collect photo of failed slip, process via Stripe)
- If "yes" → trigger testimonial collection flow (social proof loop)

**Differentiation vs DMV Genie:**

DMV Genie says "97% pass rate" (statistic). PassDMV says "Pass or your money back" (commitment). The latter is stronger — a number can be doubted, a refund cannot.

### 4.8 Billing (Stripe)


| Plan | Price | Features |
|------|-------|----------|
| **Free Tier** | $0 | 1 full practice test/day, Daily Challenge, limited topic drills (3/day). **No ads** — clean experience to maximize trust and conversion. |
| **Weekly Pass** | $2.99/week | Unlimited tests, all practice modes, streak freeze, priority new content access |
| **Unlimited Access** | $29.99 one-time | Everything in Weekly + lifetime access, priority support, early access to new features |

| Requirement | Details |
|-------------|---------|
| Payment provider | Stripe (Checkout or Elements) |
| Subscription management | Users can cancel/upgrade from settings |
| Free trial | 3-day free trial for Weekly Pass |
| Paywall trigger | After free tier limits are hit, show upgrade modal |
| Receipt emails | Via Stripe |
| Webhooks | Handle subscription created, updated, canceled, payment failed |
| Promo codes | Support Stripe coupon codes for marketing campaigns |

### 4.9 Analytics (PostHog)

| Event Category | Events to Track |
|----------------|-----------------|
| **Acquisition** | `signup_started`, `signup_completed`, `social_login_used` (provider), `state_selected` |
| **Activation** | `onboarding_completed`, `first_test_started`, `first_test_completed` |
| **Engagement** | `test_started` (mode), `test_completed` (score, mode), `question_answered` (correct/incorrect, category), `streak_continued`, `badge_earned`, `level_up` |
| **Retention** | `daily_return`, `streak_broken`, `weak_spot_practiced` |
| **Revenue** | `paywall_shown`, `checkout_started`, `subscription_created` (plan), `subscription_canceled` |
| **Feature Usage** | `results_reviewed`, `topic_drill_started` (category), `flag_question` |

| Requirement | Details |
|-------------|---------|
| Feature flags | Use PostHog feature flags for A/B testing paywall copy, onboarding flows, gamification elements |
| Session recording | Enable for debugging UX issues (with user consent) |
| Funnels | Signup > State Selection > First Test > Subscription |
| User properties | State, subscription plan, level, readiness score, days active |

---

## 5. SEO / GEO / Marketing Website Integration

The marketing website (built separately with Lovable or Claude) will drive traffic. The LMS app is the product users convert into.

### 5.1 Integration Points

| Requirement | Details |
|-------------|---------|
| Shared auth | SSO between marketing site and app (shared session/JWT) |
| Deep links | Marketing site links directly to specific states or topics (e.g., `/practice/california/road-signs`) |
| Embed widgets | "Try 5 free questions" widget embeddable on marketing pages |
| SEO landing pages | One landing page per state (50 + DC) — e.g., "California DMV Practice Test 2026" |
| Blog integration | Study tips, state-specific guides, "What to expect at the DMV" articles |
| Schema markup | FAQ schema, Review schema, HowTo schema for test prep guides |
| UTM tracking | Pass UTM params from marketing site into PostHog for attribution |
| Open Graph | Rich social previews for shared results ("I scored 95% on my CA driving test practice!") |

### 5.2 GEO Strategy

- Target pages for "[State] DMV practice test" and "[State] driving test questions"
- City-level pages for high-population areas
- "Near me" optimization for local DMV office references
- Multi-language support (Spanish as first additional language)

### 5.3 In-App SEO Surface (Indexable Question Pages)

Beyond the marketing site, the **app itself** generates massive SEO surface area. Every question becomes a public, indexable landing page that ranks for long-tail queries.

**URL structure:**
```
passdmv.us/{state}/question/{question-slug}
  ↳ passdmv.us/california/question/what-does-a-stop-sign-mean
  ↳ passdmv.us/texas/question/right-of-way-uncontrolled-intersection
  ↳ passdmv.us/florida/question/blood-alcohol-limit-bac

passdmv.us/{state}/topic/{category}
  ↳ passdmv.us/california/topic/road-signs
  ↳ passdmv.us/texas/topic/right-of-way

passdmv.us/{state}/sample-test
  ↳ passdmv.us/california/sample-test  (5 free questions, ungated)
```

**Math:** 50 states × ~100 questions per state = **5,000+ indexable pages** at launch, all targeting long-tail queries like "what does a yellow diamond sign mean California."

**Page structure (each question page):**

| Element | Purpose |
|---------|---------|
| H1 with question text | Primary keyword |
| Image (sign/signal) with alt text | Image search traffic |
| All 4 answer options | Surface text for matching searches |
| Detailed explanation (200+ words) | Content depth for ranking |
| FAQPage schema markup | Featured snippets in Google |
| Related questions (3-5) | Internal linking, dwell time |
| State-specific context | "In California, this rule applies because..." |
| CTA to sign up | Conversion path |
| Breadcrumbs | `Home > California > Road Signs > Stop Sign Question` |

**Technical requirements:**

| Requirement | Details |
|-------------|---------|
| **Static generation (SSG)** | Use Next.js `generateStaticParams` to pre-render all question pages at build time |
| **Sitemap.xml** | Auto-generated, includes every question + topic + state page |
| **Schema.org markup** | `Question`, `FAQPage`, `Quiz`, `EducationalOccupationalProgram` |
| **canonical URLs** | Prevent duplicate content across similar questions |
| **Open Graph tags** | Each page sharable with rich preview |
| **robots.txt** | Allow indexing of public question pages, block authenticated routes |
| **Internal linking** | Topic pages link to questions; questions link to related questions |
| **Page speed** | < 2s LCP — pre-render, optimize images, minimal JS for SEO pages |

**Indexing strategy:**

- **Public free preview**: First 5-10 questions per state are fully public + indexable
- **Soft paywall on rest**: Question pages 6+ show the question + first part of explanation, then "Sign up free to see the full answer"
- **Topic pages always public** with overview content + sample questions
- **Sample test always public** (5 questions ungated to capture searches like "free CA practice test")

**Why this matters:**

Driving-Tests.org dominates organic search precisely because they have thousands of indexable pages. PassDMV needs the same at-scale SEO surface to compete. This is essentially **free customer acquisition** — every question we write is also a marketing asset.

---

## 6. Technical Architecture (Recommended)

### 6.1 Frontend

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 14+** (App Router) |
| Styling | **Tailwind CSS** + **shadcn/ui** |
| State management | React Context + TanStack Query |
| Animations | Framer Motion (celebrations, transitions) |
| Charts | Recharts (performance charts) |
| PWA | Service worker for offline question caching |

### 6.2 Backend

| Layer | Technology |
|-------|-----------|
| API | Next.js API routes or separate **Node.js/Express** service |
| Database | **PostgreSQL** (via Supabase or Neon) |
| Auth | **Supabase Auth** or **NextAuth.js** (supports Google, Facebook, TikTok) |
| ORM | **Prisma** or **Drizzle** |
| File storage | Supabase Storage or S3 (for sign images) |

### 6.3 Third-Party Services

| Service | Purpose |
|---------|---------|
| **Stripe** | Billing, subscriptions, webhooks |
| **PostHog** | Analytics, feature flags, session recording |
| **Supabase** | Auth, database, real-time |
| **Vercel** | Hosting, edge functions, preview deployments |
| **Resend** or **SendGrid** | Transactional emails (welcome, streak reminders, results) |

### 6.4 Question Bank Architecture

Questions are stored as **separate JSON files per state** (not in the database), making them easy to update, review, and version-control independently of the app code.

```
data/questions/
├── schema.json            ← JSON Schema for validation
├── california.json        ← California questions
├── texas.json             ← Texas questions
├── florida.json           ← Florida questions
├── new-york.json          ← New York questions
└── ...                    ← One file per state (50 + DC)
```

| Design Decision | Rationale |
|----------------|-----------|
| **JSON files, not DB rows** | Non-technical team members can edit questions via GitHub or a simple CMS. No database migrations needed. |
| **One file per state** | Update a single state without touching others. Clear ownership. Easy to review diffs. |
| **JSON Schema validation** | `schema.json` enforces required fields, valid categories, correct answer index bounds. Run `npm run validate-questions` before deploy. |
| **Unique IDs** | Format: `{STATE}-{category}-{number}` (e.g., `CA-road-signs-001`). Enables tracking per-question analytics. |
| **State metadata included** | Each file includes test info (question count, passing score, time limit) so the app can simulate real test conditions. |
| **Source references** | Each question links to the official handbook section for content review. |
| **lastUpdated field** | Track when each question was last verified against current law. |
| **Loaded at build time** | Questions are imported during Next.js build for fast serving. A webhook can trigger rebuild when questions are updated. |

See `data/questions/README.md` for the full contribution guide and `data/questions/schema.json` for the validation schema.

### 6.5 Data Model (Core Entities)

```
Users
  - id, email, name, avatar_url, state, level, xp, streak_count
  - subscription_status, stripe_customer_id
  - created_at, last_active_at

Questions (loaded from JSON files at build time, cached in-memory or edge)
  - id, state, category, difficulty, type (mc/tf/image)
  - question_text, options (JSON), correct_answer, explanation
  - image_url (nullable)

TestSessions
  - id, user_id, mode (full/quick/topic/weak/daily)
  - state, score, total_questions, time_taken
  - started_at, completed_at

UserAnswers
  - id, test_session_id, question_id, selected_answer
  - is_correct, time_spent

UserCategoryStats
  - user_id, category, total_answered, total_correct
  - last_practiced_at

Badges
  - id, name, description, icon_url, criteria (JSON)

UserBadges
  - user_id, badge_id, earned_at

Subscriptions
  - user_id, stripe_subscription_id, plan, status
  - current_period_start, current_period_end
```

---

## 7. User Flows

### 7.1 First-Time User Flow

```
Landing Page (marketing site)
  → "Start Practicing Free" CTA
  → Sign Up (social or email)
  → Select State
  → Mini Assessment (5 questions)
  → Dashboard (with readiness score & recommended actions)
  → Start First Practice Test
  → Results + Advice
  → "Practice Weak Spots" or "Try Another Test"
  → Hit free limit → Paywall → Subscribe
```

### 7.2 Returning User Flow

```
Open App
  → Dashboard (streak reminder, daily challenge prompt)
  → Daily Challenge or Continue Practice
  → Results
  → Check Badges / Challenges
  → Practice Weak Topics
```

### 7.3 Subscription Flow

```
Hit usage limit (or tap "Go Unlimited")
  → Upgrade modal (compare plans)
  → Select plan
  → Stripe Checkout
  → Confirmation + unlock animation
  → Return to dashboard (all features unlocked)
```

---

## 8. Product-Led Growth (PLG) Strategy

The core principle: **let users experience value before asking for money.** Free users should feel the product is amazing — then hit a natural friction point where paying is the obvious next step.

### 8.1 The Free Experience (Generous Enough to Hook)

Users start fully free with no credit card required. The free tier is deliberately generous in the first 48 hours to build habit and investment.

| What's Free Forever | Why |
|---------------------|-----|
| 1 full practice test per day | Enough to feel progress, not enough to fully prepare |
| Daily Challenge (5 questions) | Low-effort daily touchpoint for streaks |
| 3 topic drills per day | Can explore categories but can't deep-dive |
| Full results + category breakdown | Users **see** their weak spots (creates urgency to practice more) |
| XP, levels, badges, streaks | Gamification hooks them emotionally before paywall |

**Key insight:** Free users should always be able to see what they're missing. Show locked features as visible-but-gated, never hidden.

### 8.2 Engagement-Based Paywall Triggers

Rather than a hard time-based wall, paywalls appear at **moments of peak motivation** — when the user wants more, not when they're bored.

| Trigger | When It Fires | Conversion Moment |
|---------|---------------|-------------------|
| **Daily limit hit** | User finishes their 1 free practice test and taps "Take Another Test" | "You're on a roll! Unlock unlimited tests." |
| **Topic drill limit** | 3rd topic drill used, user taps a 4th | "Want to master Road Signs? Go unlimited." |
| **Weak spot locked** | Results show weak categories, "Practice Weak Spots" button is gated | "You need work on Right of Way. Unlock targeted practice." |
| **Streak at risk** | Day 3+ streak, user missed daily practice, streak freeze is paid-only | "Don't lose your 5-day streak! Unlock streak freeze." |
| **Level gate** | User reaches Level 3 (Student Driver), next level requires paid | "You've earned Road Warrior status — unlock it!" |
| **Post-test high score** | User scores 85%+ on practice test | "You're almost test-ready! Unlimited practice = guaranteed pass." |

### 8.3 The Conversion Funnel

```
Day 0: Sign up (free) → Select state → Mini assessment
        ↓
Day 0: First practice test → See results + weak spots
        ↓ (hook: "I need to practice more")
Day 1: Return for Daily Challenge → Build streak → Hit topic drill limit
        ↓ (hook: "I want to practice my weak areas")
Day 1-3: Hit paywall 2-3 times → See upgrade modal
        ↓ (hook: "This is worth it, I need to pass")
Day 2-4: CONVERSION POINT → Subscribe (Weekly or Unlimited)
        ↓
Day 4+: Unlimited practice → Higher engagement → Passes real test → Shares result
```

**Target conversion window: Days 2-4** — after enough engagement to feel invested, before interest fades.

### 8.4 Upgrade Modal Design

The upgrade modal appears at paywall triggers. It should feel **celebratory, not punishing.**

| Element | Details |
|---------|---------|
| Headline | Context-aware: "You're improving fast!" / "Don't stop now!" / "Almost test-ready!" |
| Social proof | "47,000 teens passed their test with PassDMV" |
| Plan comparison | Side-by-side: Free vs Weekly vs Unlimited |
| Highlight savings | "Unlimited = less than the cost of one driving lesson" |
| Urgency (soft) | "Your test is coming up — get ready faster with unlimited practice" |
| Free trial CTA | "Try 3 days free" (Weekly plan) — primary CTA |
| Skip option | Always allow dismiss — never force. "Maybe later" link |
| A/B test | Test copy, layout, pricing via PostHog feature flags |

### 8.5 PLG Growth Loops

These loops compound user acquisition without paid marketing:

**Loop 1: Organic SEO → Free User → Paid Conversion**
```
User searches "[State] DMV practice test"
  → Lands on passdmv.us/california (SEO page)
  → Takes free embedded quiz (5 questions)
  → Signs up to see full results
  → Practices daily → Hits paywall → Subscribes
```

**Loop 2: Social Sharing → New Users**
```
User passes practice test with high score
  → Share card: "I scored 95% on my CA driving test practice on PassDMV!"
  → Friends see on TikTok/Instagram/Snapchat
  → Click link → Land on app → Sign up free
```

**Loop 3: Referral → Viral Growth**
```
Paid user invites friend
  → Friend gets 1 week free trial
  → Referrer gets 1 week added to subscription
  → Both practice → Friend converts → Refers more friends
```

**Loop 4: Word of Mouth → Authority**
```
User passes real DMV test
  → App prompts: "Did you pass? Tell us!"
  → User confirms → "Congrats! Share your success?"
  → Testimonial collected (with permission) for landing pages
  → Builds social proof → Higher conversion for new visitors
```

### 8.6 Retention Mechanics (Keep Free Users Coming Back)

Free users who don't convert immediately should still return. Retained free users convert later.

| Mechanic | How It Works |
|----------|-------------|
| **Streak emails** | "You're on a 3-day streak! Don't break it — practice today." (Day 1, 3, 7) |
| **Weekly progress report** | Email: "This week you answered 45 questions, 78% correct. Your weak area: Parking." |
| **Push notifications** | "Your Daily Challenge is ready!" (morning) / "Don't lose your streak!" (evening) |
| **Re-engagement email** | If inactive 3+ days: "Your readiness score dropped to 62%. A quick quiz takes 2 minutes." |
| **Milestone celebrations** | "You've answered 100 questions! You're in the top 20% of learners." |
| **Test date countdown** | If user sets a test date: "Your DMV test is in 12 days. You're at 71% readiness." |

### 8.7 Pricing Psychology

| Tactic | Implementation |
|--------|---------------|
| **Anchor high** | Show Unlimited ($29.99) first, Weekly ($2.99) feels cheap by comparison |
| **Frame as investment** | "Less than a coffee per day" / "Cheaper than retaking the test ($XX re-test fee)" |
| **Loss aversion** | "You've already earned 340 XP and 3 badges — don't lose momentum" |
| **Urgency (ethical)** | Tie to test date if set: "12 days until your test. Unlimited practice = confidence." |
| **Social proof** | "Join 47K teens who passed with PassDMV" on every paywall |
| **Risk reversal** | 3-day free trial on Weekly. "Cancel anytime, no questions asked." |

### 8.8 PLG Analytics (PostHog Events)

| Event | Purpose |
|-------|---------|
| `paywall_shown` (trigger_type) | Which trigger converts best? |
| `paywall_dismissed` | Where are we losing them? |
| `upgrade_modal_cta_clicked` (plan) | Which plan do they click? |
| `free_limit_hit` (limit_type) | Which limits drive conversion? |
| `trial_started` | Free trial adoption rate |
| `trial_converted` | Trial → Paid conversion rate |
| `trial_canceled` | Churn during trial |
| `referral_sent` / `referral_accepted` | Viral coefficient |
| `share_card_generated` / `share_card_clicked` | Social loop performance |
| `streak_reminder_sent` / `streak_reminder_opened` | Email/push effectiveness |
| `reengagement_email_sent` / `reengagement_returned` | Win-back rate |

**Key PLG metrics to dashboard:**

| Metric | Target |
|--------|--------|
| Time to first paywall | < 24 hours |
| Paywall → Checkout rate | > 8% |
| Trial → Paid conversion | > 40% |
| Viral coefficient (K-factor) | > 0.3 |
| Day 7 retention (free) | > 20% |
| Day 7 retention (paid) | > 60% |
| Median days to conversion | 2-4 days |

---

## 9. What You Might Be Missing

These are additional considerations not in the original brief:

### 8.1 Must-Haves

| Item | Why |
|------|-----|
| **Multi-language support (i18n)** | Many test-takers are non-native English speakers. Spanish is critical. |
| **Accessibility (WCAG 2.1 AA)** | Legal requirement + right thing to do. Screen reader support, high contrast mode. |
| **Offline mode (PWA)** | Teens might practice on the bus with spotty signal. Cache questions locally. |
| **Push notifications / email reminders** | "Don't break your streak!" — critical for retention. |
| **COPPA / privacy compliance** | Users are minors (16). Need parental consent flow or avoid collecting PII beyond email. |
| **Terms of Service & Privacy Policy** | Required for app stores and payment processing. |
| **Rate limiting & anti-cheat** | Prevent bots from answer scraping. |

### 8.2 Nice-to-Haves (v2)

| Item | Why |
|------|-----|
| **Leaderboard** | Weekly state-level and national leaderboard — adds social competition but adds complexity. Defer to keep MVP simple. |
| **Study mode (flashcards)** | Not everyone wants test format — some prefer flashcard-style review |
| **Social sharing** | "I just scored 98%!" — share results to TikTok/Instagram stories |
| **Referral program** | "Invite a friend, get 1 week free" — viral growth loop |
| **AI tutor chat** | "Why is the answer B?" — AI explains concepts conversationally |
| **Dark mode** | Teens study at night. Essential UX feature. |
| **Parent dashboard** | Parents can see their teen's progress and readiness score |
| **Simulated DMV appointment prep** | "What to bring", "What to expect" content |
| **Audio questions** | Accessibility + different learning styles |
| **Practice test PDF export** | For offline study or printing |
| **Mobile app (React Native)** | Wrap the PWA or build native for app store presence |

### 8.3 Content & Operations

| Item | Why |
|------|-----|
| **Question bank sourcing** | Need to source/write 50-100+ questions per state (2,500-5,000+ total) |
| **Question bank updates** | Laws change — need a content pipeline to keep questions current |
| **Customer support** | Chat widget (Intercom/Crisp) or at minimum a help/FAQ page |
| **Content review process** | Subject matter experts to validate question accuracy per state |

---

## 10. Success Metrics (KPIs)

| Metric | Target |
|--------|--------|
| Signup → First Test completion | > 60% |
| Day 1 retention | > 40% |
| Day 7 retention | > 20% |
| Free → Paid conversion | > 5% |
| Average tests per user per week | > 3 |
| User reported "passed real test" | > 85% |
| Average readiness score at conversion | > 75% |
| Monthly recurring revenue (MRR) | Track from day 1 |
| CAC (via PostHog + Stripe) | < $5 |

---

## 11. Milestones & Phasing

### Phase 0: Web-Only MVP — No Accreditation (4-6 weeks)
**Goal: Ship fast, validate PLG metrics, no regulatory commitments yet.**

- Web app only (no native iOS/Android, no Capacitor wrapper)
- **No state accreditation pursued** (defer until traction is proven)
- Auth (email + Google + Facebook — **no TikTok login**)
- State selection (start with 5 high-population states: CA, TX, FL, NY, IL)
- Question bank (50 questions per state, JSON files)
- Full practice test + quick quiz modes
- Basic results with category breakdown
- Dashboard with readiness score
- Stripe billing (free + Weekly $2.99 + Unlimited $29.99)
- **Pass Guarantee** copy on landing/paywall (commitment, not yet automated refund flow)
- PostHog basic event tracking
- **SEO question pages** (Section 5.3) — pre-render all questions as indexable pages
- **No ads** anywhere (clean UX even on free tier)
- Sitemap.xml + Schema.org markup from day 1

### Phase 2: Gamification & Growth (4 weeks)
- XP, levels, badges, streaks
- Daily challenges
- Push notifications / email reminders
- Expand to all 50 states
- Topic drill + weak spot modes
- Automated refund flow for Pass Guarantee (Stripe-integrated)
- Testimonial collection flow ("Did you pass?" → social proof)

### Phase 3: Optimization & Scale (ongoing)
- A/B test paywall, onboarding, pricing
- Multi-language (Spanish)
- PWA + offline mode
- Referral program
- AI tutor chat
- Social sharing (TikTok/Instagram share cards)
- Dark mode
- Marketing site integration (deep links, widgets, SSO)
- **Optional: Begin Texas TDLR accreditation** if PLG metrics justify the move

---

## 12. Open Questions

1. ~~**Brand name**~~ — **Decided: PassDMV** (passdmv.us)
2. **Question bank sourcing** — Write original? License from existing provider? Scrape public DMV handbooks?
3. **Hearts/lives system** — Include in MVP or skip to avoid frustrating users?
4. ~~**Weekly plan pricing**~~ — **Decided: $2.99/week**
5. ~~**TikTok OAuth**~~ — **Decided: Skip TikTok login.** Use TikTok only for share cards (results sharing to TikTok story).
6. **Parental consent** — How strict do we need to be with COPPA for 16-year-olds? (COPPA applies to under 13, but state laws vary)
7. **Marketing site tech** — Confirm Lovable vs. Claude-built. Need to align on auth sharing strategy early.

---

## 13. 🔔 Future Roadmap — Reminders & Backlog

These are intentional deferrals — features Tomer wants to revisit later. **Surface these proactively when relevant** (e.g., when PLG metrics are reviewed, when starting Phase 2, or when discussing retention strategy).

### 13.1 High-Priority Reminders (Re-evaluate at Phase 2 kickoff)

| ID | Item | Why Deferred | When to Revisit | Notes |
|----|------|-------------|-----------------|-------|
| **R-01** | **Test Date Mode** (Issue 5) | Massive engagement driver — user enters their DMV appointment date, app generates a daily study plan counting down. Could be the biggest retention feature, but not blocking for MVP launch. | After Phase 1 launch when retention metrics are measurable. **Reminder:** Bring this up before Phase 2 planning. | Powerful for marketing too: "Test in 14 days? We'll get you ready." |
| **R-02** | **Parent Dashboard** (Issue 10) | The parent is the buyer, the teen is the user. Parent involvement could drive both conversion (parent pays) and retention (parent nudges teen). Not in MVP because it adds account-linking complexity. | After first 100 paying customers — survey them on parent involvement. **Reminder:** Bring this up when discussing conversion optimization. | Could be as simple as: "Send your progress to mom/dad" weekly email opt-in during signup. |
| **R-03** | **Native Mobile App via Capacitor** (Issue 9) | Teens trust App Store presence. PWA works but feels second-class. Capacitor wraps the existing Next.js app for iOS/Android with minimal effort. | After PLG metrics validate web app (Phase 2). **Reminder:** Bring this up when reviewing Phase 1 retention metrics. | See Section 13.4 for full Capacitor explanation. |
| **R-04** | **State Accreditation (Texas TDLR)** | Real moat (~$25M revenue ceiling per Aceable) but 6-12 month process. Defer until PLG metrics prove the audience. | After 1,000 paying users OR 6 months of strong PLG metrics. **Reminder:** Bring this up in any quarterly planning conversation. | Texas is the easiest entry point ($500 + $10K surety bond). |

### 13.2 Medium-Priority Backlog

| ID | Item | Notes |
|----|------|-------|
| **R-05** | AI Tutor chat | "Why is the answer B?" — DMV Genie has it. Should we differentiate with voice mode? |
| **R-06** | Photo-based questions | "Take a photo of this sign" — unique feature, no competitor has it |
| **R-07** | Voice mode for questions | Practice while passenger; nobody has this |
| **R-08** | Spanish (i18n) | Use `next-intl` from day 1 architecturally; translate copy in Phase 3 |
| **R-09** | Referral program | "Invite a friend, get 1 week free" |
| **R-10** | Dark mode | Teens study at night |
| **R-11** | TikTok/Instagram share cards | Replaces TikTok login as the TikTok integration |
| **R-12** | Leaderboard | Deferred from MVP; bring back if retention needs a boost |

### 13.3 Strategic Reminders (Bring Up When Relevant)

| When to Surface | Reminder |
|-----------------|----------|
| When discussing **retention features** | Test Date Mode (R-01) is the highest-leverage retention play |
| When discussing **conversion optimization** | Parent Dashboard (R-02) — parents are the buyers |
| When discussing **app stores or mobile** | Capacitor wrapper (R-03) — see Section 13.4 |
| When discussing **scaling revenue** | State accreditation (R-04) is the path to $25M+ |
| When discussing **content moat** | AI tutor (R-05), voice mode (R-07), photo questions (R-06) |
| When PLG metrics review (monthly) | Re-evaluate R-01, R-02 against current pain points |

### 13.4 What is Capacitor? (Re: Issue 9 — PWA vs Native)

**Quick explainer for R-03:**

| | PWA (current MVP plan) | Native via Capacitor |
|--|------------------------|---------------------|
| **What it is** | Progressive Web App — works in browser, can be "added to home screen" | Wraps the existing Next.js web app into a real iOS / Android app shell |
| **Effort** | Built-in to MVP (just a manifest.json + service worker) | ~1 week of work to integrate Capacitor + submit to App Store / Play Store |
| **App Store presence** | ❌ Not in stores | ✅ In App Store + Play Store with logo, ratings, reviews |
| **Feels native** | ⚠️ Feels like a website with a shortcut | ✅ Feels like an app (splash screen, icon, push notifications) |
| **Push notifications** | Limited (especially on iOS) | ✅ Full native push support |
| **Trust signal for teens** | ⚠️ Lower — "Why isn't it in the App Store?" | ✅ Higher — App Store presence = legitimate |
| **SEO & sharing** | ✅ Each page is a URL (great for SEO) | ✅ Same — Capacitor preserves the web app |
| **Maintenance overhead** | ✅ One codebase, one deploy | ⚠️ One codebase, but Apple/Google review cycles |
| **Cost** | $0 | $99/year Apple Developer + $25 one-time Google Play |

**TL;DR:** Capacitor is a "1-week add-on" that turns your existing Next.js web app into a real iOS/Android app without rewriting anything. It uses the same codebase. **Recommendation: Add this in Phase 2** once PLG metrics validate the product.

**Alternative:** React Native is a full rewrite (more work, more native), but for an LMS-style app, Capacitor is the right trade-off. Aceable, Zutobi, and DMV Genie all use similar wrappers.

---

*Document version: 1.2*
*Last updated: 2026-04-15*
*Changes: v1.2 — Phase 0 web-only confirmed (no accreditation), SEO question pages strategy (5,000+ indexable URLs), TikTok login removed, ads removed from free tier, Pass Guarantee marketing hook added (Section 4.7), Future Roadmap section added with reminders R-01 through R-12 (Test Date Mode, Parent Dashboard, Capacitor)*

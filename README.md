# FastSync

A mobile-first PWA for couples who share a bank account: log an expense in a few seconds, auto-load standing orders on the 1st of the month, and see income vs spend without spreadsheet chaos.

## Why it exists

Shared money is simple in theory and messy in practice:

- expenses get forgotten
- standing orders are “somewhere in the bank app”
- nobody remembers last month’s grocery total

FastSync is built for **one joint household wallet** — fast entry on the phone, automatic monthly fixed costs, and a clear monthly picture.

## What you can do

- **Quick-add an expense** — amount + category in seconds
- **Recurring bills & salaries** — set once; they land automatically each month
- **Dashboard (“Status”)** — income vs spend for the current month
- **Month comparison** — see category totals vs the previous month
- **Shared household** — both partners see the same data in real time
- **Install as PWA** — Add to Home Screen on the phone

## How it works (user flow)

1. **Sign up** and create a household (or join with an invite code)
2. Set **salaries** and **standing orders** once
3. Day to day: open the app → **quick-add** expenses
4. On the **1st of the month**, fixed income/expenses are inserted automatically when someone opens the app
5. Check the **dashboard** to see where the month stands

## Product notes

- Everything is treated as coming from the **joint account** (no “who paid”)
- Categories: Grocery · Dining / Wolt · Transport · Leisure · Bills · Misc
- Personal / one-off income and a cash cushion are supported for a fuller picture
- Built as a personal product for real household use (repo is private)

---

## For developers

### Stack

| Layer | Service |
|-------|---------|
| App | React 19, Vite, Tailwind, PWA |
| Hosting | Netlify |
| Auth + DB + Realtime | Supabase |

No dedicated app server — Netlify serves the static app; Supabase holds the data.

### Quick start

```bash
copy .env.example .env
npm install
npm run dev
```

Fill `.env` from Supabase → Settings → API, then run `supabase/schema.sql` in the SQL editor.

### Security

- Never commit `.env`
- Use the **anon** key in the client — never `service_role`
- Keep the repo **private**

Product spec: [PRD.txt](PRD.txt)

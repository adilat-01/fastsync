# FastSync

**Live:** [ourmoneytracker.netlify.app](https://ourmoneytracker.netlify.app)

A mobile-first PWA for couples who share a bank account: log an expense in a few seconds, auto-load standing orders on the 1st of the month, and see income vs spend without spreadsheet chaos.

## Why it exists

Shared money is simple in theory and messy in practice:

- expenses get forgotten
- standing orders are ג€somewhere in the bank appג€
- nobody remembers last monthג€™s grocery total

FastSync is built for **one joint household wallet** ג€” fast entry on the phone, automatic monthly fixed costs, and a clear monthly picture.

## What you can do

- **Quick-add an expense** ג€” amount + category in seconds
- **Recurring bills & salaries** ג€” set once; they land automatically each month
- **Dashboard (ג€Statusג€)** ג€” income vs spend for the current month
- **Month comparison** ג€” see category totals vs the previous month
- **Shared household** ג€” both partners see the same data in real time
- **Install as PWA** ג€” Add to Home Screen on the phone

## How it works (user flow)

1. **Sign up** and create a household (or join with an invite code)
2. Set **salaries** and **standing orders** once
3. Day to day: open the app ג†’ **quick-add** expenses
4. On the **1st of the month**, fixed income/expenses are inserted automatically when someone opens the app
5. Check the **dashboard** to see where the month stands

## Product notes

- Everything is treated as coming from the **joint account** (no ג€who paidג€)
- Categories: Grocery ֲ· Dining / Wolt ֲ· Transport ֲ· Leisure ֲ· Bills ֲ· Misc
- Personal / one-off income and a cash cushion are supported for a fuller picture
- Built as a personal product for real household use

---

## For developers

### Stack

| Layer | Service |
|-------|---------|
| App | React 19, Vite, Tailwind, PWA |
| Hosting | Netlify |
| Auth + DB + Realtime | Supabase |

No dedicated app server ג€” Netlify serves the static app; Supabase holds the data.

### Quick start

```bash
copy .env.example .env
npm install
npm run dev
```

Fill `.env` from Supabase ג†’ Settings ג†’ API, then run `supabase/schema.sql` in the SQL editor.

### Security

- Never commit `.env`
- Use the **anon** key in the client ג€” never `service_role`
- Treat this as portfolio code ג€” never commit real household data or secrets

Product spec: [PRD.txt](PRD.txt)

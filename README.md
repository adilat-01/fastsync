# FastSync

Mobile-first PWA for a shared household budget: log an expense in a few seconds, recurring bills on the 1st of the month, and a dashboard of income vs spend.

No custom backend. The app is static on Netlify. Data and auth live in Supabase (PostgreSQL + Realtime).

## Stack

| Layer | Service |
|-------|---------|
| App | React 19, Vite, Tailwind, PWA |
| Hosting | Netlify |
| Auth + DB + Realtime | Supabase |

## Repo layout

```
├── src/                 # React screens and logic
├── supabase/            # schema.sql + migrations
├── public/              # PWA icons
├── netlify.toml
├── PRD.txt
└── .env.example
```

## Quick start

```bash
copy .env.example .env
npm install
npm run dev
```

Fill `.env` (from Supabase → Settings → API):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then run `supabase/schema.sql` (and later migrations if needed) in the SQL editor.

## Recurring bills

`ensure_recurring_for_current_month` runs when the app opens. If a new month started, salaries and standing orders are inserted once (no duplicates).

## Security

- Never commit `.env`
- Use the **anon** key in the client, not the `service_role` key
- Keep this repo **private** — it is a personal household app

## Categories

Grocery · Dining / Wolt · Transport · Leisure · Bills · Misc

There is no “who paid” field — everything is treated as coming from the joint account.

-- Split supermarket vs restaurants/Wolt.
-- Run in Supabase → SQL Editor.

alter type public.tx_category add value if not exists 'dining';

# Prompts

## Public

- `system.ts` — loads the real prompt at runtime; exports only a short public summary + `FUTURE_CAPABILITY_NOTE`.

## Private (not committed)

1. Edit `system.private.txt` locally (copy from `system.private.txt.example` if needed).
2. Push to Supabase for production:

```bash
npm run sync-prompt
```

Requires `supabase/app_config.sql` applied once, plus `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

See [`../../PRIVATE_EVAL.md`](../../PRIVATE_EVAL.md).

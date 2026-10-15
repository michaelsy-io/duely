# Duely × n8n

Two workflows call Duely's hook endpoints. Duely does all the maths (engine); n8n only schedules and delivers.

| File | Trigger | Calls | Then |
| --- | --- | --- | --- |
| `daily-digest.json` | Weekdays 08:00 (Asia/Manila) | `POST {APP_URL}/api/hooks/digest` | Splits `digests[]` and emails each collector their brief |
| `due-reminders.json` | Every hour | `POST {APP_URL}/api/hooks/due` | If `hasItems`, emails the team (PDCs due within 2 days, promises due today) |

Both endpoints also create in-app notifications (`collector` / `supervisor` roles). Send `{"notify": false}` to get the JSON only. Optional `{"period": "P1" | "P2"}`; default is P1. "Today" is the demo clock (the period's as-of date), so the hourly workflow repeats the same reminders — set it inactive or `notify: false` for long-running demos.

## Import

1. In n8n: **Workflows → Import from File** and pick each JSON file.
2. Set environment variables for n8n (Settings → Variables, or the container env):
   - `APP_URL` — e.g. `https://duely.vercel.app` (no trailing slash)
   - `HOOK_SECRET` — same value as the Duely deployment's `HOOK_SECRET`
   - `DIGEST_EMAIL_TO` — optional recipient (defaults to a placeholder)
   If your n8n plan blocks `$env`, paste the values directly into the HTTP Request node URL/header.
3. Open the **Gmail** node, pick or create a Gmail OAuth2 credential (the imported one is a placeholder `REPLACE_ME`). Any other email/Slack node works too: the digest JSON has `subject`, `text`, and per-collector `digests[].text`.
4. Click **Execute workflow** once to test, then toggle **Active**.

## Test without n8n

```bash
curl -X POST "$APP_URL/api/hooks/digest" -H "x-hook-secret: $HOOK_SECRET" -H 'content-type: application/json' -d '{"notify":false}'
curl -X POST "$APP_URL/api/hooks/due"    -H "x-hook-secret: $HOOK_SECRET" -H 'content-type: application/json' -d '{"period":"P2","notify":false}'
```

A missing/wrong secret returns 401; if `HOOK_SECRET` is not set on the deployment the hooks return 503 (fail closed).

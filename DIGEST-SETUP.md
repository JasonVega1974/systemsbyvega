# Weekly Demand Digest — setup

**Monday 08:00 America/Denver → `info@kingdom-creatives.com`.**

The schema, the function and the schedule are already applied and verified.
Two things remain, and both are yours: one environment variable in Vercel, and
one deploy. Until you do them the job still runs every Monday, still builds the
digest, and the HTTP call fails with a 404 that is logged and ignored. Nothing
breaks; the mail just doesn't arrive.

---

## How it works

```
pg_cron  0 14,15 * * 1  (both DST candidate hours, UTC)
   └─ sbv_send_weekly_digest()
        ├─ is it 08:00 in Denver right now?      no  → NOTICE, return
        ├─ already sent this week?               yes → NOTICE, return
        ├─ sbv_demand_digest_text(7)             null → NOTICE, return
        └─ pg_net POST → /api/digest             → Brevo → your inbox
```

**Why the job fires twice.** pg_cron schedules in UTC. 08:00 Mountain is 14:00
UTC in summer and 15:00 UTC in winter, so any single UTC time is wrong for half
the year. The job runs at both and the function returns early unless the local
Denver hour is 8. Postgres owns the DST rules, so nobody edits a schedule twice
a year. Verified both directions:

| | UTC | Denver |
|---|---|---|
| Winter | 15:00Z | **08:00** |
| Summer | 14:00Z | **08:00** |

**Why the Brevo key is not in the database.** It already exists in Vercel for
`/api/demand`. A second copy is a second thing to rotate and a second place to
leak from — and a leaked Brevo key lets someone send mail *as* you. What the
database holds instead is a secret whose only power is "make the server email
Jason a summary of his own data". The recipient is hardcoded in `api/digest.js`
and is never read from the request, so even that secret cannot redirect the
report anywhere.

---

## Step 1 — read the secret out of the database

It was generated *inside* Postgres so it never passed through a chat window or
a file. Supabase → **SQL Editor** → run:

```sql
select value from public.sbv_settings where key = 'digest_secret';
```

Copy the value.

## Step 2 — put it in Vercel

**Settings → Environment Variables**, all environments:

| Name | Value |
|---|---|
| `SBV_DIGEST_SECRET` | the value from Step 1 |

`BREVO_API_KEY` is already there from `BREVO-SETUP.md`. If it isn't, do that
first — the digest cannot send without it.

## Step 3 — deploy

`/api/digest` ships with the next push. Redeploy so the new env var is picked up.

---

## Test it without waiting for Monday

Read the digest with no email involved:

```sql
select public.sbv_demand_digest_text(7);
```

Force a real send, ignoring both the hour guard and the once-a-week guard:

```sql
select public.sbv_send_weekly_digest(true);
```

Then check what actually happened at the far end:

```sql
select id, status_code, error_msg, created
from net._http_response order by id desc limit 5;
```

`200` is delivered. `404` means `/api/digest` is not deployed yet. `401` means
`SBV_DIGEST_SECRET` in Vercel does not match `sbv_settings`.

> A forced send writes a row into `sbv_digest_log` for the current week, which
> will suppress that week's real Monday send. If you force one on a Monday
> before 08:00, clear it:
> `delete from public.sbv_digest_log where week_start = date_trunc('week', now() at time zone 'America/Denver')::date;`

---

## When the domain moves

`DNS-MIGRATION.md` puts the site on `systemsbyvega.com`. The digest endpoint is
stored in the database, not in code, so it is one statement — no redeploy:

```sql
update public.sbv_settings
   set value = 'https://systemsbyvega.com/api/digest', updated_at = now()
 where key = 'digest_endpoint';
```

---

## Operating it

**Did it send?**
```sql
select * from public.sbv_digest_log order by week_start desc limit 8;
```

**Pause it** — `select cron.unschedule('sbv-weekly-digest');`
**Resume it** — `select cron.schedule('sbv-weekly-digest','0 14,15 * * 1', $$select public.sbv_send_weekly_digest();$$);`

**Did the job run at all?**
```sql
select start_time, status, return_message
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'sbv-weekly-digest')
order by start_time desc limit 10;
```

The `return_message` shows which branch the function took: `queued:<id>`,
`skipped:hour`, `skipped:already-sent`, or an `error:*` code. Every one of
those is a NOTICE, never an exception — a digest that cannot be produced must
never take the schedule down with it.

---

## What's in the email

Plain text, fixed width, four sections:

1. **Build threshold** — every niche at 10 or more, with `** CROSSED THIS WEEK **`
   against any that got there inside the window. That flag is the only new
   information on the line, so it is the only thing marked.
2. **New this week — top 5**, with each niche's all-time total alongside.
3. **Top cities, by niche** — three per niche, ordered by niche size.
4. **All-time, ranked.**

It closes with *"Counts are raw rows in sbv_demand. Nothing here is a
projection."* — the same posture as everything else on this property.

# Brevo Setup — the registry confirmation email

**You run every step. I can't click dashboards.**

One email exists on this site. Somebody joins the line for a business in a town,
and they get a note saying so. There is no sequence behind it, no newsletter, and
no second message. About 15 minutes, most of it waiting on DNS.

---

## What gets sent

Subject: **You are in line for pressure washing in Nampa, ID**

> You are in line for pressure washing in Nampa, ID.
>
> That is all this is: a note of which business you want and which town you want
> it in. Nothing has been charged and there is nothing to cancel.
>
> It is not built yet. When enough people ask for the same one, that is the one I
> build next, and the people who asked get the first offer on their own city
> before it is listed publicly. I am not going to give you a date, because I
> would be guessing.

Full text is in `api/demand.js` (`textBody` / `htmlBody`). Edit it there, not in
Brevo — there is no Brevo template to keep in sync, on purpose.

---

## Step 1 — Authenticate the sending domain

Without this, mail from `info@kingdom-creatives.com` lands in spam or gets
rejected outright. Gmail and Outlook both require it now.

1.1 Brevo → **Senders, Domains & Dedicated IPs** → **Domains** → **Add a domain**

1.2 Enter `kingdom-creatives.com` → **Save**

1.3 Brevo shows you **three DNS records** — a DKIM `TXT`, a Brevo-code `TXT`,
and a DMARC `TXT`. Add all three at whichever registrar holds
`kingdom-creatives.com`.

> If that domain is at GoDaddy too, it's the same **DNS** screen as
> `DNS-MIGRATION.md` — just a different domain. **Adding TXT records cannot
> affect your website or your mail.** Only touch MX if Brevo explicitly asks,
> and it shouldn't.

1.4 Back in Brevo → **Verify**. Usually minutes; can take a few hours.

1.5 Don't continue until the domain shows **Authenticated** with a green check.

---

## Step 2 — Add the sender

2.1 Brevo → **Senders** → **Add a sender**

2.2 Name `Jason Vega — Systems by Vega`, email `info@kingdom-creatives.com`

2.3 Confirm the verification mail Brevo sends there.

> **This address, and only this address.** No gmail address goes anywhere near
> this project — not as sender, not as reply-to, not as a test recipient. It is
> the one contact address the whole family uses.

---

## Step 3 — Turn click tracking OFF

**This is the step that matters, and it is the one that is easy to skip.**

3.1 Brevo → **Settings** (gear) → **Transactional email** → **Tracking**

3.2 Turn **Click tracking** to **OFF**. Leave open tracking off as well.

### Why

Brevo rewrites every link in an email it sends, replacing the real URL with a
redirect through a Brevo tracking domain so it can count clicks. Three
consequences, all bad here:

- The message stops looking like a note from a person and starts looking like
  marketing, which is exactly what it is not.
- Spam filters weight redirect domains heavily. A confirmation that gets filtered
  is a confirmation that did not happen.
- The recipient hovers a link that says `estatesalebiz.com` and the status bar
  shows some tracking host. That is the opposite of the posture this whole site
  is built on.

The email is written with **no clickable links** as a second line of defence —
addresses appear as plain text so there is no anchor for Brevo to rewrite. Do
both: the switch **and** the plain text. This is the lesson the family already
learned once.

---

## Step 4 — Create the API key

4.1 Brevo → **SMTP & API** → **API Keys** → **Generate a new API key**

4.2 Name it `systemsbyvega-vercel`

4.3 **Copy it now** — Brevo shows it once.

4.4 Paste it straight into **Vercel → your project → Settings → Environment
Variables**:

| Name | Value | Environments |
|---|---|---|
| `BREVO_API_KEY` | the key you just copied | Production, Preview, Development |

> Into Vercel and nowhere else. Not into a file, not into a commit, not into
> chat. If it ever does end up somewhere it shouldn't, revoke it on this same
> screen and generate another — it takes a minute and costs nothing.

4.5 Redeploy so the function picks it up (Vercel → **Deployments** → latest →
**⋯ → Redeploy**).

---

## Step 5 — Check the other two variables are set

`/api/demand` needs three. Vercel → **Settings → Environment Variables**:

| Name | Where it comes from |
|---|---|
| `SUPABASE_URL` | `https://newjbexmvltvtmxollca.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API → the **publishable** key |
| `BREVO_API_KEY` | Step 4 |

> Note it is the **publishable** key, not the service-role one. The function
> writes the row with the same restricted key the browser has, so Row Level
> Security stays the thing protecting that table. Routing the write through a
> privileged key would silently bypass the policy that exists to protect it.

---

## Step 6 — Test it end to end

6.1 On the deployed site, join the line: pick any business, use a real address
you can check, pick a city.

6.2 Expect, in order:

- [ ] The page says **"You are in line for … Nothing has been charged"**
- [ ] The email arrives within a minute
- [ ] It is **not** in spam (if it is, Step 1 has not finished)
- [ ] The sender reads `Jason Vega — Systems by Vega <info@kingdom-creatives.com>`
- [ ] Nothing in the body is a tracking redirect
- [ ] Submitting the **same** business + city + email again says
      *"You are already in line"* and sends **no second email**

6.3 Confirm the row landed: Supabase → **Table Editor** → `sbv_demand`.

6.4 Now check the failure path, because it's the one that matters. Temporarily
delete `BREVO_API_KEY` in Vercel, redeploy, and submit again. The page should
say the row was recorded **and** that the confirmation did not send. It must
never claim you are on a list when you are not — and it must never claim the
save failed when it succeeded. Put the key back and redeploy.

---

## If mail is not arriving

| Symptom | Cause |
|---|---|
| Nothing at all, page said "did not save" | The **row** failed, not the mail. Check `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`, then Vercel → the deployment → **Functions** logs. |
| Page succeeded, no mail | `BREVO_API_KEY` missing or not redeployed. The page will say so explicitly. |
| Lands in spam | Step 1 incomplete. Check the domain still shows **Authenticated**. |
| Rejected by Gmail | DMARC record missing. It is the third TXT record in 1.3, and it is the one most often skipped. |
| Links look like `brevo` URLs | Step 3 was skipped. Turn click tracking off and redeploy. |

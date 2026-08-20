/* ============================================================================
   POST /api/digest — relay the weekly demand digest to Brevo
   ----------------------------------------------------------------------------
   Called by Postgres, not by a browser. pg_net posts the finished digest text
   here every Monday and this hands it to Brevo.

   WHY THE DATABASE DOES NOT TALK TO BREVO DIRECTLY.
   It could — pg_net can reach any host, and the key could live in Supabase
   Vault. But the Brevo key already exists in Vercel for /api/demand, and a
   second copy is a second thing to rotate and a second place to leak from. A
   leaked Brevo key lets someone send mail AS info@kingdom-creatives.com. The
   secret this endpoint checks can do exactly one thing: make the server email
   Jason a summary of his own data, at an address baked in below and not taken
   from the request. That is the whole blast radius.

   The recipient is hardcoded ON PURPOSE. If it came from the caller, anyone
   holding the secret could redirect the registry summary — including the city
   and niche breakdown — to an address of their choosing.
   ========================================================================= */

const crypto = require('crypto');

const BREVO_KEY     = process.env.BREVO_API_KEY;
const DIGEST_SECRET = process.env.SBV_DIGEST_SECRET;

/* Trailing slashes get pasted in by accident; '<url>//fail' would 404 silently
   and the switch would look healthy while alerting nothing. */
const HEARTBEAT_URL = (process.env.SBV_HEARTBEAT_URL || '').replace(/\/+$/, '');

const FROM = { name: 'Systems by Vega', email: 'info@kingdom-creatives.com' };
const TO   = [{ email: 'info@kingdom-creatives.com', name: 'Jason Vega' }];

function secretOk(given) {
  if (!DIGEST_SECRET || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(DIGEST_SECRET).digest();
  return crypto.timingSafeEqual(a, b);
}

/* Dead man's switch. The digest email is its own success signal, so what is
   actually needed is notice when that signal STOPS - including the cases this
   code can never observe, like pg_cron not firing or the project being paused.

   Pinged only on a confirmed send. A heartbeat that fires regardless of outcome
   is worse than none: it manufactures confidence. Awaited rather than
   fire-and-forget, because the function is frozen once the response returns. */
async function heartbeat(suffix) {
  if (!HEARTBEAT_URL) return;
  try {
    await fetch(HEARTBEAT_URL + suffix, { signal: AbortSignal.timeout(5000) });
  } catch (e) {
    console.error('[digest] heartbeat ping failed:', e.message);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  if (!secretOk(req.headers['x-digest-secret'])) {
    await new Promise(r => setTimeout(r, 600));
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  if (!BREVO_KEY) {
    return res.status(500).json({ ok: false, error: 'unconfigured', message: 'BREVO_API_KEY missing' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const text = String(body.text || '').slice(0, 100000);
  const subject = String(body.subject || 'SBV demand digest').slice(0, 200);

  if (!text.trim()) return res.status(400).json({ ok: false, error: 'empty_body' });

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: FROM,
        to: TO,                       // fixed — never read from the request
        subject: subject,
        textContent: text,            // plain text only; no links to be rewritten
        tags: ['sbv-digest']
      })
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      await heartbeat('/fail');
      return res.status(502).json({ ok: false, error: 'brevo_failed', status: r.status,
        message: detail.slice(0, 300) });
    }
    await heartbeat('');
    return res.status(200).json({ ok: true, sent: true, bytes: text.length });
  } catch (e) {
    console.error('[digest] brevo unreachable:', e.message);
    await heartbeat('/fail');
    return res.status(502).json({ ok: false, error: 'brevo_unreachable' });
  }
};

function safeParse(s) { try { return JSON.parse(s); } catch (e) { return {}; } }

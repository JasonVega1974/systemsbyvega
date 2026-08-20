/* ============================================================================
   POST /api/demand — record one registry row, then confirm it by email
   ----------------------------------------------------------------------------
   WHY THIS IS A FUNCTION AND NOT A DIRECT POSTGREST CALL.
   The row itself could be written straight from the browser — sbv_demand takes
   an anonymous INSERT by design. But the confirmation email cannot: it needs the
   Brevo key, and a key in the page is a key anyone can send mail with. So the
   browser posts here, and this runs the two steps in the order that fails
   safely.

   THE INSERT USES THE PUBLISHABLE KEY, NOT THE SERVICE ROLE. That is
   deliberate. Row Level Security is the control on this table, and routing the
   write through a privileged key would quietly bypass the policy that is
   supposed to be protecting it. The service-role key is not read anywhere in
   this file, and this endpoint therefore cannot do anything a visitor could not
   already do — except send the confirmation.

   ORDER OF OPERATIONS: write the row first, mail second.
   If the mail fails, the person IS in line and we say so. If the write fails,
   nothing is claimed. Telling someone they are on a list they are not on is the
   one outcome worth engineering against — the same rule the GarageSaleBiz
   waitlist follows.
   ========================================================================= */

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY     = process.env.SUPABASE_PUBLISHABLE_KEY;
const BREVO_KEY    = process.env.BREVO_API_KEY;

const FROM = { name: 'Jason Vega — Systems by Vega', email: 'info@kingdom-creatives.com' };

const STATES = new Set(('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS ' +
  'MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC').split(' '));

function bad(res, code, error, message) {
  return res.status(code).json({ ok: false, error, message });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return bad(res, 405, 'method_not_allowed', 'Use POST.');

  if (!SUPABASE_URL || !ANON_KEY) {
    return bad(res, 500, 'unconfigured',
      'That did not save, so you are not on the list. This is at our end, not yours.');
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});

  // honeypot: a real person leaves this empty. Answer 200 so a bot learns nothing.
  if (body.company_website) return res.status(200).json({ ok: true, skipped: true });

  const niche = String(body.niche_slug || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const city  = String(body.city || '').trim().replace(/\s+/g, ' ');
  const state = String(body.state || '').trim().toUpperCase();
  const name  = String(body.full_name || '').trim();

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(niche)) return bad(res, 400, 'bad_niche', 'Pick a business from the list.');
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email) || email.length > 254) return bad(res, 400, 'bad_email', 'That email address does not look right.');
  if (city.length < 2 || city.length > 120) return bad(res, 400, 'bad_city', 'Give the city you want.');
  if (!STATES.has(state)) return bad(res, 400, 'bad_state', 'Pick the state your city is in.');

  /* ---------------------------------------------------------- 1. the row */
  let insert;
  try {
    insert = await fetch(SUPABASE_URL + '/rest/v1/sbv_demand', {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: 'Bearer ' + ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        niche_slug: niche,
        email: email,
        city_label: city + ', ' + state,
        state_code: state,
        full_name: name || null,
        source: String(body.source || 'catalog').slice(0, 40)
      })
    });
  } catch (e) {
    console.error('[demand] insert threw:', e.message);
    return bad(res, 502, 'insert_failed',
      'That did not save, so you are not on the list. This is at our end, not yours.');
  }

  if (insert.status === 409) {
    // Already recorded. Not an error, and not a second email.
    return res.status(200).json({ ok: true, duplicate: true,
      message: 'You are already in line for that one in that city. Nothing has changed.' });
  }

  if (!insert.ok) {
    const detail = await insert.text().catch(() => '');
    console.error('[demand] insert failed:', insert.status, detail.slice(0, 300));
    return bad(res, 502, 'insert_failed',
      'That did not save, so you are not on the list. This is at our end, not yours.');
  }

  /* -------------------------------------------------------- 2. the email */
  // Best effort. The row is written; a mail failure must not tell the person
  // they are not in line, because they are.
  let emailed = false;
  if (BREVO_KEY) {
    try {
      const nice = niche.replace(/-/g, ' ');
      const where = city + ', ' + state;
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: FROM,
          to: [{ email: email, name: name || undefined }],
          replyTo: FROM,
          subject: 'You are in line for ' + nice + ' in ' + where,
          textContent: textBody(nice, where),
          htmlContent: htmlBody(nice, where),
          tags: ['sbv-demand']
        })
      });
      emailed = r.ok;
      if (!r.ok) {
        /* Status only. Brevo echoes the recipient address back in its error
           body, and a subscriber's email does not belong in a runtime log. */
        console.error('[demand] brevo rejected with status', r.status);
      }
    } catch (e) {
      /* The row is already written. This only decides whether the person
         got their confirmation - it must be visible, not swallowed. */
      console.error('[demand] brevo unreachable:', e.message);
      emailed = false;
    }
  }

  return res.status(201).json({ ok: true, emailed: emailed });
};

function safeParse(s) { try { return JSON.parse(s); } catch (e) { return {}; } }

/* The confirmation. Single opt-in: this is the only message that gets sent, and
   it exists to confirm a thing the person just did. It is not a newsletter and
   there is no sequence behind it.

   NO LINKS, BY DESIGN. Brevo rewrites every URL in an email it sends so it can
   count clicks, which turns a plain sentence into a tracking redirect through a
   Brevo domain — worse deliverability, and it reads as marketing. A confirmation
   with nothing to click cannot be rewritten. The one address below is plain
   text; a mail client may linkify it, but Brevo has no anchor to replace.
   The account-level click-tracking switch must ALSO be off — see BREVO-SETUP.md. */
function textBody(nice, where) {
  return [
    'You are in line for ' + nice + ' in ' + where + '.',
    '',
    'That is all this is: a note of which business you want and which town you want it in.',
    'Nothing has been charged and there is nothing to cancel.',
    '',
    'It is not built yet. When enough people ask for the same one, that is the one I build',
    'next, and the people who asked get the first offer on their own city before it is',
    'listed publicly. I am not going to give you a date, because I would be guessing.',
    '',
    'Two of these are finished and running today: estatesalebiz.com and garagesalebiz.com.',
    'If either is what you actually wanted, go and check whether your city is free.',
    '',
    'If you did not do this, ignore this message — nothing is recorded against you beyond',
    'this one row, and you can reply and I will delete it.',
    '',
    'Jason Vega',
    'Kingdom Creatives LLC, Nampa, Idaho',
    'info@kingdom-creatives.com',
    '',
    '--',
    'Systems by Vega provides software, documents, and training. It does not provide',
    'clients, leads, or locations, and makes no representation about income, revenue,',
    'profit, or results.'
  ].join('\n');
}

function htmlBody(nice, where) {
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  return `<div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#191B1E;max-width:38em">
<p style="font-size:19px;margin:0 0 18px"><strong>You are in line for ${esc(nice)} in ${esc(where)}.</strong></p>
<p>That is all this is: a note of which business you want and which town you want it in. Nothing has been charged and there is nothing to cancel.</p>
<p>It is not built yet. When enough people ask for the same one, that is the one I build next, and the people who asked get the first offer on their own city before it is listed publicly. I am not going to give you a date, because I would be guessing.</p>
<p>Two of these are finished and running today: estatesalebiz.com and garagesalebiz.com. If either is what you actually wanted, go and check whether your city is free.</p>
<p>If you did not do this, ignore this message — and you can reply and I will delete the row.</p>
<p style="margin-top:22px">Jason Vega<br>Kingdom Creatives LLC, Nampa, Idaho<br>info@kingdom-creatives.com</p>
<hr style="border:0;border-top:1px solid #CBC9C2;margin:22px 0">
<p style="font-family:ui-monospace,Consolas,monospace;font-size:11.5px;color:#7C818A;line-height:1.6">Systems by Vega provides software, documents, and training. It does not provide clients, leads, or locations, and makes no representation about income, revenue, profit, or results.</p>
</div>`;
}

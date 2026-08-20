/* ============================================================================
   POST /api/owner — the demand registry, for the one person allowed to read it
   ----------------------------------------------------------------------------
   WHY THIS NEEDS A PRIVILEGED KEY AND /api/demand DOES NOT.
   sbv_demand has an INSERT policy and no SELECT policy. anon cannot read it,
   authenticated cannot read it, and both are denied at the grant level as well
   — that is verified by sql/VERIFY.sql and again over HTTP by verify-rest.sh.
   Those checks are the product, so this endpoint does not weaken them. It
   steps around RLS with the service role instead, in one file, behind a key.

   WHY NOT A SECURITY DEFINER RPC, like the count functions use.
   Those return aggregates and nothing else, so exposing them to anon costs
   nothing. This returns email addresses. An anon-callable RPC that hands over
   PII to anyone who guesses a string is a worse shape than a server-side
   endpoint that never appears in the public API surface at all — and here the
   comparison can be constant-time and the credential can stay in Vercel.

   THE KEY IS NEVER IN THE PAGE. __owner__/index.html has no key in its source;
   Jason types it, it lives in sessionStorage for the tab's lifetime, and it is
   compared here against SBV_OWNER_KEY.
   ========================================================================= */

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_KEY    = process.env.SBV_OWNER_KEY;

/* Length-independent, timing-safe. Comparing with === leaks how many leading
   characters were right, one request at a time. */
function keyOk(given) {
  if (!OWNER_KEY || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(OWNER_KEY).digest();
  return crypto.timingSafeEqual(a, b);
}

function svc(path) {
  return fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: 'Bearer ' + SERVICE_KEY,
      Accept: 'application/json'
    }
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_KEY || !OWNER_KEY) {
    return res.status(500).json({ ok: false, error: 'unconfigured',
      message: 'The console is missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SBV_OWNER_KEY in Vercel.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  if (!keyOk(body.key)) {
    // Deliberately slow and deliberately vague.
    await new Promise(r => setTimeout(r, 600));
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    const [dRes, nRes] = await Promise.all([
      svc('sbv_demand?select=niche_slug,email,city_label,city_norm,state_code,full_name,source,created_at&order=created_at.desc&limit=5000'),
      svc('sbv_niches?select=slug,name,catalog_no,family,status,is_listed&order=sort.asc')
    ]);
    if (!dRes.ok || !nRes.ok) throw new Error('read failed ' + dRes.status + '/' + nRes.status);

    const rows    = await dRes.json();
    const niches  = await nRes.json();
    const byslug  = Object.fromEntries(niches.map(n => [n.slug, n]));

    /* ---- by niche, ranked by how many people asked ---------------------- */
    const agg = {};
    rows.forEach(r => {
      const a = agg[r.niche_slug] || (agg[r.niche_slug] = {
        niche_slug: r.niche_slug, total: 0, cities: new Set(), latest: null
      });
      a.total++;
      a.cities.add(r.city_norm);
      if (!a.latest || r.created_at > a.latest) a.latest = r.created_at;
    });

    const byNiche = niches
      .map(n => {
        const a = agg[n.slug];
        return {
          slug: n.slug, name: n.name, catalog_no: n.catalog_no,
          family: n.family, status: n.status, is_listed: n.is_listed,
          total: a ? a.total : 0,
          cities: a ? a.cities.size : 0,
          latest: a ? a.latest : null
        };
      })
      .sort((x, y) => y.total - x.total || x.name.localeCompare(y.name));

    /* ---- by city within niche ------------------------------------------- */
    const cityAgg = {};
    rows.forEach(r => {
      const k = r.niche_slug + '|' + r.city_norm;
      const c = cityAgg[k] || (cityAgg[k] = {
        niche_slug: r.niche_slug,
        niche_name: (byslug[r.niche_slug] || {}).name || r.niche_slug,
        city_label: r.city_label, state_code: r.state_code, total: 0
      });
      c.total++;
    });
    const byCity = Object.values(cityAgg)
      .sort((x, y) => y.total - x.total || x.niche_name.localeCompare(y.niche_name));

    return res.status(200).json({
      ok: true,
      generated_at: new Date().toISOString(),
      totals: {
        rows: rows.length,
        niches_with_demand: Object.keys(agg).length,
        cities: new Set(rows.map(r => r.niche_slug + '|' + r.city_norm)).size
      },
      byNiche,
      byCity,
      rows   // full rows, for the CSV export
    });
  } catch (e) {
    /* The status codes live only here. Without this line a 502 is
       indistinguishable from any other failure in the log. */
    console.error('[owner] read failed:', e.message);
    return res.status(502).json({ ok: false, error: 'read_failed',
      message: 'Could not read the registry. Nothing was changed.' });
  }
};

function safeParse(s) { try { return JSON.parse(s); } catch (e) { return {}; } }

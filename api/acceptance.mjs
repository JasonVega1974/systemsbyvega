/* ============================================================================
   GET /api/acceptance
   ----------------------------------------------------------------------------
   Returns the terms a buyer ticks in the claim modal:

     { "ok": true, "version": "v1-2026-08-27", "text": "I am buying a …" }

   ── WHY THIS IS AN ENDPOINT AND NOT A STRING IN THE PAGE ───────────────────
   ACCEPTANCE_TEXTS lives in api/_shared.mjs, which is server-side ESM the
   browser cannot import. The obvious shortcut is to paste the text into the
   modal markup — and that is exactly how it goes wrong.

   /api/create-checkout rejects any acceptance_version it does not recognise,
   and the webhook stores a SHA-256 of the text that was agreed to. A copy in
   the page drifts the first time the wording is edited in one place and not
   the other, and the failure surfaces at the worst possible moment: the buyer
   has filled in every field, ticked the box, and checkout refuses them with
   'stale_acceptance'.

   One source, fetched at modal-open. If this endpoint is unreachable the modal
   refuses to enable the claim button rather than showing terms it cannot
   prove — an unverifiable agreement is worse than a delayed one.

   Public and cacheable: it is the same text for everyone, and it is published
   on the page anyway. No auth, nothing user-specific, no rate limit.
   ========================================================================= */

import {
  json, preflight,
  ACCEPTANCE_TEXTS, CURRENT_ACCEPTANCE_VERSION, SUPPORT_EMAIL,
} from './_shared.mjs';

export const config = { runtime: 'nodejs' };

export default { fetch: handler };

async function handler(request) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'GET') {
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }

  const version = CURRENT_ACCEPTANCE_VERSION;
  const text = ACCEPTANCE_TEXTS[version];

  /* A version with no text is a deploy mistake, not a buyer problem. Fail
     loudly in the log and refuse rather than serving an empty agreement — a
     ticked box against blank terms is worth nothing. */
  if (!text) {
    console.error('acceptance: CURRENT_ACCEPTANCE_VERSION has no text:', version);
    return json({
      ok: false, error: 'not_configured',
      message: `We cannot show the terms right now. Email ${SUPPORT_EMAIL}.`,
    }, 503);
  }

  /* Five minutes. Long enough that a browse-and-buy session makes one request,
     short enough that a wording change reaches buyers the same afternoon
     rather than whenever a CDN feels like it. */
  return json({ ok: true, version, text }, 200, {
    'Cache-Control': 'public, max-age=300',
  });
}

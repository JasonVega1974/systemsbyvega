/* Where the buyer's email comes from after a Stripe-first purchase. Three
   sources because Stripe populates them differently depending on whether the
   session collected an address, and because create-checkout also stamps it
   into metadata as a belt-and-braces copy. First valid one wins.

   This is identity, not decoration. Nobody is signed in when the card is
   charged, so the address resolved here is the only thing that says WHO the
   operator is — the webhook finds or creates their auth account against it.
   Hence normaliseBuyerEmail rather than a truthiness check: an address that
   would fail the CHECK on sbv_tenants.operator_email is not an identity, it is
   a support case, and the caller has to be able to tell the difference. */
import { normaliseBuyerEmail } from './_checkout-lib.mjs';

export function buyerEmailFromSession(session) {
  const s = session || {};
  const candidates = [
    s.customer_details && s.customer_details.email,
    s.customer_email,
    s.metadata && s.metadata.operator_email
  ];
  for (const c of candidates) {
    const e = normaliseBuyerEmail(c);
    if (e) return e;
  }
  return null;
}

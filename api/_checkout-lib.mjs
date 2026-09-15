/* Buyer email handling, split out so it is testable without Stripe or Supabase.
   The regex mirrors the CHECK on sbv_tenants.operator_email exactly; if one
   changes the other must too, or a value passes the API and fails the insert. */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

export function normaliseBuyerEmail(raw) {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  if (!v || v.length > 254) return null;
  return EMAIL_RE.test(v) ? v : null;
}

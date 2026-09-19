// ═══════════════════════════════════════════════════════════════════════════
// api/_shared.js — helpers used by every CCST server endpoint.
//
// Files under /api whose name starts with "_" are not routed by Vercel, so
// this is importable but never reachable as a URL.
//
// EVERYTHING HERE RUNS WITH THE SERVICE ROLE — auth.admin.* (inviteUserByEmail,
// createUser, updateUserById) only exists on that key. The caller's identity
// ALWAYS comes from their own JWT (verified via admin.auth.getUser), never from
// the request body, so a request can only ever act as the account that sent
// it — the request body can claim to be anyone, the verified token cannot.
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';

// ── ENVIRONMENT ─────────────────────────────────────────────────────────────
// Same anon-facing values already hardcoded in index.html — public by design,
// RLS is the boundary. Only the service role key is a real secret, and it
// exists only as a Vercel env var, never in this repo.
// Migrated 2026-09-19 from the old shared project (newjbexmvltvtmxollca) to
// a new project dedicated solely to this app — see OPEN-ITEMS.md.
export const SUPABASE_URL = 'https://oroollaijzvdduuvfmsr.supabase.co';
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// The ONE place the app's own production URL is defined for server code —
// mirrors the client-side hardcoded emailRedirectTo in index.html. Every
// invite/reset link must land here, never at the shared project's Site URL
// (systemsbyvega.com) — that mix-up is what sent an earlier invite to the
// wrong place. See CCST-AUTH.sql / the admin-invite UI comment for the
// matching client-side value.
export const APP_URL = 'https://celebration-safety-team.systemsbyvega.com';

export function adminClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured in this deployment\'s environment variables');
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── HTTP ────────────────────────────────────────────────────────────────────
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': APP_URL,
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export function preflight() {
  return new Response('ok', { headers: CORS_HEADERS });
}

// ── IDENTITY ────────────────────────────────────────────────────────────────
// Resolves the bearer token to a real, currently-valid Supabase user via the
// Auth admin API. Returns { user } or { fail: Response }.
export async function userFromRequest(admin, request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { fail: json({ ok: false, error: 'missing_token' }, 401) };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return { fail: json({ ok: false, error: 'invalid_session' }, 401) };
  return { user: data.user };
}

// Admin-gated endpoints check cc_profiles.role directly with the service
// role (bypasses RLS, which is fine — this IS the trusted server side) rather
// than trusting any "adminOn" flag the client might send. A client-supplied
// admin flag is just a request body value; this is a real row read.
export async function requireAdmin(admin, user) {
  const { data, error } = await admin.from('cc_profiles').select('role').eq('id', user.id).maybeSingle();
  if (error || !data || data.role !== 'admin') {
    return { fail: json({ ok: false, error: 'admin_required' }, 403) };
  }
  return { ok: true };
}

// Readable, hard-to-mistype temporary password: 12 characters drawn from an
// alphabet with ambiguous characters (0/O, 1/l/I) removed, since an admin
// reads this off a screen and relays it by phone or text.
const TEMP_PW_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
export function generateTempPassword(length = 12) {
  let out = '';
  for (let i = 0; i < length; i++) out += TEMP_PW_ALPHABET[randomInt(TEMP_PW_ALPHABET.length)];
  return out;
}

// Pulled out of the 'invite' branch in auth-admin.js so the exact check that
// closes the wrong-redirect bug can be unit tested against fake
// generateLink() responses, without a live Supabase project. Two different
// link types (inviteUserByEmail's own mailer, then generateLink({type:
// 'invite'})) both turned out to embed the shared project's Site URL
// (systemsbyvega.com) instead of the expected redirect — this is the guard
// that would catch either of those regressions, or any future one, rather
// than trusting a generated link on faith. Used with type:'magiclink' now,
// the one link type that has actually been confirmed to honor redirectTo.
// Returns { link } or { fail: <error message> } — never throws.
export function resolveInviteLink(generateLinkResult, expectedRedirect) {
  const { data, error } = generateLinkResult;
  if (error) return { fail: error.message };
  const props = data && data.properties;
  if (!props || !props.action_link) return { fail: 'No invite link was generated.' };
  if (props.redirect_to && props.redirect_to !== expectedRedirect) {
    return { fail: 'The generated link did not point at the app. Nothing was sent — try again or check Supabase Auth settings.' };
  }
  return { link: props.action_link };
}

/* A magic link only authenticates a user that already exists, so inviting a
   brand-new email needs createUser() first — but re-inviting someone who
   already has an account is the normal case too (they lost the link, it
   expired), and createUser() rejecting an existing email is expected there,
   not a real failure. Mirrors the code+message dual-check already used for
   this exact kind of GoTrue error-shape uncertainty elsewhere in this app
   (see isOtpDisabled() in index.html) — the precise code/message text for
   "already registered" isn't nailed down across every GoTrue version, so
   this checks both rather than trusting one. */
export function isAlreadyRegistered(error) {
  if (!error) return false;
  if (error.code === 'email_exists') return true;
  const msg = String(error.message || '').toLowerCase();
  return msg.includes('already registered') || msg.includes('already exists') || msg.includes('already been registered');
}

#!/usr/bin/env node
/* tools/brevo-diag.mjs — why is Brevo returning 401?
 * ---------------------------------------------------------------------------
 *   node tools/brevo-diag.mjs <env-file>
 *   node tools/brevo-diag.mjs --key xkeysib-...        bypass the file
 *   node tools/brevo-diag.mjs <env-file> --send you@example.com
 *
 * ZERO DEPENDENCIES. The only import is node:fs. HTTP goes through the global
 * fetch built into Node 18+, so there is nothing to install and no node:https
 * plumbing to get wrong.
 *
 * WHY THE BYTE DUMP EXISTS. A regenerated key that still 401s is usually not a
 * key problem — it is a string problem. A non-breaking space or a zero-width
 * character pasted from a document is invisible in every editor and survives
 * generating a new key, because the new key gets pasted the same way. The raw
 * line looks perfect; only the character codes show it.
 *
 * Prints the key masked. Character codes are shown for the first and last 8
 * bytes only — enough to catch an invisible character, not enough to
 * reconstruct the key. Safe to paste into a chat or an issue.
 */
import fs from 'node:fs';

const RED = '\x1b[31m', GRN = '\x1b[32m', YEL = '\x1b[33m', OFF = '\x1b[0m';
const SENDER = 'info@kingdom-creatives.com';

const argv = process.argv.slice(2);
const arg = (name) => { const i = argv.indexOf(name); return i > -1 ? argv[i + 1] : null; };
const sendTo = arg('--send');
const directKey = arg('--key');
const envFile = argv.find((a) => !a.startsWith('--') && a !== sendTo && a !== directKey);

if (!directKey && !envFile) {
  console.error('usage: node tools/brevo-diag.mjs <env-file> [--send you@example.com]');
  console.error('   or: node tools/brevo-diag.mjs --key xkeysib-...');
  process.exit(2);
}

/* ---- 1. the file, if we are reading one -------------------------------- */
let KEY = directKey;
let source = 'command line';

if (!KEY) {
  source = envFile;
  if (!fs.existsSync(envFile)) {
    console.error(RED + 'env file not found: ' + envFile + OFF);
    process.exit(2);
  }
  /* Raw bytes, and deliberately NOT the parser the endpoints use. If that
     parser is the bug, one sharing its assumptions cannot find it. */
  const raw = fs.readFileSync(envFile);
  console.log('\n=== the file ===');
  console.log('  path          ' + envFile);
  console.log('  bytes         ' + raw.length);
  console.log('  BOM           ' + (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF
    ? RED + 'YES — UTF-8 BOM, which becomes part of the first key read' + OFF : 'no'));
  const text = raw.toString('utf8');
  console.log('  line endings  ' + (text.includes('\r\n') ? 'CRLF' : 'LF'));

  const hits = text.split(/\r?\n/).filter((l) => l.trim().startsWith('BREVO_API_KEY'));
  if (!hits.length) {
    console.error('\n  ' + RED + 'no BREVO_API_KEY line in this file' + OFF);
    process.exit(1);
  }
  if (hits.length > 1) {
    console.log('  ' + RED + 'WARNING: ' + hits.length + ' BREVO_API_KEY lines. Most parsers keep the LAST.' + OFF);
    hits.forEach((l, i) => console.log('    [' + i + '] ' + JSON.stringify(l.slice(0, 40) + '…')));
  }
  const line = hits[hits.length - 1];
  console.log('  raw line      ' + JSON.stringify(line.slice(0, 30) + '…' + line.slice(-8)));
  KEY = line.slice(line.indexOf('=') + 1);
}

/* ---- 2. the key, byte by byte ------------------------------------------ */
console.log('\n=== the key, as read from ' + source + ' ===');
const codes = (s) => Array.from(s).map((c) => c.charCodeAt(0)).join(' ');
console.log('  length (raw)  ' + KEY.length);
console.log('  first 8 codes ' + codes(KEY.slice(0, 8)));
console.log('  last 8 codes  ' + codes(KEY.slice(-8)));

const NAMES = {
  9: 'tab', 10: 'newline', 13: 'carriage return — CRLF leaked into the value',
  32: 'space', 160: 'NON-BREAKING SPACE — pasted from a document',
  8203: 'ZERO-WIDTH SPACE — pasted from a web page',
  8216: 'smart quote', 8217: 'smart quote', 8220: 'smart quote', 8221: 'smart quote',
  65279: 'BOM / zero-width no-break space',
};
const odd = Array.from(KEY)
  .map((c, i) => ({ i, code: c.charCodeAt(0) }))
  .filter((x) => x.code < 33 || x.code > 126);

if (odd.length) {
  console.log('  ' + RED + 'NON-PRINTABLE OR NON-ASCII CHARACTERS:' + OFF);
  for (const x of odd) {
    console.log('    position ' + x.i + '  code ' + x.code + '  (' + (NAMES[x.code] || 'unexpected') + ')');
  }
  console.log('  ' + RED + 'This is almost certainly the cause. Retype the key by hand' + OFF);
  console.log('  ' + RED + 'rather than pasting, then run this again.' + OFF);
} else {
  console.log('  charset       all printable ASCII');
}

const CLEAN = KEY.trim().replace(/^["']|["']$/g, '');
if (CLEAN !== KEY) {
  console.log('  ' + YEL + 'after trim/unquote: ' + CLEAN.length + ' chars (was ' + KEY.length + ')' + OFF);
}
console.log('  masked        ' + CLEAN.slice(0, 12) + '…' + CLEAN.slice(-4));
console.log('  prefix        ' + (
  CLEAN.startsWith('xkeysib-') ? GRN + 'xkeysib- (v3 API key — correct)' + OFF
  : CLEAN.startsWith('xsmtpsib-') ? RED + 'xsmtpsib- (SMTP key — 401s against the v3 REST API)' + OFF
  : RED + 'unrecognised: "' + CLEAN.slice(0, 10) + '"' + OFF));

/* A real v3 key is ~80-90 chars. Short means truncated on copy — Brevo shows
   it once, in a box that scrolls, and a double-click grabs only what is
   visible. */
if (CLEAN.startsWith('xkeysib-') && CLEAN.length < 70) {
  console.log('  ' + RED + 'LENGTH LOOKS SHORT.' + OFF + ' A v3 key is normally 80-90 characters.');
  console.log('  ' + RED + 'Brevo reveals it once in a scrolling box — select all of it,' + OFF);
  console.log('  ' + RED + 'not just the visible part.' + OFF);
}

/* ---- 3. the request, with nothing hidden ------------------------------- */
/* /v3/account returns the SMTP relay credentials and the marketing-automation
   key alongside the harmless fields. This output gets pasted into chats and
   issues, so those are masked. The 401 diagnosis needs none of them. */
const SECRET_KEYS = ['key', 'userName', 'password', 'apiKey', 'token'];
function redact(body) {
  let o;
  try { o = JSON.parse(body); } catch { return body; }
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        out[k] = SECRET_KEYS.includes(k) && typeof val === 'string'
          ? val.slice(0, 4) + '…[redacted]'
          : walk(val);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(walk(o));
}

async function probe(label, path, headerName) {
  console.log('\n=== ' + label + ' ===');
  console.log('  GET https://api.brevo.com/v3/' + path);
  console.log('  ' + headerName + ': ' + CLEAN.slice(0, 12) + '…');
  let res;
  try {
    res = await fetch('https://api.brevo.com/v3/' + path, {
      headers: { [headerName]: CLEAN, Accept: 'application/json' },
    });
  } catch (e) {
    console.log('  ' + RED + 'network error: ' + e.message + OFF);
    return null;
  }
  console.log('  status  ' + (res.ok ? GRN : RED) + res.status + OFF + ' ' + res.statusText);
  console.log('  --- response headers ---');
  res.headers.forEach((v, k) => console.log('    ' + k + ': ' + v));
  const body = await res.text();
  console.log('  --- response body ---');
  console.log('    ' + (redact(body) || '(empty)'));
  return { status: res.status, body };
}

const acct = await probe('account', 'account', 'api-key');

if (acct && acct.status === 401) {
  console.log('\n=== what this error means ===');
  if (/Key not found/i.test(acct.body)) {
    console.log('  "Key not found" = this exact string is not a key in ANY Brevo account.');
    console.log('  Not wrong-permissions, not wrong-account — not recognised at all.');
    console.log('');
    console.log('  With a freshly generated key, that leaves:');
    console.log('    1. Copied incompletely (see the length note above)');
    console.log('    2. An invisible character in the value (see the byte dump above)');
    console.log('    3. Created inside a Brevo SUB-ACCOUNT — those are not valid');
    console.log('       against the parent account API');
    console.log('    4. Revoked immediately after creation');
    console.log('');
    console.log('  Next: run with --key and paste the key straight from Brevo.');
    console.log('  If that returns 200, the key is fine and the file is the problem.');
  } else {
    console.log('  Unexpected 401 body — the block above is what to share.');
  }
  process.exit(1);
}

if (!acct || acct.status !== 200) process.exit(1);

let parsed = {};
try { parsed = JSON.parse(acct.body); } catch { /* shown raw above */ }
console.log('\n  ' + GRN + 'the key is valid' + OFF);
console.log('  account       ' + (parsed.companyName || '(no company name)'));
console.log('  login email   ' + (parsed.email || '(none)'));

/* ---- 4. the sender ------------------------------------------------------ */
const senders = await probe('senders', 'senders', 'api-key');
if (senders && senders.status === 200) {
  let list = [];
  try { list = (JSON.parse(senders.body).senders) || []; } catch { /* raw above */ }
  const found = list.find((s) => s.email === SENDER);
  console.log('\n=== sender check: ' + SENDER + ' ===');
  if (!found) {
    console.log('  ' + RED + 'NOT PRESENT in this account.' + OFF);
    console.log('  Every send in this codebase uses it as From and Reply-To, so a valid');
    console.log('  key alone is not enough. Brevo -> Senders -> Add a sender.');
  } else if (found.active === false) {
    console.log('  ' + RED + 'present but INACTIVE' + OFF + ' — verification was never completed.');
  } else {
    console.log('  ' + GRN + 'present and active' + OFF);
  }
}

/* ---- 5. optional live send --------------------------------------------- */
if (sendTo) {
  console.log('\n=== live send to ' + sendTo + ' ===');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': CLEAN, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Systems by Vega', email: SENDER },
      replyTo: { email: SENDER },
      to: [{ email: sendTo }],
      subject: '[SBV] Brevo diagnostic',
      textContent: 'If this arrived, the key and the sender are both working.',
      htmlContent: '<p>If this arrived, the key and the sender are both working.</p>',
    }),
  });
  const body = await res.text();
  console.log('  status  ' + (res.ok ? GRN : RED) + res.status + OFF);
  console.log('  body    ' + body);
  if (res.ok) console.log('  ' + GRN + 'accepted — check the inbox and Brevo -> Transactional -> Logs' + OFF);
}
console.log('');

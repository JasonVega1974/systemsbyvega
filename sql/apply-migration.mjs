#!/usr/bin/env node
/* Applies a SQL migration file to the Celebration Safety Team's Supabase
   project via the Management API — never the Supabase CLI's `db push`. That
   tool diffs a local migrations folder against a `supabase_migrations.
   schema_migrations` tracking table on the remote; every migration this
   project has ever had was hand-pasted through the SQL editor, so that
   tracking table has never existed against a database that already carries
   the whole systemsbyvega/ESB/GSB schema. Asking the CLI to reconcile that
   is a real, documented source of drift errors on a shared project — see
   the report this script's design came out of. The Management API's raw
   query endpoint has no opinion about schema history and does no diffing;
   it runs exactly the SQL text in the request and nothing else, which is
   the actual safety property here.

   Usage:
     SUPABASE_ACCESS_TOKEN=sbp_... node sql/apply-migration.mjs sql/FILE.sql
     SUPABASE_ACCESS_TOKEN=sbp_... node sql/apply-migration.mjs sql/FILE.sql --read-only
     SUPABASE_ACCESS_TOKEN=sbp_... node sql/apply-migration.mjs sql/FILE.sql --project <ref>

   --project (or SUPABASE_PROJECT_REF) targets a different project than the
   default below — e.g. during the one-time move to a new dedicated
   project. Access tokens are account-scoped, not project-scoped, so the
   same token works for any project this account can reach; only the
   project ref in the API path changes. Defaults to this app's own project
   so every existing call site and habit keeps working unchanged.

   Safety net (in addition to the human review every migration file already
   gets before this script ever sees it): refuses to run if the SQL
   references any public-schema object that isn't cc_-prefixed. This is a
   backstop, not the primary control — the primary control is that every
   migration in this repo is written by hand to only ever touch cc_*. */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const DEFAULT_PROJECT_REF = 'newjbexmvltvtmxollca';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const file = process.argv[2];
const readOnly = process.argv.includes('--read-only');
const projectFlagIx = process.argv.indexOf('--project');
const PROJECT_REF = projectFlagIx !== -1 ? process.argv[projectFlagIx + 1]
  : (process.env.SUPABASE_PROJECT_REF || DEFAULT_PROJECT_REF);

if (!token) {
  console.error('Set SUPABASE_ACCESS_TOKEN first (Supabase dashboard -> Account -> Access Tokens).');
  process.exit(1);
}
if (!file) {
  console.error('Usage: node sql/apply-migration.mjs <path-to.sql> [--read-only] [--project <ref>]');
  process.exit(1);
}

const sql = readFileSync(file, 'utf8');

/* Every public.<identifier> the file references must start with cc_. This
   catches CREATE/ALTER/DROP TABLE, CREATE POLICY ... ON public.x, function
   definitions, grants — anything written as `public.something`, which is
   how every statement in this project's migrations names its targets. */
const refs = new Set([...sql.matchAll(/\bpublic\.(\w+)/gi)].map(m => m[1].toLowerCase()));
const offenders = [...refs].filter(name => !name.startsWith('cc_'));
if (offenders.length) {
  console.error('REFUSING TO RUN — non-cc_-prefixed public schema object(s) referenced:');
  offenders.forEach(o => console.error('  public.' + o));
  console.error('This project shares a Supabase instance with systemsbyvega/ESB/GSB; only cc_* is this app\'s to touch.');
  process.exit(1);
}

const filename = basename(file);
const ledgerSql = `create table if not exists public.cc_schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);`;
const registerSql = readOnly ? '' :
  `\ninsert into public.cc_schema_migrations (filename) values ('${filename.replace(/'/g, "''")}') on conflict (filename) do nothing;`;

const fullQuery = readOnly ? sql : `${ledgerSql}\n${sql}\n${registerSql}`;

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: fullQuery, read_only: readOnly })
});

const body = await res.text();
if (!res.ok) {
  console.error(`FAILED (HTTP ${res.status}):`);
  console.error(body);
  process.exit(1);
}

console.log(`OK — ${filename}${readOnly ? ' (read-only)' : ', registered in cc_schema_migrations'}`);
if (body && body !== '{}') console.log(body);

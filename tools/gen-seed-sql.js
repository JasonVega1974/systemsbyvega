#!/usr/bin/env node
/* ============================================================================
   gen-seed-sql.js — write sql/SEED.sql from assets/data/niches.seed.json
   ----------------------------------------------------------------------------
   The catalog exists in two places: the page renders from the JSON seed, and
   the database serves the live rows. They must not drift, so the SQL is
   GENERATED from the JSON rather than typed alongside it.

   Run:  node tools/gen-seed-sql.js
   ========================================================================= */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'assets', 'data', 'niches.seed.json');
const OUT  = path.join(ROOT, 'sql', 'SEED.sql');

const q = v => (v == null || v === '') ? 'null' : "'" + String(v).replace(/'/g, "''") + "'";
const b = v => (v ? 'true' : 'false');

const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));

const rows = seed.niches.map(n =>
  '  (' + [
    q(n.slug), q(n.catalog_no), q(n.name), q(n.family), q(n.job_line), q(n.caveat),
    q(n.status) + '::public.sbv_niche_status',
    q(n.open_url), q(n.price_label), q(n.demo_path),
    b(n.website_offer), String(n.sort)
  ].join(', ') + ')'
).join(',\n');

const sql = `-- ============================================================================
-- SYSTEMS BY VEGA — catalog seed
-- GENERATED FILE. Do not edit by hand.
--   source: assets/data/niches.seed.json
--   regenerate: node tools/gen-seed-sql.js
--
-- Idempotent: re-running updates existing rows in place and leaves any niche
-- that has since been flipped to open with its URL and price intact only if
-- the seed says so — the seed is authoritative for every column listed here.
-- ============================================================================

insert into public.sbv_niches
  (slug, catalog_no, name, family, job_line, caveat, status, open_url, price_label, demo_path, website_offer, sort)
values
${rows}
on conflict (slug) do update set
  catalog_no    = excluded.catalog_no,
  name          = excluded.name,
  family        = excluded.family,
  job_line      = excluded.job_line,
  caveat        = excluded.caveat,
  status        = excluded.status,
  open_url      = excluded.open_url,
  price_label   = excluded.price_label,
  demo_path     = excluded.demo_path,
  website_offer = excluded.website_offer,
  sort          = excluded.sort;

-- Expected after this runs: ${seed.niches.length} rows,
--   ${seed.niches.filter(n => n.status === 'open').length} open,
--   ${seed.niches.filter(n => n.status === 'in_line').length} in line,
--   ${seed.niches.filter(n => n.status === 'website_only').length} website-only.
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, sql);
console.log('wrote sql/SEED.sql — ' + seed.niches.length + ' rows');

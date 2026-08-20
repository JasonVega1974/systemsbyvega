#!/usr/bin/env bash
# ============================================================================
# SYSTEMS BY VEGA — behavioural verification over HTTP, as an anonymous visitor
# ----------------------------------------------------------------------------
# sql/VERIFY.sql asserts what the catalog SAYS. This asserts what the endpoint
# DOES. They are not the same claim: a correct policy behind a misconfigured
# PostgREST, or a view that quietly exposes a column, both pass a structural
# check and fail here.
#
# Uses the PUBLISHABLE key only — exactly what a stranger with view-source has.
# Nothing in this script needs or uses a privileged credential.
#
# Run: bash sql/verify-rest.sh
# ============================================================================
set -uo pipefail

URL="https://newjbexmvltvtmxollca.supabase.co"
KEY="sb_publishable_ZNgmFmfr7AHbZSEibo7jqQ_z8-Oazhy"
H=(-H "apikey: $KEY" -H "Authorization: Bearer $KEY")

pass=0; fail=0
ok()   { printf "  PASS  %s\n" "$1"; pass=$((pass+1)); }
no()   { printf "  FAIL  %s\n     -> %s\n" "$1" "${2:-}"; fail=$((fail+1)); }

check_code() { # name expected_regex actual
  if [[ "$3" =~ $2 ]]; then ok "$1"; else no "$1" "got HTTP $3"; fi
}

echo "== reads a visitor is allowed =="

code=$(curl -s -o /tmp/sbv_n.json -w '%{http_code}' "${H[@]}" "$URL/rest/v1/sbv_niches?select=slug,status&limit=100")
check_code "GET sbv_niches is allowed" '^200$' "$code"
n=$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync("/tmp/sbv_n.json","utf8")).length)}catch(e){console.log(-1)}')
[ "$n" = "29" ] && ok "sbv_niches returns 29 rows" || no "sbv_niches returns 29 rows" "got $n"

code=$(curl -s -o /tmp/sbv_c.json -w '%{http_code}' "${H[@]}" "$URL/rest/v1/rpc/sbv_demand_counts")
check_code "GET rpc/sbv_demand_counts is allowed" '^200$' "$code"
if grep -qi 'email' /tmp/sbv_c.json; then no "counts payload contains no email" "'email' found in body"; else ok "counts payload contains no email"; fi

echo
echo "== reads a visitor must NOT be allowed =="

code=$(curl -s -o /tmp/sbv_d.json -w '%{http_code}' "${H[@]}" "$URL/rest/v1/sbv_demand?select=email")
if [[ "$code" =~ ^(401|403|404)$ ]]; then ok "GET sbv_demand is refused (HTTP $code)"; else no "GET sbv_demand is refused" "got HTTP $code"; fi
if grep -qE '"email"[[:space:]]*:' /tmp/sbv_d.json 2>/dev/null; then no "no email address came back" "body contained an email field"; else ok "no email address came back"; fi

# The registry must not be enumerable by any obvious alternate route.
for path in "sbv_demand?select=*" "sbv_demand?select=count" "sbv_demand?select=city_label"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "${H[@]}" "$URL/rest/v1/$path")
  if [[ "$code" =~ ^(401|403|404)$ ]]; then ok "GET $path refused (HTTP $code)"; else no "GET $path refused" "got HTTP $code"; fi
done

code=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "${H[@]}" -H 'Content-Type: application/json' \
  -d '{"name":"hacked"}' "$URL/rest/v1/sbv_niches?slug=eq.estate-sales")
if [[ "$code" =~ ^(401|403|404|405)$ ]]; then ok "PATCH sbv_niches refused (HTTP $code)"; else no "PATCH sbv_niches refused" "got HTTP $code"; fi

echo
echo "== the write a visitor IS allowed =="

STAMP="verify-$(date +%s)"
ins() { # email city -> http code
  curl -s -o /tmp/sbv_i.json -w '%{http_code}' -X POST "${H[@]}" \
    -H 'Content-Type: application/json' -H 'Prefer: return=minimal' \
    -d "{\"niche_slug\":\"junk-removal\",\"email\":\"$1\",\"city_label\":\"$2\",\"state_code\":\"ID\",\"source\":\"$STAMP\"}" \
    "$URL/rest/v1/sbv_demand"
}

code=$(ins "$STAMP-1@example.com" "Verifyville, ID")
check_code "POST sbv_demand is allowed" '^201$' "$code"

code=$(ins "$STAMP-1@example.com" "Verifyville, ID")
check_code "duplicate insert is refused (409)" '^409$' "$code"

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${H[@]}" \
  -H 'Content-Type: application/json' \
  -d "{\"niche_slug\":\"junk-removal\",\"email\":\"not-an-email\",\"city_label\":\"Verifyville, ID\",\"source\":\"$STAMP\"}" \
  "$URL/rest/v1/sbv_demand")
if [[ "$code" =~ ^4 ]]; then ok "malformed email is rejected (HTTP $code)"; else no "malformed email is rejected" "got HTTP $code"; fi

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${H[@]}" \
  -H 'Content-Type: application/json' \
  -d "{\"niche_slug\":\"no-such-niche\",\"email\":\"$STAMP-x@example.com\",\"city_label\":\"Verifyville, ID\",\"source\":\"$STAMP\"}" \
  "$URL/rest/v1/sbv_demand")
if [[ "$code" =~ ^4 ]]; then ok "unknown niche_slug is rejected (HTTP $code)"; else no "unknown niche_slug is rejected" "got HTTP $code"; fi

echo
echo "== the count floor, tested at the boundary =="
# Three rows must show nothing; the fourth must make it appear. This is
# asserted against real rows because the bug worth catching is an off-by-one,
# not a typo in the view.
waiting_for() {
  curl -s "${H[@]}" "$URL/rest/v1/rpc/sbv_demand_counts?niche_slug=eq.junk-removal&select=waiting" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const r=JSON.parse(s);console.log(r[0]&&r[0].waiting===null?"null":String(r[0]?r[0].waiting:"?"))}catch(e){console.log("?")}})'
}

ins "$STAMP-2@example.com" "Verifyville, ID" >/dev/null
ins "$STAMP-3@example.com" "Verifyville, ID" >/dev/null
w=$(waiting_for)
[ "$w" = "null" ] && ok "at 3 rows, waiting is hidden (null)" || no "at 3 rows, waiting is hidden" "got $w"

ins "$STAMP-4@example.com" "Verifyville, ID" >/dev/null
w=$(waiting_for)
[ "$w" = "4" ] && ok "at 4 rows, waiting appears as 4" || no "at 4 rows, waiting appears as 4" "got $w"

echo
echo "== city normalisation =="
# Same town, spelled differently, must collapse to one city_norm — otherwise
# the per-city report splits a town across several lines.
ins "$STAMP-5@example.com" "  verifyville , ID " >/dev/null
c=$(curl -s "${H[@]}" "$URL/rest/v1/rpc/sbv_demand_city_counts?niche_slug=eq.junk-removal&select=city_norm" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).length)}catch(e){console.log("?")}})')
[ "$c" = "1" ] && ok "spelling variants collapse to one city" || no "spelling variants collapse to one city" "got $c distinct cities"

echo
printf "  %d passed, %d failed\n" "$pass" "$fail"
echo "  clean up test rows with:  delete from public.sbv_demand where source like 'verify-%';"
[ "$fail" -eq 0 ]

"""Extract the inline <script> from the single-file app and syntax-check it with node.
Also sanity-checks that key structures survived the last patch."""
import io, re, subprocess, sys, os

p = sys.argv[1]
s = io.open(p, encoding='utf-8').read()

m = re.search(r'<script>\n(.*)\n</script>', s, re.S)
if not m:
    print("FAIL: could not locate the inline <script> block")
    sys.exit(1)
js = m.group(1)

tmp = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_extracted.js')
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(js)

r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
if r.returncode != 0:
    print("JS SYNTAX ERROR:")
    print(r.stdout or '')
    print(r.stderr or '')
    sys.exit(1)
print("JS syntax OK (%d lines)" % js.count('\n'))

# Balance checks on the markup we care about
for tag in ('section', 'script', 'style'):
    o = len(re.findall(r'<%s[\s>]' % tag, s))
    c = len(re.findall(r'</%s>' % tag, s))
    flag = 'OK ' if o == c else 'MISMATCH'
    print("%s <%s>: %d open / %d close" % (flag, tag, o, c))

# Every onclick/onchange handler must name a function that actually exists
handlers = set(re.findall(r'on(?:click|change|input)="([A-Za-z_$][A-Za-z0-9_$]*)\(', s))
defined = set(re.findall(r'function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(', js))
builtin = {'document', 'window', 'event', 'this'}
missing = sorted(h for h in handlers if h not in defined and h not in builtin)
print("undefined inline handlers: %s" % (missing if missing else "none"))

# Every getElementById target referenced in JS should exist in the markup
ids_in_html = set(re.findall(r'\sid="([^"]+)"', s))
ids_in_js = set(re.findall(r"getElementById\('([^']+)'\)", js))
ghost = sorted(i for i in ids_in_js if i not in ids_in_html)
print("getElementById targets with no element: %s" % (ghost if ghost else "none"))

# Portfolio Hub — Development Plan

A single home for every project you've built and will build: Kingdom Creatives, YourLife CC, the Faith Journey, Estate Sale Biz, the Systems by Vega ops demo, and whatever comes next. Built to be **extensible** — adding a future project should take one minute, not a rebuild.

---

## 0. Decide this first (5 minutes, then never again)

One decision shapes everything else: **whose site is this, and what's its address?**

This hub sits *above* your individual brands (it links out to Kingdom Creatives, Systems by Vega, etc.), so it wants its own neutral identity rather than borrowing one of theirs. Recommended: a **personal-name domain** — `jasonvega.com`, `jasonvega.dev`, or `builtbyvega.com`. A personal umbrella can hold faith projects *and* commercial projects *and* experiments without the awkwardness of, say, a faith brand hosting an estate-sale business. It's the most flexible container.

Pick one address. Don't deliberate — same rule as before, any clean one works.

**Second micro-decision:** what story does the hub tell? Recommended framing: *"Jason Vega — I design and build production software and systems, solo."* That one sentence makes the whole grid make sense, and it doubles as credibility for Systems by Vega (a prospect who lands here sees you actually ship real things).

---

## 1. Stack (matches how you already work)

Keep it boringly simple and dependency-light — this is a static site, not an app:

- **Static HTML/CSS/vanilla JS.** No framework. You already work this way.
- **Data-driven**, not hand-coded cards. All projects live in one `projects.js` file as an array of objects. The page *renders itself* from that data. This is the whole trick to "build on it" — adding a project = adding one object.
- **Host on GitHub Pages** (or Netlify/Vercel — all fine; GitHub Pages is simplest given the repo lives there anyway).
- **Custom domain** via a `CNAME` file once it's live.

---

## 2. Repo structure

```
portfolio/                 (new GitHub repo)
├── index.html             (markup shell — header, empty grid container, footer)
├── assets/
│   ├── css/styles.css      (all styling)
│   ├── js/projects.js       (THE DATA — your project list)
│   ├── js/app.js            (renders cards + handles filtering)
│   └── img/                 (project thumbnails: yourlifecc.png, etc.)
├── favicon.ico
├── CNAME                   (your domain, added in Phase 5)
└── README.md
```

---

## 3. Content model (the part that makes it extensible)

Every project is one object in `assets/js/projects.js`. Define the schema once:

```js
const PROJECTS = [
  {
    id: "systemsbyvega",
    name: "Systems by Vega",
    tagline: "Operations systems for small businesses",
    description: "Process, databases, and dashboards that get a business off spreadsheets. Includes a live, interactive demo console.",
    url: "https://systemsbyvega.com",
    thumb: "assets/img/systemsbyvega.png",
    category: "Commercial",
    tags: ["Dashboards", "Databases", "Process"],
    status: "Live",
    featured: true
  },
  // ...one object per project
];
```

**Field guide:**
- `category` drives the filter tabs. Recommended set: `Faith & Family` · `Commercial` · `Tools & Experiments`.
- `status`: `Live` · `In progress` · `Demo` — renders as a small badge so visitors know what's shippable.
- `featured: true` → show it bigger / first.

---

## 4. Your starting project list (drop these in as objects)

| Project | Category | Status | Note |
|---|---|---|---|
| Systems by Vega | Commercial | Live/Demo | The ops console; your newest, lead with it |
| Kingdom Creatives | Faith & Family | Live | Parent studio; church digital services |
| YourLife CC | Faith & Family | Live | Faith & family PWA |
| YourLife CC — Faith Journey | Faith & Family | Live | Either its own card or a highlight under YourLife |
| Estate Sale Biz | Commercial | Live | estatesalebiz.com |
| Netlify experiment | Tools & Experiments | Experiment | The `darling-cucurucho` URL — **give it a real name + one-line purpose before it goes on a credibility page, or leave it off until it has one.** An unlabeled experiment can read as unfinished. |

---

## 5. Page sections (top to bottom)

1. **Header** — your name + one-line "what I do" + a contact link.
2. **Hero** — the thesis sentence ("I design and build production software, solo") + maybe a count ("6 projects shipped"). Keep it tight; the grid is the real content.
3. **Filter bar** — All / Faith & Family / Commercial / Tools (rendered from the categories present in the data).
4. **Project grid** — the cards, rendered from `projects.js`. Each card: thumbnail, name, tagline, status badge, tags, → links out to the live project in a new tab.
5. **About** — 2–3 sentences: who you are, the range you cover (process, databases, dashboards, web, faith tech), how to reach you.
6. **Footer** — contact (`info@kingdom-creatives.com`), a line tying it to Kingdom Creatives LLC if you want the parent visible.

---

## 6. Build phases (each = one shippable Claude Code task)

**Phase 0 — Pipeline first.** Create the repo, an `index.html` that just says the site name, enable GitHub Pages, confirm it's live at the `github.io` URL. *Goal: prove deploy works before building anything real.*

**Phase 1 — Data-driven grid (MVP).** Add `projects.js` with all your projects, `app.js` that renders cards from it into the grid, basic `styles.css`. Cards link out. *This is the usable site — ship it here even if it's plain.*

**Phase 2 — Design pass.** Hero, about, footer, real typography and layout. Make it look like the Systems by Vega demo's sibling (consistent visual identity across your brands is itself a credibility signal). Responsive + mobile.

**Phase 3 — Filtering & badges.** Category filter tabs, status badges, tag chips — all driven off the data, no hardcoding.

**Phase 4 — Visuals & sharing.** Capture a clean screenshot/thumbnail of each project (just screenshot each live site at a consistent size), add to `img/`. Add Open Graph / Twitter meta so the hub link previews nicely when you share it.

**Phase 5 — Go live on your domain.** Add `CNAME`, point your chosen domain's DNS at GitHub Pages, add simple analytics (Plausible or GoatCounter — lightweight) so you can see what gets clicked.

---

## 7. Adding a future project (the payoff)

Once it's built, every new project is:
1. Add one object to `PROJECTS` in `projects.js`.
2. Drop a thumbnail in `assets/img/`.
3. Commit + push.

That's it. The grid, filters, and counts all update themselves. That's what "build on it" should mean.

---

## 8. One honest line

A portfolio hub makes you look credible and gives you one link to point people to — both real and worth having. What it does *not* do on its own is bring those people to the link. So treat this as the thing that makes outreach *land harder*, not a substitute for it. Build it, then point it at someone.

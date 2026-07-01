/* ============================================================
   app.js — renders cards from PROJECTS and handles filtering.
   No framework, no build step. Pure DOM.
   ============================================================ */

(function () {
  "use strict";

  // Data lives in assets/data/projects.json (edited via the admin page).
  // Fallback to window.PROJECTS if a legacy inline list is present.
  const DATA_URL = "assets/data/projects.json";

  // ---- helpers -------------------------------------------------
  const $ = (sel, root) => (root || document).querySelector(sel);

  function statusClass(status) {
    return "badge badge--" + String(status || "")
      .toLowerCase()
      .replace(/[^a-z]+/g, "-");
  }

  function initials(name) {
    return name
      .replace(/[^A-Za-z0-9 ]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  // Order: featured first, then as authored.
  function sortProjects(list) {
    return list
      .map((p, i) => ({ p, i }))
      .sort((a, b) => {
        const fa = a.p.featured ? 0 : 1;
        const fb = b.p.featured ? 0 : 1;
        return fa - fb || a.i - b.i;
      })
      .map((x) => x.p);
  }

  // ---- card rendering -----------------------------------------
  function cardEl(p) {
    const card = document.createElement("a");
    card.className = "card" + (p.featured ? " card--featured" : "");
    card.href = p.url || "#";
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.setAttribute("data-category", p.category || "");

    // Thumb (with graceful fallback to initials tile)
    const thumb = document.createElement("div");
    thumb.className = "card__thumb";
    if (p.thumb) {
      const img = new Image();
      img.loading = "lazy";
      img.alt = p.name + " thumbnail";
      img.src = p.thumb;
      img.onerror = function () {
        thumb.classList.add("card__thumb--fallback");
        thumb.textContent = initials(p.name);
        img.remove();
      };
      thumb.appendChild(img);
    } else {
      thumb.classList.add("card__thumb--fallback");
      thumb.textContent = initials(p.name);
    }

    // Body
    const body = document.createElement("div");
    body.className = "card__body";

    const topRow = document.createElement("div");
    topRow.className = "card__toprow";

    const name = document.createElement("h3");
    name.className = "card__name";
    name.textContent = p.name;
    topRow.appendChild(name);

    if (p.status) {
      const badge = document.createElement("span");
      badge.className = statusClass(p.status);
      badge.textContent = p.status;
      topRow.appendChild(badge);
    }

    const tagline = document.createElement("p");
    tagline.className = "card__tagline";
    tagline.textContent = p.tagline || "";

    const desc = document.createElement("p");
    desc.className = "card__desc";
    desc.textContent = p.description || "";

    const tags = document.createElement("div");
    tags.className = "card__tags";
    (p.tags || []).forEach((t) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = t;
      tags.appendChild(chip);
    });

    const cta = document.createElement("span");
    cta.className = "card__cta";
    cta.innerHTML = "Visit <span aria-hidden=\"true\">&rarr;</span>";

    body.appendChild(topRow);
    body.appendChild(tagline);
    body.appendChild(desc);
    if ((p.tags || []).length) body.appendChild(tags);
    body.appendChild(cta);

    card.appendChild(thumb);
    card.appendChild(body);
    return card;
  }

  // ---- filtering ----------------------------------------------
  function uniqueCategories(list) {
    const seen = [];
    list.forEach((p) => {
      if (p.category && seen.indexOf(p.category) === -1) seen.push(p.category);
    });
    return seen;
  }

  function buildFilters(grid, list) {
    const bar = $("#filters");
    if (!bar) return;
    const cats = ["All"].concat(uniqueCategories(list));

    cats.forEach((cat, idx) => {
      const btn = document.createElement("button");
      btn.className = "filter" + (idx === 0 ? " filter--active" : "");
      btn.type = "button";
      btn.textContent = cat;
      btn.setAttribute("data-filter", cat);
      btn.addEventListener("click", function () {
        bar.querySelectorAll(".filter").forEach((b) =>
          b.classList.remove("filter--active")
        );
        btn.classList.add("filter--active");
        applyFilter(grid, cat);
      });
      bar.appendChild(btn);
    });
  }

  function applyFilter(grid, cat) {
    const cards = grid.querySelectorAll(".card");
    cards.forEach((c) => {
      const show = cat === "All" || c.getAttribute("data-category") === cat;
      c.classList.toggle("is-hidden", !show);
    });
  }

  // ---- counts --------------------------------------------------
  function setCount(list) {
    const el = $("#project-count");
    if (el) el.textContent = String(list.length);
  }

  function render(grid, projects) {
    const ordered = sortProjects(projects);
    setCount(ordered);
    buildFilters(grid, ordered);
    ordered.forEach((p) => grid.appendChild(cardEl(p)));
  }

  async function loadProjects() {
    if (Array.isArray(window.PROJECTS) && window.PROJECTS.length) {
      return window.PROJECTS.slice();
    }
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  // ---- init ----------------------------------------------------
  async function init() {
    const grid = $("#grid");
    if (!grid) return;

    const yearEl = $("#year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    try {
      const projects = await loadProjects();
      render(grid, projects);
    } catch (e) {
      grid.innerHTML =
        '<p style="color:var(--muted);grid-column:1/-1">Couldn’t load projects. ' +
        "If you’re viewing this as a local file, run a local server " +
        "(e.g. <code>python -m http.server</code>) so the data file can load.</p>";
      console.error("Failed to load projects:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

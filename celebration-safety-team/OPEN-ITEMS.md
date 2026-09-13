# OPEN ITEMS — Celebration Church Safety & Security Team

Everything the team must supply, decide, or verify before this platform goes live.
Nothing on this list may be invented, guessed, or filled in with a plausible
placeholder that reads as real. Where content is required but unverified, the app
renders a clearly labelled placeholder and the item is tracked here.

**Church:** Celebration Church · 2121 Caldwell Blvd, Nampa, ID 83651
**Services:** Sundays 8:00 AM · 9:45 AM · 11:30 AM
**Coverage rule:** minimum 3 team members per service, including 1 Team Lead

---

## 1. Documents to upload (Phase 2 builds the slots)

| Item | Status | Notes |
|---|---|---|
| Safety & Security Onboarding Manual (25 pages, PDF) | **NEEDED** | Onboarding step 1 is gated on reading it. Until it exists the checklist item stays labelled as a placeholder. |
| Full site schematic | **NEEDED** | Must show all entrances/exits, evacuation routes, assembly area, AED and fire-extinguisher positions, and team post positions. |
| Foyer diagram | **NEEDED** | Greeter posts, main entry doors, guest services. |
| Sanctuary diagram | **NEEDED** | Seating, stage, exits, team posts front/rear. |
| Children's auditorium diagram | **NEEDED** | Kids' rooms, exits, secure hallway coverage. |
| Children's check-in diagram | **NEEDED** | Check-in stations, secure pickup flow, tag verification point. |
| Leadership / staff headshots | **NEEDED** | One per directory card. Team members must recognise leadership on sight. |

## 2. Facility facts nobody has told us yet

- [ ] **Assembly area location.** Referenced by the Fire & Evacuation and Earthquake procedures, which currently say "to be marked on the site schematic". Needs a real location, far enough from the building to keep fire access clear.
- [ ] **AED positions** — how many, and where. Blocking the Medical Emergency procedure from naming a location.
- [ ] **Fire extinguisher positions.**
- [ ] **Accessible evacuation routes and areas of refuge** for people with mobility needs.
- [ ] **Severe-weather shelter locations** — which interior, lowest-level rooms/hallways away from windows.
- [ ] **Radio / communication channel decision.** The training says "know your communication method (radio/text thread)" without naming one. Decide: radios (which channel?) or a text thread, and document it.
- [ ] **Which exterior doors are monitored during children's drop-off and dismissal.**

## 3. People to enter (never generated — admin entry only)

- [x] Roger Yadon — Senior Pastor. *Only staff member verified from the public site.*
- [ ] All other leadership and staff. **Do not generate these.** An admin enters each one.
- [ ] The safety/security team roster itself — names, phones, specialties, Team Lead flags.
- [ ] Who holds the admin PIN, and who the Team Leads are.

## 4. Decisions pending

- [ ] **Hosting & deployment (Phase 4).** Decided so far: do NOT deploy publicly. The app is fenced three ways — `noindex` meta, a `robots.txt` Disallow, and a `.vercelignore` entry that keeps it off the CDN entirely. It goes live only behind Vercel deployment protection or after Phase 4 authentication.
- [ ] **Auth and roles (Phase 4).** Admin / Team Lead / Member. The roster and phone numbers stay behind login.
- [ ] **Annual recertification cadence.** The Academy now supports retaking a passed module and an admin recert reset; the team must decide how often certification expires.
- [ ] **Single-file vs. build step.** Still single-file. Revisit at Phase 2, when file upload and IndexedDB land.
- [ ] **Drill schedule.** Fire drills and Code Adam walkthroughs are recurring activities; Phase 3 adds the drill log. How often?

## 5. Content pending verification

Tracked separately — a research pass is verifying every external resource link and
several factual claims in the training material. Items confirmed wrong or unsourced
get corrected or removed, never left in place.

- [ ] Code Adam "used in hundreds of thousands of facilities nationwide" — unsourced quantitative claim. Cite it or cut it.
- [ ] "Pathway to Violence" attributed to CISA — attribution appears loose; needs the correct primary source.
- [ ] CPI Crisis Development Model stage names — the app uses what looks like legacy wording.
- [ ] CPI personal-space distance — app says "1.5–3 feet *extra*"; likely a misstatement of the distance itself.
- [ ] Ready.gov "home fires" cited for a church evacuation procedure — wrong-audience page for an assembly occupancy.
- [ ] FEMA IS-907 course URL, `guidestone.org/ChurchSafety`, and the Verbal Judo church-security page — all suspected dead or redirected.
- [ ] `thecelebration.church/our-team` — cited on Roger Yadon's card; confirm the path exists.

## 6. Procedure coverage gaps

Missing procedures a house-of-worship emergency operations plan is expected to carry.
Ranked by how likely they are at this specific church.

- [ ] **Medical emergency** — cardiac arrest, AED, CPR, seizure, falls. *The most likely emergency at a church with an aging congregation, and currently absent.* Sourced from AHA / Red Cross. **In progress.**
- [ ] **Bomb threat / suspicious package.** **In progress.**
- [ ] **Wildfire smoke / air quality** — a realistic Treasure Valley hazard, more so than the tornado procedure already included. **In progress.**
- [ ] Power outage.
- [ ] Vehicle ramming / parking lot incident.
- [ ] Suspicious person or unauthorised access to children's areas (partially covered by Code Adam).

---

*This file is maintained as the project proceeds. An item is removed only when the
team has actually supplied the answer — never because it was filled in with a guess.*

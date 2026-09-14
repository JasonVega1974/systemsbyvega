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
| Safety & Security Onboarding Manual (25 pages, PDF) | **NEEDED** | Onboarding step 1 is gated on reading it. |
| Full site schematic | **NEEDED** | All entrances/exits, evacuation routes, assembly area, **AED and fire-extinguisher positions**, team post positions. |
| Foyer diagram | **NEEDED** | Greeter posts, main entry doors, guest services. |
| Sanctuary diagram | **NEEDED** | Seating, stage, exits, team posts front/rear. |
| Children's auditorium diagram | **NEEDED** | Kids' rooms, exits, secure hallway coverage. |
| Children's check-in diagram | **NEEDED** | Check-in stations, secure pickup flow, tag verification point. |
| Leadership / staff headshots | **NEEDED** | One per directory card. |
| **CISA bomb threat checklist, printed** | **NEEDED** | [One-page PDF](https://www.cisa.gov/sites/default/files/2025-08/Bomb_Threat_Checklist_082025_508.pdf). A copy by every phone that takes outside calls. Nobody composes good questions from memory mid-threat. |

## 2. Facility facts nobody has told us yet

- [ ] **AED positions — how many, and where.** *Now blocking a shipped procedure:* the Medical Emergency card tells people to send someone for the nearest AED and cannot say where that is. Highest-value item on this list.
- [ ] **Assembly area location.** Referenced by the Fire & Evacuation and Earthquake procedures, which still say "to be marked on the site schematic."
- [ ] **Fire extinguisher positions.**
- [ ] **Severe-weather shelter locations** — which specific interior, lowest-level rooms and hallways. NWS rules out the sanctuary and the fellowship hall (large open rooms with wide-span roofs), so this needs a real answer, not "move to the interior."
- [ ] **Accessible evacuation routes and areas of refuge** for people with mobility needs.
- [ ] **Radio / communication channel decision.** Training says "know your communication method (radio/text thread)" without naming one. Decide and document.
- [ ] **Which exterior doors are monitored** during children's drop-off and dismissal.
- [ ] **Reunification location and parent check-in point.** *Now blocking a shipped procedure.* Two separate places are needed, with the children out of the parents' line of sight — that single decision is what keeps a reunification orderly.
- [ ] **Reunification cards.** Do not exist yet. Needed before the procedure can be drilled.
- [ ] **Which interior doors actually lock, and who carries keys or a fob on a Sunday.** *Now blocking a shipped procedure:* the Lockdown annex is worth exactly as much as the locks behind it.
- [ ] **Shelter-in-place rooms**, who can shut down or recirculate the HVAC, and whether plastic sheeting and duct tape are stocked anywhere in the building. Sealing a room is the one protective action here that needs supplies bought in advance.

## 3. People to enter (never generated — admin entry only)

- [x] Roger Yadon — Senior Pastor. Verified from `thecelebration.church/our-team`.
- [ ] All other leadership and staff. **Do not generate these.** An admin enters each one.
  - ⚠️ The church's team page carries both a heading "Pastor Roger & Kimberly Yadon" and a separate entry "Pastor Kim Yadon — Associate & Youth Pastor." **The site does not say whether Kim and Kimberly are the same person.** Ask the church before entering either — a safety callsheet that duplicates or merges a real person is a real error.
- [ ] The safety/security team roster — names, phones, specialties, Team Lead flags.
- [ ] **Who holds the admin PIN, and who the Team Leads are.**
- [ ] **A designated bomb-threat Decision Maker**, and written evacuation criteria. *Now blocking a shipped procedure:* CISA delegates the evacuate-or-search decision to a named person working from pre-written criteria, and the Bomb Threat card says outright that neither exists yet.

*Useful context from the church's own footer: office hours are Tuesday & Thursday, 9am–3pm — so the office is unstaffed most of the week, including Sundays. Do not build any procedure that assumes someone answers (208) 466-5433.*

## 4. Decisions pending

- [ ] **Hosting & deployment (Phase 4).** Decided: **do NOT deploy publicly.** Fenced three ways — `noindex` meta, a `robots.txt` Disallow, and a `.vercelignore` entry keeping the directory off the CDN entirely. Goes live only behind Vercel deployment protection or after Phase 4 authentication.
- [ ] **Auth and roles (Phase 4).** Admin / Team Lead / Member. Roster and phone numbers behind login. Note: picking your name in the Academy is *not* auth — anyone can pick anyone.
- [ ] **Annual recertification cadence.** The app now supports self-retake, per-person admin reset, and an all-team annual reset. How often should certification expire?
- [ ] **Single-file vs. build step.** Still single-file. Revisit at Phase 2, when file upload and IndexedDB land.
- [ ] **Drill schedule.** Fire drills and Code Adam walkthroughs are recurring. How often? Phase 3 adds the drill log.
- [ ] **The five FEMA annexes.** FEMA's houses-of-worship guide mandates five functional annexes — **Evacuation, Lockdown, Shelter-in-Place, Recovery, Security**. The app currently has Evacuation. Lockdown and Shelter-in-Place are approved and in progress. Recovery and Security are deferred until after the team meeting.

### RULING — emergency action terminology (decided)

**FEMA annex structure, SRP operational wording.** The functional annexes keep
FEMA's names, because that is the framework the rest of the plan is built on.
What anyone actually *says out loud* is the **Standard Response Protocol**,
verbatim, **BIZ edition** — the one whose own text names faith-based
institutions as its audience.

  Hold · Secure · Lockdown · Evacuate · Shelter

*Why both:* FEMA is a planning structure; SRP is an operational vocabulary
shared with law enforcement and schools. They are complementary, not competing.
**Hold** and **Secure** are carried even though FEMA has no annex for either,
because they cover the two situations a church meets most often — keep the halls
clear, and police activity in the neighbourhood.

⚠️ **"Lockout" is retired and must never appear in a live procedure.** The I Love
U Guys Foundation replaced it with **Secure** in SRP v4.0 (2020-01-17), stating:
*"Lockout vs. Lockdown was confusing, Secure vs. Lockdown is clear."*

⚠️ **Licensing constraint.** SRP is free for any public or private organisation,
with no signed licence required — but the Terms of Use forbid modifying the core
actions and directives. Only three changes are permitted: localising evacuation
locations, localising shelter strategies, and adding an organisation logo. The
directive lines in this app are therefore quoted exactly and must not be
reworded, including by a future editor who thinks they read awkwardly. BIZ and
K12 wording differ; **this app uses BIZ throughout** and must not mix editions.

## 4b. Obligations we have taken on

- [ ] **Notify the "I Love U Guys" Foundation of SRM use.** Their Terms of Use make this a condition, not a courtesy: email `srm@iloveuguys.org` or sign an MOU. SRP asks only that we let them know; SRM requires it. Both are otherwise free.
- [ ] **Do not reword SRP directives.** Terms of Use permit localising evacuation locations and shelter strategies, and adding a logo — nothing else. Recorded in the ruling above and in the procedure itself.

## 4c. For the church's legal counsel — not legal advice

Statute citations only, gathered because volunteers will ask "can I be sued?"
**Nothing here is interpreted, and none of it should be relied on until counsel
has reviewed it.** Several commonly-cited references turned out to be stale:

- **Idaho Code § 5-337 (AED immunity) NO LONGER EXISTS.** It is absent from the current Title 5 Chapter 3 index and the URL 404s, yet it is still widely cited by AED vendors. The live provisions are **§§ 39-701 / 39-702 / 39-703** (Sudden Cardiac Arrest), added 2023 ch. 123.
- **§ 5-330** — general emergency first-aid immunity. **Amended in 2026**, so work from the live page, not a cached copy.
- **§ 5-348** — immunity of volunteer security personnel for religious organisations. Directly on point for this team. **Renumbered from § 5-347 in 2025** — another stale-citation trap.
- **§ 5-345** is titled "Immunity for aid during an emergency" but covers only architects, engineers and contractors. Easy to miscite from an index. Not applicable.

## 4d. Technical note — automated link checking

**`redcross.org` returns HTTP 200 and then serves an apology page** to automated
clients. A status-code-only link checker will *falsely pass* every Red Cross URL
in this app while readers get an error page. Any future link check must assert
expected page text, not just a 200. The same care applies to `cdc.gov`,
`cpr.heart.org`, `stroke.org` and `fema.gov`, which block some fetchers while
serving browsers normally — a 403 from a checker does not mean a dead link.

## 5. Content verification — CLOSED

A full pass verified all 25 external links and ten factual claims against primary
sources. Outcomes:

- [x] Code Adam "10 minutes before calling 911" — **wrong and dangerous.** NCMEC says call immediately. Corrected, along with two missing steps and a quiz question that drilled the wrong rule.
- [x] Code Adam "hundreds of thousands of locations" — **supportable.** NCMEC publishes it. Kept, now attributed to NCMEC rather than asserted flat.
- [x] "Pathway to Violence" attributed to CISA — **wrong originator and wrong fifth stage.** Re-attributed to Calhoun & Weston; fifth stage corrected to *breach*; the observable-behaviours claim now cites the FBI's 2018 study, with the FBI's own "not predictive, not a checklist" caveat.
- [x] CPI Crisis Development Model — **outdated stage name.** Now Anxiety → Defensive → **Risk Behavior** → Tension Reduction.
- [x] CPI personal space "1.5–3 feet *extra*" — **misstatement that doubled the distance.** It is the total standoff, and a minimum.
- [x] Ready.gov "home fires" cited for a church — **wrong occupancy.** Replaced with USFA non-residential guidance.
- [x] FEMA EOP guide PDF — **404.** Repointed. (It is a 2013 document, unrevised.)
- [x] Ready.gov continuity — **404.** Repointed.
- [x] FEMA IS-907 → **IS-907.A**, plus a moved Independent Study path. Repointed.
- [x] FBI, CPI and Nampa PD URLs — **redirects.** Repointed.
- [x] `guidestone.org/ChurchSafety` and the Verbal Judo page — both **live**, contrary to suspicion. Verbal Judo relabelled as the commercial service page it actually is.
- [x] Nampa PD (208) 465-2257 — **confirmed** current and non-emergency.
- [x] `thecelebration.church/our-team` — **live**, and Roger Yadon's title confirmed there.
- [x] Tornado sheltering — NWS explicitly rules out large open rooms. **The app had not said so.** Now it does.
- [x] Flood depths — correct, but the **2-foot SUV/truck figure was missing.** Added; it is the one that applies to a church van.
- [x] PASS — correct, but **three of USFA's six preconditions were missing.** All six now stated.
- [x] "Idaho is seismically active" — true of the state, but every large event is in **central** Idaho, 250–300 km away. Now qualified honestly.

*Two things remain unverifiable and are stated as such rather than filled in:
FBI page bodies (their WAF blocks automated checks; redirect targets confirmed
from headers), and the exact address string on the Google Maps listing.*

## 6. Procedure coverage

**Now covered:** active shooter · lost child/Code Adam · fire & evacuation · severe weather · earthquake · flooding · de-escalation · continuity · **medical emergency** · **bomb threat** · **wildfire smoke**

- [x] **Medical emergency** — cardiac arrest, AED, seizure, falls. Sourced from AHA, Red Cross, CDC and the Epilepsy Foundation. Placed first and open by default, because it is the likeliest emergency this congregation faces. *Blocked on AED locations.*
- [x] **Bomb threat / suspicious package.** *Blocked on a named Decision Maker and written evacuation criteria.*
- [x] **Wildfire smoke / air quality.** Note: the EPA/AirNow activity table is written for schools and stops at Very Unhealthy, so the Hazardous (301+) tier is framed as a leadership call rather than given a fabricated threshold.

**Still missing**, ranked by likelihood for this specific church:

- [ ] **Reunification / child accountability during evacuation.** Happens *every* time an evacuation happens. Right now a fire alarm during kids' ministry ends in an uncontrolled parent surge.
- [ ] **Lockdown / lockout / shelter-in-place as named, standalone procedures.** Three of FEMA's five mandatory annexes. Lockout (an external threat nearby) triggers far more often than the shooter scenario it is associated with.
- [ ] **Power / utility failure.** A Sunday outage means no lights, sound, HVAC or electronic locks, and a decision on two remaining services.
- [ ] **Child protection / abuse-allegation response / background screening.** Highest-consequence recurring exposure for a church with children's ministry, and explicitly required by CISA. Idaho is a universal-mandatory-reporting state, so the response is legally time-bound.
- [ ] **Missing at-risk adult (dementia wandering).** Code Adam covers children only. With an aging congregation this may outrank lost-child, and the protocol differs — immediate 911, vehicle and canal checks.
- [ ] Suspicious person / trespass / no-contact enforcement.
- [ ] Extreme heat and cold; who has authority to cancel a service.
- [ ] Crisis communications / mass notification / who speaks for the church.
- [ ] Security annex — open, lock, close; key control; pre-service sweeps.
- [ ] Cash and offering handling — the most common actual crime at a church.
- [ ] Recovery annex and after-action review.
- [ ] Mental health crisis / suicidal person (the 988 pathway).
- [ ] Gas leak / hazmat / carbon monoxide.
- [ ] Cyber and donor-data breach.
- [ ] Church van and offsite excursions.
- [ ] Food safety at fellowship meals.
- [ ] Protest / civil disturbance.
- [ ] Hostage / barricade — Colleyville (2022) was exactly this at a house of worship, and the response diverges sharply from Run-Hide-Fight.
- [ ] Vehicle ramming. *Ranks last on intent* — CISA's own case-study research found only two vehicle rammings at U.S. houses of worship and zero VBIEDs. Worth a short annex only because the **unintentional** version (pedal confusion at the children's-wing drop-off) is far more likely, and the mitigation is identical.

## 7. Academy modules

The Academy has six modules. Medical emergency response has a procedure card but
**no training module**, which is a gap given it is the likeliest emergency.

- [ ] Decide whether to add a Medical Emergency module (CPR/AED/seizure/falls) as a seventh. The pass-mark logic is no longer tied to five questions, so a module of any length now works correctly.

---

*An item is removed only when the team has actually supplied the answer — never
because it was filled in with a guess.*

# OPEN ITEMS — Celebration Church Safety & Security Team

Everything the team must supply, decide, or verify before this platform goes live.
Nothing on this list may be invented, guessed, or filled in with a plausible
placeholder that reads as real. Where content is required but unverified, the app
renders a clearly labelled placeholder and the item is tracked here.

**Church:** Celebration Church · 2121 Caldwell Blvd, Nampa, ID 83651
**Services:** Sundays 8:00 AM · 9:45 AM · 11:30 AM
**Coverage rule:** minimum 3 team members per service, including 1 Team Leader

---

## 0. Documents received — 2026-09-15

Five documents arrived from the church: `7 Steps to follow.docx` (generic AED
steps), `CCST SAFETY TEAM POLICY AND PROCEDURES.docx` (the full safety-team
policy manual, working copy, **March 2025**), `Evacuation Plan updated
Septmeber 2025.docx`, `Giving CPR.docx` (generic Red Cross CPR steps), and
`General Map Blueprint EXIT.pdf` (a floor-plan drawing with colour-coded
evacuation routes). What each one changed, and two things it revealed that
need a decision — not a guess — before they go further.

**The floor plan is now in the app** — Facility Maps → Full Site Schematic.
It is real progress on item 1 below, **not** the complete document that item
asked for: it shows entrances, exits and two colour-coded evacuation routes
(red = adults, blue = kids), but it has **no AED positions, no fire-extinguisher
positions, and no team post positions** marked anywhere on it. Those three are
still open exactly as before.

**Fire & Evacuation** now carries the sweep list from the church's own
Evacuation Plan — Restrooms, Classrooms, Warehouse, Media Room — swept by the
Team Leader after the building clears, sourced and attributed in the card.

**Medical Emergency** gained two things not in the app before: the AED
precautions from `7 Steps to follow.docx` (no contact during defibrillation,
no alcohol on the chest, never in a moving vehicle, never on someone in water
or on a conductive surface), and the church's own radio protocol for calling
one — see item 6 below, it answers part of Team Question 6.

**Bomb Threat** — the church's own March 2025 policy DOES assign a decision
role: "the ranking pastoral staff member or Safety Team Leader" decides on
evacuation, and elsewhere, "the Pastoral staff in consultation with the Safety
Team Leadership has the ultimate responsibility." That is a role, written down
— which is more than the app previously credited the church with having. It is
**still not** the single **named individual** working from **written
evacuation criteria** that CISA recommends and that Team Question 4 asks for.
The card now says so precisely instead of "not yet named."

The March 2025 policy also carries the church's **own** telephone bomb-threat
call-taker script — different questions from CISA's one-page checklist (it
asks things like "why do you want to blow up the church"), and undated /
older. **Both now exist.** The team should decide which one lives by the
phones — CISA's newer one, the church's own older one, or both — rather than
have the app pick.

**Eight new procedure cards were added**, each built entirely from the March
2025 CCST policy and attributed to it at the bottom of the card, matching
several items already on the "still missing" list in §6: Disruptive Person,
Trespassing & Suspicious Person · Weapon Seen in the Building · Child Abuse,
Neglect & Mandatory Reporting · Robbery & Cash/Offering Handling · Facility
Security — Doors, Alarms & Burglary Response · Power/Utility Failure,
Biohazard & Hazardous Material · Transportation & Off-Site Ministry Emergency ·
Suicide Threat or Attempt. None of these have an Academy training module yet —
same gap already noted for Medical Emergency in §7.

**Two things these documents got us weren't asked for, and need the team's
word, not this app's judgement:**

- ⚠️ **The two evacuation documents disagree on which exit the kids' wing
  uses.** The September 2025 Evacuation Plan says, in writing, "Kids evacuate
  through the West exit." The floor-plan drawing shows the kids' classroom
  wing's own marked route (blue) running out an exit corridor on the
  **opposite side of the building** — the same side the four classrooms and
  the small group room sit on — heading south, not west. **The app states
  only what both documents agree on** (children evacuate by class, separately
  from the sanctuary route, and assemble with a checked roster) and does not
  print a compass direction for the kids' exit until the team confirms which
  document is current. Somebody needs to walk the building with both
  documents in hand and correct whichever one is wrong.

- ⚠️ **The reunification method in current use does not match the procedure
  already built in this app.** The September 2025 plan describes: teachers
  hold clipboards with the class's roster and age marked, high enough for
  parents to see, in the same North West corner of the parking lot the kids
  assemble in — parents and children in the same place, in each other's
  sight, checked off by hand against a roster. **This app's Reunification
  procedure is built on the "I Love U Guys" Foundation's Standard
  Reunification Method** (adopted before these documents arrived), whose
  entire design principle is the opposite: children **out of the parents'
  line of sight**, released only through a card-based chain-of-custody flow.
  These are not two descriptions of the same system — they solve the same
  problem in incompatible ways. **The team needs to decide: adopt SRM fully
  (retire the clipboard/one-lot method and update the September 2025 plan to
  match), keep the current clipboard method and remove the SRM procedure, or
  run something else entirely.** Nothing has been changed to force this
  decision either way; the Reunification card still describes SRM, flagged
  with a pointer to this item.

**What these documents did NOT answer** — every one of these stayed open as of
this 2026-09-15 pass: AED locations, fire-extinguisher positions, team post
positions, severe-weather shelter rooms, HVAC control and who runs it, which
interior doors lock and who holds keys/fobs, radio channel and how many
radios exist, the admin PIN holder, Kim/Kimberly, a **named** bomb-threat
decision maker with **written** criteria, and the reunification-card design.
*(Updated 2026-09-18 — see §0d: AED locations, the reunification method, and
a named bomb-threat decision maker are now answered by Tyson Garten, CCST
Director. Fire-extinguisher/team-post positions, severe-weather shelter
rooms, HVAC control, door locks/keys, radio channel/count, the admin PIN
holder note (obsolete — see §3), Kim/Kimberly, and written bomb-threat
criteria remain exactly as open as before.)*


---

## 0b. Phase 5 — 2026-09-16: role hierarchy, incident reporting, onboarding manual

The team's Supabase project moved off hand-pasted SQL this session — migrations
now live in `sql/` and apply via the Management API (`sql/apply-migration.mjs`),
never the CLI's `db push`, because this project's migration history was never
CLI-tracked and the project is shared with unrelated systemsbyvega/ESB/GSB
objects. The script refuses to touch anything that isn't `cc_`-prefixed.

**Shipped this session:**
- **Role hierarchy** — `cc_team.team_role` now carries the document's real
  5-tier structure (Director / Team Leader / Safety Team Operator / Safety
  Team Trainee / Junior Safety Team Operator) instead of the old two-tier
  Team Lead/Team Member. Tyson Garten is Director (and, per the church,
  Team Leader too — see the Job Positions section of the manual embed).
  Nobody was placed into Trainee or Junior Operator on migration; there was
  no signal for who belongs in either.
- **Week A/B rotation** — `cc_team.rotation_week`, nullable, admin-editable,
  nobody preassigned. Week A serves the 1st/3rd/5th Sundays, Week B the
  2nd/4th.
- **Incident Reporting tab** — full `cc_incidents` schema (append-only,
  correction-supersedes-original), RLS keyed on category sensitivity
  (`child_related`/`medical`) and a per-report `restricted` override, photo
  uploads to a private Storage bucket, and an acknowledgment model. The
  child-abuse mandatory-reporting notice on the report form cites Idaho Code
  § 16-1605 directly (24-hour reporting deadline, misdemeanor penalty) — see
  §4c for this project's standing caution that nothing here is legal advice.
- **Onboarding manual embed** — the actual CCST Safety Team Policy &
  Procedures document (working copy, March 2025) is now rendered in full,
  section by section, inside the Onboarding tab, gated behind an actual
  scroll-to-the-end interaction before the "Read the manual" checklist item
  can be checked. A new checklist item covers the background-check
  disqualifiers (felony within 5 years, felony sex crime, misdemeanor moral
  turpitude) directly from the document's own wording.
- **Two gaps found while transcribing the document itself**, now Team
  Questions 15–16: the document's own table of contents points to an
  "Arrest/Detention Procedures" section that was never actually written
  (broken bookmark, not a scanning error on this app's part), and the
  document's telephone bomb-threat form has never been turned into a
  printable copy for the phones — the same gap §1 already flagged from the
  CISA-checklist angle, now confirmed from the church's own document too.

---

## 0c. Phase 5 — 2026-09-16: ten new Academy modules

All ten built, each 3+ lessons and a quiz at the same 80% pass threshold as the
existing seven: Roving & Sweeps, Facility Safety & Hazard Spotting,
Communications & Escalation, Pastoral Coverage, Crowd Management, Suspicious
Persons & Trespass, Church Animal Policy, HAZMAT & Utilities, Bomb Threat
Response, and Shelter-in-Place (Academy version — the existing Bomb Threat and
Shelter-in-Place items were previously reference-only Emergency Procedures
cards; these are the training-with-a-quiz versions). Academy now totals 17
modules. Sourced from the CCST policy document first, CISA/FEMA/OSHA/ADA/DOJ
where the document is silent — no invented phone numbers, names, certification
requirements, or facility-specific details.

Two items surfaced during this build that are more than routine gaps:

- **Church Animal Policy is ADA/DOJ-sourced in full** (the church's policy never
  mentions animals) and deliberately does **not** invent any service-animal
  certification, registration, or ID requirement — none exists under the ADA,
  and inventing one would create real exposure. The two questions staff may
  ask, and the list of things they may never require, come straight from
  ADA.gov.
- **The Shelter-in-Place module surfaced a naming collision that predates this
  session**: the CCST policy's "Room Lock Down/In (Shelter-in-Place)" (an
  intruder already inside — lock the room) and this app's earlier,
  independently-built Shelter-in-Place procedure card (a hazard in the outside
  air — seal the room, shut down HVAC) share one label for two different
  physical actions. The new module explains the distinction rather than
  picking a side; whether to rename one of them is Team Question 20.

New open items from these ten modules are Team Questions 17–21 (patrol pattern
for Roving & Sweeps; whether Pastoral Coverage needs a fuller curriculum;
whether to add a house rule for ordinary pets; the Shelter-in-Place naming
collision; utility shutoff locations and gas-provider confirmation).

---

## 0d. Phase 6 — 2026-09-18: four items answered by Tyson Garten, CCST Director

**AED locations — ANSWERED.** Two AEDs: (1) the kids' hallway, and (2) the
sanctuary, south wall, between the stage-left seating area and where you enter
the risers from the floor. Added to the Medical Emergency procedure card and
the Medical Emergency Response Academy module (ss205), both as confirmed
information rather than an open item now. **Still not answered:** whether
either AED is checked/maintained, and by whom (Team Question 1).

**Annual recertification cadence — ANSWERED.** Confirmed as annually (every 12
months). The app's Academy/Admin Tools language already said "annual" by
default; that default is now the team's actual decision, not an assumption.

**Reunification method — ANSWERED, and it is not SRM.** The team's actual
practice is a clipboard sign-out sheet completed by the teacher; a parent must
present a ticket (the check-in claim check) to pair with a child. The
Reunification procedure card has been rewritten around this method and no
longer references the "I Love U Guys" Foundation's Standard Reunification
Method at all — see Team Question 14. Because SRM is no longer used anywhere
in this app, the §4b obligation to notify the Foundation of SRM use no longer
applies (SRP, used separately for lockdown terminology, is unaffected — see
the terminology ruling in §4). **Still not answered:** the physical assembly
area / parent check-in location (Team Question 2) — the method is decided,
the place is not.

**Bomb-threat Decision Maker — PARTIALLY ANSWERED.** Named as Pastor Roger
Yadon and/or Tyson Garten (CCST Director) — both are named per Tyson Garten.
Updated on the Bomb Threat & Suspicious Package procedure card and the Bomb
Threat Response Academy module (ss309). **Still not answered:** the written
evacuation criteria CISA recommends the Decision Maker work from — a named
person now exists, written criteria still do not (Team Question 4).

**Untouched — do not guess:** assembly area location, severe-weather shelter
rooms, the kids'-wing evacuation route (West exit vs. classroom-side — Tyson
is getting an updated drawing), radio channel, and Kim vs. Kimberly Yadon.

**Facility diagram:** Tyson is sending an updated facility diagram when
available. The current Full Site Schematic stays as the reference until the
new one arrives; its caption now also notes that the children's auditorium
does not appear on it at all, separate from the fire-extinguisher/team-post
positions already flagged as unmarked.

---

## 0e. Phase 7 — 2026-09-18: new "Evacuation Map" diagram and "Emergency
     Evacuation Plan" document received

Two files arrived: `Evacuation Map.pdf` (an updated version of the floor-plan
drawing — this is the diagram flagged as pending in §0d) and `Emergency
Evacuation Plan.pdf` (a short, different document from the September 2025
Evacuation Plan referenced elsewhere in this file — it does not repeat that
document's "West exit" claim at all, it is simply silent on compass
direction).

**The Full Site Schematic has been replaced** with the new Evacuation Map —
Facility Maps → Full Site Schematic, now click-to-expand full screen. It
marks a route from every room/seating area to its nearest exterior exit,
including the classroom/Nursery wing for the first time (the previous
drawing didn't show that wing at all). **It still carries no compass or
"North" marking**, so it does not resolve whether the classroom-side exit it
shows is the same "West exit" the written Evacuation Plan names — see Team
Question 13, still open.

**Newly answered, from the Emergency Evacuation Plan document:**

- **Assembly area / reunification point.** "Approximately 75 yards out front
  of the church, to the far left of the parking lot" — this is where parents
  come out to receive their children. Applied to the Fire & Evacuation and
  Reunification procedure cards as the general assembly area, since the
  document names no other location. Whether this is also specifically the
  sanctuary/adult assembly point is a reasonable assumption, not a directly
  confirmed one — see Team Question 2.
- **Classroom/Nursery radios.** 5 radios, on the Safety Team's 2 channels (1
  & 15) — turned on and checked by a Safety Team member before every
  service, left on but turned down so classrooms don't pick up ordinary
  Safety Team chatter. Added to the Communications & Escalation Academy
  module. **Still not answered:** how many radios the Safety Team itself
  carries (a separate count from these 5), and who holds them — see Team
  Question 6.
- **A safety principle not previously in this app:** *"We would never
  evacuate during imminent or active threat because that puts the littles at
  higher exposure and targets."* This is now stated explicitly on the
  Lockdown, Active Shooter, and Fire & Evacuation procedure cards and the
  Active Shooter Response Academy module (ss201) — fire/smoke evacuation is
  not the response to a person-based threat; lockdown in place is. The
  Lockdown card's step list also now includes "pull blinds," from the same
  document's 4-step lockdown instructions (lock doors, pull blinds, lights
  out, wait for police/Safety Team) — the other three steps already matched.

**Still untouched — do not guess:** severe-weather shelter rooms, which
exact exit the kids' wing uses relative to true compass direction, total
Safety Team radio count and who holds them, and Kim vs. Kimberly Yadon.

---

## 0f. Phase 8 — 2026-09-19: Document Library, Drill Tracking, background
     check status

**Document Library (new "Documents" tab, Operations group).** Admin uploads
and removes; every authenticated member can browse and download. Five
categories: Policy & Procedures, Forms & Templates, Legal & Compliance,
Insurance, Training Materials. Pre-populated with three verified public
reference links (no upload needed, no signed URL — these link straight to
the official source): the CISA Bomb Threat Checklist, Idaho Code § 16-1605
(Mandatory Reporting), and Idaho Code § 5-348 (Volunteer Security Personnel
Immunity). Private uploads (policy manual, consent forms, agreements,
templates, insurance certificate, etc.) go to the `cc-documents` bucket —
same private-bucket, 1-hour-signed-URL pattern as facility maps and
incident photos — nothing has actually been uploaded yet; an admin does
that from the app whenever the files are ready.

**Drill Log & Schedule (new subsection inside Team Meetings).** Logs fire
drills, Code Adam, Active Shooter/Lockdown, Severe Weather/Shelter-in-Place,
and Medical Emergency drills — date, duration, location/notes, participants
(multi-select from the roster), and who conducted it. A compliance tracker
shows each drill type's last-conducted date, next-due date, and status
(On Track / Due Soon within 30 days / Overdue), computed client-side from a
fixed frequency table, not stored. A Dashboard "Drill Compliance" row
mirrors the same five statuses. Admin and Team Lead can log drills; only
Admin can delete a mis-entered record. **No drills have actually been
logged yet** — every drill type reads Overdue (never conducted) until the
team logs its first real one of each kind.

**Background check status (Team roster, admin-only column).** Manually set
— not_requested / requested / cleared / expired / flagged — with a check
date and an expiry date that defaults to 2 years from the check date when
status is set to Cleared, but is editable afterward rather than a database-
enforced formula. Flagged in red on the roster when Expired, Not Requested,
or Flagged. A new Onboarding checklist step asks the member to confirm
their own status shows Cleared. **No third-party integration** (Ministry
Safe, Checkr) yet — deferred on purpose, see §4's decisions-pending list:
background check integration is deferred until the church has a written
policy for handling flagged results, reviewed by counsel. Nobody's actual
background-check status has been entered yet; every roster row starts at
the not_requested default.

---

## 1. Documents to upload (Phase 2 builds the slots)

| Item | Status | Notes |
|---|---|---|
| Safety & Security Onboarding Manual | **SHIPPED 2026-09-16** | The actual CCST Safety Team Policy & Procedures document is embedded in full, section by section, behind a scroll-to-the-end gate. Onboarding step 1 is gated on it, as designed. See §0b. |
| Full site schematic | **PARTIAL — updated 2026-09-18** | The "Evacuation Map" (per-room routes to nearest exit, including the classroom/Nursery wing for the first time) replaces the 2026-09-15 floor plan in the app (Facility Maps), now with a full-screen click-to-expand view. Still missing from it: **fire-extinguisher positions, team post positions, and any compass/North marking.** See §0e. |
| Foyer diagram | **NEEDED** | Greeter posts, main entry doors, guest services. |
| Sanctuary diagram | **NEEDED** | Seating, stage, exits, team posts front/rear. |
| Children's auditorium diagram | **NEEDED** | Kids' rooms, exits, secure hallway coverage. |
| Children's check-in diagram | **NEEDED** | Check-in stations, secure pickup flow, tag verification point. |
| Leadership / staff headshots | **NEEDED** | One per directory card. |
| **A bomb threat checklist, printed** | **NEEDED — now a choice, not a gap** | The church's own March 2025 policy has its own call-taker script (see §0); CISA's [one-page PDF](https://www.cisa.gov/sites/default/files/2025-08/Bomb_Threat_Checklist_082025_508.pdf) is the other option. Team picks one (or keeps both) and a copy goes by every phone that takes outside calls. Nobody composes good questions from memory mid-threat. |

## 2. Facility facts nobody has told us yet

- [x] **AED positions — how many, and where.** ANSWERED 2026-09-18 by Tyson Garten, CCST Director — two AEDs: (1) kids' hallway, (2) sanctuary, south wall, between the stage-left seating area and where you enter the risers from the floor. See §0d.
- [x] **Assembly area location.** ANSWERED 2026-09-18 via the church's Emergency Evacuation Plan — approximately 75 yards out front of the church, to the far left of the parking lot. See §0e. Whether this is also specifically the sanctuary/adult assembly point (vs. only the kids'/reunification point) is a reasonable assumption, not directly confirmed — Team Question 2.
- [ ] **Fire extinguisher positions.**
- [ ] **Severe-weather shelter locations** — which specific interior, lowest-level rooms and hallways. NWS rules out the sanctuary and the fellowship hall (large open rooms with wide-span roofs), so this needs a real answer, not "move to the interior."
- [ ] **Accessible evacuation routes and areas of refuge** for people with mobility needs.
- [ ] **Radio channel and count — PARTIALLY ANSWERED 2026-09-18.** The classroom/Nursery side is now known: 5 radios, channels 1 & 15 (see §0e). Still unknown: how many radios the Safety Team itself carries, and who holds them.
- [ ] **Which exterior doors are monitored** during children's drop-off and dismissal.
- [x] **Reunification location and parent check-in point.** ANSWERED 2026-09-18 — approximately 75 yards out front of the church, to the far left of the parking lot (same location as the general assembly area). See §0e.
- [ ] **Which interior doors actually lock, and who carries keys or a fob on a Sunday.** *Now blocking a shipped procedure:* the Lockdown annex is worth exactly as much as the locks behind it.
- [ ] **Shelter-in-place rooms**, who can shut down or recirculate the HVAC, and whether plastic sheeting and duct tape are stocked anywhere in the building. Sealing a room is the one protective action here that needs supplies bought in advance.

## 3. People to enter (never generated — admin entry only)

- [x] Roger Yadon — Senior Pastor. Verified from `thecelebration.church/our-team`.
- [ ] All other leadership and staff. **Do not generate these.** An admin enters each one.
  - ⚠️ The church's team page carries both a heading "Pastor Roger & Kimberly Yadon" and a separate entry "Pastor Kim Yadon — Associate & Youth Pastor." **The site does not say whether Kim and Kimberly are the same person.** Ask the church before entering either — a safety callsheet that duplicates or merges a real person is a real error.
- [x] The safety/security team roster — names, phones, specialties, and the 5-tier role field (Director/Team Leader/Safety Team Operator/Safety Team Trainee/Junior Safety Team Operator) are entered and live.
- [x] Who the Team Leaders are is now visible directly in the Team roster (role-hierarchy migration, 2026-09-16). PIN-based admin access was retired the same day in favor of magic-link auth — "who holds the admin PIN" no longer applies.
- [ ] **A designated bomb-threat Decision Maker**, and written evacuation criteria. *Now blocking a shipped procedure:* CISA delegates the evacuate-or-search decision to a named person working from pre-written criteria, and the Bomb Threat card says outright that neither exists yet.

*Useful context from the church's own footer: office hours are Tuesday & Thursday, 9am–3pm — so the office is unstaffed most of the week, including Sundays. Do not build any procedure that assumes someone answers (208) 466-5433.*

## 4. Decisions pending

- [ ] **Hosting & deployment (Phase 4).** Decided: **do NOT deploy publicly.** Fenced three ways — `noindex` meta, a `robots.txt` Disallow, and a `.vercelignore` entry keeping the directory off the CDN entirely. Goes live only behind Vercel deployment protection or after Phase 4 authentication.
- [x] **Auth and roles (Phase 4) — SHIPPED 2026-09-16.** Magic-link email auth replaced the PIN entirely. `cc_profiles.role` is `admin` / `team_lead` / `member` (displayed to users as Admin / Team Leader / Member) and gates roster and phone numbers behind login. Identity now comes from the real signed-in session, not a free-text name picker.
- [x] **Annual recertification cadence.** ANSWERED 2026-09-18 by Tyson Garten, CCST Director — annually (every 12 months). See §0d.
- [ ] **Single-file vs. build step.** Still single-file. Revisit at Phase 2, when file upload and IndexedDB land.
- [x] **Drill schedule — SHIPPED 2026-09-19.** Team Meetings → Drill Log & Schedule tracks fire drills (quarterly), Code Adam (every 6 months), Active Shooter/Lockdown, Severe Weather/Shelter-in-Place, and Medical Emergency (all annually), with a compliance tracker (On Track/Due Soon/Overdue) and a Dashboard indicator. Frequencies came from standard emergency-management practice, not a church-supplied cadence — leadership can revise any of them if they want something different.
- [ ] **Background check policy for flagged results.** Background-check status (not_requested / requested / cleared / expired / flagged) is now tracked manually on the roster (Team tab, admin-only column) — see §0f. Background check integration with Ministry Safe or Checkr is deferred until the church has a written policy for handling flagged results, reviewed by counsel.
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

- [x] **Notify the "I Love U Guys" Foundation of SRM use — NO LONGER APPLICABLE.** As of 2026-09-18 (see §0d), the Reunification procedure was rewritten around the church's actual clipboard/ticket method and no longer uses SRM at all, so this obligation does not apply. SRP (used separately for lockdown terminology) is unaffected — SRP only asks to be told, it does not require it, and that item below is unrelated to SRM.
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

**Now covered:** active shooter · lost child/Code Adam · fire & evacuation · reunification · lockdown · shelter-in-place · severe weather · earthquake · flooding · de-escalation · continuity · **medical emergency** · **bomb threat** · **wildfire smoke** · disruptive person/trespassing/suspicious person · weapon in the building · child abuse & mandatory reporting · robbery & cash/offering handling · facility security (doors/alarms/burglary) · power/utility failure & hazmat/biohazard · transportation & off-site ministry emergency · suicide threat or attempt

*(Reunification, Lockdown and Shelter-in-Place had already shipped as procedure
cards by the time this list was last edited — correcting the record rather
than leaving them listed as missing.)*

- [x] **Medical emergency** — cardiac arrest, AED, seizure, falls. Sourced from AHA, Red Cross, CDC and the Epilepsy Foundation. Placed first and open by default, because it is the likeliest emergency this congregation faces. AED locations answered 2026-09-18 — see §0d.
- [x] **Bomb threat / suspicious package.** Decision Maker named 2026-09-18 (Pastor Roger Yadon and/or Tyson Garten, CCST Director) — see §0d. *Still blocked on written evacuation criteria.*
- [x] **Wildfire smoke / air quality.** Note: the EPA/AirNow activity table is written for schools and stops at Very Unhealthy, so the Hazardous (301+) tier is framed as a leadership call rather than given a fabricated threshold.
- [x] **Reunification / child accountability during evacuation.** Method confirmed 2026-09-18 as a clipboard sign-out sheet with a ticket-based pairing — see §0d. No longer based on SRM. *Still blocked on the assembly area / parent check-in location.*
- [x] **Lockdown / lockout / shelter-in-place**, built on SRP directive wording (see the terminology ruling above). *Blocked on which doors lock and who holds keys.*
- [x] **Disruptive person, trespassing & suspicious person on campus** — added 2026-09-15 from the church's own March 2025 CCST policy.
- [x] **Weapon seen in the building** (not yet an active shooter) — added 2026-09-15, same source.
- [x] **Child abuse, neglect & mandatory reporting** — added 2026-09-15, same source. Idaho's specific mandatory-reporting statute is not named in the source document and has not been added here; see §4c for the pattern this project uses for statute citations (verify with counsel, do not rely on a cached number).
- [x] **Robbery & cash/offering handling** — added 2026-09-15, same source.
- [x] **Facility security — doors, alarms & burglary response** — added 2026-09-15, same source.
- [x] **Power/utility failure & biohazard/hazardous material spill** — added 2026-09-15, same source.
- [x] **Transportation & off-site ministry emergency** — added 2026-09-15, same source.
- [x] **Suicide threat or attempt** — added 2026-09-15, same source. The source material does not mention the 988 crisis line; leadership may want it added.

**Still missing**, ranked by likelihood for this specific church:

- [ ] **Missing at-risk adult (dementia wandering).** Code Adam covers children only. With an aging congregation this may outrank lost-child, and the protocol differs — immediate 911, vehicle and canal checks.
- [ ] Extreme heat and cold; who has authority to cancel a service.
- [ ] Crisis communications / mass notification / who speaks for the church.
- [ ] Recovery annex and after-action review.
- [ ] Cyber and donor-data breach.
- [ ] Food safety at fellowship meals.
- [ ] Protest / civil disturbance.
- [ ] Hostage / barricade — Colleyville (2022) was exactly this at a house of worship, and the response diverges sharply from Run-Hide-Fight.
- [ ] Vehicle ramming. *Ranks last on intent* — CISA's own case-study research found only two vehicle rammings at U.S. houses of worship and zero VBIEDs. Worth a short annex only because the **unintentional** version (pedal confusion at the children's-wing drop-off) is far more likely, and the mitigation is identical.

## 7. Academy modules — CLOSED for now (17 modules)

Medical Emergency Response shipped as module ss205 (this closed the gap noted
below the old count). The eight 2026-09-15 procedure cards, plus Bomb Threat
and Shelter-in-Place, now all have training modules as of the 2026-09-16 build
(see §0c): Roving & Sweeps, Facility Safety & Hazard Spotting, Communications
& Escalation, Pastoral Coverage, Crowd Management, Suspicious Persons &
Trespass, Church Animal Policy, HAZMAT & Utilities, Bomb Threat Response,
Shelter-in-Place.

- [x] Medical Emergency module (ss205) — CPR/AED/seizure/falls.
- [x] Every 2026-09-15 procedure card now has a matching Academy module, either one-to-one or combined (Crowd Management and Suspicious Persons & Trespass both draw on "Disruptive Person, Trespassing & Suspicious Person"; Facility Safety & Hazard Spotting draws on the biohazard/electrical/hazmat cards).
- [ ] Idaho's specific criminal-trespass and citizen's-arrest statute language is not cited in Suspicious Persons & Trespass — same pattern as the mandatory-reporting statute (§4c): needs counsel verification before it's added, not carried forward from an unverified source.

---

*An item is removed only when the team has actually supplied the answer — never
because it was filled in with a guess.*

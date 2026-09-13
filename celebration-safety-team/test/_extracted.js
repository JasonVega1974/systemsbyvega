// ════════════════════════════════════════════════════════════════
// ACADEMY DATA — 6 modules. Content based on published guidance:
// CISA, FEMA/Ready.gov, FBI, NCMEC (Code Adam), CPI, Verbal Judo.
// ════════════════════════════════════════════════════════════════
const COURSES = [
  {
    id: 'ss101', icon: '🛡️', title: 'Team Fundamentals & Ministry of Presence',
    meta: '3 lessons · ~15 min · Required first',
    lessons: [
      { title: 'Why This Team Exists', content: `<p>The safety/security team exists so that Celebration Church stays what it is meant to be — an open, welcoming house of worship — while people are protected. Our posture is <strong>hospitality first, protection always</strong>: most of what this team does on a Sunday looks like greeting, watching, and serving.</p><ul><li>We protect <strong>people</strong> (congregation, kids, guests, staff), the <strong>ministry</strong> (services continue safely), and the <strong>facility</strong>.</li><li>We are not police. We observe, report, de-escalate, and manage emergencies until professional responders arrive. In any life-threatening situation, <strong>call 911</strong>.</li><li>Every member serves under a <strong>Team Lead</strong>. The Team Lead makes the call during an incident and is the point of contact for staff and law enforcement.</li></ul><div class="tip-box">💡 Federal guidance for this mission comes from FEMA's <em>Guide for Developing High-Quality Emergency Operations Plans for Houses of Worship</em> and CISA's <em>Protecting Houses of Worship</em> program.</div>` },
      { title: 'Coverage, Posts & Communication', content: `<p>Celebration Church runs three Sunday services: <strong>8:00 AM, 9:45 AM, and 11:30 AM</strong>. Our standing rule:</p><ul><li><strong>Minimum 3 team members per service, including 1 Team Lead.</strong></li><li>Core coverage areas: <strong>foyer/main entrance</strong>, <strong>sanctuary</strong>, and <strong>children's areas</strong> (auditorium + check-in). The parking lot/perimeter is patrolled before and after each service.</li><li>Arrive <strong>30 minutes before</strong> your service; stay until the lobby clears and children's pickup is complete.</li><li>Know your communication method (radio/text thread) and use plain language plus "Code Adam" for a missing child.</li></ul>` },
      { title: 'Situational Awareness & Reporting', content: `<p>Most incidents announce themselves early. Your job is to notice.</p><ul><li>Watch <strong>behavior, not appearance</strong>: agitation, pacing, clothing inconsistent with weather (concealment), fixation on children's areas, testing doors, filming entrances.</li><li>Use a simple standard: <strong>See something → Say something → Do something.</strong> Report to your Team Lead immediately; never investigate alone.</li><li>Attackers usually display <strong>observable behaviours before they act</strong>. The FBI's study of 63 active shooters (2000–2013) found each one displayed roughly four to five concerning behaviours visible to people around them, and that 77% spent a week or longer planning. Early reporting is prevention. The FBI is equally clear that these behaviours are <strong>not predictive and not a checklist</strong> — noticing them means tell your Team Lead, never confront or profile anyone.</li><li>Document incidents the same day: what, where, when, who, and actions taken. Reports feed team meetings and training.</li></ul>` }
    ],
    quiz: [
      { q: 'What is the minimum team staffing for every Celebration Church service?', opts: ['2 members', '3 members including 1 Team Lead', '5 members including 2 Team Leads', '1 Team Lead only'], ans: 1 },
      { q: 'Who directs the team during an active incident?', opts: ['Whoever saw it first', 'The Senior Pastor', 'The Team Lead on duty', 'Dispatch'], ans: 2 },
      { q: 'In a life-threatening emergency, your FIRST call is to:', opts: ['The church office', 'The Team Lead', '911', 'Nampa PD non-emergency line'], ans: 2 },
      { q: 'Situational awareness means watching for:', opts: ['People who look different', 'Suspicious behaviors like door-testing, concealment, or fixation on kids\u2019 areas', 'Only the parking lot', 'Nothing until an alarm sounds'], ans: 1 },
      { q: 'The team\u2019s Sunday posture is best described as:', opts: ['Undercover surveillance', 'Armed deterrence', 'Hospitality first, protection always', 'Strict rule enforcement'], ans: 2 }
    ]
  },
  {
    id: 'ss102', icon: '🕊️', title: 'De-escalation & Verbal Skills',
    meta: '3 lessons · ~15 min',
    lessons: [
      { title: 'Recognizing Escalation Early', content: `<p>De-escalation starts before the shouting. The Crisis Prevention Institute's Crisis Development Model names four levels: <strong>Anxiety → Defensive → Risk Behavior → Tension Reduction</strong>, each with a matching staff response — <em>Supportive</em>, <em>Directive</em>, <em>Safety Interventions</em>, <em>Therapeutic Rapport</em>. (CPI's older material called the third level "acting out"; <strong>Risk Behavior</strong> is the current term, and it means behaviour with the potential to harm the person or someone else.)</p><ul><li>Early signs: raised voice, rapid speech, clenched hands, pacing, invading space, refusing to move along.</li><li>Meet anxiety with <strong>support</strong>, defensiveness with <strong>calm direction</strong> — matching aggression with aggression escalates every time.</li><li>Approach in pairs when possible: one talks, one observes from an angle, both keep an exit path.</li></ul>` },
      { title: 'Core Verbal Techniques', content: `<p>Field-tested techniques taught by CPI, Verbal Judo, and church-security trainers:</p><ul><li><strong>Listen actively and show empathy.</strong> Let them vent; acknowledge feelings without agreeing to demands: "I can hear this really matters to you."</li><li><strong>Respect personal space.</strong> CPI's wording is to stand <strong>at least 1.5 to 3 feet</strong> from an escalating person — that is the whole standoff distance, not a buffer added on top of where you were already standing, and it is a minimum rather than a target. Crowding raises their anxiety and can push them into risk behaviour. Keep non-threatening body language: hands visible, relaxed, slightly bladed stance.</li><li><strong>Calm, low, slow voice.</strong> Never say "calm down" — it does the opposite.</li><li><strong>Ask open-ended questions</strong> ("Can you tell me what happened?") and <strong>offer choices</strong> ("Want to step into the lobby, or sit here and talk?") — choice restores control.</li><li><strong>Set simple limits</strong> and allow silence: "I want to help you, and I need you to lower your voice so we can talk."</li></ul>` },
      { title: 'Knowing When to Disengage', content: `<p>De-escalation requires the other person's participation. It has limits.</p><ul><li>If a weapon appears, threats become specific, or the person advances aggressively — <strong>disengage, protect people, and call 911.</strong></li><li>Position yourself between the person and the congregation, never cornered and never cornering them.</li><li>After any incident: report to the Team Lead, document it, and debrief at the next team meeting.</li></ul><div class="tip-box">📚 Read CPI's free <a href="https://www.crisisprevention.com/blog/general/cpi-s-top-10-de-escalation-tips-revisited/" target="_blank" rel="noopener">Top 10 De-escalation Tips</a> — required reading for this module.</div>` }
    ],
    quiz: [
      { q: 'Which phrase is most likely to escalate an agitated person?', opts: ['\u201cI can hear that you\u2019re upset.\u201d', '\u201cCalm down.\u201d', '\u201cCan you tell me what happened?\u201d', '\u201cWould you like to step into the lobby?\u201d'], ans: 1 },
      { q: 'Offering choices to an agitated person works because it:', opts: ['Distracts them', 'Restores a sense of control', 'Buys time for police', 'Shows authority'], ans: 1 },
      { q: 'Ideal approach when engaging a disruptive individual:', opts: ['Alone, to avoid crowding', 'In pairs — one talks, one observes', 'With the whole team surrounding them', 'From behind'], ans: 1 },
      { q: 'A weapon becomes visible during a conversation. You should:', opts: ['Keep talking calmly', 'Attempt to grab it', 'Disengage, protect people, call 911', 'Ask them to hand it over'], ans: 2 },
      { q: 'CPI says to stand how far from a person who is escalating?', opts: ['Close enough to touch, to build trust', 'At least 1.5 to 3 feet \u2014 crowding raises their anxiety', 'Across the room, calling out to them', 'Directly behind them so they stay calm'], ans: 1 }
    ]
  },
  {
    id: 'ss201', icon: '🚨', title: 'Active Shooter Response: Run · Hide · Fight',
    meta: '3 lessons · ~18 min',
    lessons: [
      { title: 'Run — Hide — Fight', content: `<p>DHS, CISA and the FBI give three <strong>options to consider</strong> — generally preferred in this order, but options rather than a rigid sequence. You take the one the situation allows.</p><ol><li><strong>RUN.</strong> If an escape path exists, evacuate. Leave belongings, move others with you if they'll come, keep hands visible outside.</li><li><strong>HIDE.</strong> If you can't run: out of view, behind locked/blockaded doors, phones silenced, lights off, behind solid cover. Spread out; stay quiet.</li><li><strong>FIGHT.</strong> Last resort, when your life is in imminent danger: commit fully, act with aggression, use improvised weapons, work together to incapacitate.</li></ol><p>As team members our added duty is to <strong>move people</strong>: direct evacuations toward safe exits, push groups into lockable rooms, and account for children's areas first.</p>` },
      { title: 'Calling 911 & Police Arrival', content: `<ul><li><strong>Call 911 when safe.</strong> Report: location within the building, shooter description/count, weapons seen, and casualties. Stay on the line if possible.</li><li>When officers arrive: <strong>hands visible and empty, fingers spread, follow commands instantly.</strong> Do not run at officers, point, scream, or grab them for help — their first job is stopping the threat, not treating the injured.</li><li>Expect follow-on waves: rescue teams, EMS staging, and a family reunification point. The Team Lead coordinates with incident command.</li></ul>` },
      { title: 'Prevention: The Pathway to Violence', content: `<p>Most attackers don't "snap" — they plan, and planning is observable. The <strong>Pathway to Violence</strong> model, developed by <strong>Frederick Calhoun and Steve Weston</strong> and built on US Secret Service threat-assessment research, describes escalating stages: <strong>grievance → ideation → research/planning → preparation → breach → attack</strong>. CISA distributes a fact sheet referencing that research; the model is not CISA's own.</p><p>Treat this as a reason to <em>report early</em>, not as a diagnostic tool. The FBI, whose 2018 study of pre-attack behaviours is the best evidence we have that these behaviours are visible, states plainly that they are not predictive and must not be used as a checklist against individuals.</p><ul><li>Take seriously: leaked threats, fixation on past church attacks, surveillance-like behavior, probing doors and security.</li><li>Report concerns to the Team Lead and leadership; contact Nampa PD ((208) 465-2257) for guidance on concerning individuals. Documentation matters.</li><li>Primary sources: FBI, <a href="https://www.fbi.gov/file-repository/reports-and-publications/pre-attack-behaviors-of-active-shooters-in-us-2000-2013.pdf" target="_blank" rel="noopener">A Study of the Pre-Attack Behaviors of Active Shooters in the United States, 2000–2013</a> · CISA, <a href="https://www.cisa.gov/resources-tools/resources/pathway-violence" target="_blank" rel="noopener">Pathway to Violence fact sheet</a>.</li><li>Complete FEMA's free <a href="https://training.fema.gov/programs/independent-study/courseoverview.aspx?code=is-907.a&amp;lang=en" target="_blank" rel="noopener">IS-907.A: Active Shooter — What You Can Do</a> as the companion to this module.</li></ul>` }
    ],
    quiz: [
      { q: 'The preferred FIRST option in an active shooter event is:', opts: ['Fight', 'Hide', 'Run / evacuate', 'Negotiate'], ans: 2 },
      { q: 'When hiding, you should:', opts: ['Group everyone tightly together in one corner', 'Lock/blockade doors, silence phones, stay behind solid cover', 'Keep the door open to hear the shooter', 'Play dead immediately'], ans: 1 },
      { q: 'When police arrive, you should:', opts: ['Run to them for protection', 'Point and shout directions', 'Keep hands visible and empty, follow commands', 'Lead them to the injured first'], ans: 2 },
      { q: '\u201cFight\u201d is appropriate:', opts: ['As soon as you see the shooter', 'Only as a last resort when your life is in imminent danger', 'Never', 'Whenever you outnumber the shooter'], ans: 1 },
      { q: 'The \u201cPathway to Violence\u201d teaches that attackers:', opts: ['Always act spontaneously', 'Usually display observable planning behaviors first', 'Cannot be detected in advance', 'Only target large events'], ans: 1 }
    ]
  },
  {
    id: 'ss202', icon: '🧒', title: 'Lost Child & Code Adam',
    meta: '3 lessons · ~15 min',
    lessons: [
      { title: 'Prevention: Secure Check-In', content: `<p>The best missing-child response is the one that never has to happen. Celebration Kids uses a secure check-in process — the team's job is to keep it airtight.</p><ul><li><strong>Every child, every tag, every time.</strong> Pickup requires the matching claim tag; no tag means a staff-verified ID process — no exceptions, even for people we recognize.</li><li>Watch children's hallways for adults without a child or a serving role; politely redirect them.</li><li>Exterior doors near kids' areas are monitored during transitions (drop-off, dismissal).</li></ul>` },
      { title: 'The Six Steps of Code Adam', content: `<p>Code Adam is NCMEC's free national missing-child protocol, named for Adam Walsh. The six steps, in NCMEC's order:</p><ol><li><strong>Get a description</strong> — name, age, gender, hair and eye colour, height, weight, and clothing <strong>including shoes</strong> (clothes are easy to change; shoes usually aren't). Ask the guardian for a photo.</li><li><strong>Page "Code Adam"</strong> with the description over the team channel.</li><li><strong>Begin the search.</strong> Cover every exterior door and the parking lot so nothing leaves unnoticed, sweep the building — sanctuary, kids' rooms, restrooms, hallways, play areas — and <strong>walk the parent or guardian to the main entrance</strong> to help identify the child.</li><li><strong>Call 911 immediately.</strong> Not after ten minutes, not after the sweep. The call goes out while the search is still running.</li><li><strong>Locate the child.</strong> Found safe → reunite with the verified parent/guardian and check the tag. Found with a non-guardian → reasonable, non-violent delay; note description, vehicle, direction; hand off to police.</li><li><strong>Conclude.</strong> Announce <strong>"Code Adam cancelled"</strong> so the whole building stands down, and report the incident to leadership — false alarms included.</li></ol><div class="alert-box">⏱️ <strong>No waiting period.</strong> NCMEC's own wording is "DON'T HESITATE, CALL 911 IMMEDIATELY." A delay rule is not part of this protocol.</div>` },
      { title: 'Reunification & Aftermath', content: `<ul><li>Only end a Code Adam when the child is found safe or law enforcement takes over — and end it <strong>out loud</strong>, with a "Code Adam cancelled" announcement. A building nobody stood down is still a building in a live alert.</li><li>Reunify away from crowds; verify the claim tag / guardian identity before release.</li><li>Debrief the same day: what worked, gaps in door coverage, timing. Update procedures.</li><li>Order the free official kit (poster, checklist, training video, employee quiz) at <a href="https://www.missingkids.org/education/training/codeadam" target="_blank" rel="noopener">missingkids.org</a>.</li></ul>` }
    ],
    quiz: [
      { q: 'Why do Code Adam descriptions emphasize the child\u2019s SHOES?', opts: ['Shoes are expensive', 'Clothing is easy to change quickly; shoes usually aren\u2019t', 'Shoes show the child\u2019s age', 'It\u2019s just tradition'], ans: 1 },
      { q: 'Immediately after the Code Adam page goes out, exterior doors are:', opts: ['Locked with chains', 'Monitored so no child leaves unnoticed', 'Ignored — everyone searches', 'Opened for police'], ans: 1 },
      { q: 'When do you call 911 during a Code Adam?', opts: ['After searching for 10 minutes', 'Immediately — the call goes out while the search is still running', 'Only if the child is found with a stranger', 'After reviewing the cameras'], ans: 1 },
      { q: 'A Code Adam ends. What has to happen before the team stands down?', opts: ['Nothing — people work it out', 'Announce \u201cCode Adam cancelled\u201d and report the incident to leadership', 'Wait for the next service', 'Only report it if the child was actually missing'], ans: 1 },
      { q: 'The child is found with someone who is NOT a parent/guardian. You should:', opts: ['Tackle the person', 'Let them leave to avoid a scene', 'Use reasonable non-violent delay, note description/vehicle, involve police', 'Take a photo and post it'], ans: 2 },
      { q: 'Secure children\u2019s pickup at Celebration requires:', opts: ['A matching claim tag or staff-verified ID — every time', 'Recognition by a volunteer', 'The child pointing at the adult', 'Nothing after the last service'], ans: 0 }
    ]
  },
  {
    id: 'ss203', icon: '🔥', title: 'Fire & Evacuation',
    meta: '3 lessons · ~15 min',
    lessons: [
      { title: 'Evacuation Roles & Routes', content: `<ul><li>On alarm: the decision is already made — <strong>evacuate.</strong> Team members move to assigned zones: sanctuary doors, foyer, children's auditorium, children's check-in.</li><li>Direct people to the <strong>nearest safe exit</strong> — never through smoke; stay low if smoke is present.</li><li>Children evacuate <strong>by class with their leaders</strong>; parents are directed to reunify at the assembly area, not in hallways (hallway reunification blocks the evacuation).</li><li>Assist people with mobility needs — know accessible routes and refuge areas in advance (marked on the site schematic).</li></ul>` },
      { title: 'Fire Response Basics', content: `<ul><li><strong>Call 911</strong> for any fire, even if it appears extinguished.</li><li>Only fight a fire if <strong>every one</strong> of the U.S. Fire Administration's conditions is true: everyone else has been alerted, the fire department has been called, you are physically able, the fire is small and contained to a single object, you are safe from toxic smoke, and <strong>you have a clear escape route</strong>. If any answer is no, leave. Then <strong>PASS</strong>: <strong>P</strong>ull the pin · <strong>A</strong>im low, at the base of the fire · <strong>S</strong>queeze the lever slowly and evenly · <strong>S</strong>weep the nozzle side to side.</li><li>Close doors behind you as areas clear to slow spread. Never use elevators.</li><li>Keep driveways and hydrants clear for arriving apparatus; a team member meets the first units to report status and anyone missing.</li></ul>` },
      { title: 'Assembly & Accountability', content: `<ul><li>Everyone proceeds to the designated <strong>assembly area</strong> (to be marked on the uploaded schematic) — far enough from the building for safety and fire access.</li><li>Team Leads account for team members, staff, and children's classes; anyone unaccounted for (and last known location) is reported to fire command — <strong>never re-enter to search.</strong></li><li>Re-entry only when fire officials declare the building safe.</li><li>Reference: <a href="https://www.usfa.fema.gov/prevention/workplace-fires/" target="_blank" rel="noopener">USFA — Workplace &amp; non-residential fires</a>, <a href="https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/fire-extinguishers/" target="_blank" rel="noopener">USFA — fire extinguishers (the PASS preconditions)</a>, and the Nampa Fire Department's guidance on drills for assembly occupancies.</li></ul>` }
    ],
    quiz: [
      { q: 'During evacuation, parents of checked-in children should:', opts: ['Go to the kids\u2019 rooms to grab their child', 'Reunify at the assembly area after classes evacuate together', 'Wait in the foyer', 'Drive around the building'], ans: 1 },
      { q: 'PASS stands for:', opts: ['Point, Alert, Spray, Stop', 'Pull, Aim, Squeeze, Sweep', 'Prepare, Act, Stay, Safe', 'Pull, Alarm, Smother, Stand'], ans: 1 },
      { q: 'You should attempt to fight a fire only if:', opts: ['It\u2019s smaller than a car', 'Everyone is alerted, 911 is called, it\u2019s small and contained, you\u2019re able and trained, and you have a clear escape route', 'Others are watching', 'The alarm hasn\u2019t sounded yet'], ans: 1 },
      { q: 'Someone is unaccounted for at the assembly area. You should:', opts: ['Re-enter and search', 'Report them and their last known location to fire command', 'Wait 10 minutes', 'Assume they went home'], ans: 1 },
      { q: 'When is re-entry allowed after a fire alarm?', opts: ['When the alarm stops', 'After 15 minutes', 'When fire officials declare the building safe', 'When smoke is no longer visible'], ans: 2 }
    ]
  },
  {
    id: 'ss204', icon: '🌪️', title: 'Severe Weather, Earthquake & Continuity',
    meta: '3 lessons · ~18 min',
    lessons: [
      { title: 'Tornado & Severe Weather', content: `<ul><li><strong>Watch = conditions possible, be ready. Warning = happening or imminent, act now.</strong> Monitor NWS Boise for the Treasure Valley.</li><li>Tornado warning: move everyone to <strong>interior rooms and hallways on the lowest level, away from windows</strong>. Crouch low, protect heads.</li><li><strong>Do not shelter in the sanctuary.</strong> NWS names large open rooms — auditoriums, gymnasiums, cafeterias — as places specifically to avoid. Our sanctuary and fellowship hall are that building type. Getting several hundred people out of the room they are already sitting in is the hard part of this procedure, and it is the part that matters.</li><li>Do not send people to their cars to shelter. (Someone already on the road should drive to the nearest sturdy building.)</li><li>Winter weather: leadership calls delays/cancellations early; the team manages lot conditions, salted walkways, and entrance safety.</li></ul>` },
      { title: 'Earthquake: Drop, Cover, Hold On', content: `<ul><li>During shaking: <strong>DROP</strong> to hands and knees, <strong>COVER</strong> head and neck under sturdy furniture if possible, <strong>HOLD ON</strong> until it stops.</li><li>Idaho's large earthquakes have struck the <strong>central</strong> part of the state — Borah Peak (1983, M6.9) and Stanley (2020, M6.5), both 250–300 km away. Nampa is in the western Snake River Plain. What we plan for is <strong>felt shaking from a distant event</strong> mid-service: enough to start a panic, drop light fixtures and put people on the floor in a crowded room.</li><li>Do not run outside during shaking; falling debris and glass cause most injuries. Stay clear of windows and tall fixtures.</li><li>After: check for injuries, gas odor, structural damage, and fire; evacuate to the assembly area if the building is suspect. Expect aftershocks.</li></ul>` },
      { title: 'Flooding & Church Continuity', content: `<ul><li>Flooding: move people up and away; <strong>Turn Around, Don't Drown</strong> — 6 inches of fast-moving water knocks an adult over, 12 inches carries away most cars, 2 feet carries away SUVs and trucks. Never route traffic through flooded lot sections, and never assume the church van rides higher than the number.</li><li><strong>Continuity of ministry</strong> (per FEMA continuity guidance): know the church's essential functions, who succeeds whom in leadership, the alternate worship location/online option, the congregation notification method, and where vital records are backed up.</li><li>The team's continuity role: secure the facility, support communication, and staff the alternate site's first services.</li></ul>` }
    ],
    quiz: [
      { q: 'A tornado WARNING during second service means:', opts: ['Continue and monitor', 'Move everyone to interior lowest-level rooms/hallways away from windows now', 'Evacuate to vehicles', 'Move everyone to the sanctuary center'], ans: 1 },
      { q: 'During earthquake shaking you should:', opts: ['Run outside immediately', 'Stand in a doorway', 'Drop, Cover, Hold On', 'Pull the fire alarm'], ans: 2 },
      { q: '\u201cTurn Around, Don\u2019t Drown\u201d exists because:', opts: ['Flood water is dirty', 'As little as 6\u2033 of moving water can knock an adult down', 'Cars float at 3 feet only', 'It rhymes'], ans: 1 },
      { q: 'Continuity planning identifies all of the following EXCEPT:', opts: ['Essential functions', 'Orders of succession', 'Alternate facilities', 'Sermon topics for next year'], ans: 3 },
      { q: 'A Watch vs. a Warning:', opts: ['They mean the same thing', 'Watch = conditions possible; Warning = happening/imminent — act now', 'Warning comes before Watch', 'Watches are only for winter storms'], ans: 1 }
    ]
  }
];

/* Each step carries a STABLE id. v1 stored completion as array indices, so
   reordering or inserting a step silently re-mapped every volunteer's finished
   work onto different steps — on a compliance checklist that gates whether
   someone may serve. The ids below must never be reused or renamed; the text
   beside them can change freely. */
const ONBOARD_ITEMS = [
  { id: 'manual',     text: 'Read the 25-page Safety & Security Onboarding Manual (placeholder until uploaded)' },
  { id: 'meet-lead',  text: 'Meet the Team Lead(s) and receive your service assignment' },
  { id: 'walk-site',  text: 'Walk the full facility: foyer, sanctuary, children\u2019s auditorium, children\u2019s check-in, all exits, perimeter' },
  { id: 'maps',       text: 'Review Facility Maps & the site schematic (routes, assembly area, AED/extinguishers)' },
  { id: 'directory',  text: 'Review the Leadership/Staff directory — know who\u2019s who on sight' },
  { id: 'mod-ss101',  text: 'Complete Academy module SS-101: Team Fundamentals' },
  { id: 'mod-ss102',  text: 'Complete Academy module: De-escalation & Verbal Skills' },
  { id: 'mod-rest',   text: 'Complete Academy modules: Active Shooter, Code Adam, Fire & Evacuation, Severe Weather' },
  { id: 'procedures', text: 'Review all Emergency Procedures incl. church continuity' },
  { id: 'numbers',    text: 'Save key numbers: 911 · Nampa PD (208) 465-2257 · Church office (208) 466-5433' },
  { id: 'shadow',     text: 'Shadow one full Sunday (all three services) with a Team Lead' },
  { id: 'signoff',    text: 'Sign off with the Team Lead — cleared for the schedule' }
];
// ════════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════════
const LS_KEY = 'ccssta_v1';
/* Bumped whenever the shape of S changes. load() migrates forward; it never
   silently accepts a shape it does not understand, because a half-understood
   roster is worse than a visible failure. */
const SCHEMA_VERSION = 2;
let S = load();
function defaults() {
  return {
    schemaVersion: SCHEMA_VERSION,
    pin: '2121',
    team: [],
    leaders: [
      { id: 'ld1', name: 'Roger Yadon', title: 'Senior Pastor', notes: 'Verified from thecelebration.church/our-team' }
    ],
    meetings: [],
    schedule: {},   // { '2026-09-20': { s0:{lead:'',members:[]}, s1:{...}, s2:{...} } }
    /* Training and onboarding are PER PERSON, keyed by roster member id.
       'guest' holds anyone training before they have been added to the roster.
       { '<memberId>': { name, training: { courseId: {...} }, onboard: [stepId] } } */
    progress: {},
    activeId: 'guest',     // who is using this browser. Not auth — see the PIN note.
    activity: []
  };
}

/* v1 kept ONE trainee name, ONE training record and ONE onboarding list for the
   whole browser, while team/schedule/meetings were shared org data in the same
   blob. Two volunteers on the church's foyer tablet overwrote each other's
   certifications, and a Team Lead had no way to see who was actually cleared to
   serve. This migration is what makes the Phase 3 completion matrix possible. */
function migrate(raw) {
  const from = raw.schemaVersion || 1;
  const d = Object.assign(defaults(), raw);
  d.schemaVersion = from;

  if (d.schemaVersion < 2) {
    d.progress = d.progress || {};
    const oldTraining = d.training || {};
    const oldOnboard = Array.isArray(d.onboard) ? d.onboard : [];
    const oldName = (d.trainee || '').trim();

    if (Object.keys(oldTraining).length || oldOnboard.length || oldName) {
      /* Attach the orphaned record to the roster member whose name matches it.
         Failing that it becomes the guest record, which stays visible and
         reassignable rather than being dropped. */
      const match = (d.team || []).find(m =>
        (m.first + ' ' + m.last).trim().toLowerCase() === oldName.toLowerCase() && oldName);
      const id = match ? match.id : 'guest';
      const bucket = d.progress[id] || (d.progress[id] = { name: oldName, training: {}, onboard: [] });
      if (!bucket.name) bucket.name = oldName;

      Object.keys(oldTraining).forEach(cid => {
        const rec = oldTraining[cid];
        /* Every v1 module had exactly five questions, so that is what these
           scores were measured against. Stamping it keeps an existing
           certificate reading correctly now that ss202 has six. */
        if (rec && rec.quizScore != null && !rec.quizTotal) rec.quizTotal = 5;
        bucket.training[cid] = rec;
      });
      /* Indices -> stable ids, using the v1 order, which is unchanged. */
      bucket.onboard = oldOnboard.map(i => ONBOARD_ITEMS[i] && ONBOARD_ITEMS[i].id).filter(Boolean);
      d.activeId = id;
    }
    delete d.training; delete d.onboard; delete d.trainee;
    d.schemaVersion = 2;
  }
  return d;
}
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) {}
  return defaults();
}

// ── Who is using this browser ──
function getProgress(id) {
  if (!S.progress[id]) S.progress[id] = { name: '', training: {}, onboard: [] };
  return S.progress[id];
}
function activeProgress() { return getProgress(S.activeId || 'guest'); }
function activeName() {
  const m = S.team.find(x => x.id === S.activeId);
  if (m) return (m.first + ' ' + m.last).trim();
  return (activeProgress().name || '').trim();
}
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {} }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function addActivity(msg) {
  S.activity.unshift({ t: new Date().toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }), msg });
  S.activity = S.activity.slice(0, 12);
  save(); renderActivity();
}
function getCS(id, memberId) {
  const t = getProgress(memberId || S.activeId || 'guest').training;
  if (!t[id]) t[id] = { doneLessons: [], quizScore: null, quizTotal: null, quizPassed: false, certName: '' };
  return t[id];
}

// ════════════════════════════════════════════════════════════════
// BACKUP / RESTORE
//
// localStorage is per-browser and one "clear browsing data" away from losing
// the entire roster, schedule and every training record. Until Phase 4 puts
// this behind a real shared backend, an exported JSON file IS the backup
// strategy, so it ships before anything else.
// ════════════════════════════════════════════════════════════════
function backupStatus(msg, color) {
  const el = document.getElementById('backupStatus');
  if (el) { el.textContent = msg; el.style.color = color || 'var(--tx3)'; }
}
function exportData() {
  const payload = {
    app: 'ccssta',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    church: 'Celebration Church — Safety & Security Team',
    data: S
  };
  const stamp = new Date();
  const name = 'celebration-safety-backup-' +
    stamp.getFullYear() + '-' +
    String(stamp.getMonth() + 1).padStart(2, '0') + '-' +
    String(stamp.getDate()).padStart(2, '0') + '.json';
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    backupStatus('✅ Exported ' + name + ' — ' + S.team.length + ' team members, ' +
      Object.keys(S.schedule).length + ' scheduled Sundays, ' + S.meetings.length + ' meetings.', 'var(--gr)');
    addActivity('Exported data backup');
  } catch (e) {
    backupStatus('❌ Export failed: ' + e.message, '#f87171');
  }
}
function importData(input) {
  const file = input.files && input.files[0];
  input.value = '';               // so re-picking the same file fires onchange again
  if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => backupStatus('❌ Could not read that file.', '#f87171');
  reader.onload = () => {
    let payload;
    try { payload = JSON.parse(reader.result); }
    catch (e) { backupStatus('❌ That file is not valid JSON.', '#f87171'); return; }

    /* Validate before touching anything. Restoring garbage over a live roster is
       the one mistake this feature could make that is worse than not having it. */
    if (!payload || payload.app !== 'ccssta' || !payload.data || typeof payload.data !== 'object') {
      backupStatus('❌ Not a Celebration Safety Team backup file.', '#f87171'); return;
    }
    const d = payload.data;
    const missing = ['team', 'leaders', 'meetings', 'schedule'].filter(k => !(k in d));
    if (missing.length) {
      backupStatus('❌ Backup is missing: ' + missing.join(', ') + '. Not restored.', '#f87171'); return;
    }
    if ((payload.schemaVersion || 1) > SCHEMA_VERSION) {
      backupStatus('❌ That backup was made by a newer version of this app. Update first.', '#f87171'); return;
    }

    const when = payload.exportedAt ? new Date(payload.exportedAt).toLocaleString('en-US') : 'an unknown date';
    const summary = (d.team || []).length + ' team members, ' +
      Object.keys(d.schedule || {}).length + ' scheduled Sundays, ' +
      (d.meetings || []).length + ' meetings, ' + (d.leaders || []).length + ' staff entries';
    if (!confirm(
      'Restore this backup?\n\nFrom: ' + when + '\nContains: ' + summary +
      '\n\nThis REPLACES everything currently in this browser:\n' +
      S.team.length + ' team members, ' + Object.keys(S.schedule).length + ' scheduled Sundays, ' +
      S.meetings.length + ' meetings.\n\nThis cannot be undone.'
    )) { backupStatus('Restore cancelled — nothing changed.'); return; }

    S = migrate(d);
    save();
    renderTeam(); renderLeaders(); renderMeetings(); renderSchedule(); renderOnboard();
    renderCourses(); refreshDash(); applyAdmin();
    backupStatus('✅ Restored backup from ' + when + '.', 'var(--gr)');
    addActivity('Restored data from backup (' + summary + ')');
  };
  reader.readAsText(file);
}

// ════════════════════════════════════════════════════════════════
// NAV
// ════════════════════════════════════════════════════════════════
function showSection(key, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-' + key).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  else document.querySelectorAll('.nav-item').forEach(n => { if (n.textContent.toLowerCase().includes(key === 'academy' ? 'academy' : key)) n.classList.add('active'); });
}
function navTo(key) {
  const items = Array.from(document.querySelectorAll('.nav-item'));
  const map = { academy:'Academy', leadership:'Leadership', maps:'Facility Maps', team:'Team', scheduling:'Scheduling' };
  const el = items.find(n => n.textContent.trim().startsWith(map[key] || '###'));
  showSection(key, el || null);
  window.scrollTo({ top: 0 });
}

// ════════════════════════════════════════════════════════════════
// ADMIN PIN
// ════════════════════════════════════════════════════════════════
let adminOn = false, pinBuf = '';
function toggleAdmin() {
  if (adminOn) {
    if (confirm('Lock admin mode?\n\n(OK = lock · Cancel = stay unlocked. To change the PIN, stay unlocked and use the Change PIN option in the Team tab.)')) {
      adminOn = false; applyAdmin(); addActivity('Admin locked');
    }
    return;
  }
  pinBuf = ''; updateDots(); updatePinHint();
  document.getElementById('pinError').textContent = '';
  document.getElementById('adminGate').classList.add('open');
}
function pinKey(k) {
  if (k === 'back') pinBuf = pinBuf.slice(0, -1);
  else if (k === 'clear') pinBuf = '';
  else if (pinBuf.length < 4) pinBuf += k;
  updateDots();
  if (pinBuf.length === 4) {
    if (pinBuf === S.pin) {
      adminOn = true; document.getElementById('adminGate').classList.remove('open');
      applyAdmin(); addActivity('Admin unlocked');
    } else {
      document.getElementById('pinError').textContent = 'Incorrect PIN';
      pinBuf = ''; setTimeout(updateDots, 350);
    }
  }
}
/* The default-PIN hint is a bootstrap aid, not a permanent label. v1 printed
   "Default is 2121" to every visitor forever, including long after the PIN had
   been changed — handing out a credential hint that was no longer even true. */
function updatePinHint() {
  const el = document.getElementById('pinGateSub');
  if (!el) return;
  el.innerHTML = S.pin === '2121'
    ? 'Enter the 4-digit admin PIN. Default is <strong style="color:var(--c);">2121</strong> — <strong style="color:var(--c);">change it after first use.</strong>'
    : 'Enter the 4-digit admin PIN.';
}
function updateDots() { for (let i = 0; i < 4; i++) document.getElementById('pd' + i).classList.toggle('filled', i < pinBuf.length); }
function closeAdminGate() { document.getElementById('adminGate').classList.remove('open'); }
function changePin() {
  const np = prompt('Enter a new 4-digit admin PIN:');
  if (np && /^\d{4}$/.test(np)) { S.pin = np; save(); updatePinHint(); alert('Admin PIN updated.'); addActivity('Admin PIN changed'); }
  else if (np !== null) alert('PIN must be exactly 4 digits.');
}
function applyAdmin() {
  const chip = document.getElementById('adminChip');
  chip.textContent = adminOn ? '🔓 Admin ON' : '🔒 Admin';
  chip.style.background = adminOn ? 'rgba(34,197,94,.12)' : '';
  chip.style.borderColor = adminOn ? 'rgba(34,197,94,.4)' : '';
  chip.style.color = adminOn ? 'var(--gr)' : '';
  document.getElementById('addMemberBtn').style.display = adminOn ? '' : 'none';
  document.getElementById('addLeaderBtn').style.display = adminOn ? '' : 'none';
  document.getElementById('addMeetingBtn').style.display = adminOn ? '' : 'none';
  document.getElementById('teamActionsHead').style.display = adminOn ? '' : 'none';
  document.getElementById('teamAdminNote').style.display = adminOn ? 'none' : '';
  document.getElementById('meetAdminNote').style.display = adminOn ? 'none' : '';
  document.getElementById('leaderAdminNote').style.display = adminOn ? 'none' : '';
  document.getElementById('schedAdminNote').style.display = adminOn ? 'none' : '';
  document.getElementById('adminToolsCard').style.display = adminOn ? '' : 'none';
  renderTeam(); renderLeaders(); renderMeetings(); renderSchedule();
}

// ════════════════════════════════════════════════════════════════
// TEAM
// ════════════════════════════════════════════════════════════════
let editingMemberId = null;
const SPEC_CLASS = { 'Police / Law Enforcement':'spec-police', 'Fire':'spec-fire', 'First Responder / EMS':'spec-medical', 'Medical (Nurse / Doctor)':'spec-medical', 'Military / Veteran':'spec-military', 'Security Professional':'spec-police', 'General / Trained Volunteer':'spec-general' };
function openMemberModal(id) {
  editingMemberId = id || null;
  document.getElementById('memberModalTitle').textContent = id ? '🛡️ EDIT TEAM MEMBER' : '🛡️ ADD TEAM MEMBER';
  const m = id ? S.team.find(x => x.id === id) : null;
  document.getElementById('mFirst').value = m ? m.first : '';
  document.getElementById('mLast').value = m ? m.last : '';
  document.getElementById('mPhone').value = m ? m.phone : '';
  document.getElementById('mSpec').value = m ? m.spec : 'General / Trained Volunteer';
  document.getElementById('mRole').value = m ? m.role : 'Team Member';
  document.getElementById('memberModal').classList.add('open');
}
function saveMember() {
  const first = document.getElementById('mFirst').value.trim();
  const last = document.getElementById('mLast').value.trim();
  const phone = document.getElementById('mPhone').value.trim();
  if (!first || !last) { alert('First and last name are required.'); return; }
  const data = { first, last, phone, spec: document.getElementById('mSpec').value, role: document.getElementById('mRole').value };
  if (editingMemberId) Object.assign(S.team.find(x => x.id === editingMemberId), data);
  else S.team.push(Object.assign({ id: 'tm' + Date.now() }, data));
  save(); closeModalEl('memberModal'); renderTeam(); renderSchedule(); renderCourses(); refreshDash();
  addActivity((editingMemberId ? 'Updated' : 'Added') + ' team member: ' + first + ' ' + last);
  editingMemberId = null;
}
function deleteMember(id) {
  const m = S.team.find(x => x.id === id);
  if (!confirm('Remove ' + m.first + ' ' + m.last + ' from the roster? They will also be removed from schedules.')) return;
  S.team = S.team.filter(x => x.id !== id);
  Object.values(S.schedule).forEach(day => Object.values(day).forEach(svc => {
    if (svc.lead === id) svc.lead = '';
    svc.members = svc.members.map(x => x === id ? '' : x);
  }));
  save(); renderTeam(); renderSchedule(); refreshDash(); addActivity('Removed team member: ' + m.first + ' ' + m.last);
}
function renderTeam() {
  const tb = document.getElementById('teamBody');
  document.getElementById('teamEmpty').style.display = S.team.length ? 'none' : '';
  document.getElementById('hs-team').textContent = S.team.length;
  tb.innerHTML = S.team.map(m => `
    <tr>
      <td style="font-weight:700;color:var(--tx);">${esc(m.first)}</td>
      <td style="font-weight:700;color:var(--tx);">${esc(m.last)}</td>
      <td><a href="tel:${esc(m.phone.replace(/\D/g,''))}" style="color:var(--bl);">${esc(m.phone)}</a></td>
      <td><span class="spec-tag ${SPEC_CLASS[m.spec] || 'spec-general'}">${esc(m.spec)}</span></td>
      <td>${m.role === 'Team Lead' ? '<span class="lead-tag">★ TEAM LEAD</span>' : '<span style="color:var(--tx2);">Team Member</span>'}</td>
      ${adminOn ? `<td><button class="btn btn-ghost" style="padding:.25rem .55rem;font-size:.68rem;" onclick="openMemberModal('${m.id}')">Edit</button> <button class="btn btn-ghost" style="padding:.25rem .55rem;font-size:.68rem;color:#f87171;" onclick="deleteMember('${m.id}')">✕</button></td>` : ''}
    </tr>`).join('');
}

// ════════════════════════════════════════════════════════════════
// LEADERSHIP
// ════════════════════════════════════════════════════════════════
let editingLeaderId = null;
function openLeaderModal(id) {
  editingLeaderId = id || null;
  document.getElementById('leaderModalTitle').textContent = id ? '⛪ EDIT LEADERSHIP / STAFF' : '⛪ ADD LEADERSHIP / STAFF';
  const l = id ? S.leaders.find(x => x.id === id) : null;
  document.getElementById('lName').value = l ? l.name : '';
  document.getElementById('lTitle').value = l ? l.title : '';
  document.getElementById('lNotes').value = l ? (l.notes || '') : '';
  document.getElementById('leaderModal').classList.add('open');
}
function saveLeader() {
  const name = document.getElementById('lName').value.trim();
  const title = document.getElementById('lTitle').value.trim();
  if (!name || !title) { alert('Name and title are required.'); return; }
  const data = { name, title, notes: document.getElementById('lNotes').value.trim() };
  if (editingLeaderId) Object.assign(S.leaders.find(x => x.id === editingLeaderId), data);
  else S.leaders.push(Object.assign({ id: 'ld' + Date.now() }, data));
  save(); closeModalEl('leaderModal'); renderLeaders();
  addActivity((editingLeaderId ? 'Updated' : 'Added') + ' staff entry: ' + name);
  editingLeaderId = null;
}
function deleteLeader(id) {
  const l = S.leaders.find(x => x.id === id);
  if (!confirm('Remove ' + l.name + ' from the directory?')) return;
  S.leaders = S.leaders.filter(x => x.id !== id);
  save(); renderLeaders(); addActivity('Removed staff entry: ' + l.name);
}
function renderLeaders() {
  document.getElementById('leaderGrid').innerHTML = S.leaders.map(l => `
    <div class="course-card" style="cursor:default;">
      <div style="width:100%;height:110px;border:2px dashed var(--bd2);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--tx3);font-size:.68rem;margin-bottom:.6rem;">📷 Photo placeholder</div>
      <div class="cc-title">${esc(l.name)}</div>
      <div style="font-size:.72rem;font-weight:800;color:var(--c);letter-spacing:.5px;">${esc(l.title)}</div>
      ${l.notes ? `<div style="font-size:.72rem;color:var(--tx2);margin-top:.3rem;line-height:1.5;">${esc(l.notes)}</div>` : ''}
      ${adminOn ? `<div style="margin-top:.55rem;"><button class="btn btn-ghost" style="padding:.22rem .5rem;font-size:.66rem;" onclick="openLeaderModal('${l.id}')">Edit</button> <button class="btn btn-ghost" style="padding:.22rem .5rem;font-size:.66rem;color:#f87171;" onclick="deleteLeader('${l.id}')">✕</button></div>` : ''}
    </div>`).join('');
}

// ════════════════════════════════════════════════════════════════
// MEETINGS
// ════════════════════════════════════════════════════════════════
function openMeetingModal() {
  document.getElementById('mtDate').value = ''; document.getElementById('mtTime').value = '';
  document.getElementById('mtTitle').value = ''; document.getElementById('mtNotes').value = '';
  document.getElementById('meetingModal').classList.add('open');
}
function saveMeeting() {
  const date = document.getElementById('mtDate').value, title = document.getElementById('mtTitle').value.trim();
  if (!date || !title) { alert('Date and topic are required.'); return; }
  S.meetings.push({ id: 'mt' + Date.now(), date, time: document.getElementById('mtTime').value, title, notes: document.getElementById('mtNotes').value.trim() });
  S.meetings.sort((a, b) => b.date.localeCompare(a.date));
  save(); closeModalEl('meetingModal'); renderMeetings(); addActivity('Meeting logged: ' + title);
}
function deleteMeeting(id) {
  if (!confirm('Delete this meeting record?')) return;
  S.meetings = S.meetings.filter(m => m.id !== id);
  save(); renderMeetings();
}
function renderMeetings() {
  document.getElementById('meetingEmpty').style.display = S.meetings.length ? 'none' : '';
  document.getElementById('meetingList').innerHTML = S.meetings.map(m => {
    const d = new Date(m.date + 'T12:00:00');
    return `<div class="card">
      <div style="display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;">
        <div style="text-align:center;background:var(--s1);border:1px solid var(--bd2);border-radius:10px;padding:.35rem .6rem;min-width:56px;">
          <div style="font-family:var(--fh);font-size:1.15rem;color:var(--c);line-height:1;">${d.getDate()}</div>
          <div style="font-size:.6rem;color:var(--tx3);font-weight:800;">${d.toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</div>
        </div>
        <div style="flex:1;">
          <div style="font-weight:800;font-size:.92rem;">${esc(m.title)}</div>
          <div style="font-size:.7rem;color:var(--tx3);">${d.toLocaleDateString('en-US',{weekday:'long',year:'numeric'})}${m.time ? ' · ' + esc(m.time) : ''}</div>
        </div>
        ${adminOn ? `<button class="btn btn-ghost" style="padding:.25rem .55rem;font-size:.68rem;color:#f87171;" onclick="deleteMeeting('${m.id}')">✕</button>` : ''}
      </div>
      ${m.notes ? `<div style="font-size:.8rem;color:var(--tx2);margin-top:.6rem;line-height:1.6;white-space:pre-wrap;">${esc(m.notes)}</div>` : ''}
    </div>`;
  }).join('');
}
// ════════════════════════════════════════════════════════════════
// SCHEDULING — Sundays, 3 services, min 3 incl 1 Team Lead
// ════════════════════════════════════════════════════════════════
const SERVICES = [ { key: 's0', label: '8:00 AM' }, { key: 's1', label: '9:45 AM' }, { key: 's2', label: '11:30 AM' } ];
let curSunday = nextSunday(new Date());
function nextSunday(d) {
  const x = new Date(d); x.setHours(12,0,0,0);
  x.setDate(x.getDate() + ((7 - x.getDay()) % 7));
  return x;
}
function iso(d) { return d.toISOString().slice(0, 10); }
function shiftSunday(days) { curSunday = new Date(curSunday.getTime() + days * 864e5); renderSchedule(); }
function getDay(dateIso) {
  if (!S.schedule[dateIso]) S.schedule[dateIso] = { s0: { lead: '', members: ['','','',''] }, s1: { lead: '', members: ['','','',''] }, s2: { lead: '', members: ['','','',''] } };
  return S.schedule[dateIso];
}
function setAssign(dateIso, svcKey, slot, val) {
  const day = getDay(dateIso);
  if (slot === 'lead') day[svcKey].lead = val; else day[svcKey].members[slot] = val;
  save(); renderSchedule(); refreshDash();
}
function svcStatus(svc) {
  const ids = [svc.lead, ...svc.members].filter(Boolean);
  const unique = [...new Set(ids)];
  const hasLead = !!svc.lead;
  return { count: unique.length, hasLead, ok: unique.length >= 3 && hasLead };
}
function renderSchedule() {
  const dateIso = iso(curSunday);
  const day = getDay(dateIso);
  const label = curSunday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  document.getElementById('schedDateLabel').textContent = label;
  document.getElementById('schedSummaryDate').textContent = label;
  const leads = S.team.filter(m => m.role === 'Team Lead');
  const all = S.team;
  const opt = (list, sel) => '<option value="">— unassigned —</option>' + list.map(m => `<option value="${m.id}" ${m.id===sel?'selected':''}>${esc(m.first + ' ' + m.last)}</option>`).join('');
  document.getElementById('schedGrid').innerHTML = SERVICES.map(sv => {
    const svc = day[sv.key]; const st = svcStatus(svc);
    const dis = adminOn ? '' : 'disabled';
    return `<div class="svc-col">
      <div class="svc-time">⛪ ${sv.label}</div>
      <div class="svc-req">Min 3 team · 1 Team Lead required</div>
      <div class="svc-slot"><span class="lead-tag" style="flex-shrink:0;">★ LEAD</span>
        <select ${dis} onchange="setAssign('${dateIso}','${sv.key}','lead',this.value)">${opt(leads, svc.lead)}</select></div>
      ${svc.members.map((mid, i) => `<div class="svc-slot"><span style="font-size:.62rem;color:var(--tx3);font-weight:800;flex-shrink:0;width:38px;">#${i + 2}</span>
        <select ${dis} onchange="setAssign('${dateIso}','${sv.key}',${i},this.value)">${opt(all, mid)}</select></div>`).join('')}
      <div class="svc-warn-box ${st.ok ? 'ok' : 'bad'}">${st.ok ? '✅ Coverage met (' + st.count + ' assigned)' : '⚠️ ' + st.count + '/3 assigned' + (st.hasLead ? '' : ' — no Team Lead')}</div>
    </div>`;
  }).join('');
  if (!S.team.length) {
    document.getElementById('schedSummary').innerHTML = '<div class="empty-note">Add team members in the Team tab to begin scheduling.</div>';
  } else {
    document.getElementById('schedSummary').innerHTML = SERVICES.map(sv => {
      const svc = day[sv.key]; const st = svcStatus(svc);
      const names = [...new Set([svc.lead, ...svc.members].filter(Boolean))].map(id => { const m = S.team.find(x => x.id === id); return m ? (m.role === 'Team Lead' && id === svc.lead ? '★ ' : '') + m.first + ' ' + m.last : ''; }).filter(Boolean);
      return `<div style="margin-bottom:.4rem;"><strong style="color:${st.ok ? 'var(--gr)' : '#f87171'};">${sv.label}</strong> — ${names.length ? esc(names.join(', ')) : '<em>no one assigned</em>'}</div>`;
    }).join('');
  }
}

// ════════════════════════════════════════════════════════════════
// ONBOARDING CHECKLIST
// ════════════════════════════════════════════════════════════════
function renderOnboard() {
  const p = activeProgress();
  const who = activeName();
  document.getElementById('onboardWho').innerHTML = who
    ? 'Checklist for <strong style="color:var(--tx);">' + esc(who) + '</strong>'
    : '<strong style="color:var(--c);">No one selected.</strong> Pick who you are in the Academy tab so this checklist is saved to a person.';
  document.getElementById('onboardChecklist').innerHTML = ONBOARD_ITEMS.map(item => {
    const done = p.onboard.includes(item.id);
    return `<label style="display:flex;gap:.55rem;align-items:flex-start;padding:.4rem 0;border-bottom:1px solid var(--bd);cursor:pointer;font-size:.8rem;color:${done ? 'var(--gr)' : 'var(--tx2)'};">
      <input type="checkbox" ${done ? 'checked' : ''} onchange="toggleOnboard('${item.id}')" style="margin-top:.2rem;accent-color:var(--gr);">
      <span style="${done ? 'text-decoration:line-through;opacity:.75;' : ''}">${item.text}</span>
    </label>`;
  }).join('') + `<div style="font-size:.72rem;color:var(--tx3);margin-top:.5rem;">${p.onboard.length}/${ONBOARD_ITEMS.length} complete</div>`;
}
function toggleOnboard(stepId) {
  const p = activeProgress();
  if (p.onboard.includes(stepId)) p.onboard = p.onboard.filter(x => x !== stepId);
  else p.onboard.push(stepId);
  save(); renderOnboard();
  refreshDash();   // v1 never did this, so the dashboard counter sat stale until an unrelated action
}

// ════════════════════════════════════════════════════════════════
// ACADEMY — courses, lessons, quiz, certificate
// ════════════════════════════════════════════════════════════════
let curCourse = null, quizAnswers = {}, quizSubmitted = false;

/* v1 hardcoded "5 questions, pass at 4" in six separate places. Every module
   happens to have five questions today, so it was correct — and would have gone
   on being correct right up until someone added a sixth question to one module,
   at which point the pass mark silently becomes 67% with nothing to notice it.
   The threshold is the policy (80%); the question count is data. */
const PASS_THRESHOLD = 0.8;
function quizTotal(course) { return course.quiz.length; }
function passMark(course) { return Math.ceil(quizTotal(course) * PASS_THRESHOLD); }
/* Historical records keep the total they were scored against, so a stored
   result stays readable even if the module's question count later changes. */
function scorePct(cs, course) {
  const total = cs.quizTotal || quizTotal(course);
  return total ? Math.round((cs.quizScore / total) * 100) : 0;
}
function renderCourses() {
  let certs = 0;
  document.getElementById('courseGrid').innerHTML = COURSES.map(c => {
    const cs = getCS(c.id);
    const pct = Math.round((cs.doneLessons.length / c.lessons.length) * 100);
    if (cs.quizPassed) certs++;
    return `<div class="course-card ${cs.quizPassed ? 'certified' : ''}" onclick="openCourse('${c.id}')">
      ${cs.quizPassed ? '<div class="cc-badge">🏆</div>' : ''}
      <div class="cc-icon">${c.icon}</div>
      <div class="cc-title">${c.title}</div>
      <div class="cc-meta">${c.meta}</div>
      <div class="cc-bar"><div class="cc-fill" style="width:${pct}%;"></div></div>
      <div style="font-size:.66rem;color:var(--tx3);margin-top:.3rem;">${cs.quizPassed ? '✅ Certified — ' + scorePct(cs, c) + '%' : cs.doneLessons.length + '/' + c.lessons.length + ' lessons'}</div>
    </div>`;
  }).join('');
  document.getElementById('certCount').textContent = certs;
  document.getElementById('certTotal').textContent = COURSES.length;
  document.getElementById('hs-modules').textContent = certs;
  document.getElementById('academyPct').textContent = Math.round((certs / COURSES.length) * 100) + '%';
  document.getElementById('traineeName').textContent = activeName() || 'not set — tap change';
}
function openWhoModal() {
  renderWhoList();
  document.getElementById('whoGuest').value = S.activeId === 'guest' ? (getProgress('guest').name || '') : '';
  document.getElementById('whoModal').classList.add('open');
}
function renderWhoList() {
  const el = document.getElementById('whoList');
  if (!S.team.length) {
    el.innerHTML = '<div class="empty-note" style="padding:.9rem;">No roster yet. Type your name below — an admin can link your record to the roster once you are added.</div>';
    return;
  }
  el.innerHTML = S.team.map(m => {
    const p = S.progress[m.id];
    const certs = p ? Object.values(p.training).filter(t => t.quizPassed).length : 0;
    const on = S.activeId === m.id;
    return `<button class="quiz-opt ${on ? 'selected' : ''}" style="width:100%;margin-bottom:.35rem;display:flex;justify-content:space-between;align-items:center;gap:.5rem;" onclick="setActiveMember('${m.id}')">
      <span>${esc(m.first + ' ' + m.last)}${m.role === 'Team Lead' ? ' <span class="lead-tag">★ LEAD</span>' : ''}</span>
      <span style="font-size:.68rem;color:var(--tx3);white-space:nowrap;">${certs}/${COURSES.length} certified</span>
    </button>`;
  }).join('');
}
function setActiveMember(id) {
  /* The realistic path is: a volunteer trains first, and gets added to the
     roster afterwards. Offer to carry the guest record across rather than
     stranding it, but never overwrite a record the member already has. */
  const guest = S.progress.guest;
  const guestHasWork = guest && (Object.keys(guest.training).length || guest.onboard.length);
  const target = S.progress[id];
  const targetHasWork = target && (Object.keys(target.training).length || target.onboard.length);
  if (S.activeId === 'guest' && guestHasWork && !targetHasWork) {
    const m = S.team.find(x => x.id === id);
    if (confirm('Move the unassigned training record' + (guest.name ? ' for "' + guest.name + '"' : '') +
                ' to ' + m.first + ' ' + m.last + '?\n\nOK = move it across. Cancel = leave it where it is and just switch.')) {
      S.progress[id] = { name: '', training: guest.training, onboard: guest.onboard };
      delete S.progress.guest;
      addActivity('Linked training record to ' + m.first + ' ' + m.last);
    }
  }
  S.activeId = id;
  save(); closeModalEl('whoModal'); renderCourses(); renderOnboard(); refreshDash();
}
function saveGuestName() {
  const n = document.getElementById('whoGuest').value.trim();
  if (!n) { alert('Type a name, or pick someone from the roster above.'); return; }
  S.activeId = 'guest';
  getProgress('guest').name = n;
  save(); closeModalEl('whoModal'); renderCourses(); renderOnboard(); refreshDash();
}
function openCourse(id) {
  curCourse = COURSES.find(c => c.id === id);
  quizAnswers = {}; quizSubmitted = false;
  document.getElementById('mIcon').textContent = curCourse.icon;
  document.getElementById('mTitle').textContent = curCourse.title.toUpperCase();
  document.getElementById('mMeta').textContent = curCourse.meta;
  renderLessons(); renderQuiz(); renderCert();
  const cs = getCS(id);
  document.getElementById('footerQuizBtn').style.display = cs.doneLessons.length === curCourse.lessons.length && !cs.quizPassed ? '' : 'none';
  document.getElementById('footerCertBtn').style.display = cs.quizPassed ? '' : 'none';
  switchTab('lessons');
  document.getElementById('courseModal').classList.add('open');
}
function closeCourseModal() {
  document.body.classList.remove('printing-cert');
  document.getElementById('courseModal').classList.remove('open');
  curCourse = null; renderCourses(); refreshDash();
}
function switchTab(tab) {
  ['lessons','quiz','cert'].forEach(t => {
    document.getElementById('mtab-' + t).classList.toggle('active', t === tab);
    document.getElementById('mpanel-' + t).classList.toggle('active', t === tab);
  });
}
function renderLessons() {
  const cs = getCS(curCourse.id);
  document.getElementById('lessonContent').innerHTML = curCourse.lessons.map((lesson, i) => {
    const done = cs.doneLessons.includes(i);
    return `<div class="lesson-item ${done ? 'done' : ''}" id="lesson-${i}">
      <div class="li-header" onclick="document.getElementById('lesson-${i}').classList.toggle('expanded')">
        <div class="li-num">${done ? '✓' : i + 1}</div>
        <div class="li-title">${lesson.title}</div>
        <div class="li-check">${done ? '✅' : '▶'}</div>
      </div>
      <div class="li-body">${lesson.content}
        ${!done ? `<div class="mark-done-btn" onclick="event.stopPropagation();markDone(${i})">✅ Mark Complete</div>` : '<div style="font-size:.72rem;color:var(--gr);margin-top:.6rem;font-weight:700;">✓ Completed</div>'}
      </div>
    </div>`;
  }).join('');
}
function markDone(i) {
  const cs = getCS(curCourse.id);
  if (!cs.doneLessons.includes(i)) cs.doneLessons.push(i);
  save(); renderLessons(); renderQuiz();
  if (cs.doneLessons.length === curCourse.lessons.length && !cs.quizPassed) document.getElementById('footerQuizBtn').style.display = '';
  addActivity('Completed lesson: ' + curCourse.lessons[i].title);
}
function renderQuiz() {
  const el = document.getElementById('quizContent');
  const cs = getCS(curCourse.id);
  if (cs.quizPassed) {
    el.innerHTML = `<div class="quiz-result"><div class="quiz-score-big pass">🏆</div><div style="font-size:1rem;font-weight:800;color:var(--gr);margin:.4rem 0;">Already Certified!</div><div style="font-size:.8rem;color:var(--tx2);">You passed with ${scorePct(cs, curCourse)}%. Your certificate is available.</div></div>`;
    return;
  }
  if (cs.doneLessons.length < curCourse.lessons.length) {
    el.innerHTML = `<div class="quiz-result"><div style="font-size:2rem;">📖</div><div style="font-size:.9rem;font-weight:700;margin:.5rem 0;">Complete All Lessons First</div><div style="font-size:.78rem;color:var(--tx2);">Finish all ${curCourse.lessons.length} lessons before the quiz. You've done ${cs.doneLessons.length} so far.</div></div>`;
    return;
  }
  let html = `<div style="font-size:.8rem;color:var(--tx2);margin-bottom:1rem;">Answer all ${quizTotal(curCourse)} questions. Score <strong style="color:var(--c);">${Math.round(PASS_THRESHOLD * 100)}% or higher</strong> (${passMark(curCourse)}/${quizTotal(curCourse)}) to earn your certificate.</div>`;
  curCourse.quiz.forEach((q, qi) => {
    html += `<div class="quiz-q"><div class="quiz-q-num">Question ${qi + 1} of ${curCourse.quiz.length}</div><div class="quiz-q-text">${q.q}</div><div class="quiz-options">`;
    q.opts.forEach((opt, oi) => { html += `<button class="quiz-opt ${quizAnswers[qi] === oi ? 'selected' : ''}" onclick="selectAnswer(${qi},${oi})">${opt}</button>`; });
    html += '</div></div>';
  });
  html += '<div class="quiz-submit-row"><button class="btn btn-primary" onclick="submitQuiz()">Submit Quiz →</button></div>';
  el.innerHTML = html;
}
function selectAnswer(qi, oi) { if (quizSubmitted) return; quizAnswers[qi] = oi; renderQuiz(); }
function submitQuiz() {
  if (curCourse.quiz.some((_, qi) => quizAnswers[qi] === undefined)) { alert('Please answer all ' + curCourse.quiz.length + ' questions.'); return; }
  quizSubmitted = true;
  let correct = 0;
  curCourse.quiz.forEach((q, qi) => { if (quizAnswers[qi] === q.ans) correct++; });
  const total = quizTotal(curCourse);
  const passed = correct >= passMark(curCourse);
  const pct = Math.round((correct / total) * 100);
  const cs = getCS(curCourse.id);
  cs.quizScore = correct; cs.quizTotal = total; cs.quizPassed = passed;
  if (passed && !cs.certName) cs.certName = activeName();
  save();
  let html = '';
  curCourse.quiz.forEach((q, qi) => {
    html += `<div class="quiz-q"><div class="quiz-q-num">Question ${qi + 1}</div><div class="quiz-q-text">${q.q}</div><div class="quiz-options">`;
    q.opts.forEach((opt, oi) => {
      let cls = '';
      if (oi === q.ans) cls = 'correct'; else if (oi === quizAnswers[qi]) cls = 'wrong';
      html += `<button class="quiz-opt ${cls}" disabled>${opt}</button>`;
    });
    html += '</div></div>';
  });
  html += `<div class="quiz-result"><div class="quiz-score-big ${passed ? 'pass' : 'fail'}">${correct}/${total}</div>
    <div style="font-size:.9rem;font-weight:800;color:${passed ? 'var(--gr)' : 'var(--cr)'};margin:.4rem 0;">${passed ? '🎉 Passed! Certificate Earned!' : '❌ Not Passed — Try Again'}</div>
    <div style="font-size:.78rem;color:var(--tx2);">${passed ? 'Your certificate is now available.' : 'You scored ' + pct + '%. You need ' + Math.round(PASS_THRESHOLD * 100) + '% (' + passMark(curCourse) + '/' + total + '). Review the lessons and retry.'}</div>
    ${passed ? `<button class="btn btn-success" style="margin-top:.75rem;" onclick="renderCert();switchTab('cert')">🏆 View Certificate</button>` : `<button class="btn btn-primary" style="margin-top:.75rem;" onclick="retryQuiz()">Retry Quiz</button>`}
  </div>`;
  document.getElementById('quizContent').innerHTML = html;
  if (passed) { document.getElementById('footerCertBtn').style.display = ''; document.getElementById('footerQuizBtn').style.display = 'none'; renderCert(); addActivity('🏆 CERTIFIED: ' + curCourse.title); }
  else addActivity('Quiz attempt (' + pct + '%): ' + curCourse.title);
}
function retryQuiz() {
  quizAnswers = {}; quizSubmitted = false;
  const cs = getCS(curCourse.id);
  cs.quizScore = null; cs.quizTotal = null; cs.quizPassed = false;
  save(); renderQuiz();
}
function renderCert() {
  const el = document.getElementById('certContent');
  const cs = getCS(curCourse.id);
  if (!cs.quizPassed) {
    el.innerHTML = `<div class="cert-locked"><div class="lock-icon">🔒</div><p>Complete all lessons and pass the quiz with <strong>80% or higher</strong> to unlock your certificate for <strong>${curCourse.title}</strong>.</p><button class="btn btn-primary" style="margin-top:1rem;" onclick="switchTab('quiz')">Go to Quiz →</button></div>`;
    return;
  }
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  el.innerHTML = `<div class="cert-wrap">
    <div class="certificate" id="certDocument">
      <div class="cert-brand">CELEBRATION CHURCH — SAFETY &amp; SECURITY TEAM ACADEMY</div>
      <div class="cert-title-main">CERTIFICATE OF COMPLETION</div>
      <div class="cert-course-name">${curCourse.title}</div>
      <div class="cert-name-line">This certifies that</div><br>
      <div class="cert-recipient">${esc(cs.certName || activeName() || 'Team Member')}</div>
      <div class="cert-score">Score: ${scorePct(cs, curCourse)}% · ${cs.quizScore}/${cs.quizTotal || quizTotal(curCourse)} correct</div>
      <div class="cert-date">Issued: ${date} · Nampa, Idaho</div>
      <div class="cert-seal">🏆</div>
    </div>
    <div style="margin-top:.75rem;display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;">
      <input type="text" placeholder="Name on certificate" value="${esc(cs.certName || activeName() || '')}" style="padding:.4rem .8rem;border-radius:8px;border:1px solid var(--bd2);background:var(--s1);color:var(--tx);width:200px;" oninput="updateCertName(this.value)">
      <button class="cert-print-btn" onclick="printCertificate()">🖨️ Print Certificate</button>
    </div>
  </div>`;
}
function printCertificate() {
  document.body.classList.add('printing-cert');
  window.addEventListener('afterprint', function off() {
    document.body.classList.remove('printing-cert');
    window.removeEventListener('afterprint', off);
  });
  window.print();
}
function updateCertName(v) {
  const cs = getCS(curCourse.id);
  cs.certName = v; save();
  document.querySelector('#certDocument .cert-recipient').textContent = v || 'Team Member';
}

// ════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════
function refreshDash() {
  const certs = COURSES.filter(c => getCS(c.id).quizPassed).length;
  document.getElementById('dashTraining').innerHTML =
    `<div>Training as: <strong style="color:var(--tx);">${esc(activeName() || 'not set')}</strong></div>
     <div>Certificates: <strong style="color:var(--gr);">${certs}/${COURSES.length}</strong></div>
     <div>Onboarding: <strong style="color:var(--c);">${activeProgress().onboard.length}/${ONBOARD_ITEMS.length}</strong> steps</div>`;
  const dateIso = iso(nextSunday(new Date()));
  const day = getDay(dateIso);
  const cov = SERVICES.map(sv => {
    const st = svcStatus(day[sv.key]);
    return `<span class="stat-pill" style="border-color:${st.ok ? 'rgba(34,197,94,.35)' : 'rgba(204,51,51,.35)'};color:${st.ok ? 'var(--gr)' : '#f87171'};">${sv.label}: ${st.ok ? '✅' : st.count + '/3'}</span>`;
  }).join(' ');
  document.getElementById('dashCoverage').innerHTML = cov;
  document.getElementById('dashNextSunday').innerHTML =
    `<div style="font-family:var(--fh);font-size:1.05rem;letter-spacing:1px;color:var(--tx);margin-bottom:.4rem;">${nextSunday(new Date()).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
     <div class="stats-row">${cov}</div>
     <button class="btn btn-ghost" style="margin-top:.7rem;" onclick="navTo('scheduling')">Open Scheduling →</button>`;
  renderActivity();
}
function renderActivity() {
  document.getElementById('activityFeed').innerHTML = S.activity.length
    ? S.activity.map(a => `<div>· <span style="color:var(--tx3);">${a.t}</span> — ${esc(a.msg)}</div>`).join('')
    : '<div style="color:var(--tx3);">No activity yet — start with the Academy or build the team roster.</div>';
}

// ════════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════════
function closeModalEl(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay, .pin-gate-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); }));
renderCourses(); renderTeam(); renderLeaders(); renderMeetings(); renderSchedule(); renderOnboard(); applyAdmin(); refreshDash();
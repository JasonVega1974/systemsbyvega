-- ============================================================================
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
  ('estate-sales', 'SR-01', 'Estate Sales', 'sale-resale', 'Run the whole sale when a household has to be emptied — pricing, staffing, and the day itself.', null, 'open'::public.sbv_niche_status, 'https://estatesalebiz.com', '$497 + $39/mo · 3 cities', null, false, 1),
  ('garage-sales', 'SR-02', 'Garage Sales', 'sale-resale', 'Run other people''s garage sales in your three cities — and be the map every shopper in town checks on Saturday morning.', null, 'open'::public.sbv_niche_status, 'https://garagesalebiz.com', '$249 once · 3 cities', null, false, 2),
  ('local-auctions', 'SR-03', 'Local Auctions', 'sale-resale', 'Run the bidding for estates, farms, and storage lots — catalog, consignors, gavel.', 'Auctioneer licensing varies by state. Check yours before you get in line.', 'in_line'::public.sbv_niche_status, null, null, null, false, 3),
  ('consignment-vintage', 'SR-04', 'Consignment & Vintage', 'sale-resale', 'Sell other people''s furniture and finds on a split, without owning the inventory.', null, 'in_line'::public.sbv_niche_status, null, null, null, false, 4),
  ('market-vendors', 'SR-05', 'Market Vendors', 'sale-resale', 'Be the booth directory and sign-up desk for the markets in your county.', null, 'in_line'::public.sbv_niche_status, null, null, null, false, 5),
  ('junk-removal', 'HC-01', 'Junk Removal', 'haul-clear', 'Take the cleanout calls — garages, estates, and the stuff nobody wants to load.', null, 'in_line'::public.sbv_niche_status, null, null, null, false, 10),
  ('delivery', 'HC-02', 'Delivery & Courier', 'haul-clear', 'Move packages across town same-day, on a zone map you set.', null, 'in_line'::public.sbv_niche_status, null, null, '/sites/delivery/', true, 11),
  ('dumpster-rental', 'HC-03', 'Dumpster Rental', 'haul-clear', 'Drop the container, haul it off, bill a flat rate.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/dumpster-rental/', true, 12),
  ('moving', 'HC-04', 'Moving', 'haul-clear', 'Load, drive, unload — local moves priced before the truck arrives.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/moving/', true, 13),
  ('pressure-washing', 'CE-01', 'Pressure Washing', 'curb-exterior', 'Take the grime off driveways, siding, and decks, quoted from a photo.', null, 'in_line'::public.sbv_niche_status, null, null, '/sites/pressure-washing/', true, 20),
  ('bin-cleaning', 'CE-02', 'Bin Cleaning', 'curb-exterior', 'Clean the trash bins on a route, on a schedule, every month.', null, 'in_line'::public.sbv_niche_status, null, null, '/sites/bin-cleaning/', true, 21),
  ('landscaping', 'CE-03', 'Landscaping', 'curb-exterior', 'Keep yards cut, edged, and planted through all four seasons.', null, 'in_line'::public.sbv_niche_status, null, null, '/sites/landscaping/', true, 22),
  ('painting', 'CE-04', 'Painting', 'curb-exterior', 'Repaint rooms and exteriors — colour picked before the first coat.', 'Homes built before 1978 need EPA RRP certification for lead-safe work.', 'in_line'::public.sbv_niche_status, null, null, '/sites/painting/', true, 23),
  ('roofing', 'CE-05', 'Roofing', 'curb-exterior', 'Repair and replace roofs, and handle the storm-damage paperwork.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/roofing/', true, 24),
  ('car-detailing', 'AU-01', 'Car Detailing', 'auto', 'Bring cars back to showroom condition in the customer''s driveway.', null, 'in_line'::public.sbv_niche_status, null, null, '/sites/car-detailing/', true, 30),
  ('auto-repair', 'AU-02', 'Auto Repair', 'auto', 'Diagnose it, fix it, and explain it before the work starts.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/auto-repair/', true, 31),
  ('auto-body', 'AU-03', 'Auto Body', 'auto', 'Put collision-damaged panels back to factory shape.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/auto-body/', true, 32),
  ('plumbing', 'HT-01', 'Plumbing', 'home-trade', 'Fix the leak, clear the drain, replace the water heater.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/plumbing/', true, 40),
  ('electrician', 'HT-02', 'Electrician', 'home-trade', 'Run wire, upgrade panels, and pull the permits.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/electrician/', true, 41),
  ('hvac', 'HT-03', 'Heating & Air', 'home-trade', 'Keep the heat on in January and the air cold in July.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/hvac/', true, 42),
  ('contracting', 'HT-04', 'Contracting', 'home-trade', 'Take a remodel from first sketch to final walkthrough.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/contracting/', true, 43),
  ('metal-fabrication', 'HT-05', 'Metal Fabrication', 'home-trade', 'Cut, weld, and build it in steel from a drawing.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/metal-fabrication/', true, 44),
  ('dog-walking', 'PP-01', 'Dog Walking', 'people-pets', 'Walk the dogs on a weekly rhythm their owners can count on.', null, 'in_line'::public.sbv_niche_status, null, null, '/sites/dog-walking/', true, 50),
  ('child-care', 'PP-02', 'Child Care', 'people-pets', 'Watch the kids so the parents can have the evening.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/child-care/', true, 51),
  ('caregiving', 'PP-03', 'Caregiving', 'people-pets', 'Keep someone company and safe in their own home.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/caregiving/', true, 52),
  ('personal-trainer', 'PP-04', 'Personal Trainer', 'people-pets', 'Coach lifters and runners toward one specific goal.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/personal-trainer/', true, 53),
  ('tattoo-studio', 'PP-05', 'Tattoo Studio', 'people-pets', 'Draw it, book it, and tattoo it in a private studio.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/tattoo-studio/', true, 54),
  ('dj', 'PP-06', 'DJ', 'people-pets', 'Play the room — weddings, clubs, and anywhere with a dance floor.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/dj/', true, 55),
  ('bbq-food-truck', 'PP-07', 'BBQ Food Truck', 'people-pets', 'Smoke it overnight and park where the crowd is.', null, 'website_only'::public.sbv_niche_status, null, null, '/sites/bbq-food-truck/', true, 56)
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

-- Expected after this runs: 29 rows,
--   2 open,
--   11 in line,
--   16 website-only.

/* ============================================================================
   000-FOUNDATION-FROM-OLD-PROJECT.sql — one-time reconstruction of the
   celebration-safety-team schema for the NEW dedicated Supabase project
   (oroollaijzvdduuvfmsr), run ONCE, FIRST, before any other file in sql/.
   ----------------------------------------------------------------------------
   WHY THIS FILE EXISTS: the old project (newjbexmvltvtmxollca, shared with
   unrelated systemsbyvega/ESB/GSB objects) has a foundational schema —
   cc_profiles, cc_team, cc_leaders, cc_meetings, cc_schedule_slots,
   cc_activity, cc_training_records, cc_onboarding_steps, plus the
   cc_is_admin()/cc_is_team_lead_or_admin() functions every RLS policy in
   this app depends on — that predates this project's sql/ migration-file
   convention and was never captured in git. Every file in sql/ only ever
   ALTERs those objects, assuming they already exist.

   SOURCE: extracted from sql/OLD-SCHEMA-DUMP.sql (a full `public`-schema
   dump of the OLD shared project, provided by the project owner), filtered
   down to ONLY cc_-prefixed objects — every "sbv_"-prefixed statement
   (systemsbyvega/ESB/GSB — unrelated to this app) was mechanically
   excluded via a dollar-quote-aware statement parser, verified with zero
   "sbv_" occurrences remaining and balanced dollar-quote pairs. This
   necessarily also re-creates every object that DOES already have its own
   tracked migration in sql/ (cc_news, cc_prayers, cc_bolos, etc.) — that
   is intentional and safe: every later file in sql/ uses
   CREATE TABLE/POLICY IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, or
   DROP POLICY IF EXISTS + CREATE POLICY, so replaying the full historical
   sequence afterward is a no-op for anything already reproduced here.

   ONE OBJECT below is NOT from that dump: pg_dump-style exports of the
   `public` schema do not capture triggers defined on `auth.users` (a
   Supabase-managed schema). cc_on_auth_user_created — the trigger that
   creates a cc_profiles row for every new auth.users signup, referenced
   by name in api/auth-admin.js — is reconstructed by hand at the bottom
   of this file, using the standard Supabase pattern, calling the
   cc_handle_new_user() function this file DOES create from the dump.

   NOT IDEMPOTENT THE WAY OTHER sql/ FILES ARE: the CREATE POLICY
   statements below have no DROP POLICY IF EXISTS guard (they were dumped
   from a live database, not hand-written against this project's
   convention). This file is meant to run exactly ONCE, against an empty
   project — a second run will fail loudly on "policy already exists"
   rather than silently duplicating anything, which is the correct
   behavior for a reconstruction step, not a normal repeatable migration.

   NOTHING FROM THE OLD PROJECT'S DATA IS INCLUDED — schema only, per
   explicit instruction to start fresh on the new project.
   ========================================================================= */




SET statement_timeout = 0;

SET lock_timeout = 0;

SET idle_in_transaction_session_timeout = 0;

SET client_encoding = 'UTF8';

SET standard_conforming_strings = on;

SELECT pg_catalog.set_config('search_path', '', false);

SET check_function_bodies = false;

SET xmloption = content;

SET client_min_messages = warning;

SET row_security = off;



CREATE SCHEMA IF NOT EXISTS "public";



ALTER SCHEMA "public" OWNER TO "pg_database_owner";



COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."cc_can_see_incident"("incident_profile_id" "uuid", "cat" "text", "is_restricted" boolean) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    not (public.cc_incident_category_is_sensitive(cat) or is_restricted)
    or incident_profile_id = (select auth.uid())
    or (select public.cc_is_team_lead_or_admin());
$$;



ALTER FUNCTION "public"."cc_can_see_incident"("incident_profile_id" "uuid", "cat" "text", "is_restricted" boolean) OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."cc_handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.cc_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;



ALTER FUNCTION "public"."cc_handle_new_user"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."cc_incident_category_is_sensitive"("cat" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select cat in ('child_related', 'medical');
$$;



ALTER FUNCTION "public"."cc_incident_category_is_sensitive"("cat" "text") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."cc_incident_eligible_acknowledgers"("p_incident_id" "uuid") RETURNS TABLE("profile_id" "uuid", "display_name" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_reporter_id uuid;
  v_category text;
  v_restricted boolean;
begin
  select i.profile_id, i.category, i.restricted
    into v_reporter_id, v_category, v_restricted
  from public.cc_incidents i
  where i.id = p_incident_id;

  if v_reporter_id is null or not public.cc_can_see_incident(v_reporter_id, v_category, v_restricted) then
    return; -- caller cannot see this incident at all; give them nothing back.
  end if;

  if public.cc_incident_category_is_sensitive(v_category) or v_restricted then
    return query
      select p.id, coalesce(t.first_name || ' ' || t.last_name, 'Team member')
      from public.cc_profiles p
      left join public.cc_team t on t.id = p.team_member_id
      where p.role in ('admin', 'team_lead') or p.id = v_reporter_id;
  else
    return query
      select p.id, coalesce(t.first_name || ' ' || t.last_name, 'Team member')
      from public.cc_profiles p
      left join public.cc_team t on t.id = p.team_member_id;
  end if;
end;
$$;



ALTER FUNCTION "public"."cc_incident_eligible_acknowledgers"("p_incident_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."cc_incident_eligible_acknowledgers_bulk"("p_incident_ids" "uuid"[]) RETURNS TABLE("incident_id" "uuid", "profile_id" "uuid", "display_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select i.id, p.id, coalesce(t.first_name || ' ' || t.last_name, 'Team member')
  from public.cc_incidents i
  join public.cc_profiles p on (
    case
      when public.cc_incident_category_is_sensitive(i.category) or i.restricted
        then p.role in ('admin', 'team_lead') or p.id = i.profile_id
      else true
    end
  )
  left join public.cc_team t on t.id = p.team_member_id
  where i.id = any(p_incident_ids)
    and public.cc_can_see_incident(i.profile_id, i.category, i.restricted);
$$;



ALTER FUNCTION "public"."cc_incident_eligible_acknowledgers_bulk"("p_incident_ids" "uuid"[]) OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."cc_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.cc_profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;



ALTER FUNCTION "public"."cc_is_admin"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."cc_is_team_lead_or_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.cc_profiles
    where id = (select auth.uid()) and role in ('admin', 'team_lead')
  );
$$;



ALTER FUNCTION "public"."cc_is_team_lead_or_admin"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."cc_resolve_coverage_request"("p_request_id" "uuid", "p_assign_team_member_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_request public.cc_coverage_requests;
  v_caller uuid := (select auth.uid());
  v_target uuid;
  v_requester_member uuid;
  v_target_member uuid := p_assign_team_member_id;
  v_target_name text;
  v_slot_id uuid;
  v_slot_updated boolean := false;
begin
  select * into v_request from public.cc_coverage_requests where id = p_request_id for update;
  if not found then
    raise exception 'Coverage request not found';
  end if;
  if v_request.status <> 'open' then
    raise exception 'This coverage request is no longer open';
  end if;

  if p_assign_team_member_id is null then
    -- Self-cover: always allowed on an open request.
    v_target := v_caller;
    select team_member_id into v_target_member from public.cc_profiles where id = v_target;
  else
    -- Assigning someone else: Team Lead/Admin only.
    if not (select public.cc_is_team_lead_or_admin()) then
      raise exception 'Only a Team Lead or Admin can assign someone other than yourself';
    end if;
    select id into v_target from public.cc_profiles where team_member_id = p_assign_team_member_id;
    if v_target is null then
      raise exception 'That team member does not have a login linked yet — an Admin sets that on the Team tab';
    end if;
  end if;

  select team_member_id into v_requester_member from public.cc_profiles where id = v_request.profile_id;

  if v_requester_member is not null and v_target_member is not null then
    select id into v_slot_id
      from public.cc_schedule_slots
      where service_date = v_request.service_date
        and service_key = v_request.service_key
        and team_member_id = v_requester_member
      limit 1;
    if v_slot_id is not null then
      update public.cc_schedule_slots set team_member_id = v_target_member where id = v_slot_id;
      v_slot_updated := true;
    end if;
  end if;

  -- Same team_member_id -> "First Last" -> else-email fallback as activeName() client-side.
  select (t.first_name || ' ' || t.last_name) into v_target_name
    from public.cc_team t where t.id = v_target_member;
  if v_target_name is null then
    select email into v_target_name from public.cc_profiles where id = v_target;
  end if;

  update public.cc_coverage_requests
    set status = 'resolved', covered_by_profile_id = v_target, covered_by_name = v_target_name, resolved_at = now()
    where id = p_request_id;

  return jsonb_build_object('slot_updated', v_slot_updated, 'covered_by', v_target, 'covered_by_name', v_target_name);
end;
$$;



ALTER FUNCTION "public"."cc_resolve_coverage_request"("p_request_id" "uuid", "p_assign_team_member_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."cc_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;



ALTER FUNCTION "public"."cc_set_updated_at"() OWNER TO "postgres";


SET default_tablespace = '';


SET default_table_access_method = "heap";



CREATE TABLE IF NOT EXISTS "public"."cc_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_profile_id" "uuid",
    "message" "text" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL
);



ALTER TABLE "public"."cc_activity" OWNER TO "postgres";



CREATE TABLE IF NOT EXISTS "public"."cc_bolos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_description" "text" NOT NULL,
    "status" "text" DEFAULT 'Active'::"text" NOT NULL,
    "notes" "text",
    "linked_incident_id" "uuid",
    "issued_by" "uuid" NOT NULL,
    "issued_by_name" "text" NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cc_bolos_status_check" CHECK (("status" = ANY (ARRAY['Active'::"text", 'Resolved'::"text"])))
);



ALTER TABLE "public"."cc_bolos" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_bolos" IS 'Be-On-the-Lookout alerts. Authenticated SELECT, Team Lead/Admin INSERT+UPDATE, no DELETE — resolve via status instead.';




CREATE TABLE IF NOT EXISTS "public"."cc_coverage_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "profile_name" "text" NOT NULL,
    "service_date" "date" NOT NULL,
    "service_key" "text" NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "covered_by_profile_id" "uuid",
    "covered_by_name" "text",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cc_coverage_requests_service_key_check" CHECK (("service_key" = ANY (ARRAY['s0'::"text", 's1'::"text", 's2'::"text"]))),
    CONSTRAINT "cc_coverage_requests_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'resolved'::"text", 'cancelled'::"text"])))
);



ALTER TABLE "public"."cc_coverage_requests" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_coverage_requests" IS 'Shift coverage requests. Authenticated SELECT, INSERT self-only, UPDATE (status flip) by the requester or Team Lead/Admin. The resolve-by-covering transition (status + covered_by_profile_id + the matching cc_schedule_slots swap) goes through cc_resolve_coverage_request(), not a direct UPDATE, because covering someone ELSE''s request needs a write cc_schedule_slots RLS does not grant to a plain member or a Team Lead.';




CREATE TABLE IF NOT EXISTS "public"."cc_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text",
    "storage_path" "text",
    "external_url" "text",
    "uploaded_by" "uuid",
    "uploaded_by_name" "text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cc_documents_category_check" CHECK (("category" = ANY (ARRAY['policy'::"text", 'forms'::"text", 'legal'::"text", 'insurance'::"text", 'training'::"text"]))),
    CONSTRAINT "cc_documents_exactly_one_source" CHECK (((("storage_path" IS NOT NULL) AND ("external_url" IS NULL)) OR (("storage_path" IS NULL) AND ("external_url" IS NOT NULL))))
);



ALTER TABLE "public"."cc_documents" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_documents" IS 'Document Library. category: policy=Policy & Procedures, forms=Forms & Templates, legal=Legal & Compliance, insurance=Insurance, training=Training Materials. Exactly one of storage_path (private cc-documents bucket upload) or external_url (public reference link) is set per row.';




CREATE TABLE IF NOT EXISTS "public"."cc_drills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "drill_type" "text" NOT NULL,
    "conducted_date" "date" NOT NULL,
    "duration_minutes" integer,
    "location_notes" "text",
    "participant_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "conducted_by" "uuid",
    "conducted_by_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cc_drills_drill_type_check" CHECK (("drill_type" = ANY (ARRAY['fire'::"text", 'code_adam'::"text", 'active_shooter'::"text", 'severe_weather'::"text", 'medical'::"text"]))),
    CONSTRAINT "cc_drills_duration_minutes_check" CHECK ((("duration_minutes" IS NULL) OR ("duration_minutes" > 0)))
);



ALTER TABLE "public"."cc_drills" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_drills" IS 'Drill log. drill_type: fire (quarterly), code_adam (every 6 months), active_shooter (annually), severe_weather (annually), medical (annually). Next-due date and On Track/Due Soon/Overdue status are computed client-side from the most recent conducted_date per drill_type, not stored here.';




CREATE TABLE IF NOT EXISTS "public"."cc_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "event_date" "date",
    "event_time" "text",
    "description" "text",
    "url" "text",
    "location" "text",
    "category" "text" DEFAULT 'other'::"text" NOT NULL,
    "posted_by" "uuid",
    "posted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cc_events_category_check" CHECK (("category" = ANY (ARRAY['webinar'::"text", 'training'::"text", 'law_enforcement'::"text", 'church'::"text", 'other'::"text"])))
);



ALTER TABLE "public"."cc_events" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_events" IS 'Admin-curated event/webinar calendar (News tab, Events view). Authenticated SELECT, admin-only write.';




CREATE TABLE IF NOT EXISTS "public"."cc_facility_maps" (
    "slot_id" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);



ALTER TABLE "public"."cc_facility_maps" OWNER TO "postgres";



CREATE TABLE IF NOT EXISTS "public"."cc_incident_acknowledgments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "incident_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "acknowledged_at" timestamp with time zone DEFAULT "now"() NOT NULL
);



ALTER TABLE "public"."cc_incident_acknowledgments" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_incident_acknowledgments" IS 'Keyed to the specific incident ROW, not a stable incident number — a correction is a new row with zero acknowledgments, so the team re-acknowledges the corrected facts automatically, with no extra application logic.';




CREATE TABLE IF NOT EXISTS "public"."cc_incident_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "incident_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);



ALTER TABLE "public"."cc_incident_photos" OWNER TO "postgres";



CREATE TABLE IF NOT EXISTS "public"."cc_incidents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "supersedes_id" "uuid",
    "category" "text" NOT NULL,
    "restricted" boolean DEFAULT false NOT NULL,
    "incident_date" "date" NOT NULL,
    "incident_time" time without time zone,
    "location" "text" NOT NULL,
    "description" "text" NOT NULL,
    "subject_height" "text",
    "subject_weight" "text",
    "subject_hair_color" "text",
    "subject_approx_age" "text",
    "subject_sex" "text",
    "subject_marks" "text",
    "subject_clothing" "text",
    "subject_approached" boolean,
    "trespass_warning_issued" boolean,
    "verbal_warning_given" boolean,
    "conversation_summary" "text",
    "prayer_offered" boolean,
    "repeat_offender" boolean,
    "related_report_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "vehicle_description" "text",
    "police_called" boolean DEFAULT false NOT NULL,
    "fire_called" boolean DEFAULT false NOT NULL,
    "ambulance_called" boolean DEFAULT false NOT NULL,
    "first_aid_applied" boolean,
    "first_aid_details" "text",
    "witnesses" "text",
    "pastor_notified" boolean,
    "tyson_notified" boolean,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cc_incidents_category_check" CHECK (("category" = ANY (ARRAY['disruptive_person'::"text", 'trespass'::"text", 'theft'::"text", 'medical'::"text", 'weapon'::"text", 'suspicious_person_package'::"text", 'child_related'::"text", 'facility_hazard'::"text", 'other'::"text"])))
);



ALTER TABLE "public"."cc_incidents" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_incidents" IS 'Append-only incident log. No DELETE policy exists, and the only UPDATE-able column is `restricted` (Team Lead/Admin only, column-level grant) -- a correction is a new row with supersedes_id set, never an edit to the original content. category and restricted together gate SELECT visibility; see cc_can_see_incident().';




CREATE OR REPLACE VIEW "public"."cc_incidents_current" WITH ("security_invoker"='true') AS
 SELECT "id",
    "profile_id",
    "supersedes_id",
    "category",
    "restricted",
    "incident_date",
    "incident_time",
    "location",
    "description",
    "subject_height",
    "subject_weight",
    "subject_hair_color",
    "subject_approx_age",
    "subject_sex",
    "subject_marks",
    "subject_clothing",
    "subject_approached",
    "trespass_warning_issued",
    "verbal_warning_given",
    "conversation_summary",
    "prayer_offered",
    "repeat_offender",
    "related_report_ids",
    "vehicle_description",
    "police_called",
    "fire_called",
    "ambulance_called",
    "first_aid_applied",
    "first_aid_details",
    "witnesses",
    "pastor_notified",
    "tyson_notified",
    "created_at"
   FROM "public"."cc_incidents" "i"
  WHERE (NOT (EXISTS ( SELECT 1
           FROM "public"."cc_incidents" "c2"
          WHERE ("c2"."supersedes_id" = "i"."id"))));



ALTER VIEW "public"."cc_incidents_current" OWNER TO "postgres";



COMMENT ON VIEW "public"."cc_incidents_current" IS 'Latest version of each incident (original, or its most recent correction). security_invoker=true is load-bearing — without it this view would read as the view owner and ignore cc_incidents'' RLS entirely.';




CREATE TABLE IF NOT EXISTS "public"."cc_leaders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "title" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);



ALTER TABLE "public"."cc_leaders" OWNER TO "postgres";



CREATE TABLE IF NOT EXISTS "public"."cc_meetings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meeting_date" "date" NOT NULL,
    "meeting_time" time without time zone,
    "title" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);



ALTER TABLE "public"."cc_meetings" OWNER TO "postgres";



CREATE TABLE IF NOT EXISTS "public"."cc_news" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "url" "text" NOT NULL,
    "summary" "text",
    "posted_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "posted_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "og_image_url" "text",
    "og_title" "text",
    "og_description" "text",
    "og_fetched_at" timestamp with time zone
);



ALTER TABLE "public"."cc_news" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_news" IS 'Admin-curated link cards (News tab). Authenticated SELECT, admin-only INSERT/DELETE.';




CREATE TABLE IF NOT EXISTS "public"."cc_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "posted_by" "uuid" NOT NULL,
    "posted_by_name" "text" NOT NULL,
    "posted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" "date",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);



ALTER TABLE "public"."cc_notes" OWNER TO "postgres";



CREATE TABLE IF NOT EXISTS "public"."cc_onboarding_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "step_id" "text" NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);



ALTER TABLE "public"."cc_onboarding_steps" OWNER TO "postgres";



CREATE TABLE IF NOT EXISTS "public"."cc_prayers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "posted_by_name" "text" NOT NULL,
    "request_text" "text" NOT NULL,
    "posted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "answered" boolean DEFAULT false NOT NULL,
    "answered_at" timestamp with time zone
);



ALTER TABLE "public"."cc_prayers" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_prayers" IS 'Prayer Request Board. Any authenticated member posts; the poster or Admin can mark answered or delete. No editing the request text — remove and re-post instead (enforced by the UPDATE column grant below, not just the UI).';




CREATE TABLE IF NOT EXISTS "public"."cc_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "team_member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "theme" "text",
    "push_enabled" boolean,
    "tour_completed" boolean,
    "display_name" "text",
    CONSTRAINT "cc_profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'team_lead'::"text", 'member'::"text"]))),
    CONSTRAINT "cc_profiles_theme_check" CHECK (("theme" = ANY (ARRAY['dark'::"text", 'light'::"text"])))
);



ALTER TABLE "public"."cc_profiles" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_profiles" IS 'One row per auth.users account, created by cc_handle_new_user(). role is app permissions (admin/team_lead/member), assigned via the Admin-only role screen — not the same thing as cc_team.team_role.';




CREATE TABLE IF NOT EXISTS "public"."cc_push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "keys" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);



ALTER TABLE "public"."cc_push_subscriptions" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_push_subscriptions" IS 'One row per browser/device push subscription. Read server-side only, with the service role, by api/send-push.js — RLS here governs the OWNER managing their own devices, not the fan-out logic that decides who gets notified.';




CREATE TABLE IF NOT EXISTS "public"."cc_schedule_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_date" "date" NOT NULL,
    "service_key" "text" NOT NULL,
    "slot_type" "text" NOT NULL,
    "slot_position" integer DEFAULT 0 NOT NULL,
    "team_member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cc_schedule_slots_lead_position" CHECK ((("slot_type" <> 'lead'::"text") OR ("slot_position" = 0))),
    CONSTRAINT "cc_schedule_slots_service_key_check" CHECK (("service_key" = ANY (ARRAY['s0'::"text", 's1'::"text", 's2'::"text"]))),
    CONSTRAINT "cc_schedule_slots_slot_type_check" CHECK (("slot_type" = ANY (ARRAY['lead'::"text", 'member'::"text"])))
);



ALTER TABLE "public"."cc_schedule_slots" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_schedule_slots" IS 'One row per position per service — the relational replacement for the old per-Sunday JSON blob. team_member_id null is a position that exists but is unfilled (the old "+ another position" button). A SELECT must never create rows; only an explicit assignment or "add a position" action does.';






CREATE TABLE IF NOT EXISTS "public"."cc_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);



ALTER TABLE "public"."cc_settings" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_settings" IS 'Admin-managed app-wide key/value settings (section visibility, Academy module visibility). Authenticated read, admin-only write.';




CREATE TABLE IF NOT EXISTS "public"."cc_team" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "specialty" "text" DEFAULT 'General / Trained Volunteer'::"text" NOT NULL,
    "team_role" "text" DEFAULT 'Safety Team Operator'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rotation_week" "text",
    "background_check_status" "text" DEFAULT 'not_requested'::"text",
    "background_check_date" "date",
    "background_check_expiry" "date",
    CONSTRAINT "cc_team_background_check_status_check" CHECK (("background_check_status" = ANY (ARRAY['not_requested'::"text", 'requested'::"text", 'cleared'::"text", 'expired'::"text", 'flagged'::"text"]))),
    CONSTRAINT "cc_team_rotation_week_check" CHECK (("rotation_week" = ANY (ARRAY['A'::"text", 'B'::"text"]))),
    CONSTRAINT "cc_team_specialty_check" CHECK (("specialty" = ANY (ARRAY['Police / Law Enforcement'::"text", 'Fire'::"text", 'First Responder / EMS'::"text", 'Medical (Nurse / Doctor)'::"text", 'Military / Veteran'::"text", 'Security Professional'::"text", 'General / Trained Volunteer'::"text"]))),
    CONSTRAINT "cc_team_team_role_check" CHECK (("team_role" = ANY (ARRAY['Director'::"text", 'Team Leader'::"text", 'Safety Team Operator'::"text", 'Safety Team Trainee'::"text", 'Junior Safety Team Operator'::"text"])))
);



ALTER TABLE "public"."cc_team" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_team" IS 'Safety/security volunteer roster. team_role gates the schedule LEAD slot; it is not the auth role.';




COMMENT ON COLUMN "public"."cc_team"."rotation_week" IS 'Week A serves the 1st/3rd/5th Sundays, Week B the 2nd/4th. Null = unassigned. Admin-editable, expected to change regularly — not preassigned on migration.';




COMMENT ON COLUMN "public"."cc_team"."background_check_status" IS 'Manually set by an admin. not_requested (default) / requested / cleared / expired / flagged. No Ministry Safe / Checkr integration yet — deferred until the church has a written policy for handling flagged results (see OPEN-ITEMS.md).';




COMMENT ON COLUMN "public"."cc_team"."background_check_date" IS 'Date of the most recent background check, if any.';




COMMENT ON COLUMN "public"."cc_team"."background_check_expiry" IS 'Defaults to 2 years from background_check_date when a check clears (set client-side), but admin-editable thereafter — not a generated column.';




CREATE TABLE IF NOT EXISTS "public"."cc_training_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "course_id" "text" NOT NULL,
    "done_lessons" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "quiz_score" integer,
    "quiz_total" integer,
    "quiz_passed" boolean DEFAULT false NOT NULL,
    "cert_name" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);



ALTER TABLE "public"."cc_training_records" OWNER TO "postgres";



COMMENT ON TABLE "public"."cc_training_records" IS 'Per-person, per-course Academy progress, keyed to the authenticated profile. Real auth retires the old freely-selectable "who am I" picker and its guest-bucket reattachment logic — there is no more ambiguity about whose record this is.';




CREATE TABLE IF NOT EXISTS "public"."cc_verses" (
    "week_number" integer NOT NULL,
    "reference" "text" NOT NULL,
    "verse_text" "text" NOT NULL,
    "translation" "text" DEFAULT 'WEB'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cc_verses_week_number_check" CHECK ((("week_number" >= 1) AND ("week_number" <= 52)))
);



ALTER TABLE "public"."cc_verses" OWNER TO "postgres";




ALTER TABLE ONLY "public"."cc_activity"
    ADD CONSTRAINT "cc_activity_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_bolos"
    ADD CONSTRAINT "cc_bolos_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_coverage_requests"
    ADD CONSTRAINT "cc_coverage_requests_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_documents"
    ADD CONSTRAINT "cc_documents_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_drills"
    ADD CONSTRAINT "cc_drills_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_events"
    ADD CONSTRAINT "cc_events_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_facility_maps"
    ADD CONSTRAINT "cc_facility_maps_pkey" PRIMARY KEY ("slot_id");




ALTER TABLE ONLY "public"."cc_incident_acknowledgments"
    ADD CONSTRAINT "cc_incident_acknowledgments_incident_id_profile_id_key" UNIQUE ("incident_id", "profile_id");




ALTER TABLE ONLY "public"."cc_incident_acknowledgments"
    ADD CONSTRAINT "cc_incident_acknowledgments_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_incident_photos"
    ADD CONSTRAINT "cc_incident_photos_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_incidents"
    ADD CONSTRAINT "cc_incidents_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_leaders"
    ADD CONSTRAINT "cc_leaders_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_meetings"
    ADD CONSTRAINT "cc_meetings_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_news"
    ADD CONSTRAINT "cc_news_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_notes"
    ADD CONSTRAINT "cc_notes_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_onboarding_steps"
    ADD CONSTRAINT "cc_onboarding_steps_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_onboarding_steps"
    ADD CONSTRAINT "cc_onboarding_steps_profile_id_step_id_key" UNIQUE ("profile_id", "step_id");




ALTER TABLE ONLY "public"."cc_prayers"
    ADD CONSTRAINT "cc_prayers_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_profiles"
    ADD CONSTRAINT "cc_profiles_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_push_subscriptions"
    ADD CONSTRAINT "cc_push_subscriptions_endpoint_key" UNIQUE ("endpoint");




ALTER TABLE ONLY "public"."cc_push_subscriptions"
    ADD CONSTRAINT "cc_push_subscriptions_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_schedule_slots"
    ADD CONSTRAINT "cc_schedule_slots_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_schedule_slots"
    ADD CONSTRAINT "cc_schedule_slots_unique_slot" UNIQUE ("service_date", "service_key", "slot_type", "slot_position");







ALTER TABLE ONLY "public"."cc_settings"
    ADD CONSTRAINT "cc_settings_pkey" PRIMARY KEY ("key");




ALTER TABLE ONLY "public"."cc_team"
    ADD CONSTRAINT "cc_team_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_training_records"
    ADD CONSTRAINT "cc_training_records_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."cc_training_records"
    ADD CONSTRAINT "cc_training_records_profile_id_course_id_key" UNIQUE ("profile_id", "course_id");




ALTER TABLE ONLY "public"."cc_verses"
    ADD CONSTRAINT "cc_verses_pkey" PRIMARY KEY ("week_number");




CREATE INDEX "cc_activity_occurred_ix" ON "public"."cc_activity" USING "btree" ("occurred_at" DESC);




CREATE INDEX "cc_bolos_linked_incident_ix" ON "public"."cc_bolos" USING "btree" ("linked_incident_id");




CREATE INDEX "cc_bolos_status_ix" ON "public"."cc_bolos" USING "btree" ("status");




CREATE INDEX "cc_coverage_requests_profile_ix" ON "public"."cc_coverage_requests" USING "btree" ("profile_id");




CREATE INDEX "cc_coverage_requests_service_ix" ON "public"."cc_coverage_requests" USING "btree" ("service_date", "service_key");




CREATE INDEX "cc_coverage_requests_status_ix" ON "public"."cc_coverage_requests" USING "btree" ("status");




CREATE INDEX "cc_documents_category_ix" ON "public"."cc_documents" USING "btree" ("category");




CREATE INDEX "cc_drills_type_date_ix" ON "public"."cc_drills" USING "btree" ("drill_type", "conducted_date" DESC);




CREATE INDEX "cc_events_event_date_ix" ON "public"."cc_events" USING "btree" ("event_date");




CREATE INDEX "cc_incident_acks_incident_ix" ON "public"."cc_incident_acknowledgments" USING "btree" ("incident_id");




CREATE INDEX "cc_incident_photos_incident_ix" ON "public"."cc_incident_photos" USING "btree" ("incident_id");




CREATE INDEX "cc_incidents_category_ix" ON "public"."cc_incidents" USING "btree" ("category");




CREATE INDEX "cc_incidents_date_ix" ON "public"."cc_incidents" USING "btree" ("incident_date");




CREATE INDEX "cc_incidents_supersedes_ix" ON "public"."cc_incidents" USING "btree" ("supersedes_id");




CREATE INDEX "cc_news_posted_date_ix" ON "public"."cc_news" USING "btree" ("posted_date" DESC);




CREATE INDEX "cc_onboarding_steps_profile_ix" ON "public"."cc_onboarding_steps" USING "btree" ("profile_id");




CREATE INDEX "cc_prayers_answered_posted_ix" ON "public"."cc_prayers" USING "btree" ("answered", "posted_at" DESC);




CREATE INDEX "cc_profiles_team_member_ix" ON "public"."cc_profiles" USING "btree" ("team_member_id");




CREATE INDEX "cc_push_subscriptions_profile_ix" ON "public"."cc_push_subscriptions" USING "btree" ("profile_id");




CREATE INDEX "cc_schedule_slots_date_ix" ON "public"."cc_schedule_slots" USING "btree" ("service_date");




CREATE INDEX "cc_schedule_slots_member_ix" ON "public"."cc_schedule_slots" USING "btree" ("team_member_id");




CREATE INDEX "cc_training_records_profile_ix" ON "public"."cc_training_records" USING "btree" ("profile_id");




CREATE OR REPLACE TRIGGER "cc_bolos_set_updated_at" BEFORE UPDATE ON "public"."cc_bolos" FOR EACH ROW EXECUTE FUNCTION "public"."cc_set_updated_at"();




CREATE OR REPLACE TRIGGER "cc_leaders_set_updated_at" BEFORE UPDATE ON "public"."cc_leaders" FOR EACH ROW EXECUTE FUNCTION "public"."cc_set_updated_at"();




CREATE OR REPLACE TRIGGER "cc_meetings_set_updated_at" BEFORE UPDATE ON "public"."cc_meetings" FOR EACH ROW EXECUTE FUNCTION "public"."cc_set_updated_at"();




CREATE OR REPLACE TRIGGER "cc_profiles_set_updated_at" BEFORE UPDATE ON "public"."cc_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."cc_set_updated_at"();




CREATE OR REPLACE TRIGGER "cc_schedule_slots_set_updated_at" BEFORE UPDATE ON "public"."cc_schedule_slots" FOR EACH ROW EXECUTE FUNCTION "public"."cc_set_updated_at"();




CREATE OR REPLACE TRIGGER "cc_settings_set_updated_at" BEFORE UPDATE ON "public"."cc_settings" FOR EACH ROW EXECUTE FUNCTION "public"."cc_set_updated_at"();




CREATE OR REPLACE TRIGGER "cc_team_set_updated_at" BEFORE UPDATE ON "public"."cc_team" FOR EACH ROW EXECUTE FUNCTION "public"."cc_set_updated_at"();




CREATE OR REPLACE TRIGGER "cc_training_records_set_updated_at" BEFORE UPDATE ON "public"."cc_training_records" FOR EACH ROW EXECUTE FUNCTION "public"."cc_set_updated_at"();




ALTER TABLE ONLY "public"."cc_activity"
    ADD CONSTRAINT "cc_activity_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."cc_profiles"("id") ON DELETE SET NULL;




ALTER TABLE ONLY "public"."cc_bolos"
    ADD CONSTRAINT "cc_bolos_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."cc_profiles"("id") ON DELETE RESTRICT;




ALTER TABLE ONLY "public"."cc_bolos"
    ADD CONSTRAINT "cc_bolos_linked_incident_id_fkey" FOREIGN KEY ("linked_incident_id") REFERENCES "public"."cc_incidents"("id") ON DELETE SET NULL;




ALTER TABLE ONLY "public"."cc_coverage_requests"
    ADD CONSTRAINT "cc_coverage_requests_covered_by_profile_id_fkey" FOREIGN KEY ("covered_by_profile_id") REFERENCES "public"."cc_profiles"("id") ON DELETE SET NULL;




ALTER TABLE ONLY "public"."cc_coverage_requests"
    ADD CONSTRAINT "cc_coverage_requests_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."cc_profiles"("id") ON DELETE CASCADE;




ALTER TABLE ONLY "public"."cc_documents"
    ADD CONSTRAINT "cc_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."cc_profiles"("id") ON DELETE SET NULL;




ALTER TABLE ONLY "public"."cc_drills"
    ADD CONSTRAINT "cc_drills_conducted_by_fkey" FOREIGN KEY ("conducted_by") REFERENCES "public"."cc_profiles"("id") ON DELETE SET NULL;




ALTER TABLE ONLY "public"."cc_events"
    ADD CONSTRAINT "cc_events_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "public"."cc_profiles"("id") ON DELETE SET NULL;




ALTER TABLE ONLY "public"."cc_facility_maps"
    ADD CONSTRAINT "cc_facility_maps_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."cc_profiles"("id");




ALTER TABLE ONLY "public"."cc_incident_acknowledgments"
    ADD CONSTRAINT "cc_incident_acknowledgments_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "public"."cc_incidents"("id");




ALTER TABLE ONLY "public"."cc_incident_acknowledgments"
    ADD CONSTRAINT "cc_incident_acknowledgments_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."cc_profiles"("id");




ALTER TABLE ONLY "public"."cc_incident_photos"
    ADD CONSTRAINT "cc_incident_photos_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "public"."cc_incidents"("id");




ALTER TABLE ONLY "public"."cc_incident_photos"
    ADD CONSTRAINT "cc_incident_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."cc_profiles"("id");




ALTER TABLE ONLY "public"."cc_incidents"
    ADD CONSTRAINT "cc_incidents_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."cc_profiles"("id");




ALTER TABLE ONLY "public"."cc_incidents"
    ADD CONSTRAINT "cc_incidents_supersedes_id_fkey" FOREIGN KEY ("supersedes_id") REFERENCES "public"."cc_incidents"("id");




ALTER TABLE ONLY "public"."cc_news"
    ADD CONSTRAINT "cc_news_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "public"."cc_profiles"("id") ON DELETE RESTRICT;




ALTER TABLE ONLY "public"."cc_notes"
    ADD CONSTRAINT "cc_notes_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "public"."cc_profiles"("id");




ALTER TABLE ONLY "public"."cc_onboarding_steps"
    ADD CONSTRAINT "cc_onboarding_steps_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."cc_profiles"("id") ON DELETE CASCADE;




ALTER TABLE ONLY "public"."cc_prayers"
    ADD CONSTRAINT "cc_prayers_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."cc_profiles"("id") ON DELETE CASCADE;




ALTER TABLE ONLY "public"."cc_profiles"
    ADD CONSTRAINT "cc_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;




ALTER TABLE ONLY "public"."cc_profiles"
    ADD CONSTRAINT "cc_profiles_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "public"."cc_team"("id") ON DELETE SET NULL;




ALTER TABLE ONLY "public"."cc_push_subscriptions"
    ADD CONSTRAINT "cc_push_subscriptions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."cc_profiles"("id") ON DELETE CASCADE;




ALTER TABLE ONLY "public"."cc_schedule_slots"
    ADD CONSTRAINT "cc_schedule_slots_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "public"."cc_team"("id") ON DELETE SET NULL;




ALTER TABLE ONLY "public"."cc_settings"
    ADD CONSTRAINT "cc_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."cc_profiles"("id") ON DELETE SET NULL;




ALTER TABLE ONLY "public"."cc_training_records"
    ADD CONSTRAINT "cc_training_records_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."cc_profiles"("id") ON DELETE CASCADE;




ALTER TABLE "public"."cc_activity" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_activity_insert" ON "public"."cc_activity" FOR INSERT TO "authenticated" WITH CHECK (true);




CREATE POLICY "cc_activity_select" ON "public"."cc_activity" FOR SELECT TO "authenticated" USING (true);




ALTER TABLE "public"."cc_bolos" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_bolos_insert" ON "public"."cc_bolos" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "public"."cc_is_team_lead_or_admin"() AS "cc_is_team_lead_or_admin") AND ("issued_by" = ( SELECT "auth"."uid"() AS "uid"))));




CREATE POLICY "cc_bolos_select" ON "public"."cc_bolos" FOR SELECT TO "authenticated" USING (true);




CREATE POLICY "cc_bolos_update" ON "public"."cc_bolos" FOR UPDATE TO "authenticated" USING (( SELECT "public"."cc_is_team_lead_or_admin"() AS "cc_is_team_lead_or_admin"));




ALTER TABLE "public"."cc_coverage_requests" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_coverage_requests_insert" ON "public"."cc_coverage_requests" FOR INSERT TO "authenticated" WITH CHECK (("profile_id" = ( SELECT "auth"."uid"() AS "uid")));




CREATE POLICY "cc_coverage_requests_select" ON "public"."cc_coverage_requests" FOR SELECT TO "authenticated" USING (true);




CREATE POLICY "cc_coverage_requests_update" ON "public"."cc_coverage_requests" FOR UPDATE TO "authenticated" USING ((("profile_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."cc_is_team_lead_or_admin"() AS "cc_is_team_lead_or_admin")));




ALTER TABLE "public"."cc_documents" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_documents_delete" ON "public"."cc_documents" FOR DELETE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_documents_insert" ON "public"."cc_documents" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_documents_select" ON "public"."cc_documents" FOR SELECT TO "authenticated" USING (true);




ALTER TABLE "public"."cc_drills" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_drills_delete" ON "public"."cc_drills" FOR DELETE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_drills_insert" ON "public"."cc_drills" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."cc_is_team_lead_or_admin"() AS "cc_is_team_lead_or_admin"));




CREATE POLICY "cc_drills_select" ON "public"."cc_drills" FOR SELECT TO "authenticated" USING (true);




ALTER TABLE "public"."cc_events" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_events_delete" ON "public"."cc_events" FOR DELETE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_events_insert" ON "public"."cc_events" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_events_select" ON "public"."cc_events" FOR SELECT TO "authenticated" USING (true);




CREATE POLICY "cc_events_update" ON "public"."cc_events" FOR UPDATE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin")) WITH CHECK (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




ALTER TABLE "public"."cc_facility_maps" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_facility_maps_delete" ON "public"."cc_facility_maps" FOR DELETE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_facility_maps_insert" ON "public"."cc_facility_maps" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_facility_maps_select" ON "public"."cc_facility_maps" FOR SELECT TO "authenticated" USING (true);




CREATE POLICY "cc_facility_maps_update" ON "public"."cc_facility_maps" FOR UPDATE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin")) WITH CHECK (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




ALTER TABLE "public"."cc_incident_acknowledgments" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_incident_acks_insert" ON "public"."cc_incident_acknowledgments" FOR INSERT TO "authenticated" WITH CHECK ((("profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."cc_incidents" "i"
  WHERE (("i"."id" = "cc_incident_acknowledgments"."incident_id") AND ( SELECT "public"."cc_can_see_incident"("i"."profile_id", "i"."category", "i"."restricted") AS "cc_can_see_incident"))))));




CREATE POLICY "cc_incident_acks_select" ON "public"."cc_incident_acknowledgments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cc_incidents" "i"
  WHERE (("i"."id" = "cc_incident_acknowledgments"."incident_id") AND ( SELECT "public"."cc_can_see_incident"("i"."profile_id", "i"."category", "i"."restricted") AS "cc_can_see_incident")))));




ALTER TABLE "public"."cc_incident_photos" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_incident_photos_insert" ON "public"."cc_incident_photos" FOR INSERT TO "authenticated" WITH CHECK ((("uploaded_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."cc_incidents" "i"
  WHERE (("i"."id" = "cc_incident_photos"."incident_id") AND ( SELECT "public"."cc_can_see_incident"("i"."profile_id", "i"."category", "i"."restricted") AS "cc_can_see_incident"))))));




CREATE POLICY "cc_incident_photos_select" ON "public"."cc_incident_photos" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cc_incidents" "i"
  WHERE (("i"."id" = "cc_incident_photos"."incident_id") AND ( SELECT "public"."cc_can_see_incident"("i"."profile_id", "i"."category", "i"."restricted") AS "cc_can_see_incident")))));




ALTER TABLE "public"."cc_incidents" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_incidents_insert" ON "public"."cc_incidents" FOR INSERT TO "authenticated" WITH CHECK ((("profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("supersedes_id" IS NULL) OR ( SELECT "public"."cc_is_team_lead_or_admin"() AS "cc_is_team_lead_or_admin") OR (EXISTS ( SELECT 1
   FROM "public"."cc_incidents" "orig"
  WHERE (("orig"."id" = "orig"."supersedes_id") AND ("orig"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))))));




CREATE POLICY "cc_incidents_select" ON "public"."cc_incidents" FOR SELECT TO "authenticated" USING (( SELECT "public"."cc_can_see_incident"("cc_incidents"."profile_id", "cc_incidents"."category", "cc_incidents"."restricted") AS "cc_can_see_incident"));




CREATE POLICY "cc_incidents_update_restricted" ON "public"."cc_incidents" FOR UPDATE TO "authenticated" USING (( SELECT "public"."cc_is_team_lead_or_admin"() AS "cc_is_team_lead_or_admin")) WITH CHECK (( SELECT "public"."cc_is_team_lead_or_admin"() AS "cc_is_team_lead_or_admin"));




ALTER TABLE "public"."cc_leaders" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_leaders_delete" ON "public"."cc_leaders" FOR DELETE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_leaders_insert" ON "public"."cc_leaders" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_leaders_select" ON "public"."cc_leaders" FOR SELECT TO "authenticated" USING (true);




CREATE POLICY "cc_leaders_update" ON "public"."cc_leaders" FOR UPDATE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




ALTER TABLE "public"."cc_meetings" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_meetings_delete" ON "public"."cc_meetings" FOR DELETE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_meetings_insert" ON "public"."cc_meetings" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_meetings_select" ON "public"."cc_meetings" FOR SELECT TO "authenticated" USING (true);




CREATE POLICY "cc_meetings_update" ON "public"."cc_meetings" FOR UPDATE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




ALTER TABLE "public"."cc_news" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_news_delete" ON "public"."cc_news" FOR DELETE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_news_insert" ON "public"."cc_news" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "public"."cc_is_admin"() AS "cc_is_admin") AND ("posted_by" = ( SELECT "auth"."uid"() AS "uid"))));




CREATE POLICY "cc_news_select" ON "public"."cc_news" FOR SELECT TO "authenticated" USING (true);




CREATE POLICY "cc_news_update" ON "public"."cc_news" FOR UPDATE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




ALTER TABLE "public"."cc_notes" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_notes_delete" ON "public"."cc_notes" FOR DELETE TO "authenticated" USING ((("posted_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."cc_is_team_lead_or_admin"() AS "cc_is_team_lead_or_admin")));




CREATE POLICY "cc_notes_insert" ON "public"."cc_notes" FOR INSERT TO "authenticated" WITH CHECK (("posted_by" = ( SELECT "auth"."uid"() AS "uid")));




CREATE POLICY "cc_notes_select" ON "public"."cc_notes" FOR SELECT TO "authenticated" USING (true);




CREATE POLICY "cc_notes_update" ON "public"."cc_notes" FOR UPDATE TO "authenticated" USING (( SELECT "public"."cc_is_team_lead_or_admin"() AS "cc_is_team_lead_or_admin"));




ALTER TABLE "public"."cc_onboarding_steps" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_onboarding_steps_delete" ON "public"."cc_onboarding_steps" FOR DELETE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "profile_id") OR ( SELECT "public"."cc_is_admin"() AS "cc_is_admin")));




CREATE POLICY "cc_onboarding_steps_insert" ON "public"."cc_onboarding_steps" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "profile_id") OR ( SELECT "public"."cc_is_admin"() AS "cc_is_admin")));




CREATE POLICY "cc_onboarding_steps_select" ON "public"."cc_onboarding_steps" FOR SELECT TO "authenticated" USING (true);




ALTER TABLE "public"."cc_prayers" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_prayers_delete" ON "public"."cc_prayers" FOR DELETE TO "authenticated" USING ((("profile_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."cc_is_admin"() AS "cc_is_admin")));




CREATE POLICY "cc_prayers_insert" ON "public"."cc_prayers" FOR INSERT TO "authenticated" WITH CHECK (("profile_id" = ( SELECT "auth"."uid"() AS "uid")));




CREATE POLICY "cc_prayers_select" ON "public"."cc_prayers" FOR SELECT TO "authenticated" USING (true);




CREATE POLICY "cc_prayers_update" ON "public"."cc_prayers" FOR UPDATE TO "authenticated" USING ((("profile_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."cc_is_admin"() AS "cc_is_admin"))) WITH CHECK ((("profile_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."cc_is_admin"() AS "cc_is_admin")));




ALTER TABLE "public"."cc_profiles" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_profiles_select_admin" ON "public"."cc_profiles" FOR SELECT TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_profiles_select_own" ON "public"."cc_profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));




CREATE POLICY "cc_profiles_update_admin" ON "public"."cc_profiles" FOR UPDATE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_profiles_update_own_theme" ON "public"."cc_profiles" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));




ALTER TABLE "public"."cc_push_subscriptions" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_push_subscriptions_delete" ON "public"."cc_push_subscriptions" FOR DELETE TO "authenticated" USING (("profile_id" = ( SELECT "auth"."uid"() AS "uid")));




CREATE POLICY "cc_push_subscriptions_insert" ON "public"."cc_push_subscriptions" FOR INSERT TO "authenticated" WITH CHECK (("profile_id" = ( SELECT "auth"."uid"() AS "uid")));




CREATE POLICY "cc_push_subscriptions_select" ON "public"."cc_push_subscriptions" FOR SELECT TO "authenticated" USING (("profile_id" = ( SELECT "auth"."uid"() AS "uid")));




ALTER TABLE "public"."cc_schedule_slots" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_schedule_slots_delete" ON "public"."cc_schedule_slots" FOR DELETE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_schedule_slots_insert" ON "public"."cc_schedule_slots" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_schedule_slots_select" ON "public"."cc_schedule_slots" FOR SELECT TO "authenticated" USING (true);




CREATE POLICY "cc_schedule_slots_update" ON "public"."cc_schedule_slots" FOR UPDATE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




ALTER TABLE "public"."cc_settings" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_settings_delete" ON "public"."cc_settings" FOR DELETE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_settings_insert" ON "public"."cc_settings" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_settings_select" ON "public"."cc_settings" FOR SELECT TO "authenticated" USING (true);




CREATE POLICY "cc_settings_update" ON "public"."cc_settings" FOR UPDATE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




ALTER TABLE "public"."cc_team" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_team_delete" ON "public"."cc_team" FOR DELETE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_team_insert" ON "public"."cc_team" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




CREATE POLICY "cc_team_select" ON "public"."cc_team" FOR SELECT TO "authenticated" USING (true);




CREATE POLICY "cc_team_update" ON "public"."cc_team" FOR UPDATE TO "authenticated" USING (( SELECT "public"."cc_is_admin"() AS "cc_is_admin"));




ALTER TABLE "public"."cc_training_records" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_training_records_delete" ON "public"."cc_training_records" FOR DELETE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "profile_id") OR ( SELECT "public"."cc_is_admin"() AS "cc_is_admin")));




CREATE POLICY "cc_training_records_insert" ON "public"."cc_training_records" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "profile_id") OR ( SELECT "public"."cc_is_admin"() AS "cc_is_admin")));




CREATE POLICY "cc_training_records_select" ON "public"."cc_training_records" FOR SELECT TO "authenticated" USING (true);




CREATE POLICY "cc_training_records_update" ON "public"."cc_training_records" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "profile_id") OR ( SELECT "public"."cc_is_admin"() AS "cc_is_admin")));




ALTER TABLE "public"."cc_verses" ENABLE ROW LEVEL SECURITY;



CREATE POLICY "cc_verses_insert" ON "public"."cc_verses" FOR INSERT WITH CHECK ("public"."cc_is_admin"());




CREATE POLICY "cc_verses_select" ON "public"."cc_verses" FOR SELECT TO "authenticated" USING (true);




CREATE POLICY "cc_verses_update" ON "public"."cc_verses" FOR UPDATE USING ("public"."cc_is_admin"());




GRANT USAGE ON SCHEMA "public" TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "anon";

GRANT USAGE ON SCHEMA "public" TO "authenticated";

GRANT USAGE ON SCHEMA "public" TO "service_role";




REVOKE ALL ON FUNCTION "public"."cc_can_see_incident"("incident_profile_id" "uuid", "cat" "text", "is_restricted" boolean) FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."cc_can_see_incident"("incident_profile_id" "uuid", "cat" "text", "is_restricted" boolean) TO "authenticated";

GRANT ALL ON FUNCTION "public"."cc_can_see_incident"("incident_profile_id" "uuid", "cat" "text", "is_restricted" boolean) TO "service_role";




GRANT ALL ON FUNCTION "public"."cc_handle_new_user"() TO "anon";

GRANT ALL ON FUNCTION "public"."cc_handle_new_user"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."cc_handle_new_user"() TO "service_role";




REVOKE ALL ON FUNCTION "public"."cc_incident_category_is_sensitive"("cat" "text") FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."cc_incident_category_is_sensitive"("cat" "text") TO "authenticated";

GRANT ALL ON FUNCTION "public"."cc_incident_category_is_sensitive"("cat" "text") TO "service_role";




REVOKE ALL ON FUNCTION "public"."cc_incident_eligible_acknowledgers"("p_incident_id" "uuid") FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."cc_incident_eligible_acknowledgers"("p_incident_id" "uuid") FROM "postgres";

GRANT ALL ON FUNCTION "public"."cc_incident_eligible_acknowledgers"("p_incident_id" "uuid") TO "authenticated";

GRANT ALL ON FUNCTION "public"."cc_incident_eligible_acknowledgers"("p_incident_id" "uuid") TO "service_role";




REVOKE ALL ON FUNCTION "public"."cc_incident_eligible_acknowledgers_bulk"("p_incident_ids" "uuid"[]) FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."cc_incident_eligible_acknowledgers_bulk"("p_incident_ids" "uuid"[]) FROM "postgres";

GRANT ALL ON FUNCTION "public"."cc_incident_eligible_acknowledgers_bulk"("p_incident_ids" "uuid"[]) TO "authenticated";

GRANT ALL ON FUNCTION "public"."cc_incident_eligible_acknowledgers_bulk"("p_incident_ids" "uuid"[]) TO "service_role";




REVOKE ALL ON FUNCTION "public"."cc_is_admin"() FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."cc_is_admin"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."cc_is_admin"() TO "service_role";




REVOKE ALL ON FUNCTION "public"."cc_is_team_lead_or_admin"() FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."cc_is_team_lead_or_admin"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."cc_is_team_lead_or_admin"() TO "service_role";




REVOKE ALL ON FUNCTION "public"."cc_resolve_coverage_request"("p_request_id" "uuid", "p_assign_team_member_id" "uuid") FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."cc_resolve_coverage_request"("p_request_id" "uuid", "p_assign_team_member_id" "uuid") TO "authenticated";

GRANT ALL ON FUNCTION "public"."cc_resolve_coverage_request"("p_request_id" "uuid", "p_assign_team_member_id" "uuid") TO "service_role";




GRANT ALL ON FUNCTION "public"."cc_set_updated_at"() TO "anon";

GRANT ALL ON FUNCTION "public"."cc_set_updated_at"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."cc_set_updated_at"() TO "service_role";




GRANT ALL ON TABLE "public"."cc_activity" TO "anon";

GRANT ALL ON TABLE "public"."cc_activity" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_activity" TO "service_role";




GRANT ALL ON TABLE "public"."cc_bolos" TO "anon";

GRANT ALL ON TABLE "public"."cc_bolos" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_bolos" TO "service_role";




GRANT ALL ON TABLE "public"."cc_coverage_requests" TO "anon";

GRANT ALL ON TABLE "public"."cc_coverage_requests" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_coverage_requests" TO "service_role";




GRANT ALL ON TABLE "public"."cc_documents" TO "anon";

GRANT ALL ON TABLE "public"."cc_documents" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_documents" TO "service_role";




GRANT ALL ON TABLE "public"."cc_drills" TO "anon";

GRANT ALL ON TABLE "public"."cc_drills" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_drills" TO "service_role";




GRANT ALL ON TABLE "public"."cc_events" TO "anon";

GRANT ALL ON TABLE "public"."cc_events" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_events" TO "service_role";




GRANT ALL ON TABLE "public"."cc_facility_maps" TO "anon";

GRANT ALL ON TABLE "public"."cc_facility_maps" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_facility_maps" TO "service_role";




GRANT ALL ON TABLE "public"."cc_incident_acknowledgments" TO "anon";

GRANT ALL ON TABLE "public"."cc_incident_acknowledgments" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_incident_acknowledgments" TO "service_role";




GRANT ALL ON TABLE "public"."cc_incident_photos" TO "anon";

GRANT ALL ON TABLE "public"."cc_incident_photos" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_incident_photos" TO "service_role";




GRANT ALL ON TABLE "public"."cc_incidents" TO "anon";

GRANT ALL ON TABLE "public"."cc_incidents" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_incidents" TO "service_role";




GRANT UPDATE("restricted") ON TABLE "public"."cc_incidents" TO "authenticated";




GRANT ALL ON TABLE "public"."cc_incidents_current" TO "anon";

GRANT ALL ON TABLE "public"."cc_incidents_current" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_incidents_current" TO "service_role";




GRANT ALL ON TABLE "public"."cc_leaders" TO "anon";

GRANT ALL ON TABLE "public"."cc_leaders" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_leaders" TO "service_role";




GRANT ALL ON TABLE "public"."cc_meetings" TO "anon";

GRANT ALL ON TABLE "public"."cc_meetings" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_meetings" TO "service_role";




GRANT ALL ON TABLE "public"."cc_news" TO "anon";

GRANT ALL ON TABLE "public"."cc_news" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_news" TO "service_role";




GRANT UPDATE("og_image_url") ON TABLE "public"."cc_news" TO "authenticated";




GRANT UPDATE("og_title") ON TABLE "public"."cc_news" TO "authenticated";




GRANT UPDATE("og_description") ON TABLE "public"."cc_news" TO "authenticated";




GRANT UPDATE("og_fetched_at") ON TABLE "public"."cc_news" TO "authenticated";




GRANT ALL ON TABLE "public"."cc_notes" TO "anon";

GRANT ALL ON TABLE "public"."cc_notes" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_notes" TO "service_role";




GRANT ALL ON TABLE "public"."cc_onboarding_steps" TO "anon";

GRANT ALL ON TABLE "public"."cc_onboarding_steps" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_onboarding_steps" TO "service_role";




GRANT ALL ON TABLE "public"."cc_prayers" TO "anon";

GRANT ALL ON TABLE "public"."cc_prayers" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_prayers" TO "service_role";




GRANT UPDATE("answered") ON TABLE "public"."cc_prayers" TO "authenticated";




GRANT UPDATE("answered_at") ON TABLE "public"."cc_prayers" TO "authenticated";




GRANT ALL ON TABLE "public"."cc_profiles" TO "anon";

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."cc_profiles" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_profiles" TO "service_role";




GRANT UPDATE("theme") ON TABLE "public"."cc_profiles" TO "authenticated";




GRANT UPDATE("push_enabled") ON TABLE "public"."cc_profiles" TO "authenticated";




GRANT UPDATE("tour_completed") ON TABLE "public"."cc_profiles" TO "authenticated";




GRANT UPDATE("display_name") ON TABLE "public"."cc_profiles" TO "authenticated";




GRANT ALL ON TABLE "public"."cc_push_subscriptions" TO "anon";

GRANT ALL ON TABLE "public"."cc_push_subscriptions" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_push_subscriptions" TO "service_role";




GRANT ALL ON TABLE "public"."cc_schedule_slots" TO "anon";

GRANT ALL ON TABLE "public"."cc_schedule_slots" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_schedule_slots" TO "service_role";





GRANT ALL ON TABLE "public"."cc_settings" TO "anon";

GRANT ALL ON TABLE "public"."cc_settings" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_settings" TO "service_role";




GRANT ALL ON TABLE "public"."cc_team" TO "anon";

GRANT ALL ON TABLE "public"."cc_team" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_team" TO "service_role";




GRANT ALL ON TABLE "public"."cc_training_records" TO "anon";

GRANT ALL ON TABLE "public"."cc_training_records" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_training_records" TO "service_role";




GRANT ALL ON TABLE "public"."cc_verses" TO "anon";

GRANT ALL ON TABLE "public"."cc_verses" TO "authenticated";

GRANT ALL ON TABLE "public"."cc_verses" TO "service_role";




ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";







ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";







ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";










-- ── cc_on_auth_user_created — NOT capturable by a public-schema dump (see
-- header). Standard Supabase "create a profile row on signup" pattern.
create trigger cc_on_auth_user_created
  after insert on auth.users
  for each row execute function public.cc_handle_new_user();

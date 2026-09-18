/* ============================================================================
   VISIBILITY-SETTINGS.sql — admin-controlled section/module visibility
   for the Celebration Church Safety & Security Team app (cc_ prefix, project
   newjbexmvltvtmxollca.supabase.co).

   Backs the new "Customize Visibility" admin panel: a single key/value table
   holding which sidebar sections and which individual Academy modules are
   turned on. Absence of a key (or of an id inside a key's JSON) means
   VISIBLE — this table only ever needs to record what's been turned OFF, so
   a brand-new module or section added later in index.html is visible by
   default without a matching migration.

   Two rows are the whole schema:
     'section_visibility'         -> {"academy": false, ...}
     'academy_module_visibility'  -> {"ss304": false, ...}
   Keys are whatever data-section / COURSES id values index.html uses; this
   table does not enumerate or constrain them.
   ========================================================================= */

create table if not exists public.cc_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.cc_profiles (id) on delete set null
);
comment on table public.cc_settings is
  'Admin-managed app-wide key/value settings (section visibility, Academy module visibility). Authenticated read, admin-only write.';

drop trigger if exists cc_settings_set_updated_at on public.cc_settings;
create trigger cc_settings_set_updated_at before update on public.cc_settings
  for each row execute function public.cc_set_updated_at();

alter table public.cc_settings enable row level security;

drop policy if exists cc_settings_select on public.cc_settings;
create policy cc_settings_select on public.cc_settings
  for select to authenticated using (true);
drop policy if exists cc_settings_insert on public.cc_settings;
create policy cc_settings_insert on public.cc_settings
  for insert to authenticated with check ((select public.cc_is_admin()));
drop policy if exists cc_settings_update on public.cc_settings;
create policy cc_settings_update on public.cc_settings
  for update to authenticated using ((select public.cc_is_admin()));
drop policy if exists cc_settings_delete on public.cc_settings;
create policy cc_settings_delete on public.cc_settings
  for delete to authenticated using ((select public.cc_is_admin()));

grant select, insert, update, delete on public.cc_settings to authenticated;

insert into public.cc_schema_migrations (filename) values ('VISIBILITY-SETTINGS.sql')
  on conflict (filename) do nothing;

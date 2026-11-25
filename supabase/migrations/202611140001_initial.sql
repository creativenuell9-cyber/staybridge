create type public.app_role as enum (
  'customer',
  'hospitality_partner',
  'administrator',
  'super_administrator'
);

create type public.property_category as enum (
  'hotel',
  'luxury_hotel',
  'boutique_hotel',
  'resort',
  'guest_house',
  'serviced_apartment',
  'short_let_apartment',
  'lodge',
  'hostel',
  'other'
);

create type public.application_status as enum (
  'draft',
  'submitted',
  'pending_review',
  'information_requested',
  'approved',
  'rejected',
  'suspended'
);

create type public.publication_status as enum (
  'inactive',
  'active',
  'unpublished',
  'suspended'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trading_name text,
  business_email text not null,
  business_phone text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  member_role text not null check (member_role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null unique,
  category public.property_category not null,
  description text not null,
  address text not null,
  city text not null,
  state text not null,
  country text not null default 'Nigeria',
  room_count integer check (room_count is null or room_count >= 0),
  check_in_time time,
  check_out_time time,
  facilities text[] not null default '{}',
  services text[] not null default '{}',
  publication_status public.publication_status not null default 'inactive',
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_active_not_suspended check (
    publication_status <> 'active' or suspended_at is null
  )
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  property_id uuid not null references public.properties (id),
  submitted_by uuid not null references public.profiles (id),
  status public.application_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references public.profiles (id),
  decision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  administrator_id uuid not null references public.profiles (id),
  previous_status public.application_status not null,
  new_status public.application_status not null,
  application_version integer not null check (application_version > 0),
  notes text,
  created_at timestamptz not null default now()
);

create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  storage_path text not null unique,
  category text not null check (
    category in ('exterior', 'reception', 'bedroom', 'bathroom', 'restaurant', 'pool', 'facility', 'other')
  ),
  alt_text text not null,
  created_at timestamptz not null default now()
);

create table public.property_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  storage_path text not null unique,
  document_type text not null check (
    document_type in ('business_registration', 'business_identity', 'hospitality_permit', 'representative_authority', 'other')
  ),
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null,
  description text not null,
  maximum_occupants integer not null check (maximum_occupants > 0),
  bed_configuration text not null,
  price_per_night numeric(12, 2) not null check (price_per_night >= 0),
  facilities text[] not null default '{}',
  booking_conditions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id),
  customer_id uuid not null references public.profiles (id),
  status text not null default 'enquiry' check (
    status in ('enquiry', 'pending', 'confirmed', 'cancelled', 'completed')
  ),
  check_in date not null,
  check_out date not null,
  guest_count integer not null check (guest_count > 0),
  total_amount numeric(12, 2) check (total_amount is null or total_amount >= 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_valid_dates check (check_out > check_in)
);

create table public.booking_guests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  organization_id uuid not null references public.organizations (id),
  rate_basis_points integer not null check (rate_basis_points between 0 and 10000),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  status text not null default 'pending' check (status in ('pending', 'payable', 'paid', 'void')),
  adjustment_reason text,
  adjusted_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  customer_id uuid not null references public.profiles (id),
  booking_id uuid references public.bookings (id),
  rating integer not null check (rating between 1 and 5),
  body text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.founder_authorizations (
  slot smallint primary key check (slot in (1, 2)),
  profile_id uuid not null unique references public.profiles (id),
  authorized_at timestamptz not null default now()
);

create table public.launch_security_checks (
  check_key text primary key,
  description text not null,
  required boolean not null default true,
  passed boolean not null default false,
  evidence text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz
);

create table public.launch_approvals (
  id uuid primary key default gen_random_uuid(),
  founder_profile_id uuid not null references public.profiles (id),
  approved boolean not null,
  notes text,
  created_at timestamptz not null default now()
);

create index properties_public_search_idx
  on public.properties (state, city, category)
  where publication_status = 'active';
create index applications_status_created_idx
  on public.applications (status, created_at desc);
create index applications_property_idx on public.applications (property_id);
create index bookings_customer_idx on public.bookings (customer_id, created_at desc);
create index notifications_profile_idx on public.notifications (profile_id, created_at desc);
create index audit_logs_resource_idx on public.audit_logs (resource_type, resource_id, created_at desc);

insert into public.launch_security_checks (check_key, description) values
  ('rls_tested', 'PostgreSQL row-level security policies have been tested.'),
  ('tenant_isolation_tested', 'Organization-level data isolation has been verified.'),
  ('customer_isolation_tested', 'Customer reservation privacy has been verified.'),
  ('private_documents_tested', 'Verification document privacy has been verified.'),
  ('admin_mfa_tested', 'Administrator MFA and role enforcement have been tested.'),
  ('self_approval_tested', 'Partners cannot approve or publish their own properties.'),
  ('approval_workflow_tested', 'Application review and publication transitions have been tested.'),
  ('public_listing_tested', 'Only eligible approved properties appear publicly.'),
  ('file_uploads_tested', 'File upload restrictions have been tested.'),
  ('web_security_tested', 'Authentication, rate limits, and common web risks have been tested.'),
  ('backups_tested', 'Database backup and recovery have been tested.'),
  ('security_findings_resolved', 'Critical and high-severity security findings have been resolved.'),
  ('production_secrets_tested', 'Production configuration and secret management have been verified.'),
  ('legal_notices_ready', 'Required legal, privacy, and operational notices are available.'),
  ('independent_review_received', 'Independent security review and written assessment have been received.')
on conflict (check_key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('property-photos', 'property-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('business-documents', 'business-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('administrator', 'super_administrator')
  ) and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and profile_id = (select auth.uid())
  );
$$;

create or replace function public.is_published_property(target_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.properties p
    join public.applications a on a.property_id = p.id
    where p.id = target_property_id
      and p.publication_status = 'active'
      and p.suspended_at is null
      and a.status = 'approved'
  );
$$;

create or replace function public.public_registration_is_authorized()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with latest_approvals as (
    select distinct on (la.founder_profile_id)
      la.founder_profile_id,
      la.approved
    from public.launch_approvals la
    join public.founder_authorizations fa
      on fa.profile_id = la.founder_profile_id
    order by la.founder_profile_id, la.created_at desc, la.id desc
  )
  select
    (select count(*) from public.founder_authorizations) = 2
    and (select count(*) from latest_approvals where approved) = 2
    and not exists (
      select 1
      from public.launch_security_checks
      where required and not passed
    );
$$;

create or replace function public.submit_property_application(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  organization_id uuid;
  property_id uuid;
  application_id uuid;
  property_slug text;
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = actor_id
      and email_confirmed_at is not null
  ) then
    raise exception 'verified email address required' using errcode = '42501';
  end if;

  if not public.public_registration_is_authorized() then
    raise exception 'public registration is not authorized' using errcode = '42501';
  end if;

  if coalesce(length(trim(payload ->> 'business_name')), 0) not between 2 and 160
     or coalesce(length(trim(payload ->> 'trading_name')), 0) > 160
     or coalesce(length(trim(payload ->> 'business_email')), 0) not between 3 and 254
     or position('@' in trim(payload ->> 'business_email')) < 2
     or coalesce(length(trim(payload ->> 'business_phone')), 0) not between 7 and 30
     or coalesce(length(trim(payload ->> 'property_name')), 0) not between 2 and 160
     or coalesce(length(trim(payload ->> 'description')), 0) not between 20 and 4000
     or coalesce(length(trim(payload ->> 'address')), 0) not between 5 and 300
     or coalesce(length(trim(payload ->> 'city')), 0) not between 2 and 100
     or coalesce(length(trim(payload ->> 'state')), 0) not between 2 and 100
     or coalesce(length(trim(payload ->> 'country')), 0) not between 2 and 100 then
    raise exception 'application fields are invalid' using errcode = '22023';
  end if;

  insert into public.organizations (
    legal_name,
    trading_name,
    business_email,
    business_phone,
    created_by
  )
  values (
    trim(payload ->> 'business_name'),
    nullif(trim(payload ->> 'trading_name'), ''),
    lower(trim(payload ->> 'business_email')),
    trim(payload ->> 'business_phone'),
    actor_id
  )
  returning id into organization_id;

  insert into public.organization_members (organization_id, profile_id, member_role)
  values (organization_id, actor_id, 'owner');

  property_slug := lower(regexp_replace(trim(payload ->> 'property_name'), '[^a-zA-Z0-9]+', '-', 'g'))
    || '-' || substr(gen_random_uuid()::text, 1, 8);

  insert into public.properties (
    organization_id,
    name,
    slug,
    category,
    description,
    address,
    city,
    state,
    country
  )
  values (
    organization_id,
    trim(payload ->> 'property_name'),
    property_slug,
    (payload ->> 'category')::public.property_category,
    trim(payload ->> 'description'),
    trim(payload ->> 'address'),
    trim(payload ->> 'city'),
    trim(payload ->> 'state'),
    coalesce(nullif(trim(payload ->> 'country'), ''), 'Nigeria')
  )
  returning id into property_id;

  insert into public.applications (
    organization_id,
    property_id,
    submitted_by,
    status,
    submitted_at
  )
  values (organization_id, property_id, actor_id, 'pending_review', now())
  returning id into application_id;

  update public.profiles
  set role = 'hospitality_partner', updated_at = now()
  where id = actor_id and role = 'customer';

  insert into public.audit_logs (actor_id, action, resource_type, resource_id)
  values (actor_id, 'application.submitted', 'application', application_id);

  return jsonb_build_object(
    'application_id', application_id,
    'property_id', property_id
  );
end;
$$;

create or replace function public.record_property_upload(
  target_property_id uuid,
  target_storage_path text,
  target_bucket text,
  upload_category text,
  upload_alt_text text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  target_organization_id uuid;
  upload_id uuid;
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select organization_id into target_organization_id
  from public.properties
  where id = target_property_id;

  if target_organization_id is null
     or not public.is_organization_member(target_organization_id) then
    raise exception 'property access denied' using errcode = '42501';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = target_bucket and name = target_storage_path
  ) then
    raise exception 'uploaded file was not found' using errcode = 'P0002';
  end if;

  if target_bucket = 'property-photos' then
    insert into public.property_photos (
      property_id,
      storage_path,
      category,
      alt_text
    )
    values (
      target_property_id,
      target_storage_path,
      upload_category,
      left(trim(upload_alt_text), 240)
    )
    returning id into upload_id;
  elsif target_bucket = 'business-documents' then
    insert into public.property_documents (
      organization_id,
      property_id,
      storage_path,
      document_type
    )
    values (
      target_organization_id,
      target_property_id,
      target_storage_path,
      upload_category
    )
    returning id into upload_id;
  else
    raise exception 'unsupported upload bucket' using errcode = '22023';
  end if;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id)
  values (actor_id, 'property.file_uploaded', 'property', target_property_id);

  return upload_id;
end;
$$;

create or replace function public.review_property_application(
  target_application_id uuid,
  decision text,
  decision_notes text,
  expected_version integer
)
returns public.applications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  current_application public.applications;
  previous_status public.application_status;
  next_status public.application_status;
begin
  if actor_id is null
     or not public.is_administrator()
     or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'administrator MFA is required' using errcode = '42501';
  end if;

  if decision not in ('approved', 'rejected', 'information_requested', 'suspended') then
    raise exception 'unsupported application decision' using errcode = '22023';
  end if;

  select * into current_application
  from public.applications
  where id = target_application_id
  for update;

  if not found then
    raise exception 'application not found' using errcode = 'P0002';
  end if;

  if current_application.version <> expected_version then
    raise exception 'application has changed; reload before deciding' using errcode = '40001';
  end if;

  if current_application.submitted_by = actor_id
     or public.is_organization_member(current_application.organization_id) then
    raise exception 'administrators cannot review their own organization application'
      using errcode = '42501';
  end if;

  if current_application.status not in ('submitted', 'pending_review', 'information_requested') then
    raise exception 'application is not reviewable in its current state' using errcode = '55000';
  end if;

  previous_status := current_application.status;

  if decision = 'approved' and not exists (
    select 1
    from public.properties p
    join public.organizations o on o.id = p.organization_id
    where p.id = current_application.property_id
      and length(trim(p.name)) >= 2
      and length(trim(p.description)) >= 20
      and length(trim(p.address)) >= 5
      and length(trim(o.business_email)) > 3
      and exists (select 1 from public.property_photos ph where ph.property_id = p.id)
      and exists (select 1 from public.property_documents d where d.property_id = p.id)
  ) then
    raise exception 'listing is incomplete; required photos and verification documents are missing'
      using errcode = '23514';
  end if;

  next_status := decision::public.application_status;

  update public.applications
  set status = next_status,
      version = version + 1,
      decided_at = case when decision in ('approved', 'rejected') then now() else null end,
      decided_by = actor_id,
      decision_notes = nullif(trim(decision_notes), ''),
      updated_at = now()
  where id = target_application_id
  returning * into current_application;

  update public.properties
  set publication_status = case
        when decision = 'approved' then 'active'::public.publication_status
        when decision = 'suspended' then 'suspended'::public.publication_status
        else 'inactive'::public.publication_status
      end,
      suspended_at = case when decision = 'suspended' then now() else null end,
      updated_at = now()
  where id = current_application.property_id;

  insert into public.application_reviews (
    application_id,
    administrator_id,
    previous_status,
    new_status,
    application_version,
    notes
  )
  values (
    target_application_id,
    actor_id,
    previous_status,
    next_status,
    current_application.version,
    nullif(trim(decision_notes), '')
  );

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, details)
  values (
    actor_id,
    'application.' || decision,
    'application',
    target_application_id,
    jsonb_build_object('status', next_status, 'version', current_application.version)
  );

  return current_application;
end;
$$;

create or replace function public.record_founder_launch_approval(
  is_approved boolean,
  approval_notes text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null
     or not exists (select 1 from public.founder_authorizations where profile_id = actor_id)
     or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'authorized founder MFA is required' using errcode = '42501';
  end if;

  insert into public.launch_approvals (founder_profile_id, approved, notes)
  values (actor_id, is_approved, nullif(trim(approval_notes), ''));

  insert into public.audit_logs (actor_id, action, resource_type, details)
  values (
    actor_id,
    'launch.approval_recorded',
    'launch',
    jsonb_build_object('approved', is_approved)
  );
end;
$$;

alter table public.application_reviews enable row level security;
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.properties enable row level security;
alter table public.applications enable row level security;
alter table public.property_photos enable row level security;
alter table public.property_documents enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_guests enable row level security;
alter table public.commissions enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.founder_authorizations enable row level security;
alter table public.launch_security_checks enable row level security;
alter table public.launch_approvals enable row level security;

create policy "profiles_select_self_or_admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_administrator()));
create policy "profiles_update_self"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create policy "organizations_select_members_or_admin"
  on public.organizations for select to authenticated
  using (created_by = (select auth.uid()) or (select public.is_organization_member(id)) or (select public.is_administrator()));
create policy "organizations_insert_self"
  on public.organizations for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "organization_members_select_self_or_admin"
  on public.organization_members for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_administrator()));

create policy "properties_select_eligible_or_member"
  on public.properties for select to anon, authenticated
  using (
    (select public.is_published_property(id))
    or (select public.is_administrator())
    or (select public.is_organization_member(organization_id))
  );

create policy "applications_select_owner_or_admin"
  on public.applications for select to authenticated
  using (
    submitted_by = (select auth.uid())
    or (select public.is_organization_member(organization_id))
    or (select public.is_administrator())
  );

create policy "application_reviews_select_admin"
  on public.application_reviews for select to authenticated
  using ((select public.is_administrator()));

create policy "property_photos_select_public_or_member"
  on public.property_photos for select to anon, authenticated
  using (
    (select public.is_published_property(property_id))
    or exists (
      select 1 from public.properties p
      where p.id = property_id
        and (select public.is_organization_member(p.organization_id))
    )
    or (select public.is_administrator())
  );

create policy "property_documents_select_member_or_admin"
  on public.property_documents for select to authenticated
  using (
    (select public.is_organization_member(organization_id))
    or (select public.is_administrator())
  );

create policy "rooms_select_public_or_member"
  on public.rooms for select to anon, authenticated
  using (
    (select public.is_published_property(property_id))
    or exists (
      select 1 from public.properties p
      where p.id = property_id
        and (select public.is_organization_member(p.organization_id))
    )
    or (select public.is_administrator())
  );

create policy "bookings_select_customer_property_admin"
  on public.bookings for select to authenticated
  using (
    customer_id = (select auth.uid())
    or exists (
      select 1 from public.properties p
      where p.id = property_id
        and (select public.is_organization_member(p.organization_id))
    )
    or (select public.is_administrator())
  );

create policy "booking_guests_select_booking_owner_or_admin"
  on public.booking_guests for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.customer_id = (select auth.uid())
          or (select public.is_administrator())
          or exists (
            select 1 from public.properties p
            where p.id = b.property_id
              and (select public.is_organization_member(p.organization_id))
          )
        )
    )
  );

create policy "commissions_select_organization_or_admin"
  on public.commissions for select to authenticated
  using (
    (select public.is_organization_member(organization_id))
    or (select public.is_administrator())
  );

create policy "reviews_select_published_or_owner_or_admin"
  on public.reviews for select to anon, authenticated
  using (
    is_published
    or customer_id = (select auth.uid())
    or (select public.is_administrator())
  );

create policy "notifications_select_self"
  on public.notifications for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "notifications_update_self"
  on public.notifications for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "audit_logs_select_admin"
  on public.audit_logs for select to authenticated
  using ((select public.is_administrator()));

create policy "founder_authorizations_select_admin"
  on public.founder_authorizations for select to authenticated
  using ((select public.is_administrator()));
create policy "launch_checks_select_admin"
  on public.launch_security_checks for select to authenticated
  using ((select public.is_administrator()));
create policy "launch_checks_update_super_admin"
  on public.launch_security_checks for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'super_administrator'
        and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'super_administrator'
        and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    )
  );

create or replace function public.stamp_launch_check_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.reviewed_by := auth.uid();
  new.reviewed_at := now();
  return new;
end;
$$;

create trigger stamp_launch_check_review_before_update
  before update on public.launch_security_checks
  for each row execute procedure public.stamp_launch_check_review();
create policy "launch_approvals_select_admin"
  on public.launch_approvals for select to authenticated
  using ((select public.is_administrator()));

create policy "property_photos_storage_select"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'property-photos'
    and (
      exists (
        select 1 from public.property_photos ph
        where ph.storage_path = name
          and (select public.is_published_property(ph.property_id))
      )
      or exists (
        select 1
        from public.property_photos ph
        join public.properties p on p.id = ph.property_id
        where ph.storage_path = name
          and (select public.is_organization_member(p.organization_id))
      )
      or (select public.is_administrator())
    )
  );

create policy "documents_storage_select_private"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'business-documents'
    and (
      exists (
        select 1 from public.property_documents d
        where d.storage_path = name
          and (select public.is_organization_member(d.organization_id))
      )
      or (select public.is_administrator())
    )
  );

create policy "property_storage_upload_member"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('property-photos', 'business-documents')
    and exists (
      select 1 from public.properties p
      join public.organization_members m on m.organization_id = p.organization_id
      where p.id::text = split_part(name, '/', 2)
        and p.organization_id::text = split_part(name, '/', 1)
        and m.profile_id = (select auth.uid())
    )
  );

create policy "property_storage_delete_member_or_admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('property-photos', 'business-documents')
    and (
      exists (
        select 1
        from public.properties p
        join public.organization_members m on m.organization_id = p.organization_id
        where p.id::text = split_part(name, '/', 2)
          and p.organization_id::text = split_part(name, '/', 1)
          and m.profile_id = (select auth.uid())
      )
      or (select public.is_administrator())
    )
  );

revoke all on all tables in schema public from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;
revoke all on public.founder_authorizations from anon, authenticated;
revoke all on public.launch_approvals from anon, authenticated;
revoke all on public.launch_security_checks from anon, authenticated;
grant select on public.profiles, public.organizations, public.organization_members,
  public.properties, public.applications, public.property_photos,
  public.property_documents, public.rooms, public.bookings, public.booking_guests,
  public.commissions, public.reviews, public.notifications,
  public.application_reviews, public.audit_logs, public.founder_authorizations,
  public.launch_security_checks, public.launch_approvals to authenticated;
grant select on public.properties, public.property_photos, public.rooms, public.reviews to anon;
grant update (full_name, phone) on public.profiles to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant update (passed, evidence) on public.launch_security_checks to authenticated;
grant select, insert, delete on storage.objects to authenticated;
grant select on storage.objects to anon;

revoke all on function public.submit_property_application(jsonb) from public, anon;
grant execute on function public.submit_property_application(jsonb) to authenticated;
revoke all on function public.record_property_upload(uuid, text, text, text, text) from public, anon;
grant execute on function public.record_property_upload(uuid, text, text, text, text) to authenticated;
revoke all on function public.review_property_application(uuid, text, text, integer) from public, anon;
grant execute on function public.review_property_application(uuid, text, text, integer) to authenticated;
revoke all on function public.record_founder_launch_approval(boolean, text) from public, anon;
grant execute on function public.record_founder_launch_approval(boolean, text) to authenticated;
revoke all on function public.public_registration_is_authorized() from public;
grant execute on function public.public_registration_is_authorized() to anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.stamp_launch_check_review() from public, anon, authenticated;
revoke all on function public.is_administrator() from public;
grant execute on function public.is_administrator() to anon, authenticated;
revoke all on function public.is_organization_member(uuid) from public;
grant execute on function public.is_organization_member(uuid) to anon, authenticated;
revoke all on function public.is_published_property(uuid) from public;
grant execute on function public.is_published_property(uuid) to anon, authenticated;


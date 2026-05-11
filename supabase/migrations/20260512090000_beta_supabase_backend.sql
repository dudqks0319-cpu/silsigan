-- Move the MVP from demo-only storage toward the Korean private web beta backend.
-- Exact user coordinates remain transient API input only.

alter table public.reports
  add column if not exists location_verified boolean not null default false;

alter table public.reports
  alter column verified_radius_m drop not null;

alter table public.reports
  drop constraint if exists reports_verified_radius_m_check;

alter table public.reports
  add constraint reports_verified_radius_m_check
  check (verified_radius_m is null or verified_radius_m in (50, 150, 300));

alter table public.reports
  add column if not exists handled_by uuid references public.profiles(id) on delete set null,
  add column if not exists handled_at timestamptz;

alter table public.reports
  drop constraint if exists reports_location_verification_consistency;

update public.reports
set location_verified = true
where verified_radius_m is not null;

alter table public.reports
  add constraint reports_location_verification_consistency
  check (
    (location_verified = true and verified_radius_m in (50, 150, 300))
    or (location_verified = false and verified_radius_m is null)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-photos',
  'report-photos',
  false,
  8388608,
  array['image/jpeg']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.report_photo_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bucket_name text not null default 'report-photos',
  photo_path text not null unique check (photo_path ~ '^reports/[0-9a-f-]+\.jpg$'),
  content_type text not null check (content_type = 'image/jpeg'),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 8388608),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists report_photo_uploads_user_unused_idx
  on public.report_photo_uploads (user_id, created_at desc)
  where consumed_at is null;

alter table public.report_photo_uploads enable row level security;

insert into public.places (id, name, address, region, category, latitude, longitude)
values
  ('11111111-1111-4111-8111-111111111111', '태화강 국가정원', '울산 중구 태화강국가정원길', 'ulsan', 'tourism', 35.548600, 129.300500),
  ('22222222-2222-4222-8222-222222222222', '광안리해수욕장', '부산 수영구 광안해변로', 'busan', 'tourism', 35.153200, 129.118600),
  ('33333333-3333-4333-8333-333333333333', '황리단길', '경북 경주시 포석로', 'gyeongju', 'restaurant_cafe', 35.838200, 129.209800),
  ('44444444-4444-4444-8444-444444444444', '울산광역시청', '울산 남구 중앙로 201', 'ulsan', 'public_office', 35.539600, 129.311500)
on conflict (id) do nothing;

drop view if exists public.active_reports;

create view public.active_reports as
select
  id,
  place_id,
  category,
  crowd_level,
  line_status,
  parking_status,
  weather_feel,
  comment,
  photo_path,
  verified_radius_m,
  location_verified,
  created_at,
  expires_at
from public.reports
where hidden_at is null
  and expires_at > now();

create or replace function public.create_question_with_credit(
  p_user_id uuid,
  p_place_id uuid,
  p_question_type public.question_type,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := p_user_id;
  v_credit_cost smallint := case when p_question_type = 'photo_request' then 2 else 1 end;
  v_event_type public.credit_event_type := case
    when p_question_type = 'photo_request' then 'ask_photo_request'::public.credit_event_type
    else 'ask_question'::public.credit_event_type
  end;
  v_balance integer;
  v_question public.questions%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  if not exists (select 1 from public.places where id = p_place_id) then
    raise exception 'PLACE_NOT_FOUND';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  select coalesce(sum(amount), 0)::integer
  into v_balance
  from public.credit_events
  where user_id = v_user_id;

  if v_balance < v_credit_cost then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into public.questions (
    place_id,
    user_id,
    question_type,
    body,
    credit_cost
  )
  values (
    p_place_id,
    v_user_id,
    p_question_type,
    p_body,
    v_credit_cost
  )
  returning * into v_question;

  insert into public.credit_events (
    user_id,
    event_type,
    amount,
    question_id
  )
  values (
    v_user_id,
    v_event_type,
    -v_credit_cost,
    v_question.id
  );

  select coalesce(sum(amount), 0)::integer
  into v_balance
  from public.credit_events
  where user_id = v_user_id;

  return jsonb_build_object(
    'question', jsonb_build_object(
      'id', v_question.id,
      'placeId', v_question.place_id,
      'questionType', v_question.question_type,
      'body', v_question.body,
      'creditCost', v_question.credit_cost,
      'createdAt', v_question.created_at
    ),
    'creditEvent', jsonb_build_object(
      'type', v_event_type,
      'amount', -v_credit_cost
    ),
    'balance', v_balance
  );
end;
$$;

create or replace function public.create_report_with_credits(
  p_user_id uuid,
  p_place_id uuid,
  p_category public.place_category,
  p_crowd_level public.crowd_level,
  p_line_status public.line_status,
  p_parking_status public.parking_status,
  p_weather_feel public.weather_feel,
  p_comment text,
  p_photo_path text,
  p_verified_radius_m smallint,
  p_location_verified boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := p_user_id;
  v_report public.reports%rowtype;
  v_photo_upload public.report_photo_uploads%rowtype;
  v_balance integer;
  v_credits jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  if not exists (select 1 from public.places where id = p_place_id) then
    raise exception 'PLACE_NOT_FOUND';
  end if;

  if not exists (select 1 from public.places where id = p_place_id and category = p_category) then
    raise exception 'CATEGORY_MISMATCH';
  end if;

  if p_location_verified and p_verified_radius_m not in (50, 150, 300) then
    raise exception 'LOCATION_VERIFICATION_CONFLICT';
  end if;

  if not p_location_verified and p_verified_radius_m is not null then
    raise exception 'LOCATION_VERIFICATION_CONFLICT';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  if p_photo_path is not null then
    update public.report_photo_uploads
    set consumed_at = now()
    where user_id = v_user_id
      and photo_path = p_photo_path
      and consumed_at is null
    returning * into v_photo_upload;

    if not found then
      raise exception 'PHOTO_UPLOAD_NOT_FOUND';
    end if;
  end if;

  insert into public.reports (
    place_id,
    user_id,
    category,
    crowd_level,
    line_status,
    parking_status,
    weather_feel,
    comment,
    photo_path,
    verified_radius_m,
    location_verified
  )
  values (
    p_place_id,
    v_user_id,
    p_category,
    p_crowd_level,
    p_line_status,
    p_parking_status,
    p_weather_feel,
    p_comment,
    p_photo_path,
    p_verified_radius_m,
    p_location_verified
  )
  returning * into v_report;

  if p_location_verified then
    insert into public.credit_events (user_id, event_type, amount, report_id)
    values (v_user_id, 'verified_report', 1, v_report.id);

    v_credits := v_credits || jsonb_build_array(jsonb_build_object('type', 'verified_report', 'amount', 1));

    if p_photo_path is not null then
      insert into public.credit_events (user_id, event_type, amount, report_id)
      values (v_user_id, 'photo_report', 1, v_report.id);

      v_credits := v_credits || jsonb_build_array(jsonb_build_object('type', 'photo_report', 'amount', 1));
    end if;
  end if;

  select coalesce(sum(amount), 0)::integer
  into v_balance
  from public.credit_events
  where user_id = v_user_id;

  return jsonb_build_object(
    'report', jsonb_build_object(
      'id', v_report.id,
      'placeId', v_report.place_id,
      'category', v_report.category,
      'crowdLevel', v_report.crowd_level,
      'lineStatus', v_report.line_status,
      'parkingStatus', v_report.parking_status,
      'weatherFeel', v_report.weather_feel,
      'comment', v_report.comment,
      'photoPath', v_report.photo_path,
      'verifiedRadiusM', v_report.verified_radius_m,
      'locationVerified', v_report.location_verified,
      'createdAt', v_report.created_at,
      'expiresAt', v_report.expires_at,
      'flagCount', 0,
      'hiddenAt', v_report.hidden_at
    ),
    'credits', v_credits,
    'balance', v_balance
  );
end;
$$;

revoke execute on function public.create_question_with_credit(uuid, uuid, public.question_type, text) from public, anon, authenticated;
grant execute on function public.create_question_with_credit(uuid, uuid, public.question_type, text) to service_role;
revoke execute on function public.create_report_with_credits(
  uuid,
  uuid,
  public.place_category,
  public.crowd_level,
  public.line_status,
  public.parking_status,
  public.weather_feel,
  text,
  text,
  smallint,
  boolean
) from public, anon, authenticated;
grant execute on function public.create_report_with_credits(
  uuid,
  uuid,
  public.place_category,
  public.crowd_level,
  public.line_status,
  public.parking_status,
  public.weather_feel,
  text,
  text,
  smallint,
  boolean
) to service_role;

comment on column public.reports.location_verified is
  'True only when the server verified the transient client coordinate within the allowed place radius.';
comment on column public.reports.handled_by is
  'Operator profile id for manual moderation actions when available.';
comment on column public.reports.handled_at is
  'Time when an operator last handled hide or restore state.';

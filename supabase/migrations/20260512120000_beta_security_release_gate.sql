-- Beta release gate hardening.
-- Keeps public reads away from raw user-owned tables and guarantees signup credits once.

drop policy if exists "visible reports are publicly readable" on public.reports;
drop policy if exists "place questions are publicly readable" on public.questions;

drop view if exists public.active_reports;
drop view if exists public.public_active_reports;
drop view if exists public.public_place_questions;

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
  (photo_path is not null) as has_photo,
  verified_radius_m,
  location_verified,
  created_at,
  expires_at
from public.reports
where hidden_at is null
  and expires_at > now();

create view public.public_active_reports as
select
  id,
  place_id,
  category,
  crowd_level,
  line_status,
  parking_status,
  weather_feel,
  comment,
  (photo_path is not null) as has_photo,
  verified_radius_m,
  location_verified,
  created_at,
  expires_at
from public.reports
where hidden_at is null
  and expires_at > now();

create view public.public_place_questions as
select
  id,
  place_id,
  question_type,
  body,
  credit_cost,
  answered_report_id,
  created_at
from public.questions;

grant select on public.active_reports to anon, authenticated;
grant select on public.public_active_reports to anon, authenticated;
grant select on public.public_place_questions to anon, authenticated;

create unique index if not exists credit_events_signup_once_idx
  on public.credit_events (user_id)
  where event_type = 'signup_bonus';

create or replace function public.ensure_profile_with_signup_bonus(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into public.profiles (id)
  values (p_user_id)
  on conflict (id) do nothing;

  insert into public.credit_events (user_id, event_type, amount)
  values (p_user_id, 'signup_bonus', 3)
  on conflict do nothing;
end;
$$;

revoke execute on function public.ensure_profile_with_signup_bonus(uuid) from public, anon, authenticated;
grant execute on function public.ensure_profile_with_signup_bonus(uuid) to service_role;

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
  perform public.ensure_profile_with_signup_bonus(v_user_id);

  if not exists (select 1 from public.places where id = p_place_id) then
    raise exception 'PLACE_NOT_FOUND';
  end if;

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

revoke execute on function public.create_question_with_credit(
  uuid,
  uuid,
  public.question_type,
  text
) from public, anon, authenticated;
grant execute on function public.create_question_with_credit(
  uuid,
  uuid,
  public.question_type,
  text
) to service_role;

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
  p_location_verified boolean,
  p_answer_question_id uuid default null
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
  v_question public.questions%rowtype;
  v_balance integer;
  v_credits jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));
  perform public.ensure_profile_with_signup_bonus(v_user_id);

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

  if p_answer_question_id is not null and not p_location_verified then
    raise exception 'ANSWER_LOCATION_REQUIRED';
  end if;

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

  if p_answer_question_id is not null then
    update public.questions
    set answered_report_id = v_report.id
    where id = p_answer_question_id
      and place_id = p_place_id
      and answered_report_id is null
    returning * into v_question;

    if not found then
      raise exception 'QUESTION_NOT_FOUND';
    end if;

    insert into public.credit_events (user_id, event_type, amount, report_id, question_id)
    values (v_user_id, 'answer_question', 2, v_report.id, v_question.id);

    v_credits := v_credits || jsonb_build_array(jsonb_build_object('type', 'answer_question', 'amount', 2));
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
  boolean,
  uuid
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
  boolean,
  uuid
) to service_role;

comment on view public.public_active_reports is
  'Public-safe report projection. Does not expose user_id or raw photo_path.';
comment on view public.active_reports is
  'Backward-compatible public-safe report projection. Does not expose user_id or raw photo_path.';
comment on view public.public_place_questions is
  'Public-safe question projection. Does not expose asker user_id.';

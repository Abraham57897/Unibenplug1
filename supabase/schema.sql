-- UnibenPlug schema. Run in Supabase SQL editor (whole file, once).
create extension if not exists pgcrypto;

create type post_type as enum ('SELL','NEED');
create type post_status as enum ('approved','pending_review','hidden','auto_deleted');

-- ============ TABLES ============
create table campuses (
  id serial primary key, name text not null, slug text unique not null,
  lat double precision not null, lng double precision not null,
  state text, is_active boolean not null default false);

insert into campuses (name,slug,lat,lng,state,is_active) values
 ('UNIBEN Ugbowo','uniben-ugbowo',6.3973,5.6148,'Edo',true),
 ('UNIBEN Ekehuan','uniben-ekehuan',6.3333,5.6000,'Edo',true),
 ('AAU Ekpoma','aau-ekpoma',6.7537,6.1313,'Edo',false),
 ('Auchi Poly','auchi-poly',7.0682,6.2641,'Edo',false),
 ('EDSU Iyamho','edsu-iyamho',7.2333,6.2833,'Edo',false),
 ('UNILAG','unilag',6.5167,3.3863,'Lagos',false),
 ('UI','ui',7.4418,3.9066,'Oyo',false),
 ('OAU','oau',7.5211,4.5211,'Osun',false),
 ('UNILORIN','unilorin',8.4923,4.5950,'Kwara',false),
 ('UNN','unn',6.8630,7.3953,'Enugu',false),
 ('UNIPORT','uniport',4.8931,6.9225,'Rivers',false),
 ('UNICAL','unical',4.9510,8.3417,'Cross River',false),
 ('DELSU','delsu',5.7898,6.1021,'Delta',false),
 ('LASU','lasu',6.4658,3.2015,'Lagos',false),
 ('ABU','abu',11.08,7.70,'Kaduna',false),
 ('UNIZIK','unizik',6.2459,7.1152,'Anambra',false),
 ('FUTO','futo',5.3937,6.9928,'Imo',false),
 ('FUTA','futa',7.3043,5.1355,'Ondo',false),
 ('FUT Minna','futminna',9.6116,6.5465,'Niger',false),
 ('BUK','buk',11.9767,8.3926,'Kano',false);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique, full_name text, whatsapp_number text, hostel_area text,
  campus_id int references campuses(id),
  is_banned boolean not null default false,
  is_verified boolean not null default false,
  is_admin boolean not null default false,
  total_approved_posts int not null default 0,
  avg_rating double precision not null default 0,
  created_at timestamptz not null default now());

create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  campus_id int not null references campuses(id),
  post_type post_type not null,
  title text not null, description text,
  price text not null check (length(trim(price)) > 0),
  category text not null, area text,
  lat double precision, lng double precision,
  image_url text, whatsapp_link text,
  views_count int not null default 0,
  is_urgent boolean not null default false, urgent_until timestamptz,
  status post_status not null default 'pending_review',
  reports_count int not null default 0, auto_delete_reason text,
  created_at timestamptz not null default now(), expires_at timestamptz);
create index on posts (campus_id, status, expires_at);
create index on posts (user_id);

create table post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  viewer_id uuid not null references profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(), unique (post_id, viewer_id));

create table reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reason text not null check (reason in ('Fraud','Sexual','Gambling','Wrong Category','Outside Location')),
  created_at timestamptz not null default now(), unique (post_id, reporter_id));

create table ratings (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  rater_id uuid not null references profiles(id) on delete cascade,
  seller_id uuid not null references profiles(id) on delete cascade,
  stars int not null check (stars between 1 and 5), comment text,
  created_at timestamptz not null default now(), unique (post_id, rater_id));

-- ============ HELPERS ============
create function is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select is_admin from profiles where id = auth.uid()), false) $$;

create function banned_keyword(txt text) returns text language sql immutable as $$
  select k from unnest(array['yahoo','yahoo boy','olosho','hookup','escort','knack','bet9ja','1xbet','betting','porn','xxx','sex service','viagra','investment double','double your money','bring 5k get 50k','click link to win','forex double']) k
  where position(k in lower(coalesce(txt,''))) > 0 limit 1 $$;

-- ============ SIGNUP: just the profile ============
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, phone, full_name, whatsapp_number, hostel_area, campus_id)
  values (new.id, new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'whatsapp_number', new.raw_user_meta_data->>'hostel_area',
          nullif(new.raw_user_meta_data->>'campus_id','')::int);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ============ CREATE POST (all moderation lives here, not in the browser) ============
create function create_post(p_type post_type, p_campus int, p_title text, p_desc text, p_price text,
  p_category text, p_area text, p_lat double precision, p_lng double precision,
  p_image text, p_urgent boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u profiles; v_kw text; v_id uuid; v_wa text; v_status post_status; v_exp timestamptz; v_cats text[];
begin
  select * into u from profiles where id = auth.uid();
  if u.id is null then raise exception 'Login required'; end if;
  if u.is_banned then raise exception 'Your account is banned'; end if;
  if not exists (select 1 from campuses where id = p_campus and is_active) then raise exception 'Campus not active'; end if;
  if coalesce(trim(p_title),'') = '' or coalesce(trim(p_price),'') = '' then raise exception 'Title and price are required'; end if;

  v_cats := case when p_type = 'SELL' then array['Food & Snacks','Thrift & Fashion','Beauty (Hair, Makeup, Nails, Barbing)','Tech (Phones, Laptops, Data, Graphics)','Printing & Photography','Laundry & Cleaning','Tutor & Assignment Help','Accommodation & Room']
            else array['Beauty Service Needed','Cleaning, Laundry & Errand','Food Delivery Needed','Tutor & School Help Needed','Tech Help Needed','Worker Needed','Accommodation & Roommate Needed','Other Help (write anything)'] end;
  if not (p_category = any (v_cats)) then raise exception 'Invalid category'; end if;

  v_wa := regexp_replace(coalesce(u.whatsapp_number,''), '\D', '', 'g');
  if v_wa like '0%' then v_wa := '234' || substr(v_wa, 2); end if;
  v_wa := 'https://wa.me/' || v_wa;

  v_kw := banned_keyword(p_title || ' ' || coalesce(p_desc,''));
  if v_kw is not null then
    insert into posts (user_id,campus_id,post_type,title,description,price,category,area,lat,lng,image_url,whatsapp_link,status,auto_delete_reason,expires_at)
    values (u.id,p_campus,p_type,p_title,p_desc,p_price,p_category,p_area,p_lat,p_lng,p_image,v_wa,'auto_deleted','Banned keyword: '||v_kw, now());
    if (select count(*) from posts where user_id = u.id and status = 'auto_deleted') >= 3 then
      update profiles set is_banned = true where id = u.id;
    end if;
    return jsonb_build_object('status','auto_deleted','message','This post breaks the Community Policy and was removed.');
  end if;

  if u.total_approved_posts < 2 then
    v_status := 'pending_review'; v_exp := now() + interval '24 hours';
  else
    v_status := 'approved'; v_exp := now() + interval '24 hours';
  end if;

  insert into posts (user_id,campus_id,post_type,title,description,price,category,area,lat,lng,image_url,whatsapp_link,
     status,expires_at,is_urgent,urgent_until)
  values (u.id,p_campus,p_type,p_title,p_desc,p_price,p_category,p_area,p_lat,p_lng,p_image,v_wa,
     v_status,v_exp,(p_type = 'NEED' and coalesce(p_urgent,false)), case when p_type = 'NEED' and coalesce(p_urgent,false) then now() + interval '2 hours' end)
  returning id into v_id;

  if v_status = 'approved' then update profiles set total_approved_posts = total_approved_posts + 1 where id = u.id; end if;
  return jsonb_build_object('id',v_id,'status',v_status);
end $$;

-- Block bad edits after approval
create function check_edit() returns trigger language plpgsql as $$
begin
  if banned_keyword(new.title || ' ' || coalesce(new.description,'')) is not null then
    raise exception 'This edit breaks the Community Policy';
  end if;
  return new;
end $$;
create trigger posts_check_edit before update of title, description on posts for each row execute function check_edit();

-- ============ VIEWS / REPORTS / RATINGS ============
create function record_view(p_post uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if exists (select 1 from posts where id = p_post and user_id = auth.uid()) then return; end if;
  insert into post_views (post_id, viewer_id) values (p_post, auth.uid()) on conflict do nothing;
  if found then update posts set views_count = views_count + 1 where id = p_post; end if;
end $$;

create function report_post(p_post uuid, p_reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  insert into reports (post_id, reporter_id, reason) values (p_post, auth.uid(), p_reason) on conflict do nothing;
  if found then
    update posts set reports_count = reports_count + 1,
      status = case when reports_count + 1 >= 3 and status = 'approved' then 'hidden' else status end
    where id = p_post;
  end if;
end $$;

create function rate_seller(p_post uuid, p_stars int, p_comment text) returns void language plpgsql security definer set search_path = public as $$
declare v_seller uuid;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  select user_id into v_seller from posts where id = p_post;
  if v_seller is null or v_seller = auth.uid() then raise exception 'Cannot rate this post'; end if;
  insert into ratings (post_id, rater_id, seller_id, stars, comment) values (p_post, auth.uid(), v_seller, p_stars, p_comment) on conflict do nothing;
  update profiles set avg_rating = coalesce((select round(avg(stars)::numeric,1) from ratings where seller_id = v_seller),0) where id = v_seller;
end $$;

-- ============ ADMIN ============
create function admin_review_post(p_post uuid, p_action text) returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select user_id into v_owner from posts where id = p_post;
  if p_action = 'approve' then
    update posts set status = 'approved', expires_at = now() + interval '24 hours', reports_count = 0 where id = p_post and status in ('pending_review','hidden');
    if found then update profiles set total_approved_posts = total_approved_posts + 1 where id = v_owner; end if;
  elsif p_action = 'hide' then update posts set status = 'hidden' where id = p_post;
  elsif p_action = 'delete' then delete from posts where id = p_post;
  end if;
end $$;

create function admin_set_ban(p_user uuid, p_ban boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  update profiles set is_banned = p_ban where id = p_user;
end $$;

create function admin_set_verified(p_user uuid, p_val boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  update profiles set is_verified = p_val where id = p_user;
end $$;

-- Hourly job. Enable pg_cron (Database > Extensions), then uncomment the schedule line.
create function run_expiry() returns void language sql security definer set search_path = public as $$
  update posts set is_urgent = false where is_urgent and urgent_until < now();
$$;
-- select cron.schedule('unibenplug-hourly', '0 * * * *', 'select public.run_expiry()');
-- Expired posts (expires_at < now) are already excluded by the feed policy below.

-- ============ PUBLIC VIEWS ============
create view seller_public as
  select p.id, p.full_name, p.is_verified, p.avg_rating,
         (select count(*) from ratings r where r.seller_id = p.id)::int as rating_count
  from profiles p where not p.is_banned;

create view feed_posts with (security_invoker = true) as
  select p.*, (p.is_urgent and p.urgent_until > now()) as urgent_now,
         s.full_name as seller_name, s.is_verified as seller_verified,
         s.avg_rating as seller_rating, s.rating_count as seller_rating_count
  from posts p join seller_public s on s.id = p.user_id;

grant select on seller_public, feed_posts to anon, authenticated;

-- ============ RLS ============
alter table campuses enable row level security;
alter table profiles enable row level security;
alter table posts enable row level security;
alter table post_views enable row level security;
alter table reports enable row level security;
alter table ratings enable row level security;

create policy campuses_read on campuses for select using (is_active or is_admin());

create policy profiles_read on profiles for select to authenticated using (id = auth.uid() or is_admin());
create policy profiles_update on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on profiles from authenticated;
grant update (full_name, whatsapp_number, hostel_area, campus_id) on profiles to authenticated;

create policy posts_read on posts for select using ((status = 'approved' and expires_at > now()) or user_id = auth.uid() or is_admin());
create policy posts_update_own on posts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy posts_delete_own on posts for delete to authenticated using (user_id = auth.uid() or is_admin());
revoke insert, update on posts from authenticated, anon;
grant update (title, description, price, category, area, lat, lng, image_url) on posts to authenticated;

create policy ratings_read on ratings for select using (true);
create policy reports_admin_read on reports for select to authenticated using (is_admin());
-- post_views, and all inserts on reports/ratings, are only possible through the functions above.
revoke insert, update, delete on reports, ratings, post_views from authenticated, anon;

-- ============ STORAGE ============
insert into storage.buckets (id, name, public) values ('post-images','post-images',true) on conflict do nothing;
create policy post_images_read on storage.objects for select using (bucket_id = 'post-images');
-- post-images are uploaded by /api/upload (service role) after the nudity check, so no insert policy here.

-- Make yourself admin after signing up:
-- update profiles set is_admin = true where phone = '08012345678';

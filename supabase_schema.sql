-- SmartKafe SaaS Database Schema

-- Enable Extension for UUID generation
create extension if not exists "uuid-ossp";

-- PROFILES TABLE (Linked to auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  phone text,
  avatar_url text,
  telegram_chat_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- STORES TABLE (SaaS Multi-tenant)
create table stores (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  logo_url text,
  banner_url text,
  phone text,
  address text,
  is_active boolean default true not null,
  theme_settings jsonb default '{"primary_color": "#10b981", "font_family": "Inter"}'::jsonb not null,
  features_enabled jsonb default '{"table_service": true, "takeaway": true, "delivery": false}'::jsonb not null,
  payment_settings jsonb default '{"iyzico_api_key": "", "iyzico_secret_key": "", "iyzico_base_url": ""}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- USER ROLES ENUM
create type user_role as enum ('owner', 'manager', 'staff', 'courier');

-- STORE MEMBERS TABLE
create table store_members (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role user_role default 'staff'::user_role not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(store_id, user_id)
);

-- PRODUCTS TABLE
create table products (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id) on delete cascade not null,
  name text not null,
  price numeric not null,
  category text not null,
  image_url text,
  description text,
  calories integer,
  allergens text[], -- e.g. {'gluten', 'peanuts'}
  is_available boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PRODUCT OPTION GROUPS
create table product_option_groups (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade not null,
  name text not null, -- e.g., "Sos Seçimi", "Boyut"
  is_required boolean default false not null,
  min_select integer default 0 not null,
  max_select integer default 1 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PRODUCT OPTIONS
create table product_options (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references product_option_groups(id) on delete cascade not null,
  name text not null, -- e.g., "Ketçap", "Büyük Boy"
  price_modifier numeric default 0 not null,
  is_available boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TABLES TABLE
create table tables (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id) on delete cascade not null,
  table_no text not null,
  qr_token text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(store_id, table_no)
);

-- DELIVERY ZONES TABLE
create table delivery_zones (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id) on delete cascade not null,
  name text not null,
  coordinates jsonb not null, -- GeoJSON Poligon
  min_order_price numeric default 0 not null,
  delivery_fee numeric default 0 not null,
  estimated_minutes integer default 45 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ENUMS FOR ORDERS
create type order_type as enum ('table', 'takeaway', 'delivery');
create type order_status as enum ('new', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled', 'paid');
create type payment_type as enum ('cash_table', 'card_table', 'online_pay', 'cash_delivery', 'card_delivery');

-- ORDERS TABLE
create table orders (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete set null,
  type order_type default 'table'::order_type not null,
  status order_status default 'new'::order_status not null,
  payment_method payment_type not null,
  payment_status text default 'pending' not null, -- pending, paid, refunded
  
  table_no text,
  
  customer_name text not null,
  customer_phone text not null,
  delivery_address text,
  delivery_coordinates jsonb, -- [lat, lng]
  delivery_notes text,
  courier_id uuid references profiles(id) on delete set null,
  
  total_price numeric not null,
  items jsonb not null, -- [{id, name, quantity, price, options: [{name, price}]}]
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CALLS TABLE
create table calls (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id) on delete cascade not null,
  table_no text not null,
  type text not null, -- waiter, bill
  active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SUGGESTIONS TABLE (Landing page)
create table suggestions (
  id uuid default gen_random_uuid() primary key,
  name text,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- HELPER FUNCTIONS FOR RLS
create or replace function public.is_store_member(store_id uuid, user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.store_members
    where store_members.store_id = is_store_member.store_id
      and store_members.user_id = is_store_member.user_id
  );
end;
$$ language plpgsql security definer;

create or replace function public.is_store_admin(store_id uuid, user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.store_members
    where store_members.store_id = is_store_admin.store_id
      and store_members.user_id = is_store_admin.user_id
      and store_members.role in ('owner', 'manager')
  );
end;
$$ language plpgsql security definer;

-- TRIGGERS
-- 1. Create profile on auth user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Associate store creator as owner in store_members
create or replace function public.handle_new_store()
returns trigger as $$
begin
  insert into public.store_members (store_id, user_id, role)
  values (new.id, auth.uid(), 'owner'::user_role);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_store_created
  after insert on public.stores
  for each row execute procedure public.handle_new_store();


-- ENABLE ROW LEVEL SECURITY
alter table profiles enable row level security;
alter table stores enable row level security;
alter table store_members enable row level security;
alter table products enable row level security;
alter table product_option_groups enable row level security;
alter table product_options enable row level security;
alter table tables enable row level security;
alter table delivery_zones enable row level security;
alter table orders enable row level security;
alter table calls enable row level security;
alter table suggestions enable row level security;


-- RLS POLICIES

-- Profiles: Users can see all profiles (for member management), but only update their own
create policy "View profiles" on profiles for select using (true);
create policy "Update own profile" on profiles for update using (auth.uid() = id);

-- Stores: Public read, Admin write
create policy "Public stores view" on stores for select using (true);
create policy "Authenticated insert stores" on stores for insert with check (auth.role() = 'authenticated');
create policy "Admin update stores" on stores for update using (public.is_store_admin(id, auth.uid()));

-- Store Members: Members can view other members, Admins can manage members
create policy "Members view members" on store_members for select using (public.is_store_member(store_id, auth.uid()));
create policy "Admins manage members" on store_members for all using (public.is_store_admin(store_id, auth.uid()));

-- Products & Options: Public read, Admin write
create policy "Public products view" on products for select using (true);
create policy "Admin manage products" on products for all using (public.is_store_admin(store_id, auth.uid()));

create policy "Public option groups view" on product_option_groups for select using (true);
create policy "Admin manage option groups" on product_option_groups for all using (
  exists (select 1 from products where id = product_id and public.is_store_admin(store_id, auth.uid()))
);

create policy "Public options view" on product_options for select using (true);
create policy "Admin manage options" on product_options for all using (
  exists (
    select 1 from product_option_groups g
    join products p on p.id = g.product_id
    where g.id = group_id and public.is_store_admin(p.store_id, auth.uid())
  )
);

-- Tables: Public read, Admin write
create policy "Public tables view" on tables for select using (true);
create policy "Admin manage tables" on tables for all using (public.is_store_admin(store_id, auth.uid()));

-- Delivery Zones: Public read, Admin write
create policy "Public delivery zones view" on delivery_zones for select using (true);
create policy "Admin manage delivery zones" on delivery_zones for all using (public.is_store_admin(store_id, auth.uid()));

-- Orders: Public insert, Members read/update, user_id match read
create policy "Public insert orders" on orders for insert with check (true);
create policy "Members view all orders" on orders for select using (
  public.is_store_member(store_id, auth.uid()) or (auth.uid() = user_id)
);
create policy "Members update orders" on orders for update using (public.is_store_member(store_id, auth.uid()));

-- Calls: Public insert, Members read/update
create policy "Public insert calls" on calls for insert with check (true);
create policy "Members view calls" on calls for select using (public.is_store_member(store_id, auth.uid()));
create policy "Members update calls" on calls for update using (public.is_store_member(store_id, auth.uid()));

-- Suggestions: Public read/insert
create policy "Public read suggestions" on suggestions for select using (true);
create policy "Public insert suggestions" on suggestions for insert with check (true);


-- REALTIME REPLICATION SETUP
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table calls;


-- SEED DATA (Demo Cafe)
insert into stores (id, name, slug) 
values ('00000000-0000-0000-0000-000000000001', 'Smart Kafe Demo', 'smartkafem');

-- Seed products for demo cafe
insert into products (store_id, name, price, category, image_url, description, calories, allergens) values
('00000000-0000-0000-0000-000000000001', 'Latte', 85, 'Coffee', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800', 'Creamy espresso with steamed milk', 120, ARRAY['dairy']),
('00000000-0000-0000-0000-000000000001', 'Cheesecake', 120, 'Dessert', 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=800', 'Classic NY style cheesecake', 350, ARRAY['dairy', 'gluten']),
('00000000-0000-0000-0000-000000000001', 'Turkish Tea', 25, 'Tea', 'https://images.unsplash.com/photo-1597393437292-359f41052631?w=800', 'Traditional Turkish tea', 5, ARRAY[]::text[]);

-- Create Option Groups & Options for Latte
do $$
declare
  latte_id uuid;
  group_milk_id uuid;
  group_syrup_id uuid;
begin
  select id into latte_id from products where name = 'Latte' limit 1;
  
  -- Milk Choice Group
  insert into product_option_groups (product_id, name, is_required, min_select, max_select)
  values (latte_id, 'Süt Tercihi', true, 1, 1) returning id into group_milk_id;
  
  insert into product_options (group_id, name, price_modifier) values
  (group_milk_id, 'Tam Yağlı Süt', 0),
  (group_milk_id, 'Yulaf Sütü', 15),
  (group_milk_id, 'Badem Sütü', 20);

  -- Syrup Choice Group
  insert into product_option_groups (product_id, name, is_required, min_select, max_select)
  values (latte_id, 'Şurup İlavesi', false, 0, 2) returning id into group_syrup_id;
  
  insert into product_options (group_id, name, price_modifier) values
  (group_syrup_id, 'Karamel Şurubu', 10),
  (group_syrup_id, 'Vanilya Şurubu', 10),
  (group_syrup_id, 'Fındık Şurubu', 10);
end $$;

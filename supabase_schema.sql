-- Enable Row Level Security
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

-- STORES TABLE
create table stores (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ORDERS TABLE
create table orders (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id) on delete cascade not null,
  table_no text not null,
  total_price numeric not null,
  status text not null default 'new', -- new, preparing, done
  items jsonb not null, -- Store order items as JSON for simplicity in MVP
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CALLS TABLE
create table calls (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id) on delete cascade not null,
  table_no text not null,
  type text not null, -- waiter, bill
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table stores enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table calls enable row level security;

-- RLS POLICIES

-- Stores: Public read, Admin write (mocking admin as valid auth user)
create policy "Public stores are viewable by everyone" on stores for select using (true);
create policy "Admins can insert stores" on stores for insert with check (auth.role() = 'authenticated');
create policy "Admins can update stores" on stores for update using (auth.role() = 'authenticated');

-- Products: Public read, Admin write
create policy "Public products are viewable by everyone" on products for select using (true);
create policy "Admins can manage products" on products for all using (auth.role() = 'authenticated');

-- Orders: Public insert, Admin all
create policy "Public can create orders" on orders for insert with check (true);
create policy "Admins can view all orders" on orders for select using (auth.role() = 'authenticated');
create policy "Admins can update orders" on orders for update using (auth.role() = 'authenticated');

-- Calls: Public insert, Admin all
create policy "Public can create calls" on calls for insert with check (true);
create policy "Admins can view all calls" on calls for select using (auth.role() = 'authenticated');
create policy "Admins can update calls" on calls for update using (auth.role() = 'authenticated');

-- REALTIME setup
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table calls;

-- SEED DATA (Demo Cafe)
insert into stores (name, slug) values ('Smart Kafe Demo', 'demo-cafe');

-- Note: You'll need the store_id from above to seed products. 
-- For the script to handle it automatically in SQL Editor (assuming single transaction):
do $$
declare
  demo_store_id uuid;
begin
  select id into demo_store_id from stores where slug = 'demo-cafe' limit 1;
  
  insert into products (store_id, name, price, category, image_url, description) values
  (demo_store_id, 'Latte', 85, 'Coffee', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800', 'Creamy espresso with steamed milk'),
  (demo_store_id, 'Cheesecake', 120, 'Dessert', 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=800', 'Classic NY style cheesecake'),
  (demo_store_id, 'Turkish Tea', 25, 'Tea', 'https://images.unsplash.com/photo-1597393437292-359f41052631?w=800', 'Traditional Turkish tea');
end $$;

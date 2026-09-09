-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Store Settings Table (Tailored for Shundor Product)
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name TEXT DEFAULT 'Shundor Product',
    tagline TEXT DEFAULT 'Quality Products, Smart Choice',
    phone TEXT DEFAULT '01608797030',
    email TEXT DEFAULT 'shundorproduct@gmail.com',
    address TEXT DEFAULT 'Radio Colony, Savar, Dhaka',
    delivery_fee_dhaka NUMERIC DEFAULT 80.0,
    delivery_fee_outside NUMERIC DEFAULT 150.0,
    facebook_page_id TEXT,
    page_access_token TEXT,
    is_bot_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products Catalog Table (Matched with shundorproduct.com)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT,
    price NUMERIC NOT NULL,
    original_price NUMERIC,
    category TEXT,
    stock_status TEXT DEFAULT 'IN_STOCK', -- 'IN_STOCK' or 'OUT_OF_STOCK'
    variants JSONB DEFAULT '[]'::jsonb, -- e.g. [{"name": "Pink", "in_stock": true}]
    description TEXT,
    images TEXT[], -- Image URLs from website
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Customers Table (Tracks Facebook PSID & Order State)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id TEXT NOT NULL,
    psid TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    is_bot_muted BOOLEAN DEFAULT FALSE,
    order_state TEXT DEFAULT 'IDLE', -- IDLE, GATHERING_ITEMS, GATHERING_NAME, GATHERING_PHONE, GATHERING_ADDRESS, CONFIRMING_ORDER, COMPLETED
    draft_order JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(page_id, psid)
);

-- 4. Messages Table (Real-time Live Inbox)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('CUSTOMER', 'BOT', 'AGENT')),
    text TEXT,
    media_url TEXT,
    mid TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Orders Table (Shundor Product Order Processing)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    order_number SERIAL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_zone TEXT DEFAULT 'INSIDE_DHAKA', -- INSIDE_DHAKA or OUTSIDE_DHAKA
    delivery_fee NUMERIC NOT NULL,
    subtotal NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
    items JSONB NOT NULL,
    courier_tracking_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for Messages & Orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Insert Default Shundor Product Store Settings
INSERT INTO public.store_settings (store_name, tagline, phone, email, address) 
VALUES ('Shundor Product', 'Quality Products, Smart Choice', '01608797030', 'shundorproduct@gmail.com', 'Radio Colony, Savar, Dhaka')
ON CONFLICT DO NOTHING;

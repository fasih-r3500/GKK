-- GharKaKhana (GKK) baseline schema.
--
-- This file documents the live Supabase database as captured from the project;
-- it does not create it from scratch. It was produced with:
--
--   pg_dump --schema-only --schema=public --no-owner --no-privileges
--
-- The on_auth_user_created trigger on auth.users lives outside the public schema,
-- so pg_dump does not emit it. It was appended by hand at the end of this file.
--

--
-- PostgreSQL database dump
--

\restrict F63wjeyBiyKSKOc3Cid7JeYhCd97ah1uGIXbZ3CgxWQXGbJWvYd40Tml7MvwZMv

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: day_of_week; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.day_of_week AS ENUM (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'completed',
    'cancelled'
);


--
-- Name: user_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_type AS ENUM (
    'customer',
    'chef'
);


--
-- Name: calculate_chef_rating(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_chef_rating(chef_uuid uuid) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
  avg_rating DECIMAL;
BEGIN
  SELECT ROUND(AVG(rating)::numeric, 1)
  INTO avg_rating
  FROM reviews
  WHERE chef_id = chef_uuid AND is_visible = TRUE;
  
  RETURN COALESCE(avg_rating, 0);
END;
$$;


--
-- Name: calculate_distance(numeric, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_distance(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  R DECIMAL := 6371; -- Earth's radius in kilometers
  dLat DECIMAL;
  dLon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  
  a := sin(dLat/2) * sin(dLat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dLon/2) * sin(dLon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$;


--
-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  new_number TEXT;
BEGIN
  new_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN new_number;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_type_val TEXT;
BEGIN
  -- Get user type from metadata, default to 'customer'
  user_type_val := COALESCE(NEW.raw_user_meta_data->>'user_type', 'customer');

  -- Insert into profiles table with all metadata
  INSERT INTO public.profiles (id, user_type, full_name, phone_number)
  VALUES (
    NEW.id,
    user_type_val::user_type,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '')
  );

  -- If customer, create customer profile
  IF user_type_val = 'customer' THEN
    INSERT INTO public.customer_profiles (id)
    VALUES (NEW.id);
  END IF;

  -- If chef, create chef profile
  IF user_type_val = 'chef' THEN
    INSERT INTO public.chef_profiles (
      id,
      kitchen_name,
      kitchen_address,
      bio
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'kitchen_name', 'My Kitchen'),
      COALESCE(NEW.raw_user_meta_data->>'kitchen_address', 'Address not set'),
      COALESCE(NEW.raw_user_meta_data->>'bio', '')
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


--
-- Name: set_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_order_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: chef_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chef_profiles (
    id uuid NOT NULL,
    kitchen_name text NOT NULL,
    bio text,
    kitchen_address text NOT NULL,
    postcode text,
    cuisine_types text[] DEFAULT '{}'::text[],
    food_hygiene_rating integer,
    is_verified boolean DEFAULT false,
    is_active boolean DEFAULT true,
    is_accepting_orders boolean DEFAULT true,
    average_preparation_time integer DEFAULT 30,
    social_media jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    kitchen_image text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    CONSTRAINT chef_profiles_food_hygiene_rating_check CHECK (((food_hygiene_rating >= 0) AND (food_hygiene_rating <= 5)))
);


--
-- Name: dishes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dishes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chef_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    image_url text,
    category text DEFAULT 'main'::text,
    cuisine_type text,
    dietary_info text[] DEFAULT '{}'::text[],
    spice_level integer,
    is_available boolean DEFAULT true,
    preparation_time integer DEFAULT 30,
    serving_size text,
    ingredients text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dishes_price_check CHECK ((price > (0)::numeric)),
    CONSTRAINT dishes_spice_level_check CHECK (((spice_level >= 0) AND (spice_level <= 5)))
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    chef_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    customer_id uuid NOT NULL,
    chef_id uuid NOT NULL,
    status public.order_status DEFAULT 'pending'::public.order_status NOT NULL,
    collection_time timestamp with time zone NOT NULL,
    collection_address text NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    customer_notes text,
    chef_notes text,
    cancelled_reason text,
    cancelled_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT orders_total_amount_check CHECK ((total_amount >= (0)::numeric))
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    chef_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    food_quality integer,
    service_rating integer,
    is_visible boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_food_quality_check CHECK (((food_quality >= 1) AND (food_quality <= 5))),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT reviews_service_rating_check CHECK (((service_rating >= 1) AND (service_rating <= 5)))
);


--
-- Name: chef_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.chef_statistics AS
 SELECT cp.id,
    cp.kitchen_name,
    cp.is_active,
    cp.is_accepting_orders,
    count(DISTINCT o.id) FILTER (WHERE (o.status = 'completed'::public.order_status)) AS total_completed_orders,
    count(DISTINCT o.id) FILTER (WHERE (o.status = ANY (ARRAY['pending'::public.order_status, 'confirmed'::public.order_status, 'preparing'::public.order_status]))) AS active_orders,
    round(avg(r.rating), 1) AS average_rating,
    count(DISTINCT r.id) AS total_reviews,
    count(DISTINCT f.id) AS total_favorites,
    count(DISTINCT d.id) AS total_dishes,
    sum(o.total_amount) FILTER (WHERE (o.status = 'completed'::public.order_status)) AS total_revenue
   FROM ((((public.chef_profiles cp
     LEFT JOIN public.orders o ON ((cp.id = o.chef_id)))
     LEFT JOIN public.reviews r ON (((cp.id = r.chef_id) AND (r.is_visible = true))))
     LEFT JOIN public.favorites f ON ((cp.id = f.chef_id)))
     LEFT JOIN public.dishes d ON (((cp.id = d.chef_id) AND (d.is_available = true))))
  GROUP BY cp.id, cp.kitchen_name, cp.is_active, cp.is_accepting_orders;


--
-- Name: customer_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_profiles (
    id uuid NOT NULL,
    default_address text,
    dietary_restrictions text[],
    notification_preferences jsonb DEFAULT '{"sms": false, "push": true, "email": true}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: operating_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operating_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chef_id uuid NOT NULL,
    day_of_week public.day_of_week NOT NULL,
    open_time time without time zone NOT NULL,
    close_time time without time zone NOT NULL,
    is_closed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    dish_id uuid NOT NULL,
    dish_name text NOT NULL,
    quantity integer NOT NULL,
    price_at_time numeric(10,2) NOT NULL,
    special_instructions text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: popular_dishes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.popular_dishes AS
 SELECT d.id,
    d.name,
    d.chef_id,
    cp.kitchen_name,
    d.price,
    d.image_url,
    count(oi.id) AS times_ordered,
    sum(oi.quantity) AS total_quantity_sold
   FROM (((public.dishes d
     JOIN public.chef_profiles cp ON ((d.chef_id = cp.id)))
     LEFT JOIN public.order_items oi ON ((d.id = oi.dish_id)))
     LEFT JOIN public.orders o ON (((oi.order_id = o.id) AND (o.status = 'completed'::public.order_status))))
  WHERE (d.is_available = true)
  GROUP BY d.id, d.name, d.chef_id, cp.kitchen_name, d.price, d.image_url
  ORDER BY (count(oi.id)) DESC;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    user_type public.user_type DEFAULT 'customer'::public.user_type NOT NULL,
    full_name text,
    phone_number text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    latitude numeric(10,8),
    longitude numeric(11,8),
    address text,
    city text
);


--
-- Name: chef_profiles chef_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chef_profiles
    ADD CONSTRAINT chef_profiles_pkey PRIMARY KEY (id);


--
-- Name: customer_profiles customer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_pkey PRIMARY KEY (id);


--
-- Name: dishes dishes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dishes
    ADD CONSTRAINT dishes_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_customer_id_chef_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_customer_id_chef_id_key UNIQUE (customer_id, chef_id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: operating_hours operating_hours_chef_id_day_of_week_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operating_hours
    ADD CONSTRAINT operating_hours_chef_id_day_of_week_key UNIQUE (chef_id, day_of_week);


--
-- Name: operating_hours operating_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operating_hours
    ADD CONSTRAINT operating_hours_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_key UNIQUE (order_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: idx_chef_profiles_accepting_orders; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chef_profiles_accepting_orders ON public.chef_profiles USING btree (is_accepting_orders);


--
-- Name: idx_chef_profiles_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chef_profiles_active ON public.chef_profiles USING btree (is_active);


--
-- Name: idx_chef_profiles_cuisine; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chef_profiles_cuisine ON public.chef_profiles USING gin (cuisine_types);


--
-- Name: idx_dishes_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dishes_available ON public.dishes USING btree (is_available);


--
-- Name: idx_dishes_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dishes_category ON public.dishes USING btree (category);


--
-- Name: idx_dishes_chef; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dishes_chef ON public.dishes USING btree (chef_id);


--
-- Name: idx_dishes_dietary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dishes_dietary ON public.dishes USING gin (dietary_info);


--
-- Name: idx_favorites_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_customer ON public.favorites USING btree (customer_id);


--
-- Name: idx_operating_hours_chef; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operating_hours_chef ON public.operating_hours USING btree (chef_id);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_orders_chef; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_chef ON public.orders USING btree (chef_id);


--
-- Name: idx_orders_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created ON public.orders USING btree (created_at DESC);


--
-- Name: idx_orders_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer ON public.orders USING btree (customer_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_profiles_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_user_type ON public.profiles USING btree (user_type);


--
-- Name: idx_reviews_chef; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_chef ON public.reviews USING btree (chef_id);


--
-- Name: idx_reviews_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_rating ON public.reviews USING btree (rating);


--
-- Name: orders generate_order_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_order_number_trigger BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_order_number();


--
-- Name: chef_profiles update_chef_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chef_profiles_updated_at BEFORE UPDATE ON public.chef_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_profiles update_customer_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_profiles_updated_at BEFORE UPDATE ON public.customer_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dishes update_dishes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dishes_updated_at BEFORE UPDATE ON public.dishes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chef_profiles chef_profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chef_profiles
    ADD CONSTRAINT chef_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: customer_profiles customer_profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: dishes dishes_chef_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dishes
    ADD CONSTRAINT dishes_chef_id_fkey FOREIGN KEY (chef_id) REFERENCES public.chef_profiles(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_chef_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_chef_id_fkey FOREIGN KEY (chef_id) REFERENCES public.chef_profiles(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer_profiles(id) ON DELETE CASCADE;


--
-- Name: operating_hours operating_hours_chef_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operating_hours
    ADD CONSTRAINT operating_hours_chef_id_fkey FOREIGN KEY (chef_id) REFERENCES public.chef_profiles(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_dish_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_dish_id_fkey FOREIGN KEY (dish_id) REFERENCES public.dishes(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id);


--
-- Name: orders orders_chef_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_chef_id_fkey FOREIGN KEY (chef_id) REFERENCES public.chef_profiles(id);


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer_profiles(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_chef_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_chef_id_fkey FOREIGN KEY (chef_id) REFERENCES public.chef_profiles(id);


--
-- Name: reviews reviews_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer_profiles(id);


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: chef_profiles Anyone can view active chef profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active chef profiles" ON public.chef_profiles FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: dishes Anyone can view available dishes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view available dishes" ON public.dishes FOR SELECT TO authenticated USING ((is_available = true));


--
-- Name: profiles Anyone can view chef profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view chef profiles" ON public.profiles FOR SELECT TO authenticated USING ((user_type = 'chef'::public.user_type));


--
-- Name: operating_hours Anyone can view operating hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view operating hours" ON public.operating_hours FOR SELECT TO authenticated USING (true);


--
-- Name: reviews Anyone can view visible reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view visible reviews" ON public.reviews FOR SELECT USING ((is_visible = true));


--
-- Name: operating_hours Chefs can manage their operating hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chefs can manage their operating hours" ON public.operating_hours USING ((auth.uid() = chef_id));


--
-- Name: dishes Chefs can manage their own dishes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chefs can manage their own dishes" ON public.dishes TO authenticated USING ((auth.uid() = chef_id));


--
-- Name: orders Chefs can update their kitchen orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chefs can update their kitchen orders" ON public.orders FOR UPDATE USING ((auth.uid() = chef_id));


--
-- Name: chef_profiles Chefs can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chefs can update their own profile" ON public.chef_profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: orders Chefs can view orders for their kitchen; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chefs can view orders for their kitchen" ON public.orders FOR SELECT USING ((auth.uid() = chef_id));


--
-- Name: order_items Customers can create order items with orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can create order items with orders" ON public.order_items FOR INSERT WITH CHECK ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.customer_id = auth.uid()))));


--
-- Name: orders Customers can create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can create orders" ON public.orders FOR INSERT WITH CHECK ((auth.uid() = customer_id));


--
-- Name: reviews Customers can create reviews for completed orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can create reviews for completed orders" ON public.reviews FOR INSERT WITH CHECK (((auth.uid() = customer_id) AND (order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE ((orders.customer_id = auth.uid()) AND (orders.status = 'completed'::public.order_status))))));


--
-- Name: favorites Customers can manage their favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can manage their favorites" ON public.favorites USING ((auth.uid() = customer_id));


--
-- Name: customer_profiles Customers can manage their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can manage their own profile" ON public.customer_profiles USING ((auth.uid() = id));


--
-- Name: orders Customers can view their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view their own orders" ON public.orders FOR SELECT USING ((auth.uid() = customer_id));


--
-- Name: order_items Order items inherit order policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Order items inherit order policies" ON public.order_items FOR SELECT USING ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE ((orders.customer_id = auth.uid()) OR (orders.chef_id = auth.uid())))));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: chef_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chef_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: dishes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: operating_hours; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.operating_hours ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict F63wjeyBiyKSKOc3Cid7JeYhCd97ah1uGIXbZ3CgxWQXGbJWvYd40Tml7MvwZMv


--
-- The trigger on auth.users is not part of the public schema, so pg_dump of
-- public does not emit it. Recreate it here so a rebuild from this file leaves
-- the database in the same state.
--
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

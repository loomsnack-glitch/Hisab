\restrict dbmate

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

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
-- Name: category_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.category_status_enum AS ENUM (
    'active',
    'inactive'
);


--
-- Name: customer_ledger_entry_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.customer_ledger_entry_type_enum AS ENUM (
    'sale',
    'payment',
    'void',
    'adjustment'
);


--
-- Name: payment_method_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method_enum AS ENUM (
    'cash',
    'upi',
    'card',
    'bank_transfer',
    'other'
);


--
-- Name: payment_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status_enum AS ENUM (
    'pending',
    'partial',
    'paid'
);


--
-- Name: product_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_status_enum AS ENUM (
    'active',
    'inactive'
);


--
-- Name: sale_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sale_status_enum AS ENUM (
    'draft',
    'completed',
    'voided'
);


--
-- Name: salutation_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.salutation_enum AS ENUM (
    'mr.',
    'mrs.',
    'ms.'
);


--
-- Name: store_device_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.store_device_status_enum AS ENUM (
    'active',
    'inactive',
    'revoked'
);


--
-- Name: ensure_payment_sale_is_completed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_payment_sale_is_completed() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    sale_row RECORD;
BEGIN
    SELECT id, status
    INTO sale_row
    FROM sales
    WHERE id = NEW.sale_id
      AND organization_id = NEW.organization_id
      AND store_id = NEW.store_id;

    IF sale_row.id IS NULL THEN
        RAISE EXCEPTION 'payment sale does not exist in the same organization/store';
    END IF;

    IF sale_row.status <> 'completed' THEN
        RAISE EXCEPTION 'payments can only be collected against completed sales';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: prevent_voided_sale_with_payments(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_voided_sale_with_payments() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status = 'voided'
       AND OLD.status <> 'voided'
       AND EXISTS (
           SELECT 1
           FROM payments
           WHERE sale_id = NEW.id
       ) THEN
        RAISE EXCEPTION 'sales with collected payments cannot be voided';
    END IF;

    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    status public.category_status_enum DEFAULT 'active'::public.category_status_enum NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    sale_id uuid,
    payment_id uuid,
    entry_type public.customer_ledger_entry_type_enum NOT NULL,
    amount numeric(12,2) NOT NULL,
    balance_after numeric(12,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_ledger_amount_check CHECK ((amount <> (0)::numeric)),
    CONSTRAINT customer_ledger_balance_after_check CHECK ((balance_after >= (0)::numeric))
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(20),
    balance numeric(12,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customers_balance_check CHECK ((balance >= (0)::numeric))
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    sale_id uuid NOT NULL,
    collected_by uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    method public.payment_method_enum NOT NULL,
    reference_number character varying(255),
    notes text,
    collected_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    category_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    price numeric(10,2) NOT NULL,
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    image_path character varying(512),
    status public.product_status_enum DEFAULT 'active'::public.product_status_enum NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT products_discount_check CHECK ((discount >= (0)::numeric)),
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric))
);


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    sale_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,3) NOT NULL,
    product_name_snapshot character varying(255) NOT NULL,
    unit_price_snapshot numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    line_subtotal numeric(12,2) NOT NULL,
    line_total numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sale_items_discount_amount_check CHECK (((discount_amount >= (0)::numeric) AND (discount_amount <= line_subtotal))),
    CONSTRAINT sale_items_line_subtotal_check CHECK ((line_subtotal >= (0)::numeric)),
    CONSTRAINT sale_items_line_total_check CHECK (((line_total >= (0)::numeric) AND (line_total = (line_subtotal - discount_amount)))),
    CONSTRAINT sale_items_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT sale_items_unit_price_snapshot_check CHECK ((unit_price_snapshot >= (0)::numeric))
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    sale_number bigint,
    customer_id uuid,
    user_id uuid NOT NULL,
    status public.sale_status_enum DEFAULT 'draft'::public.sale_status_enum NOT NULL,
    payment_status public.payment_status_enum DEFAULT 'pending'::public.payment_status_enum NOT NULL,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    discount_total numeric(12,2) DEFAULT 0 NOT NULL,
    grand_total numeric(12,2) DEFAULT 0 NOT NULL,
    notes text,
    committed_at timestamp with time zone,
    voided_at timestamp with time zone,
    void_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sales_discount_total_check CHECK (((discount_total >= (0)::numeric) AND (discount_total <= subtotal))),
    CONSTRAINT sales_draft_commit_check CHECK ((((status = 'draft'::public.sale_status_enum) AND (committed_at IS NULL) AND (payment_status = 'pending'::public.payment_status_enum)) OR ((status <> 'draft'::public.sale_status_enum) AND (committed_at IS NOT NULL)))),
    CONSTRAINT sales_draft_sale_number_check CHECK ((((status = 'draft'::public.sale_status_enum) AND (sale_number IS NULL)) OR ((status <> 'draft'::public.sale_status_enum) AND (sale_number IS NOT NULL)))),
    CONSTRAINT sales_grand_total_check CHECK (((grand_total >= (0)::numeric) AND (grand_total = (subtotal - discount_total)))),
    CONSTRAINT sales_receivable_customer_check CHECK (((status = 'draft'::public.sale_status_enum) OR (payment_status = 'paid'::public.payment_status_enum) OR (customer_id IS NOT NULL))),
    CONSTRAINT sales_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT sales_void_metadata_check CHECK (((status <> 'voided'::public.sale_status_enum) OR ((payment_status = 'pending'::public.payment_status_enum) AND (voided_at IS NOT NULL) AND (void_reason IS NOT NULL)))),
    CONSTRAINT sales_walk_in_payment_check CHECK (((status = 'draft'::public.sale_status_enum) OR (customer_id IS NOT NULL) OR (payment_status = 'paid'::public.payment_status_enum)))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: store_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    device_secret_encrypted character varying(255) CONSTRAINT store_devices_device_secret_hash_not_null NOT NULL,
    status public.store_device_status_enum DEFAULT 'active'::public.store_device_status_enum NOT NULL,
    last_seen_at timestamp with time zone,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: store_sale_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_sale_counters (
    store_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    next_sale_number bigint DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_sale_counters_next_sale_number_check CHECK ((next_sale_number > 0))
);


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    address text,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    salutation public.salutation_enum NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(255),
    pin_hash character varying(255),
    password_hash character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories categories_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: categories categories_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: customer_ledger customer_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_ledger
    ADD CONSTRAINT customer_ledger_pkey PRIMARY KEY (id);


--
-- Name: customers customers_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: customers customers_organization_id_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_organization_id_phone_key UNIQUE (organization_id, phone);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: products products_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: products products_organization_id_category_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_organization_id_category_id_name_key UNIQUE (organization_id, category_id, name);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_id_organization_id_store_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_id_organization_id_store_id_key UNIQUE (id, organization_id, store_id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: sales sales_store_id_sale_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_store_id_sale_number_key UNIQUE (store_id, sale_number);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: store_devices store_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_devices
    ADD CONSTRAINT store_devices_pkey PRIMARY KEY (id);


--
-- Name: store_devices store_devices_store_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_devices
    ADD CONSTRAINT store_devices_store_id_name_key UNIQUE (store_id, name);


--
-- Name: store_sale_counters store_sale_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_sale_counters
    ADD CONSTRAINT store_sale_counters_pkey PRIMARY KEY (store_id);


--
-- Name: stores stores_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: stores stores_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_categories_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_organization_id ON public.categories USING btree (organization_id);


--
-- Name: idx_categories_organization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_organization_status ON public.categories USING btree (organization_id, status);


--
-- Name: idx_customer_ledger_customer_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_ledger_customer_created_at ON public.customer_ledger USING btree (customer_id, created_at DESC);


--
-- Name: idx_customers_organization_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_organization_active ON public.customers USING btree (organization_id, is_active);


--
-- Name: idx_customers_organization_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_organization_phone ON public.customers USING btree (organization_id, phone);


--
-- Name: idx_payments_organization_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_organization_created_at ON public.payments USING btree (organization_id, created_at);


--
-- Name: idx_payments_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_sale_id ON public.payments USING btree (sale_id);


--
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);


--
-- Name: idx_products_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_organization_id ON public.products USING btree (organization_id);


--
-- Name: idx_products_organization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_organization_status ON public.products USING btree (organization_id, status);


--
-- Name: idx_sale_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_product_id ON public.sale_items USING btree (product_id);


--
-- Name: idx_sale_items_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_sale_id ON public.sale_items USING btree (sale_id);


--
-- Name: idx_sales_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_customer_id ON public.sales USING btree (customer_id);


--
-- Name: idx_sales_organization_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_organization_created_at ON public.sales USING btree (organization_id, created_at);


--
-- Name: idx_sales_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_status ON public.sales USING btree (organization_id, status, payment_status);


--
-- Name: idx_sales_store_sale_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_store_sale_number ON public.sales USING btree (store_id, sale_number);


--
-- Name: idx_store_devices_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_devices_store_id ON public.store_devices USING btree (store_id);


--
-- Name: idx_stores_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stores_organization_id ON public.stores USING btree (organization_id);


--
-- Name: payments trg_payments_require_completed_sale; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_payments_require_completed_sale BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.ensure_payment_sale_is_completed();


--
-- Name: sales trg_sales_prevent_void_with_payments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sales_prevent_void_with_payments BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.prevent_voided_sale_with_payments();


--
-- Name: categories categories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: categories categories_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: categories categories_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: customer_ledger customer_ledger_customer_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_ledger
    ADD CONSTRAINT customer_ledger_customer_id_organization_id_fkey FOREIGN KEY (customer_id, organization_id) REFERENCES public.customers(id, organization_id) ON DELETE CASCADE;


--
-- Name: customer_ledger customer_ledger_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_ledger
    ADD CONSTRAINT customer_ledger_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: customer_ledger customer_ledger_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_ledger
    ADD CONSTRAINT customer_ledger_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE RESTRICT;


--
-- Name: customer_ledger customer_ledger_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_ledger
    ADD CONSTRAINT customer_ledger_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE RESTRICT;


--
-- Name: customers customers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: customers customers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: customers customers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: organizations organizations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: organizations organizations_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: payments payments_collected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_collected_by_fkey FOREIGN KEY (collected_by) REFERENCES public.users(id);


--
-- Name: payments payments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: payments payments_sale_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_sale_id_organization_id_store_id_fkey FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES public.sales(id, organization_id, store_id) ON DELETE RESTRICT;


--
-- Name: payments payments_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: products products_category_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_organization_id_fkey FOREIGN KEY (category_id, organization_id) REFERENCES public.categories(id, organization_id) ON DELETE RESTRICT;


--
-- Name: products products_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: products products_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: products products_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: sale_items sale_items_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: sale_items sale_items_product_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_organization_id_fkey FOREIGN KEY (product_id, organization_id) REFERENCES public.products(id, organization_id) ON DELETE RESTRICT;


--
-- Name: sale_items sale_items_sale_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_organization_id_store_id_fkey FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES public.sales(id, organization_id, store_id) ON DELETE CASCADE;


--
-- Name: sale_items sale_items_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: sales sales_customer_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_organization_id_fkey FOREIGN KEY (customer_id, organization_id) REFERENCES public.customers(id, organization_id) ON DELETE RESTRICT;


--
-- Name: sales sales_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: sales sales_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: sales sales_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: store_devices store_devices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_devices
    ADD CONSTRAINT store_devices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: store_devices store_devices_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_devices
    ADD CONSTRAINT store_devices_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_devices store_devices_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_devices
    ADD CONSTRAINT store_devices_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: store_sale_counters store_sale_counters_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_sale_counters
    ADD CONSTRAINT store_sale_counters_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: stores stores_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: stores stores_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: stores stores_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260301111014'),
    ('20260625143000'),
    ('20260625150000'),
    ('20260626120000'),
    ('20260626123000');

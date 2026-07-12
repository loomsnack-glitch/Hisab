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
-- Name: add_on_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.add_on_status_enum AS ENUM (
    'active',
    'inactive'
);


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
-- Name: product_add_on_attachment_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_add_on_attachment_status_enum AS ENUM (
    'active',
    'inactive'
);


--
-- Name: product_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_status_enum AS ENUM (
    'active',
    'inactive'
);


--
-- Name: product_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_type_enum AS ENUM (
    'single',
    'bundle'
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
-- Name: add_ons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.add_ons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    price numeric(10,2) NOT NULL,
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    status public.add_on_status_enum DEFAULT 'active'::public.add_on_status_enum NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT add_ons_discount_check CHECK ((discount >= (0)::numeric)),
    CONSTRAINT add_ons_price_check CHECK ((price >= (0)::numeric))
);


--
-- Name: bundle_product_component_add_ons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bundle_product_component_add_ons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    bundle_product_component_id uuid CONSTRAINT bundle_product_component_ad_bundle_product_component_i_not_null NOT NULL,
    add_on_id uuid NOT NULL,
    quantity integer NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bundle_product_component_add_ons_quantity_check CHECK ((quantity >= 1))
);


--
-- Name: bundle_product_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bundle_product_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    bundle_product_id uuid NOT NULL,
    component_product_id uuid NOT NULL,
    quantity integer NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bundle_product_components_not_self CHECK ((bundle_product_id <> component_product_id)),
    CONSTRAINT bundle_product_components_quantity_check CHECK ((quantity >= 1))
);


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
    collected_by uuid,
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
-- Name: product_add_on_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_add_on_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    product_id uuid NOT NULL,
    add_on_id uuid NOT NULL,
    selection_cap integer DEFAULT 1 NOT NULL,
    status public.product_add_on_attachment_status_enum DEFAULT 'active'::public.product_add_on_attachment_status_enum NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_add_on_attachments_selection_cap_check CHECK ((selection_cap >= 1))
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
    product_type public.product_type_enum DEFAULT 'single'::public.product_type_enum NOT NULL,
    CONSTRAINT products_discount_check CHECK ((discount >= (0)::numeric)),
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric))
);


--
-- Name: sale_item_add_ons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_item_add_ons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    sale_id uuid NOT NULL,
    sale_item_id uuid NOT NULL,
    add_on_id uuid NOT NULL,
    quantity_per_parent integer NOT NULL,
    total_quantity integer NOT NULL,
    add_on_name_snapshot character varying(255) NOT NULL,
    unit_price_snapshot numeric(10,2) NOT NULL,
    unit_discount_snapshot numeric(10,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    line_subtotal numeric(12,2) NOT NULL,
    line_total numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sale_item_add_ons_discount_amount_check CHECK (((discount_amount >= (0)::numeric) AND (discount_amount <= line_subtotal))),
    CONSTRAINT sale_item_add_ons_line_subtotal_check CHECK ((line_subtotal >= (0)::numeric)),
    CONSTRAINT sale_item_add_ons_line_total_check CHECK (((line_total >= (0)::numeric) AND (line_total = (line_subtotal - discount_amount)))),
    CONSTRAINT sale_item_add_ons_quantity_per_parent_check CHECK ((quantity_per_parent >= 1)),
    CONSTRAINT sale_item_add_ons_total_quantity_check CHECK ((total_quantity >= 1)),
    CONSTRAINT sale_item_add_ons_unit_discount_snapshot_check CHECK ((unit_discount_snapshot >= (0)::numeric)),
    CONSTRAINT sale_item_add_ons_unit_price_snapshot_check CHECK ((unit_price_snapshot >= (0)::numeric))
);


--
-- Name: sale_item_bundle_component_add_ons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_item_bundle_component_add_ons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    sale_id uuid NOT NULL,
    sale_item_id uuid NOT NULL,
    sale_item_bundle_component_id uuid CONSTRAINT sale_item_bundle_component__sale_item_bundle_component_not_null NOT NULL,
    add_on_id uuid NOT NULL,
    quantity_per_component integer CONSTRAINT sale_item_bundle_component_add__quantity_per_component_not_null NOT NULL,
    total_quantity integer NOT NULL,
    add_on_name_snapshot character varying(255) CONSTRAINT sale_item_bundle_component_add_on_add_on_name_snapshot_not_null NOT NULL,
    unit_price_snapshot numeric(10,2) NOT NULL,
    unit_discount_snapshot numeric(10,2) DEFAULT 0 CONSTRAINT sale_item_bundle_component_add__unit_discount_snapshot_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sale_item_bundle_component_add_ons_quantity_per_component_check CHECK ((quantity_per_component >= 1)),
    CONSTRAINT sale_item_bundle_component_add_ons_total_quantity_check CHECK ((total_quantity >= 1)),
    CONSTRAINT sale_item_bundle_component_add_ons_unit_discount_snapshot_check CHECK ((unit_discount_snapshot >= (0)::numeric)),
    CONSTRAINT sale_item_bundle_component_add_ons_unit_price_snapshot_check CHECK ((unit_price_snapshot >= (0)::numeric))
);


--
-- Name: sale_item_bundle_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_item_bundle_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    sale_id uuid NOT NULL,
    sale_item_id uuid NOT NULL,
    component_product_id uuid NOT NULL,
    quantity_per_bundle integer NOT NULL,
    total_quantity integer NOT NULL,
    product_name_snapshot character varying(255) NOT NULL,
    unit_price_snapshot numeric(10,2) NOT NULL,
    unit_discount_snapshot numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sale_item_bundle_components_quantity_per_bundle_check CHECK ((quantity_per_bundle >= 1)),
    CONSTRAINT sale_item_bundle_components_total_quantity_check CHECK ((total_quantity >= 1)),
    CONSTRAINT sale_item_bundle_components_unit_discount_snapshot_check CHECK ((unit_discount_snapshot >= (0)::numeric)),
    CONSTRAINT sale_item_bundle_components_unit_price_snapshot_check CHECK ((unit_price_snapshot >= (0)::numeric))
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
    quantity integer NOT NULL,
    product_name_snapshot character varying(255) NOT NULL,
    unit_price_snapshot numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    line_subtotal numeric(12,2) NOT NULL,
    line_total numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    configuration_signature text DEFAULT ''::text NOT NULL,
    CONSTRAINT sale_items_discount_amount_check CHECK (((discount_amount >= (0)::numeric) AND (discount_amount <= line_subtotal))),
    CONSTRAINT sale_items_line_subtotal_check CHECK ((line_subtotal >= (0)::numeric)),
    CONSTRAINT sale_items_line_total_check CHECK (((line_total >= (0)::numeric) AND (line_total = (line_subtotal - discount_amount)))),
    CONSTRAINT sale_items_quantity_check CHECK (((quantity)::numeric > (0)::numeric)),
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
    user_id uuid,
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
    created_by_device_id uuid,
    updated_by_device_id uuid,
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
-- Name: add_ons add_ons_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.add_ons
    ADD CONSTRAINT add_ons_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: add_ons add_ons_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.add_ons
    ADD CONSTRAINT add_ons_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: add_ons add_ons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.add_ons
    ADD CONSTRAINT add_ons_pkey PRIMARY KEY (id);


--
-- Name: bundle_product_component_add_ons bundle_product_component_add__bundle_product_component_id_a_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_component_add_ons
    ADD CONSTRAINT bundle_product_component_add__bundle_product_component_id_a_key UNIQUE (bundle_product_component_id, add_on_id);


--
-- Name: bundle_product_component_add_ons bundle_product_component_add_ons_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_component_add_ons
    ADD CONSTRAINT bundle_product_component_add_ons_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: bundle_product_component_add_ons bundle_product_component_add_ons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_component_add_ons
    ADD CONSTRAINT bundle_product_component_add_ons_pkey PRIMARY KEY (id);


--
-- Name: bundle_product_components bundle_product_components_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_components
    ADD CONSTRAINT bundle_product_components_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: bundle_product_components bundle_product_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_components
    ADD CONSTRAINT bundle_product_components_pkey PRIMARY KEY (id);


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
-- Name: product_add_on_attachments product_add_on_attachments_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_add_on_attachments
    ADD CONSTRAINT product_add_on_attachments_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: product_add_on_attachments product_add_on_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_add_on_attachments
    ADD CONSTRAINT product_add_on_attachments_pkey PRIMARY KEY (id);


--
-- Name: product_add_on_attachments product_add_on_attachments_product_id_add_on_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_add_on_attachments
    ADD CONSTRAINT product_add_on_attachments_product_id_add_on_id_key UNIQUE (product_id, add_on_id);


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
-- Name: sale_item_add_ons sale_item_add_ons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_add_ons
    ADD CONSTRAINT sale_item_add_ons_pkey PRIMARY KEY (id);


--
-- Name: sale_item_add_ons sale_item_add_ons_sale_item_id_add_on_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_add_ons
    ADD CONSTRAINT sale_item_add_ons_sale_item_id_add_on_id_key UNIQUE (sale_item_id, add_on_id);


--
-- Name: sale_item_bundle_component_add_ons sale_item_bundle_component_ad_sale_item_bundle_component_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_component_add_ons
    ADD CONSTRAINT sale_item_bundle_component_ad_sale_item_bundle_component_id_key UNIQUE (sale_item_bundle_component_id, add_on_id);


--
-- Name: sale_item_bundle_component_add_ons sale_item_bundle_component_add_ons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_component_add_ons
    ADD CONSTRAINT sale_item_bundle_component_add_ons_pkey PRIMARY KEY (id);


--
-- Name: sale_item_bundle_components sale_item_bundle_components_id_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_components
    ADD CONSTRAINT sale_item_bundle_components_id_scope_key UNIQUE (id, organization_id, store_id, sale_id, sale_item_id);


--
-- Name: sale_item_bundle_components sale_item_bundle_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_components
    ADD CONSTRAINT sale_item_bundle_components_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_id_organization_store_sale_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_id_organization_store_sale_key UNIQUE (id, organization_id, store_id, sale_id);


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
-- Name: store_devices store_devices_id_organization_id_store_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_devices
    ADD CONSTRAINT store_devices_id_organization_id_store_id_key UNIQUE (id, organization_id, store_id);


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
-- Name: idx_add_ons_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_add_ons_organization_id ON public.add_ons USING btree (organization_id);


--
-- Name: idx_add_ons_organization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_add_ons_organization_status ON public.add_ons USING btree (organization_id, status);


--
-- Name: idx_bundle_product_component_add_ons_add_on_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bundle_product_component_add_ons_add_on_id ON public.bundle_product_component_add_ons USING btree (add_on_id);


--
-- Name: idx_bundle_product_component_add_ons_component_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bundle_product_component_add_ons_component_id ON public.bundle_product_component_add_ons USING btree (bundle_product_component_id);


--
-- Name: idx_bundle_product_component_add_ons_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bundle_product_component_add_ons_organization_id ON public.bundle_product_component_add_ons USING btree (organization_id);


--
-- Name: idx_bundle_product_components_bundle_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bundle_product_components_bundle_product_id ON public.bundle_product_components USING btree (bundle_product_id);


--
-- Name: idx_bundle_product_components_component_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bundle_product_components_component_product_id ON public.bundle_product_components USING btree (component_product_id);


--
-- Name: idx_bundle_product_components_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bundle_product_components_organization_id ON public.bundle_product_components USING btree (organization_id);


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
-- Name: idx_product_add_on_attachments_add_on_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_add_on_attachments_add_on_id ON public.product_add_on_attachments USING btree (add_on_id);


--
-- Name: idx_product_add_on_attachments_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_add_on_attachments_organization_id ON public.product_add_on_attachments USING btree (organization_id);


--
-- Name: idx_product_add_on_attachments_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_add_on_attachments_product_id ON public.product_add_on_attachments USING btree (product_id);


--
-- Name: idx_product_add_on_attachments_product_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_add_on_attachments_product_status ON public.product_add_on_attachments USING btree (product_id, status);


--
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);


--
-- Name: idx_products_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_organization_id ON public.products USING btree (organization_id);


--
-- Name: idx_products_organization_product_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_organization_product_type ON public.products USING btree (organization_id, product_type);


--
-- Name: idx_products_organization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_organization_status ON public.products USING btree (organization_id, status);


--
-- Name: idx_sale_item_add_ons_add_on_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_item_add_ons_add_on_id ON public.sale_item_add_ons USING btree (add_on_id);


--
-- Name: idx_sale_item_add_ons_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_item_add_ons_sale_id ON public.sale_item_add_ons USING btree (sale_id);


--
-- Name: idx_sale_item_add_ons_sale_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_item_add_ons_sale_item_id ON public.sale_item_add_ons USING btree (sale_item_id);


--
-- Name: idx_sale_item_bundle_component_add_ons_add_on_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_item_bundle_component_add_ons_add_on_id ON public.sale_item_bundle_component_add_ons USING btree (add_on_id);


--
-- Name: idx_sale_item_bundle_component_add_ons_component_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_item_bundle_component_add_ons_component_id ON public.sale_item_bundle_component_add_ons USING btree (sale_item_bundle_component_id);


--
-- Name: idx_sale_item_bundle_component_add_ons_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_item_bundle_component_add_ons_sale_id ON public.sale_item_bundle_component_add_ons USING btree (sale_id);


--
-- Name: idx_sale_item_bundle_component_add_ons_sale_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_item_bundle_component_add_ons_sale_item_id ON public.sale_item_bundle_component_add_ons USING btree (sale_item_id);


--
-- Name: idx_sale_item_bundle_components_component_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_item_bundle_components_component_product_id ON public.sale_item_bundle_components USING btree (component_product_id);


--
-- Name: idx_sale_item_bundle_components_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_item_bundle_components_sale_id ON public.sale_item_bundle_components USING btree (sale_id);


--
-- Name: idx_sale_item_bundle_components_sale_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_item_bundle_components_sale_item_id ON public.sale_item_bundle_components USING btree (sale_item_id);


--
-- Name: idx_sale_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_product_id ON public.sale_items USING btree (product_id);


--
-- Name: idx_sale_items_sale_configuration_signature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_sale_configuration_signature ON public.sale_items USING btree (sale_id, product_id, configuration_signature);


--
-- Name: idx_sale_items_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_sale_id ON public.sale_items USING btree (sale_id);


--
-- Name: idx_sales_created_by_device_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_created_by_device_id ON public.sales USING btree (created_by_device_id);


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
-- Name: idx_sales_updated_by_device_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_updated_by_device_id ON public.sales USING btree (updated_by_device_id);


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
-- Name: add_ons add_ons_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.add_ons
    ADD CONSTRAINT add_ons_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: add_ons add_ons_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.add_ons
    ADD CONSTRAINT add_ons_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: add_ons add_ons_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.add_ons
    ADD CONSTRAINT add_ons_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: bundle_product_component_add_ons bundle_product_component_add__bundle_product_component_id__fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_component_add_ons
    ADD CONSTRAINT bundle_product_component_add__bundle_product_component_id__fkey FOREIGN KEY (bundle_product_component_id, organization_id) REFERENCES public.bundle_product_components(id, organization_id) ON DELETE CASCADE;


--
-- Name: bundle_product_component_add_ons bundle_product_component_add_ons_add_on_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_component_add_ons
    ADD CONSTRAINT bundle_product_component_add_ons_add_on_id_organization_id_fkey FOREIGN KEY (add_on_id, organization_id) REFERENCES public.add_ons(id, organization_id) ON DELETE RESTRICT;


--
-- Name: bundle_product_component_add_ons bundle_product_component_add_ons_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_component_add_ons
    ADD CONSTRAINT bundle_product_component_add_ons_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: bundle_product_component_add_ons bundle_product_component_add_ons_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_component_add_ons
    ADD CONSTRAINT bundle_product_component_add_ons_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: bundle_product_component_add_ons bundle_product_component_add_ons_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_component_add_ons
    ADD CONSTRAINT bundle_product_component_add_ons_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: bundle_product_components bundle_product_components_bundle_product_id_organization_i_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_components
    ADD CONSTRAINT bundle_product_components_bundle_product_id_organization_i_fkey FOREIGN KEY (bundle_product_id, organization_id) REFERENCES public.products(id, organization_id) ON DELETE CASCADE;


--
-- Name: bundle_product_components bundle_product_components_component_product_id_organizatio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_components
    ADD CONSTRAINT bundle_product_components_component_product_id_organizatio_fkey FOREIGN KEY (component_product_id, organization_id) REFERENCES public.products(id, organization_id) ON DELETE RESTRICT;


--
-- Name: bundle_product_components bundle_product_components_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_components
    ADD CONSTRAINT bundle_product_components_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: bundle_product_components bundle_product_components_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_components
    ADD CONSTRAINT bundle_product_components_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: bundle_product_components bundle_product_components_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_product_components
    ADD CONSTRAINT bundle_product_components_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


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
-- Name: product_add_on_attachments product_add_on_attachments_add_on_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_add_on_attachments
    ADD CONSTRAINT product_add_on_attachments_add_on_id_organization_id_fkey FOREIGN KEY (add_on_id, organization_id) REFERENCES public.add_ons(id, organization_id) ON DELETE RESTRICT;


--
-- Name: product_add_on_attachments product_add_on_attachments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_add_on_attachments
    ADD CONSTRAINT product_add_on_attachments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: product_add_on_attachments product_add_on_attachments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_add_on_attachments
    ADD CONSTRAINT product_add_on_attachments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: product_add_on_attachments product_add_on_attachments_product_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_add_on_attachments
    ADD CONSTRAINT product_add_on_attachments_product_id_organization_id_fkey FOREIGN KEY (product_id, organization_id) REFERENCES public.products(id, organization_id) ON DELETE CASCADE;


--
-- Name: product_add_on_attachments product_add_on_attachments_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_add_on_attachments
    ADD CONSTRAINT product_add_on_attachments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


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
-- Name: sale_item_add_ons sale_item_add_ons_add_on_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_add_ons
    ADD CONSTRAINT sale_item_add_ons_add_on_id_organization_id_fkey FOREIGN KEY (add_on_id, organization_id) REFERENCES public.add_ons(id, organization_id) ON DELETE RESTRICT;


--
-- Name: sale_item_add_ons sale_item_add_ons_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_add_ons
    ADD CONSTRAINT sale_item_add_ons_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: sale_item_add_ons sale_item_add_ons_sale_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_add_ons
    ADD CONSTRAINT sale_item_add_ons_sale_id_organization_id_store_id_fkey FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES public.sales(id, organization_id, store_id) ON DELETE CASCADE;


--
-- Name: sale_item_add_ons sale_item_add_ons_sale_item_id_organization_id_store_id_sa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_add_ons
    ADD CONSTRAINT sale_item_add_ons_sale_item_id_organization_id_store_id_sa_fkey FOREIGN KEY (sale_item_id, organization_id, store_id, sale_id) REFERENCES public.sale_items(id, organization_id, store_id, sale_id) ON DELETE CASCADE;


--
-- Name: sale_item_add_ons sale_item_add_ons_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_add_ons
    ADD CONSTRAINT sale_item_add_ons_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: sale_item_bundle_component_add_ons sale_item_bundle_component_ad_sale_id_organization_id_stor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_component_add_ons
    ADD CONSTRAINT sale_item_bundle_component_ad_sale_id_organization_id_stor_fkey FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES public.sales(id, organization_id, store_id) ON DELETE CASCADE;


--
-- Name: sale_item_bundle_component_add_ons sale_item_bundle_component_ad_sale_item_bundle_component_i_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_component_add_ons
    ADD CONSTRAINT sale_item_bundle_component_ad_sale_item_bundle_component_i_fkey FOREIGN KEY (sale_item_bundle_component_id, organization_id, store_id, sale_id, sale_item_id) REFERENCES public.sale_item_bundle_components(id, organization_id, store_id, sale_id, sale_item_id) ON DELETE CASCADE;


--
-- Name: sale_item_bundle_component_add_ons sale_item_bundle_component_ad_sale_item_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_component_add_ons
    ADD CONSTRAINT sale_item_bundle_component_ad_sale_item_id_organization_id_fkey FOREIGN KEY (sale_item_id, organization_id, store_id, sale_id) REFERENCES public.sale_items(id, organization_id, store_id, sale_id) ON DELETE CASCADE;


--
-- Name: sale_item_bundle_component_add_ons sale_item_bundle_component_add_o_add_on_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_component_add_ons
    ADD CONSTRAINT sale_item_bundle_component_add_o_add_on_id_organization_id_fkey FOREIGN KEY (add_on_id, organization_id) REFERENCES public.add_ons(id, organization_id) ON DELETE RESTRICT;


--
-- Name: sale_item_bundle_component_add_ons sale_item_bundle_component_add_on_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_component_add_ons
    ADD CONSTRAINT sale_item_bundle_component_add_on_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: sale_item_bundle_component_add_ons sale_item_bundle_component_add_ons_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_component_add_ons
    ADD CONSTRAINT sale_item_bundle_component_add_ons_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: sale_item_bundle_components sale_item_bundle_components_component_product_id_organizat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_components
    ADD CONSTRAINT sale_item_bundle_components_component_product_id_organizat_fkey FOREIGN KEY (component_product_id, organization_id) REFERENCES public.products(id, organization_id) ON DELETE RESTRICT;


--
-- Name: sale_item_bundle_components sale_item_bundle_components_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_components
    ADD CONSTRAINT sale_item_bundle_components_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: sale_item_bundle_components sale_item_bundle_components_sale_id_organization_id_store__fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_components
    ADD CONSTRAINT sale_item_bundle_components_sale_id_organization_id_store__fkey FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES public.sales(id, organization_id, store_id) ON DELETE CASCADE;


--
-- Name: sale_item_bundle_components sale_item_bundle_components_sale_item_id_organization_id_s_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_components
    ADD CONSTRAINT sale_item_bundle_components_sale_item_id_organization_id_s_fkey FOREIGN KEY (sale_item_id, organization_id, store_id, sale_id) REFERENCES public.sale_items(id, organization_id, store_id, sale_id) ON DELETE CASCADE;


--
-- Name: sale_item_bundle_components sale_item_bundle_components_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_item_bundle_components
    ADD CONSTRAINT sale_item_bundle_components_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


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
-- Name: sales sales_created_by_device_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_created_by_device_id_organization_id_store_id_fkey FOREIGN KEY (created_by_device_id, organization_id, store_id) REFERENCES public.store_devices(id, organization_id, store_id) ON DELETE RESTRICT;


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
-- Name: sales sales_updated_by_device_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_updated_by_device_id_organization_id_store_id_fkey FOREIGN KEY (updated_by_device_id, organization_id, store_id) REFERENCES public.store_devices(id, organization_id, store_id) ON DELETE RESTRICT;


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
    ('20260626123000'),
    ('20260628010000'),
    ('20260711190000'),
    ('20260711200000'),
    ('20260712030000'),
    ('20260712043000'),
    ('20260712050000'),
    ('20260712051500'),
    ('20260712060000');

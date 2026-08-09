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
    'bundle',
    'combo'
);


--
-- Name: purchase_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.purchase_status_enum AS ENUM (
    'recorded',
    'voided'
);


--
-- Name: sale_number_reset_period_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sale_number_reset_period_enum AS ENUM (
    'never',
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'half_yearly',
    'yearly',
    'financial_yearly'
);


--
-- Name: token_number_reset_period_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.token_number_reset_period_enum AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'half_yearly',
    'yearly',
    'financial_yearly',
    'never'
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
-- Name: prevent_sale_number_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_sale_number_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.status <> 'draft'
       AND (
           NEW.sale_number IS DISTINCT FROM OLD.sale_number
           OR NEW.sale_sequence_number IS DISTINCT FROM OLD.sale_sequence_number
           OR NEW.sale_period_key IS DISTINCT FROM OLD.sale_period_key
           OR NEW.token_number IS DISTINCT FROM OLD.token_number
           OR NEW.token_sequence_number IS DISTINCT FROM OLD.token_sequence_number
           OR NEW.token_period_key IS DISTINCT FROM OLD.token_period_key
       ) THEN
        RAISE EXCEPTION 'committed Sale Numbers and Token Numbers are immutable';
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
       )
       AND NOT EXISTS (
           SELECT 1
           FROM sales replacement
           WHERE replacement.replacement_of_sale_id = NEW.id
             AND replacement.organization_id = NEW.organization_id
             AND replacement.store_id = NEW.store_id
       ) THEN
        RAISE EXCEPTION 'sales with collected payments can only be voided as a replacement';
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
    CONSTRAINT add_ons_discount_not_above_price_check CHECK ((discount <= price)),
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
-- Name: combo_choice_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.combo_choice_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    combo_product_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    min_selections integer DEFAULT 0 NOT NULL,
    max_selections integer DEFAULT 1 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT combo_choice_groups_limits_check CHECK (((min_selections >= 0) AND (max_selections >= min_selections) AND (max_selections <= 100))),
    CONSTRAINT combo_choice_groups_name_check CHECK ((length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT combo_choice_groups_sort_order_check CHECK ((sort_order >= 0))
);


--
-- Name: combo_choice_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.combo_choice_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    choice_group_id uuid NOT NULL,
    option_product_id uuid NOT NULL,
    max_quantity integer DEFAULT 1 NOT NULL,
    price_adjustment numeric(10,2) DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT combo_choice_options_quantity_check CHECK (((max_quantity >= 1) AND (max_quantity <= 100))),
    CONSTRAINT combo_choice_options_sort_order_check CHECK ((sort_order >= 0))
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    username character varying(64) NOT NULL,
    tagline character varying(255),
    CONSTRAINT organizations_username_check CHECK (((username)::text ~ '^[a-z0-9][a-z0-9_-]{1,63}$'::text))
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
    CONSTRAINT products_image_path_no_icons CHECK (((image_path IS NULL) OR ((image_path)::text !~~ 'icon:%'::text))),
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric))
);


--
-- Name: purchase_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_id uuid NOT NULL,
    item_name character varying(255) NOT NULL,
    description text,
    quantity numeric(14,3) NOT NULL,
    rate numeric(12,2) NOT NULL,
    line_total numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchase_items_line_total_check CHECK ((line_total >= (0)::numeric)),
    CONSTRAINT purchase_items_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT purchase_items_rate_check CHECK ((rate >= (0)::numeric))
);


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    purchase_date date NOT NULL,
    supplier_name character varying(255) NOT NULL,
    invoice_number character varying(255),
    notes text,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    status public.purchase_status_enum DEFAULT 'recorded'::public.purchase_status_enum NOT NULL,
    created_by_user_id uuid,
    created_by_device_id uuid,
    updated_by_user_id uuid,
    updated_by_device_id uuid,
    voided_at timestamp with time zone,
    void_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchases_total_amount_check CHECK ((total_amount >= (0)::numeric)),
    CONSTRAINT purchases_void_metadata_check CHECK ((((status = 'recorded'::public.purchase_status_enum) AND (voided_at IS NULL) AND (void_reason IS NULL)) OR ((status = 'voided'::public.purchase_status_enum) AND (voided_at IS NOT NULL) AND (void_reason IS NOT NULL))))
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
    price_adjustment_snapshot numeric(10,2) DEFAULT 0 NOT NULL,
    choice_group_id uuid,
    CONSTRAINT sale_item_bundle_components_price_adjustment_snapshot_check CHECK ((price_adjustment_snapshot IS NOT NULL)),
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
    sale_number character varying(64),
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
    completion_request_id uuid,
    replacement_of_sale_id uuid,
    sale_sequence_number bigint,
    sale_period_key character varying(32),
    token_number character varying(64),
    token_sequence_number bigint,
    token_period_key character varying(32),
    CONSTRAINT sales_discount_total_check CHECK (((discount_total >= (0)::numeric) AND (discount_total <= subtotal))),
    CONSTRAINT sales_draft_commit_check CHECK ((((status = 'draft'::public.sale_status_enum) AND (committed_at IS NULL) AND (payment_status = 'pending'::public.payment_status_enum)) OR ((status <> 'draft'::public.sale_status_enum) AND (committed_at IS NOT NULL)))),
    CONSTRAINT sales_draft_sale_number_check CHECK ((((status = 'draft'::public.sale_status_enum) AND (sale_number IS NULL)) OR ((status <> 'draft'::public.sale_status_enum) AND (sale_number IS NOT NULL)))),
    CONSTRAINT sales_grand_total_check CHECK (((grand_total >= (0)::numeric) AND (grand_total = (subtotal - discount_total)))),
    CONSTRAINT sales_receivable_customer_check CHECK (((status = 'draft'::public.sale_status_enum) OR (payment_status = 'paid'::public.payment_status_enum) OR (customer_id IS NOT NULL))),
    CONSTRAINT sales_replacement_not_self_check CHECK (((replacement_of_sale_id IS NULL) OR (replacement_of_sale_id <> id))),
    CONSTRAINT sales_sale_number_metadata_check CHECK ((((status = 'draft'::public.sale_status_enum) AND (sale_number IS NULL) AND (sale_sequence_number IS NULL) AND (sale_period_key IS NULL)) OR ((status <> 'draft'::public.sale_status_enum) AND (sale_number IS NOT NULL) AND (sale_sequence_number IS NOT NULL) AND (sale_period_key IS NOT NULL) AND (length(TRIM(BOTH FROM sale_period_key)) > 0)))),
    CONSTRAINT sales_sale_sequence_number_check CHECK (((sale_sequence_number IS NULL) OR (sale_sequence_number > 0))),
    CONSTRAINT sales_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT sales_token_number_metadata_check CHECK ((((status = 'draft'::public.sale_status_enum) AND (token_number IS NULL) AND (token_sequence_number IS NULL) AND (token_period_key IS NULL)) OR ((status <> 'draft'::public.sale_status_enum) AND (((token_number IS NULL) AND (token_sequence_number IS NULL) AND (token_period_key IS NULL)) OR ((token_number IS NOT NULL) AND (token_sequence_number IS NOT NULL) AND (token_sequence_number > 0) AND (token_period_key IS NOT NULL) AND (length(TRIM(BOTH FROM token_period_key)) > 0))))),
    CONSTRAINT sales_token_sequence_number_check CHECK (((token_sequence_number IS NULL) OR (token_sequence_number > 0))),
    CONSTRAINT sales_void_metadata_check CHECK (((status <> 'voided'::public.sale_status_enum) OR ((voided_at IS NOT NULL) AND (void_reason IS NOT NULL)))),
    CONSTRAINT sales_walk_in_payment_check CHECK (((status = 'draft'::public.sale_status_enum) OR (customer_id IS NOT NULL) OR (payment_status = 'paid'::public.payment_status_enum)))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: store_billing_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_billing_settings (
    store_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    sale_number_reset_period public.sale_number_reset_period_enum DEFAULT 'never'::public.sale_number_reset_period_enum NOT NULL,
    sale_number_timezone character varying(64) DEFAULT 'Asia/Kolkata'::character varying NOT NULL,
    token_number_enabled boolean DEFAULT false NOT NULL,
    token_number_reset_period public.token_number_reset_period_enum DEFAULT 'daily'::public.token_number_reset_period_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_billing_settings_timezone_check CHECK ((length(TRIM(BOTH FROM sale_number_timezone)) > 0))
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    login_username character varying(64) NOT NULL,
    CONSTRAINT store_devices_login_username_check CHECK (((login_username)::text ~ '^[a-z0-9][a-z0-9_-]{1,63}$'::text))
);


--
-- Name: store_sale_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_sale_sequences (
    store_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    period_key character varying(32) NOT NULL,
    next_sequence_number bigint DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_sale_sequences_next_number_check CHECK ((next_sequence_number > 0)),
    CONSTRAINT store_sale_sequences_period_key_check CHECK ((length(TRIM(BOTH FROM period_key)) > 0))
);


--
-- Name: store_token_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_token_sequences (
    store_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    period_key character varying(32) NOT NULL,
    next_sequence_number bigint DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_token_sequences_next_number_check CHECK ((next_sequence_number > 0)),
    CONSTRAINT store_token_sequences_period_key_check CHECK ((length(TRIM(BOTH FROM period_key)) > 0))
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
-- Name: combo_choice_groups combo_choice_groups_id_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_choice_groups
    ADD CONSTRAINT combo_choice_groups_id_scope_key UNIQUE (id, organization_id);


--
-- Name: combo_choice_groups combo_choice_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_choice_groups
    ADD CONSTRAINT combo_choice_groups_pkey PRIMARY KEY (id);


--
-- Name: combo_choice_options combo_choice_options_id_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_choice_options
    ADD CONSTRAINT combo_choice_options_id_scope_key UNIQUE (id, organization_id);


--
-- Name: combo_choice_options combo_choice_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_choice_options
    ADD CONSTRAINT combo_choice_options_pkey PRIMARY KEY (id);


--
-- Name: combo_choice_options combo_choice_options_unique_product; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_choice_options
    ADD CONSTRAINT combo_choice_options_unique_product UNIQUE (choice_group_id, option_product_id);


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
-- Name: organizations organizations_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_username_key UNIQUE (username);


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
-- Name: purchase_items purchase_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_items
    ADD CONSTRAINT purchase_items_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


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
-- Name: store_token_sequences store_token_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_token_sequences
    ADD CONSTRAINT store_token_sequences_pkey PRIMARY KEY (store_id, period_key);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: store_billing_settings store_billing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_billing_settings
    ADD CONSTRAINT store_billing_settings_pkey PRIMARY KEY (store_id);


--
-- Name: store_devices store_devices_id_organization_id_store_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_devices
    ADD CONSTRAINT store_devices_id_organization_id_store_id_key UNIQUE (id, organization_id, store_id);


--
-- Name: store_devices store_devices_organization_id_login_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_devices
    ADD CONSTRAINT store_devices_organization_id_login_username_key UNIQUE (organization_id, login_username);


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
-- Name: store_sale_sequences store_sale_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_sale_sequences
    ADD CONSTRAINT store_sale_sequences_pkey PRIMARY KEY (store_id, period_key);


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
-- Name: idx_combo_choice_groups_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combo_choice_groups_organization_id ON public.combo_choice_groups USING btree (organization_id);


--
-- Name: idx_combo_choice_groups_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combo_choice_groups_product_id ON public.combo_choice_groups USING btree (combo_product_id);


--
-- Name: idx_combo_choice_options_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combo_choice_options_group_id ON public.combo_choice_options USING btree (choice_group_id);


--
-- Name: idx_combo_choice_options_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combo_choice_options_organization_id ON public.combo_choice_options USING btree (organization_id);


--
-- Name: idx_combo_choice_options_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combo_choice_options_product_id ON public.combo_choice_options USING btree (option_product_id);


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
-- Name: idx_purchase_items_purchase_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_items_purchase_id ON public.purchase_items USING btree (purchase_id);


--
-- Name: idx_purchases_store_purchase_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_store_purchase_date ON public.purchases USING btree (store_id, purchase_date DESC);


--
-- Name: idx_purchases_store_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_store_status ON public.purchases USING btree (store_id, status);


--
-- Name: idx_purchases_supplier_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_supplier_name ON public.purchases USING btree (organization_id, supplier_name);


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
-- Name: idx_sales_replacement_of_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_sales_replacement_of_sale_id ON public.sales USING btree (replacement_of_sale_id) WHERE (replacement_of_sale_id IS NOT NULL);


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
-- Name: sales_store_completion_request_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sales_store_completion_request_id_key ON public.sales USING btree (store_id, completion_request_id) WHERE (completion_request_id IS NOT NULL);


--
-- Name: sales_store_token_period_sequence_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sales_store_token_period_sequence_key ON public.sales USING btree (store_id, token_period_key, token_sequence_number) WHERE ((token_period_key IS NOT NULL) AND (token_sequence_number IS NOT NULL));


--
-- Name: payments trg_payments_require_completed_sale; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_payments_require_completed_sale BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.ensure_payment_sale_is_completed();


--
-- Name: sales trg_sales_prevent_void_with_payments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sales_prevent_void_with_payments BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.prevent_voided_sale_with_payments();


--
-- Name: sales trg_sales_sale_number_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sales_sale_number_immutable BEFORE UPDATE OF sale_number, sale_sequence_number, sale_period_key, token_number, token_sequence_number, token_period_key ON public.sales FOR EACH ROW EXECUTE FUNCTION public.prevent_sale_number_mutation();


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
-- Name: combo_choice_groups combo_choice_groups_combo_product_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_choice_groups
    ADD CONSTRAINT combo_choice_groups_combo_product_fkey FOREIGN KEY (combo_product_id, organization_id) REFERENCES public.products(id, organization_id) ON DELETE CASCADE;


--
-- Name: combo_choice_groups combo_choice_groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_choice_groups
    ADD CONSTRAINT combo_choice_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: combo_choice_groups combo_choice_groups_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_choice_groups
    ADD CONSTRAINT combo_choice_groups_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: combo_choice_groups combo_choice_groups_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_choice_groups
    ADD CONSTRAINT combo_choice_groups_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: combo_choice_options combo_choice_options_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_choice_options
    ADD CONSTRAINT combo_choice_options_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: combo_choice_options combo_choice_options_group_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_choice_options
    ADD CONSTRAINT combo_choice_options_group_fkey FOREIGN KEY (choice_group_id, organization_id) REFERENCES public.combo_choice_groups(id, organization_id) ON DELETE CASCADE;


--
-- Name: combo_choice_options combo_choice_options_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_choice_options
    ADD CONSTRAINT combo_choice_options_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: combo_choice_options combo_choice_options_product_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_choice_options
    ADD CONSTRAINT combo_choice_options_product_fkey FOREIGN KEY (option_product_id, organization_id) REFERENCES public.products(id, organization_id) ON DELETE RESTRICT;


--
-- Name: combo_choice_options combo_choice_options_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_choice_options
    ADD CONSTRAINT combo_choice_options_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


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
-- Name: purchase_items purchase_items_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_items
    ADD CONSTRAINT purchase_items_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) ON DELETE CASCADE;


--
-- Name: purchases purchases_created_by_device_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_created_by_device_id_organization_id_store_id_fkey FOREIGN KEY (created_by_device_id, organization_id, store_id) REFERENCES public.store_devices(id, organization_id, store_id) ON DELETE RESTRICT;


--
-- Name: purchases purchases_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: purchases purchases_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: purchases purchases_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: purchases purchases_updated_by_device_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_updated_by_device_id_organization_id_store_id_fkey FOREIGN KEY (updated_by_device_id, organization_id, store_id) REFERENCES public.store_devices(id, organization_id, store_id) ON DELETE RESTRICT;


--
-- Name: purchases purchases_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


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
-- Name: sales sales_replacement_of_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_replacement_of_sale_id_fkey FOREIGN KEY (replacement_of_sale_id, organization_id, store_id) REFERENCES public.sales(id, organization_id, store_id) ON DELETE RESTRICT;


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
-- Name: store_billing_settings store_billing_settings_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_billing_settings
    ADD CONSTRAINT store_billing_settings_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


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
-- Name: store_sale_sequences store_sale_sequences_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_sale_sequences
    ADD CONSTRAINT store_sale_sequences_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_token_sequences store_token_sequences_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_token_sequences
    ADD CONSTRAINT store_token_sequences_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


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
    ('20260712060000'),
    ('20260727120000'),
    ('20260728100000'),
    ('20260729100000'),
    ('20260731120000'),
    ('20260731123000'),
    ('20260731124000'),
    ('20260731130000'),
    ('20260731140000'),
    ('20260802120000'),
    ('20260806120000'),
    ('20260807120000'),
    ('20260809120000');

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
-- Name: catalog_commercial_item_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.catalog_commercial_item_type_enum AS ENUM (
    'product',
    'add_on'
);


--
-- Name: catalog_commercial_operation_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.catalog_commercial_operation_type_enum AS ENUM (
    'set_price_override',
    'set_discount_override',
    'clear_price_override',
    'clear_discount_override',
    'set_local_status'
);


--
-- Name: category_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.category_status_enum AS ENUM (
    'active',
    'inactive'
);


--
-- Name: commercial_catalog_revision_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.commercial_catalog_revision_status AS ENUM (
    'draft',
    'active',
    'retired',
    'discarded'
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
-- Name: expense_category_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.expense_category_kind_enum AS ENUM (
    'predefined',
    'custom'
);


--
-- Name: expense_category_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.expense_category_status_enum AS ENUM (
    'active',
    'inactive'
);


--
-- Name: expense_lifecycle_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.expense_lifecycle_enum AS ENUM (
    'draft',
    'recorded',
    'voided'
);


--
-- Name: kot_fulfillment_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.kot_fulfillment_type_enum AS ENUM (
    'dine_in',
    'pick_up'
);


--
-- Name: kot_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.kot_type_enum AS ENUM (
    'table',
    'parcel'
);


--
-- Name: label_template_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.label_template_status_enum AS ENUM (
    'active',
    'inactive'
);


--
-- Name: money_account_movement_source_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.money_account_movement_source_kind_enum AS ENUM (
    'pos_payment',
    'sale_replacement_reversal',
    'outgoing_purchase_payment',
    'outgoing_expense_payment',
    'outgoing_purchase_payment_reversal',
    'outgoing_purchase_void_reversal',
    'outgoing_expense_payment_reversal',
    'outgoing_expense_void_reversal',
    'manual_deposit',
    'manual_withdrawal',
    'balance_adjustment',
    'transfer_out',
    'transfer_in'
);


--
-- Name: money_account_payment_route_method_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.money_account_payment_route_method_enum AS ENUM (
    'upi',
    'card'
);


--
-- Name: money_account_scope_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.money_account_scope_enum AS ENUM (
    'organization_wide',
    'store_scoped'
);


--
-- Name: money_account_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.money_account_status_enum AS ENUM (
    'active',
    'inactive'
);


--
-- Name: money_account_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.money_account_type_enum AS ENUM (
    'bank',
    'upi',
    'card_settlement',
    'petty_cash',
    'other',
    'cash'
);


--
-- Name: outgoing_payment_reversal_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.outgoing_payment_reversal_kind_enum AS ENUM (
    'payment_reversal',
    'payable_void'
);


--
-- Name: payable_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payable_status_enum AS ENUM (
    'due',
    'partial',
    'paid'
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
-- Name: product_code_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_code_kind_enum AS ENUM (
    'manufacturer',
    'internal_rcn'
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
-- Name: purchase_lifecycle_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.purchase_lifecycle_enum AS ENUM (
    'draft',
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
-- Name: sale_service_mode_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sale_service_mode_enum AS ENUM (
    'dine_in',
    'pick_up'
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
-- Name: service_table_state_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_table_state_enum AS ENUM (
    'free',
    'allocated',
    'engaged',
    'ready_to_bill',
    'payment_due',
    'paid'
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
-- Name: table_order_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.table_order_status_enum AS ENUM (
    'active',
    'checked_out',
    'discarded'
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
-- Name: unit_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.unit_kind_enum AS ENUM (
    'predefined',
    'custom'
);


--
-- Name: unit_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.unit_status_enum AS ENUM (
    'active',
    'inactive'
);


--
-- Name: vendor_item_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vendor_item_status_enum AS ENUM (
    'active',
    'inactive'
);


--
-- Name: vendor_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vendor_status_enum AS ENUM (
    'active',
    'inactive'
);


--
-- Name: whatsapp_account_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_account_status_enum AS ENUM (
    'pending_qr',
    'connecting',
    'connected',
    'disconnected',
    'failed',
    'revoked'
);


--
-- Name: whatsapp_campaign_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_campaign_status_enum AS ENUM (
    'draft',
    'queued',
    'sending',
    'completed',
    'failed',
    'cancelled'
);


--
-- Name: whatsapp_cloud_account_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_cloud_account_status_enum AS ENUM (
    'pending_authorization',
    'provisioning',
    'connected',
    'needs_action',
    'disconnected',
    'revoked',
    'suspended',
    'failed'
);


--
-- Name: whatsapp_cloud_provisioning_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_cloud_provisioning_status_enum AS ENUM (
    'running',
    'completed',
    'failed',
    'cancelled'
);


--
-- Name: whatsapp_cloud_provisioning_step_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_cloud_provisioning_step_enum AS ENUM (
    'authorization_received',
    'waba_resolved',
    'system_user_assigned',
    'phone_registered',
    'webhook_subscribed',
    'templates_synced',
    'completed'
);


--
-- Name: whatsapp_cloud_quota_event_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_cloud_quota_event_type_enum AS ENUM (
    'reserved',
    'settled',
    'released'
);


--
-- Name: whatsapp_cloud_quota_reservation_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_cloud_quota_reservation_status_enum AS ENUM (
    'reserved',
    'settled',
    'released'
);


--
-- Name: whatsapp_cloud_template_category_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_cloud_template_category_enum AS ENUM (
    'marketing',
    'utility',
    'authentication',
    'unknown'
);


--
-- Name: whatsapp_cloud_template_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_cloud_template_status_enum AS ENUM (
    'approved',
    'rejected',
    'paused',
    'disabled',
    'pending',
    'unknown'
);


--
-- Name: whatsapp_cloud_template_submission_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_cloud_template_submission_status_enum AS ENUM (
    'draft',
    'submitting',
    'pending',
    'approved',
    'rejected',
    'paused',
    'disabled',
    'failed',
    'archived'
);


--
-- Name: whatsapp_cloud_webhook_event_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_cloud_webhook_event_status_enum AS ENUM (
    'pending',
    'processing',
    'completed',
    'retryable',
    'dead_letter',
    'ignored'
);


--
-- Name: whatsapp_customer_consent_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_customer_consent_kind_enum AS ENUM (
    'marketing',
    'utility',
    'suppression'
);


--
-- Name: whatsapp_customer_consent_source_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_customer_consent_source_enum AS ENUM (
    'admin',
    'pos',
    'import',
    'customer_reply',
    'migration',
    'system'
);


--
-- Name: whatsapp_customer_consent_state_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_customer_consent_state_enum AS ENUM (
    'opted_in',
    'opted_out',
    'suppressed',
    'cleared'
);


--
-- Name: whatsapp_message_direction_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_message_direction_enum AS ENUM (
    'inbound',
    'outbound'
);


--
-- Name: whatsapp_message_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_message_status_enum AS ENUM (
    'queued',
    'sending',
    'sent',
    'delivered',
    'read',
    'failed'
);


--
-- Name: whatsapp_message_template_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_message_template_kind_enum AS ENUM (
    'bill',
    'due_reminder',
    'promotion'
);


--
-- Name: whatsapp_message_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_message_type_enum AS ENUM (
    'text',
    'document',
    'image',
    'template'
);


--
-- Name: whatsapp_outbox_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_outbox_kind_enum AS ENUM (
    'invoice',
    'text',
    'document',
    'promotion',
    'template'
);


--
-- Name: whatsapp_outbox_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_outbox_status_enum AS ENUM (
    'pending',
    'processing',
    'sent',
    'retryable',
    'dead_letter',
    'cancelled',
    'reconciling'
);


--
-- Name: whatsapp_provider_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_provider_enum AS ENUM (
    'baileys',
    'cloud_api'
);


--
-- Name: whatsapp_provider_event_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.whatsapp_provider_event_status_enum AS ENUM (
    'pending',
    'processing',
    'completed',
    'retryable',
    'dead_letter'
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
-- Name: ensure_whatsapp_account_default_store(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_whatsapp_account_default_store() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    account_id UUID;
BEGIN
    account_id := COALESCE(NEW.whatsapp_account_id, OLD.whatsapp_account_id);

    IF EXISTS (
        SELECT 1
        FROM whatsapp_account_stores
        WHERE whatsapp_account_id = account_id
    ) AND NOT EXISTS (
        SELECT 1
        FROM whatsapp_account_stores
        WHERE whatsapp_account_id = account_id
          AND is_default_for_inbound
    ) THEN
        RAISE EXCEPTION 'WhatsApp account must have one default inbound Store';
    END IF;

    RETURN NULL;
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
-- Name: catalog_commercial_operation_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_commercial_operation_audits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    item_type public.catalog_commercial_item_type_enum NOT NULL,
    operation public.catalog_commercial_operation_type_enum NOT NULL,
    store_ids uuid[] NOT NULL,
    item_ids uuid[] NOT NULL,
    actor_id uuid NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT catalog_commercial_operation_audits_details_check CHECK ((jsonb_typeof(details) = 'object'::text)),
    CONSTRAINT catalog_commercial_operation_audits_item_ids_check CHECK ((cardinality(item_ids) > 0)),
    CONSTRAINT catalog_commercial_operation_audits_store_ids_check CHECK ((cardinality(store_ids) > 0))
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT categories_sort_order_check CHECK ((sort_order >= 0))
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
-- Name: commercial_enforcement_launch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_enforcement_launch (
    id smallint DEFAULT 1 NOT NULL,
    launched_at timestamp with time zone NOT NULL,
    CONSTRAINT commercial_enforcement_launch_id_check CHECK ((id = 1))
);


--
-- Name: commercial_feature_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_feature_revisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feature_id uuid NOT NULL,
    revision_number integer NOT NULL,
    status public.commercial_catalog_revision_status NOT NULL,
    display_name character varying(255) NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    created_by_owner_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    published_by_owner_user_id uuid,
    published_at timestamp with time zone,
    retired_by_owner_user_id uuid,
    retired_at timestamp with time zone,
    discarded_by_owner_user_id uuid,
    discarded_at timestamp with time zone,
    CONSTRAINT commercial_feature_revisions_display_name_not_blank CHECK ((length(btrim((display_name)::text)) > 0)),
    CONSTRAINT commercial_feature_revisions_revision_number_positive CHECK ((revision_number >= 1)),
    CONSTRAINT commercial_feature_revisions_status_audit CHECK ((((status = 'draft'::public.commercial_catalog_revision_status) AND (published_at IS NULL) AND (published_by_owner_user_id IS NULL) AND (retired_at IS NULL) AND (retired_by_owner_user_id IS NULL) AND (discarded_at IS NULL) AND (discarded_by_owner_user_id IS NULL)) OR ((status = 'active'::public.commercial_catalog_revision_status) AND (published_at IS NOT NULL) AND (published_by_owner_user_id IS NOT NULL) AND (retired_at IS NULL) AND (retired_by_owner_user_id IS NULL) AND (discarded_at IS NULL) AND (discarded_by_owner_user_id IS NULL)) OR ((status = 'retired'::public.commercial_catalog_revision_status) AND (published_at IS NOT NULL) AND (published_by_owner_user_id IS NOT NULL) AND (retired_at IS NOT NULL) AND (retired_by_owner_user_id IS NOT NULL) AND (discarded_at IS NULL) AND (discarded_by_owner_user_id IS NULL)) OR ((status = 'discarded'::public.commercial_catalog_revision_status) AND (published_at IS NULL) AND (published_by_owner_user_id IS NULL) AND (retired_at IS NULL) AND (retired_by_owner_user_id IS NULL) AND (discarded_at IS NOT NULL) AND (discarded_by_owner_user_id IS NOT NULL))))
);


--
-- Name: commercial_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_features (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT commercial_features_key_format CHECK (((key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text))
);


--
-- Name: commercial_module_revision_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_module_revision_features (
    module_revision_id uuid NOT NULL,
    feature_revision_id uuid CONSTRAINT commercial_module_revision_feature_feature_revision_id_not_null NOT NULL,
    feature_id uuid NOT NULL
);


--
-- Name: commercial_module_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_module_revisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    revision_number integer NOT NULL,
    status public.commercial_catalog_revision_status NOT NULL,
    display_name character varying(255) NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    is_separately_purchasable boolean DEFAULT false NOT NULL,
    price_inr numeric(10,2),
    term_count integer,
    term_unit character varying(16),
    created_by_owner_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    published_by_owner_user_id uuid,
    published_at timestamp with time zone,
    retired_by_owner_user_id uuid,
    retired_at timestamp with time zone,
    discarded_by_owner_user_id uuid,
    discarded_at timestamp with time zone,
    CONSTRAINT commercial_module_revisions_display_name_not_blank CHECK ((length(btrim((display_name)::text)) > 0)),
    CONSTRAINT commercial_module_revisions_purchasable_terms CHECK ((((is_separately_purchasable = false) AND (price_inr IS NULL) AND (term_count IS NULL) AND (term_unit IS NULL)) OR ((is_separately_purchasable = true) AND (price_inr IS NOT NULL) AND (price_inr >= (0)::numeric) AND (term_count IS NOT NULL) AND (term_count >= 1) AND ((term_unit)::text = ANY ((ARRAY['day'::character varying, 'month'::character varying, 'year'::character varying])::text[]))))),
    CONSTRAINT commercial_module_revisions_revision_number_positive CHECK ((revision_number >= 1)),
    CONSTRAINT commercial_module_revisions_status_audit CHECK ((((status = 'draft'::public.commercial_catalog_revision_status) AND (published_at IS NULL) AND (published_by_owner_user_id IS NULL) AND (retired_at IS NULL) AND (retired_by_owner_user_id IS NULL) AND (discarded_at IS NULL) AND (discarded_by_owner_user_id IS NULL)) OR ((status = 'active'::public.commercial_catalog_revision_status) AND (published_at IS NOT NULL) AND (published_by_owner_user_id IS NOT NULL) AND (retired_at IS NULL) AND (retired_by_owner_user_id IS NULL) AND (discarded_at IS NULL) AND (discarded_by_owner_user_id IS NULL)) OR ((status = 'retired'::public.commercial_catalog_revision_status) AND (published_at IS NOT NULL) AND (published_by_owner_user_id IS NOT NULL) AND (retired_at IS NOT NULL) AND (retired_by_owner_user_id IS NOT NULL) AND (discarded_at IS NULL) AND (discarded_by_owner_user_id IS NULL)) OR ((status = 'discarded'::public.commercial_catalog_revision_status) AND (published_at IS NULL) AND (published_by_owner_user_id IS NULL) AND (retired_at IS NULL) AND (retired_by_owner_user_id IS NULL) AND (discarded_at IS NOT NULL) AND (discarded_by_owner_user_id IS NOT NULL))))
);


--
-- Name: commercial_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT commercial_modules_key_format CHECK (((key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text))
);


--
-- Name: commercial_payment_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_payment_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    razorpay_event_id character varying(128) NOT NULL,
    event_type character varying(64) NOT NULL,
    razorpay_order_id character varying(64),
    razorpay_payment_id character varying(64),
    amount_paise integer,
    currency character varying(8),
    quote_id uuid,
    fulfillment_status character varying(32) NOT NULL,
    fulfillment_error text,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    CONSTRAINT commercial_payment_events_fulfillment_status CHECK (((fulfillment_status)::text = ANY ((ARRAY['received'::character varying, 'fulfilled'::character varying, 'ignored'::character varying, 'mismatched'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: commercial_plan_revision_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_plan_revision_modules (
    plan_revision_id uuid NOT NULL,
    module_revision_id uuid NOT NULL,
    module_id uuid NOT NULL
);


--
-- Name: commercial_plan_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_plan_revisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    revision_number integer NOT NULL,
    status public.commercial_catalog_revision_status NOT NULL,
    display_name character varying(255) NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    plan_type character varying(32) NOT NULL,
    price_inr numeric(10,2) NOT NULL,
    term_count integer NOT NULL,
    term_unit character varying(16) NOT NULL,
    created_by_owner_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    published_by_owner_user_id uuid,
    published_at timestamp with time zone,
    retired_by_owner_user_id uuid,
    retired_at timestamp with time zone,
    discarded_by_owner_user_id uuid,
    discarded_at timestamp with time zone,
    CONSTRAINT commercial_plan_revisions_display_name_not_blank CHECK ((length(btrim((display_name)::text)) > 0)),
    CONSTRAINT commercial_plan_revisions_price CHECK (((((plan_type)::text = 'trial'::text) AND (price_inr = (0)::numeric)) OR (((plan_type)::text = 'paid'::text) AND (price_inr > (0)::numeric)))),
    CONSTRAINT commercial_plan_revisions_revision_number_positive CHECK ((revision_number >= 1)),
    CONSTRAINT commercial_plan_revisions_status_audit CHECK ((((status = 'draft'::public.commercial_catalog_revision_status) AND (published_at IS NULL) AND (published_by_owner_user_id IS NULL) AND (retired_at IS NULL) AND (retired_by_owner_user_id IS NULL) AND (discarded_at IS NULL) AND (discarded_by_owner_user_id IS NULL)) OR ((status = 'active'::public.commercial_catalog_revision_status) AND (published_at IS NOT NULL) AND (published_by_owner_user_id IS NOT NULL) AND (retired_at IS NULL) AND (retired_by_owner_user_id IS NULL) AND (discarded_at IS NULL) AND (discarded_by_owner_user_id IS NULL)) OR ((status = 'retired'::public.commercial_catalog_revision_status) AND (published_at IS NOT NULL) AND (published_by_owner_user_id IS NOT NULL) AND (retired_at IS NOT NULL) AND (retired_by_owner_user_id IS NOT NULL) AND (discarded_at IS NULL) AND (discarded_by_owner_user_id IS NULL)) OR ((status = 'discarded'::public.commercial_catalog_revision_status) AND (published_at IS NULL) AND (published_by_owner_user_id IS NULL) AND (retired_at IS NULL) AND (retired_by_owner_user_id IS NULL) AND (discarded_at IS NOT NULL) AND (discarded_by_owner_user_id IS NOT NULL)))),
    CONSTRAINT commercial_plan_revisions_term CHECK (((term_count >= 1) AND ((term_unit)::text = ANY ((ARRAY['day'::character varying, 'month'::character varying, 'year'::character varying])::text[])))),
    CONSTRAINT commercial_plan_revisions_type CHECK (((plan_type)::text = ANY ((ARRAY['trial'::character varying, 'paid'::character varying])::text[])))
);


--
-- Name: commercial_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT commercial_plans_key_format CHECK (((key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text))
);


--
-- Name: commercial_quote_feature_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_quote_feature_snapshots (
    quote_id uuid NOT NULL,
    module_id uuid NOT NULL,
    feature_id uuid NOT NULL,
    feature_revision_id uuid NOT NULL,
    feature_key character varying(64) NOT NULL,
    feature_display_name character varying(255) CONSTRAINT commercial_quote_feature_snapshot_feature_display_name_not_null NOT NULL,
    CONSTRAINT commercial_quote_feature_snapshots_key_format CHECK (((feature_key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text))
);


--
-- Name: commercial_quote_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_quote_line_items (
    quote_id uuid NOT NULL,
    "position" integer NOT NULL,
    description text NOT NULL,
    amount_inr numeric(10,2) NOT NULL,
    CONSTRAINT commercial_quote_line_items_amount CHECK ((amount_inr >= (0)::numeric)),
    CONSTRAINT commercial_quote_line_items_position CHECK (("position" >= 1))
);


--
-- Name: commercial_quote_module_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_quote_module_snapshots (
    quote_id uuid NOT NULL,
    module_id uuid NOT NULL,
    module_revision_id uuid NOT NULL,
    module_key character varying(64) NOT NULL,
    module_display_name character varying(255) NOT NULL,
    CONSTRAINT commercial_quote_module_snapshots_key_format CHECK (((module_key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text))
);


--
-- Name: commercial_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    kind character varying(32) NOT NULL,
    plan_id uuid,
    plan_revision_id uuid,
    plan_key character varying(64),
    plan_display_name character varying(255),
    plan_type character varying(32),
    price_inr numeric(10,2) NOT NULL,
    amount_inr numeric(10,2) NOT NULL,
    amount_paise integer NOT NULL,
    currency character varying(8) NOT NULL,
    term_count integer NOT NULL,
    term_unit character varying(16) NOT NULL,
    license_timing character varying(32) NOT NULL,
    intended_starts_at timestamp with time zone NOT NULL,
    intended_ends_at timestamp with time zone NOT NULL,
    razorpay_order_id character varying(64) NOT NULL,
    razorpay_receipt character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    fulfilled_at timestamp with time zone,
    fulfilled_license_id uuid,
    created_by_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    module_id uuid,
    module_revision_id uuid,
    module_key character varying(64),
    module_display_name character varying(255),
    fulfilled_co_term_add_on_id uuid,
    CONSTRAINT commercial_quotes_amounts CHECK (((price_inr >= (0)::numeric) AND (amount_inr >= (0)::numeric) AND (amount_paise >= 0) AND ((amount_paise)::numeric = round((amount_inr * (100)::numeric))))),
    CONSTRAINT commercial_quotes_currency CHECK (((currency)::text = 'INR'::text)),
    CONSTRAINT commercial_quotes_key_format CHECK (((plan_key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text)),
    CONSTRAINT commercial_quotes_kind CHECK (((kind)::text = ANY ((ARRAY['paid_plan'::character varying, 'plan_renewal'::character varying, 'plan_upgrade'::character varying, 'co_term_add_on'::character varying])::text[]))),
    CONSTRAINT commercial_quotes_license_timing CHECK (((license_timing)::text = ANY ((ARRAY['immediate'::character varying, 'scheduled'::character varying])::text[]))),
    CONSTRAINT commercial_quotes_module_key_format CHECK (((module_key IS NULL) OR ((module_key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text))),
    CONSTRAINT commercial_quotes_plan_type CHECK (((plan_type)::text = 'paid'::text)),
    CONSTRAINT commercial_quotes_selection CHECK (((((kind)::text = ANY ((ARRAY['paid_plan'::character varying, 'plan_renewal'::character varying, 'plan_upgrade'::character varying])::text[])) AND (plan_id IS NOT NULL) AND (plan_revision_id IS NOT NULL) AND (plan_key IS NOT NULL) AND (plan_display_name IS NOT NULL) AND ((plan_type)::text = 'paid'::text) AND (module_id IS NULL) AND (module_revision_id IS NULL) AND (module_key IS NULL) AND (module_display_name IS NULL)) OR (((kind)::text = 'co_term_add_on'::text) AND (plan_id IS NULL) AND (plan_revision_id IS NULL) AND (plan_key IS NULL) AND (plan_display_name IS NULL) AND (plan_type IS NULL) AND (module_id IS NOT NULL) AND (module_revision_id IS NOT NULL) AND (module_key IS NOT NULL) AND (module_display_name IS NOT NULL)))),
    CONSTRAINT commercial_quotes_term CHECK (((term_count >= 1) AND ((term_unit)::text = ANY ((ARRAY['day'::character varying, 'month'::character varying, 'year'::character varying])::text[])) AND (intended_ends_at > intended_starts_at) AND (expires_at > created_at)))
);


--
-- Name: commercial_refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commercial_refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    quote_id uuid NOT NULL,
    payment_event_id uuid NOT NULL,
    access_source_kind character varying(32) NOT NULL,
    access_source_id uuid NOT NULL,
    razorpay_payment_id character varying(64) NOT NULL,
    razorpay_refund_id character varying(64) NOT NULL,
    amount_inr numeric(10,2) NOT NULL,
    amount_paise integer NOT NULL,
    currency character varying(8) NOT NULL,
    created_by_owner_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT commercial_refunds_access_source_kind CHECK (((access_source_kind)::text = ANY ((ARRAY['store_license'::character varying, 'co_term_add_on'::character varying])::text[]))),
    CONSTRAINT commercial_refunds_amounts CHECK (((amount_inr >= (0)::numeric) AND (amount_paise > 0) AND ((amount_paise)::numeric = round((amount_inr * (100)::numeric))))),
    CONSTRAINT commercial_refunds_currency CHECK (((currency)::text = 'INR'::text))
);


--
-- Name: console_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.console_users (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT owner_users_id_not_null NOT NULL,
    first_name character varying(255) CONSTRAINT owner_users_first_name_not_null NOT NULL,
    last_name character varying(255) CONSTRAINT owner_users_last_name_not_null NOT NULL,
    phone character varying(20) CONSTRAINT owner_users_phone_not_null NOT NULL,
    password_hash character varying(255) CONSTRAINT owner_users_password_hash_not_null NOT NULL,
    is_active boolean DEFAULT true CONSTRAINT owner_users_is_active_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT owner_users_created_at_not_null NOT NULL,
    updated_at timestamp with time zone DEFAULT now() CONSTRAINT owner_users_updated_at_not_null NOT NULL,
    CONSTRAINT console_users_first_name_not_blank CHECK ((length(btrim((first_name)::text)) > 0)),
    CONSTRAINT console_users_last_name_not_blank CHECK ((length(btrim((last_name)::text)) > 0)),
    CONSTRAINT console_users_phone_normalized CHECK (((phone)::text ~ '^\+[1-9][0-9]{7,14}$'::text))
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
    marketing_opted_out boolean DEFAULT false NOT NULL,
    marketing_opted_out_at timestamp with time zone,
    marketing_opted_in boolean DEFAULT true NOT NULL,
    marketing_opted_in_at timestamp with time zone,
    marketing_opt_in_source public.whatsapp_customer_consent_source_enum,
    utility_opted_in boolean DEFAULT true NOT NULL,
    utility_opted_in_at timestamp with time zone,
    utility_opt_in_source public.whatsapp_customer_consent_source_enum,
    whatsapp_suppressed boolean DEFAULT false NOT NULL,
    whatsapp_suppressed_at timestamp with time zone,
    whatsapp_suppression_reason character varying(1000),
    CONSTRAINT customers_balance_check CHECK ((balance >= (0)::numeric)),
    CONSTRAINT customers_marketing_opt_in_at_check CHECK ((marketing_opted_in OR (marketing_opted_in_at IS NULL))),
    CONSTRAINT customers_phone_e164_check CHECK (((phone IS NULL) OR ((phone)::text ~ '^[+][1-9][0-9]{7,14}$'::text))),
    CONSTRAINT customers_utility_opt_in_at_check CHECK ((utility_opted_in OR (utility_opted_in_at IS NULL))),
    CONSTRAINT customers_whatsapp_suppression_check CHECK (((whatsapp_suppressed AND (whatsapp_suppressed_at IS NOT NULL)) OR ((NOT whatsapp_suppressed) AND (whatsapp_suppressed_at IS NULL))))
);


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    kind public.expense_category_kind_enum NOT NULL,
    predefined_key character varying(64),
    status public.expense_category_status_enum DEFAULT 'active'::public.expense_category_status_enum NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expense_categories_predefined_key_kind_check CHECK ((((kind = 'predefined'::public.expense_category_kind_enum) AND (predefined_key IS NOT NULL)) OR ((kind = 'custom'::public.expense_category_kind_enum) AND (predefined_key IS NULL))))
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    expense_category_id uuid NOT NULL,
    expense_category_name character varying(255) NOT NULL,
    lifecycle public.expense_lifecycle_enum DEFAULT 'draft'::public.expense_lifecycle_enum NOT NULL,
    payable_status public.payable_status_enum,
    effective_date date NOT NULL,
    invoice_reference character varying(255),
    notes character varying(1000),
    total numeric(12,2) NOT NULL,
    paid_total numeric(12,2) DEFAULT 0 NOT NULL,
    due_amount numeric(12,2),
    recorded_at timestamp with time zone,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    voided_at timestamp with time zone,
    void_reason character varying(1000),
    CONSTRAINT expenses_lifecycle_shape_check CHECK ((((lifecycle = 'draft'::public.expense_lifecycle_enum) AND (payable_status IS NULL) AND (paid_total = (0)::numeric) AND (due_amount IS NULL) AND (recorded_at IS NULL) AND (voided_at IS NULL) AND (void_reason IS NULL)) OR ((lifecycle = 'recorded'::public.expense_lifecycle_enum) AND (payable_status IS NOT NULL) AND (due_amount IS NOT NULL) AND (recorded_at IS NOT NULL) AND (voided_at IS NULL) AND (void_reason IS NULL)) OR ((lifecycle = 'voided'::public.expense_lifecycle_enum) AND (payable_status IS NULL) AND (due_amount IS NULL) AND (recorded_at IS NOT NULL) AND (voided_at IS NOT NULL) AND (void_reason IS NOT NULL)))),
    CONSTRAINT expenses_paid_total_non_negative CHECK ((paid_total >= (0)::numeric)),
    CONSTRAINT expenses_total_positive CHECK ((total > (0)::numeric))
);


--
-- Name: google_contacts_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_contacts_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    status character varying(32) NOT NULL,
    google_account_email character varying(320),
    google_account_subject character varying(255),
    credential_reference character varying(255),
    credential_key_version character varying(64),
    oauth_attempt_nonce_hash character varying(64),
    connected_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    initial_sync_status character varying(32) DEFAULT 'not_started'::character varying NOT NULL,
    last_successful_sync_at timestamp with time zone,
    oauth_attempt_intent character varying(32),
    contact_name_prefix character varying(32) DEFAULT ''::character varying NOT NULL,
    contact_name_postfix character varying(32) DEFAULT ''::character varying NOT NULL,
    CONSTRAINT google_contacts_connections_connected_credentials_check CHECK ((((status)::text <> 'connected'::text) OR ((google_account_email IS NOT NULL) AND (google_account_subject IS NOT NULL) AND (credential_reference IS NOT NULL) AND (credential_key_version IS NOT NULL) AND (connected_at IS NOT NULL)))),
    CONSTRAINT google_contacts_connections_email_check CHECK (((google_account_email IS NULL) OR ((length(btrim((google_account_email)::text)) >= 3) AND (length(btrim((google_account_email)::text)) <= 320)))),
    CONSTRAINT google_contacts_connections_initial_sync_status_check CHECK (((initial_sync_status)::text = ANY ((ARRAY['not_started'::character varying, 'pending'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT google_contacts_connections_oauth_attempt_intent_check CHECK (((oauth_attempt_intent IS NULL) OR ((oauth_attempt_intent)::text = ANY ((ARRAY['connect'::character varying, 'reconnect'::character varying, 'replace'::character varying])::text[])))),
    CONSTRAINT google_contacts_connections_oauth_attempt_intent_status_check CHECK ((((status)::text = 'connecting'::text) = (oauth_attempt_intent IS NOT NULL))),
    CONSTRAINT google_contacts_connections_oauth_attempt_nonce_hash_check CHECK (((oauth_attempt_nonce_hash IS NULL) OR ((oauth_attempt_nonce_hash)::text ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT google_contacts_connections_oauth_attempt_status_check CHECK ((((status)::text = 'connecting'::text) = (oauth_attempt_nonce_hash IS NOT NULL))),
    CONSTRAINT google_contacts_connections_status_check CHECK (((status)::text = ANY ((ARRAY['connecting'::character varying, 'connected'::character varying, 'reconnect_required'::character varying])::text[])))
);


--
-- Name: google_contacts_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_contacts_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    owner_key character varying(255) NOT NULL,
    encrypted_payload text NOT NULL,
    key_version character varying(64) NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT google_contacts_credentials_encrypted_payload_check CHECK ((length(btrim(encrypted_payload)) > 0)),
    CONSTRAINT google_contacts_credentials_key_version_check CHECK (((length(btrim((key_version)::text)) >= 1) AND (length(btrim((key_version)::text)) <= 64))),
    CONSTRAINT google_contacts_credentials_owner_key_check CHECK (((length(btrim((owner_key)::text)) >= 1) AND (length(btrim((owner_key)::text)) <= 255)))
);


--
-- Name: google_contacts_customer_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_contacts_customer_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    google_resource_name character varying(255) NOT NULL,
    matched_phone character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT google_contacts_customer_links_phone_check CHECK (((length(btrim((matched_phone)::text)) >= 1) AND (length(btrim((matched_phone)::text)) <= 20))),
    CONSTRAINT google_contacts_customer_links_resource_check CHECK (((length(btrim((google_resource_name)::text)) >= 1) AND (length(btrim((google_resource_name)::text)) <= 255)))
);


--
-- Name: google_contacts_oauth_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_contacts_oauth_states (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    nonce_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT google_contacts_oauth_states_consumed_at_check CHECK (((consumed_at IS NULL) OR (consumed_at >= created_at))),
    CONSTRAINT google_contacts_oauth_states_expiry_check CHECK ((expires_at > created_at)),
    CONSTRAINT google_contacts_oauth_states_nonce_hash_check CHECK (((nonce_hash)::text ~ '^[0-9a-f]{64}$'::text))
);


--
-- Name: google_contacts_sync_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_contacts_sync_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    connection_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    status character varying(32) NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    lease_owner character varying(100),
    lease_expires_at timestamp with time zone,
    customer_updated_at timestamp with time zone NOT NULL,
    last_error_code character varying(64),
    last_error_message character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT google_contacts_sync_outbox_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT google_contacts_sync_outbox_error_code_check CHECK (((last_error_code IS NULL) OR ((length(btrim((last_error_code)::text)) >= 1) AND (length(btrim((last_error_code)::text)) <= 64)))),
    CONSTRAINT google_contacts_sync_outbox_error_message_check CHECK (((last_error_message IS NULL) OR ((length(btrim((last_error_message)::text)) >= 1) AND (length(btrim((last_error_message)::text)) <= 500)))),
    CONSTRAINT google_contacts_sync_outbox_lease_check CHECK (((lease_owner IS NULL) = (lease_expires_at IS NULL))),
    CONSTRAINT google_contacts_sync_outbox_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'skipped'::character varying, 'failed'::character varying, 'conflict'::character varying])::text[])))
);


--
-- Name: internal_product_code_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internal_product_code_sequences (
    organization_id uuid NOT NULL,
    next_sequence bigint DEFAULT 0 NOT NULL,
    CONSTRAINT internal_product_code_sequences_next_sequence_check CHECK (((next_sequence >= 0) AND (next_sequence <= '10000000000'::bigint)))
);


--
-- Name: kot_item_add_ons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kot_item_add_ons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    kot_id uuid NOT NULL,
    kot_item_id uuid NOT NULL,
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
    CONSTRAINT kot_item_add_ons_discount_amount_check CHECK (((discount_amount >= (0)::numeric) AND (discount_amount <= line_subtotal))),
    CONSTRAINT kot_item_add_ons_line_subtotal_check CHECK ((line_subtotal >= (0)::numeric)),
    CONSTRAINT kot_item_add_ons_line_total_check CHECK (((line_total >= (0)::numeric) AND (line_total = (line_subtotal - discount_amount)))),
    CONSTRAINT kot_item_add_ons_quantity_per_parent_check CHECK ((quantity_per_parent >= 1)),
    CONSTRAINT kot_item_add_ons_total_quantity_check CHECK ((total_quantity >= 1)),
    CONSTRAINT kot_item_add_ons_unit_discount_snapshot_check CHECK ((unit_discount_snapshot >= (0)::numeric)),
    CONSTRAINT kot_item_add_ons_unit_price_snapshot_check CHECK ((unit_price_snapshot >= (0)::numeric))
);


--
-- Name: kot_item_bundle_component_add_ons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kot_item_bundle_component_add_ons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    kot_id uuid NOT NULL,
    kot_item_id uuid NOT NULL,
    kot_item_bundle_component_id uuid CONSTRAINT kot_item_bundle_component_a_kot_item_bundle_component__not_null NOT NULL,
    add_on_id uuid NOT NULL,
    quantity_per_component integer CONSTRAINT kot_item_bundle_component_add_o_quantity_per_component_not_null NOT NULL,
    total_quantity integer NOT NULL,
    add_on_name_snapshot character varying(255) NOT NULL,
    unit_price_snapshot numeric(10,2) NOT NULL,
    unit_discount_snapshot numeric(10,2) DEFAULT 0 CONSTRAINT kot_item_bundle_component_add_o_unit_discount_snapshot_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kot_item_bundle_component_add_ons_quantity_per_component_check CHECK ((quantity_per_component >= 1)),
    CONSTRAINT kot_item_bundle_component_add_ons_total_quantity_check CHECK ((total_quantity >= 1)),
    CONSTRAINT kot_item_bundle_component_add_ons_unit_discount_snapshot_check CHECK ((unit_discount_snapshot >= (0)::numeric)),
    CONSTRAINT kot_item_bundle_component_add_ons_unit_price_snapshot_check CHECK ((unit_price_snapshot >= (0)::numeric))
);


--
-- Name: kot_item_bundle_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kot_item_bundle_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    kot_id uuid NOT NULL,
    kot_item_id uuid NOT NULL,
    choice_group_id uuid,
    component_product_id uuid NOT NULL,
    quantity_per_bundle integer NOT NULL,
    total_quantity integer NOT NULL,
    product_name_snapshot character varying(255) NOT NULL,
    unit_price_snapshot numeric(10,2) NOT NULL,
    unit_discount_snapshot numeric(10,2) DEFAULT 0 NOT NULL,
    price_adjustment_snapshot numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kot_item_bundle_components_quantity_per_bundle_check CHECK ((quantity_per_bundle >= 1)),
    CONSTRAINT kot_item_bundle_components_total_quantity_check CHECK ((total_quantity >= 1)),
    CONSTRAINT kot_item_bundle_components_unit_discount_snapshot_check CHECK ((unit_discount_snapshot >= (0)::numeric)),
    CONSTRAINT kot_item_bundle_components_unit_price_snapshot_check CHECK ((unit_price_snapshot >= (0)::numeric))
);


--
-- Name: kot_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kot_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    kot_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    configuration_signature text DEFAULT ''::text NOT NULL,
    product_name_snapshot character varying(320) NOT NULL,
    unit_price_snapshot numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    line_subtotal numeric(12,2) NOT NULL,
    line_total numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sold_quantity numeric(10,2) NOT NULL,
    unit_id uuid NOT NULL,
    unit_label_snapshot character varying(32) NOT NULL,
    CONSTRAINT kot_items_discount_amount_check CHECK (((discount_amount >= (0)::numeric) AND (discount_amount <= line_subtotal))),
    CONSTRAINT kot_items_line_subtotal_check CHECK ((line_subtotal >= (0)::numeric)),
    CONSTRAINT kot_items_line_total_check CHECK (((line_total >= (0)::numeric) AND (line_total = (line_subtotal - discount_amount)))),
    CONSTRAINT kot_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT kot_items_sold_quantity_positive CHECK ((sold_quantity > (0)::numeric)),
    CONSTRAINT kot_items_unit_price_snapshot_check CHECK ((unit_price_snapshot >= (0)::numeric))
);


--
-- Name: kots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    sale_id uuid,
    kot_type public.kot_type_enum NOT NULL,
    kot_number character varying(64) NOT NULL,
    kot_sequence_number bigint NOT NULL,
    kot_period_key character varying(32) NOT NULL,
    created_by_device_id uuid,
    updated_by_device_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    table_order_id uuid,
    kitchen_completed_at timestamp with time zone,
    fulfillment_type public.kot_fulfillment_type_enum NOT NULL,
    sale_batch_sequence integer,
    generation_request_id uuid,
    CONSTRAINT kots_number_check CHECK ((length(TRIM(BOTH FROM kot_number)) > 0)),
    CONSTRAINT kots_period_key_check CHECK ((length(TRIM(BOTH FROM kot_period_key)) > 0)),
    CONSTRAINT kots_sale_batch_sequence_check CHECK (((sale_batch_sequence IS NULL) OR (sale_batch_sequence > 0))),
    CONSTRAINT kots_sequence_number_check CHECK ((kot_sequence_number > 0)),
    CONSTRAINT kots_standalone_batch_check CHECK ((((kot_type = 'parcel'::public.kot_type_enum) AND (sale_id IS NOT NULL) AND (sale_batch_sequence IS NOT NULL)) OR ((kot_type = 'parcel'::public.kot_type_enum) AND (sale_id IS NULL) AND (sale_batch_sequence IS NULL)) OR ((kot_type = 'table'::public.kot_type_enum) AND (sale_batch_sequence IS NULL)))),
    CONSTRAINT kots_type_association_check CHECK ((((kot_type = 'parcel'::public.kot_type_enum) AND (sale_id IS NOT NULL) AND (table_order_id IS NULL)) OR ((kot_type = 'table'::public.kot_type_enum) AND (table_order_id IS NOT NULL))))
);


--
-- Name: label_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.label_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    status public.label_template_status_enum DEFAULT 'active'::public.label_template_status_enum NOT NULL,
    stock jsonb NOT NULL,
    keep_outs jsonb DEFAULT '[]'::jsonb NOT NULL,
    elements jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: license_revocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.license_revocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    commercial_refund_id uuid NOT NULL,
    access_source_kind character varying(32) NOT NULL,
    access_source_id uuid NOT NULL,
    effective_ends_at timestamp with time zone NOT NULL,
    recorded_at timestamp with time zone NOT NULL,
    created_by_owner_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT license_revocations_access_source_kind CHECK (((access_source_kind)::text = ANY ((ARRAY['store_license'::character varying, 'co_term_add_on'::character varying])::text[])))
);


--
-- Name: money_account_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.money_account_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    money_account_id uuid NOT NULL,
    store_id uuid,
    amount numeric(12,2) NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    source_kind public.money_account_movement_source_kind_enum DEFAULT 'pos_payment'::public.money_account_movement_source_kind_enum NOT NULL,
    payment_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reversed_movement_id uuid,
    outgoing_payment_id uuid,
    note character varying(1000),
    actual_balance numeric(12,2),
    transfer_id uuid,
    CONSTRAINT money_account_movements_amount_nonzero_check CHECK ((amount <> (0)::numeric)),
    CONSTRAINT money_account_movements_source_shape_check CHECK ((((source_kind = 'pos_payment'::public.money_account_movement_source_kind_enum) AND (amount > (0)::numeric) AND (payment_id IS NOT NULL) AND (outgoing_payment_id IS NULL) AND (reversed_movement_id IS NULL) AND (store_id IS NOT NULL) AND (note IS NULL) AND (actual_balance IS NULL) AND (transfer_id IS NULL)) OR ((source_kind = 'sale_replacement_reversal'::public.money_account_movement_source_kind_enum) AND (amount < (0)::numeric) AND (reversed_movement_id IS NOT NULL) AND (payment_id IS NULL) AND (outgoing_payment_id IS NULL) AND (store_id IS NOT NULL) AND (note IS NULL) AND (actual_balance IS NULL) AND (transfer_id IS NULL)) OR ((source_kind = 'outgoing_purchase_payment'::public.money_account_movement_source_kind_enum) AND (amount < (0)::numeric) AND (outgoing_payment_id IS NOT NULL) AND (payment_id IS NULL) AND (reversed_movement_id IS NULL) AND (store_id IS NOT NULL) AND (note IS NULL) AND (actual_balance IS NULL) AND (transfer_id IS NULL)) OR ((source_kind = 'outgoing_expense_payment'::public.money_account_movement_source_kind_enum) AND (amount < (0)::numeric) AND (outgoing_payment_id IS NOT NULL) AND (payment_id IS NULL) AND (reversed_movement_id IS NULL) AND (store_id IS NOT NULL) AND (note IS NULL) AND (actual_balance IS NULL) AND (transfer_id IS NULL)) OR ((source_kind = ANY (ARRAY['outgoing_purchase_payment_reversal'::public.money_account_movement_source_kind_enum, 'outgoing_purchase_void_reversal'::public.money_account_movement_source_kind_enum, 'outgoing_expense_payment_reversal'::public.money_account_movement_source_kind_enum, 'outgoing_expense_void_reversal'::public.money_account_movement_source_kind_enum])) AND (amount > (0)::numeric) AND (reversed_movement_id IS NOT NULL) AND (payment_id IS NULL) AND (outgoing_payment_id IS NULL) AND (store_id IS NOT NULL) AND (note IS NULL) AND (actual_balance IS NULL) AND (transfer_id IS NULL)) OR ((source_kind = 'manual_deposit'::public.money_account_movement_source_kind_enum) AND (amount > (0)::numeric) AND (payment_id IS NULL) AND (outgoing_payment_id IS NULL) AND (reversed_movement_id IS NULL) AND (actual_balance IS NULL) AND (transfer_id IS NULL)) OR ((source_kind = 'manual_withdrawal'::public.money_account_movement_source_kind_enum) AND (amount < (0)::numeric) AND (payment_id IS NULL) AND (outgoing_payment_id IS NULL) AND (reversed_movement_id IS NULL) AND (actual_balance IS NULL) AND (transfer_id IS NULL)) OR ((source_kind = 'balance_adjustment'::public.money_account_movement_source_kind_enum) AND (amount <> (0)::numeric) AND (payment_id IS NULL) AND (outgoing_payment_id IS NULL) AND (reversed_movement_id IS NULL) AND (note IS NOT NULL) AND (btrim((note)::text) <> ''::text) AND (actual_balance IS NOT NULL) AND (actual_balance >= (0)::numeric) AND (transfer_id IS NULL)) OR ((source_kind = 'transfer_out'::public.money_account_movement_source_kind_enum) AND (amount < (0)::numeric) AND (payment_id IS NULL) AND (outgoing_payment_id IS NULL) AND (reversed_movement_id IS NULL) AND (actual_balance IS NULL) AND (transfer_id IS NOT NULL)) OR ((source_kind = 'transfer_in'::public.money_account_movement_source_kind_enum) AND (amount > (0)::numeric) AND (payment_id IS NULL) AND (outgoing_payment_id IS NULL) AND (reversed_movement_id IS NULL) AND (actual_balance IS NULL) AND (transfer_id IS NOT NULL))))
);


--
-- Name: money_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.money_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type public.money_account_type_enum NOT NULL,
    scope public.money_account_scope_enum DEFAULT 'organization_wide'::public.money_account_scope_enum NOT NULL,
    notes character varying(1000),
    status public.money_account_status_enum DEFAULT 'active'::public.money_account_status_enum NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    store_id uuid,
    opening_balance numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT money_accounts_cash_store_scoped_check CHECK (((type <> 'cash'::public.money_account_type_enum) OR ((scope = 'store_scoped'::public.money_account_scope_enum) AND (store_id IS NOT NULL)))),
    CONSTRAINT money_accounts_opening_balance_non_negative_check CHECK ((opening_balance >= (0)::numeric)),
    CONSTRAINT money_accounts_scope_store_check CHECK ((((scope = 'organization_wide'::public.money_account_scope_enum) AND (store_id IS NULL)) OR ((scope = 'store_scoped'::public.money_account_scope_enum) AND (store_id IS NOT NULL))))
);


--
-- Name: organization_catalog_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_catalog_settings (
    organization_id uuid NOT NULL,
    barcode_scanning_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organization_invoice_appearance_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_invoice_appearance_settings (
    organization_id uuid CONSTRAINT organization_invoice_appearance_settin_organization_id_not_null NOT NULL,
    published_settings jsonb DEFAULT '{}'::jsonb CONSTRAINT organization_invoice_appearance_set_published_settings_not_null NOT NULL,
    draft_settings jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
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
-- Name: outgoing_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outgoing_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    purchase_id uuid,
    amount numeric(12,2) NOT NULL,
    payment_method public.payment_method_enum NOT NULL,
    money_account_id uuid,
    reference character varying(255),
    notes character varying(1000),
    paid_at timestamp with time zone NOT NULL,
    reversed_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expense_id uuid,
    reversal_reason character varying(1000),
    reversal_kind public.outgoing_payment_reversal_kind_enum,
    CONSTRAINT outgoing_payments_amount_positive CHECK ((amount > (0)::numeric)),
    CONSTRAINT outgoing_payments_purchase_or_expense_xor CHECK ((((purchase_id IS NOT NULL) AND (expense_id IS NULL)) OR ((purchase_id IS NULL) AND (expense_id IS NOT NULL)))),
    CONSTRAINT outgoing_payments_reversal_shape_check CHECK ((((reversed_at IS NULL) AND (reversal_reason IS NULL) AND (reversal_kind IS NULL)) OR ((reversed_at IS NOT NULL) AND (reversal_reason IS NOT NULL) AND (reversal_kind IS NOT NULL)))),
    CONSTRAINT outgoing_payments_untracked_methods_without_account CHECK (((money_account_id IS NOT NULL) OR (payment_method = ANY (ARRAY['cash'::public.payment_method_enum, 'upi'::public.payment_method_enum, 'card'::public.payment_method_enum]))))
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
-- Name: product_label_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_label_profiles (
    product_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    ingredients text,
    nutrition jsonb,
    net_weight character varying(128),
    unit_selling_price_text character varying(255),
    mrp numeric(10,2),
    shelf_life_days integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_label_profiles_mrp_check CHECK (((mrp IS NULL) OR (mrp >= (0)::numeric))),
    CONSTRAINT product_label_profiles_shelf_life_days_check CHECK (((shelf_life_days IS NULL) OR (shelf_life_days >= 1)))
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
    product_code character varying(128),
    product_code_kind public.product_code_kind_enum,
    sort_order integer DEFAULT 0 NOT NULL,
    unit_id uuid NOT NULL,
    default_selling_quantity numeric(10,2) NOT NULL,
    allow_custom_selling_quantity boolean DEFAULT false NOT NULL,
    CONSTRAINT products_default_selling_quantity_positive CHECK ((default_selling_quantity > (0)::numeric)),
    CONSTRAINT products_discount_check CHECK ((discount >= (0)::numeric)),
    CONSTRAINT products_image_path_no_icons CHECK (((image_path IS NULL) OR ((image_path)::text !~~ 'icon:%'::text))),
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_product_code_kind_consistency_check CHECK ((((product_code IS NULL) AND (product_code_kind IS NULL)) OR ((product_code IS NOT NULL) AND (product_code_kind IS NOT NULL)))),
    CONSTRAINT products_sort_order_check CHECK ((sort_order >= 0))
);


--
-- Name: purchase_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    purchase_id uuid NOT NULL,
    "position" integer NOT NULL,
    vendor_item_id uuid NOT NULL,
    vendor_item_name character varying(255) NOT NULL,
    unit_id uuid NOT NULL,
    unit_label character varying(32) NOT NULL,
    quantity numeric(14,3) NOT NULL,
    agreed_unit_price numeric(12,2) NOT NULL,
    line_total numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchase_lines_agreed_unit_price_non_negative CHECK ((agreed_unit_price >= (0)::numeric)),
    CONSTRAINT purchase_lines_line_total_non_negative CHECK ((line_total >= (0)::numeric)),
    CONSTRAINT purchase_lines_quantity_positive CHECK ((quantity > (0)::numeric))
);


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    vendor_name character varying(255) NOT NULL,
    lifecycle public.purchase_lifecycle_enum DEFAULT 'draft'::public.purchase_lifecycle_enum NOT NULL,
    payable_status public.payable_status_enum,
    effective_date date NOT NULL,
    invoice_reference character varying(255),
    notes character varying(1000),
    adjustment numeric(12,2) DEFAULT 0 NOT NULL,
    lines_total numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    paid_total numeric(12,2) DEFAULT 0 NOT NULL,
    due_amount numeric(12,2),
    recorded_at timestamp with time zone,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    voided_at timestamp with time zone,
    void_reason character varying(1000),
    CONSTRAINT purchases_lifecycle_shape_check CHECK ((((lifecycle = 'draft'::public.purchase_lifecycle_enum) AND (payable_status IS NULL) AND (paid_total = (0)::numeric) AND (due_amount IS NULL) AND (recorded_at IS NULL) AND (voided_at IS NULL) AND (void_reason IS NULL)) OR ((lifecycle = 'recorded'::public.purchase_lifecycle_enum) AND (payable_status IS NOT NULL) AND (due_amount IS NOT NULL) AND (recorded_at IS NOT NULL) AND (voided_at IS NULL) AND (void_reason IS NULL)) OR ((lifecycle = 'voided'::public.purchase_lifecycle_enum) AND (payable_status IS NULL) AND (due_amount IS NULL) AND (recorded_at IS NOT NULL) AND (voided_at IS NOT NULL) AND (void_reason IS NOT NULL)))),
    CONSTRAINT purchases_paid_total_non_negative CHECK ((paid_total >= (0)::numeric))
);


--
-- Name: released_internal_product_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.released_internal_product_codes (
    organization_id uuid NOT NULL,
    product_code character varying(13) NOT NULL,
    released_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT released_internal_product_codes_shape_check CHECK (((product_code)::text ~ '^04[0-9]{11}$'::text))
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
    product_name_snapshot character varying(320) NOT NULL,
    unit_price_snapshot numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    line_subtotal numeric(12,2) NOT NULL,
    line_total numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    configuration_signature text DEFAULT ''::text NOT NULL,
    sold_quantity numeric(10,2) NOT NULL,
    unit_id uuid NOT NULL,
    unit_label_snapshot character varying(32) NOT NULL,
    CONSTRAINT sale_items_discount_amount_check CHECK (((discount_amount >= (0)::numeric) AND (discount_amount <= line_subtotal))),
    CONSTRAINT sale_items_line_subtotal_check CHECK ((line_subtotal >= (0)::numeric)),
    CONSTRAINT sale_items_line_total_check CHECK (((line_total >= (0)::numeric) AND (line_total = (line_subtotal - discount_amount)))),
    CONSTRAINT sale_items_quantity_check CHECK (((quantity)::numeric > (0)::numeric)),
    CONSTRAINT sale_items_sold_quantity_positive CHECK ((sold_quantity > (0)::numeric)),
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
    customer_name_snapshot character varying(255),
    customer_phone_snapshot character varying(20),
    service_table_id uuid,
    service_mode public.sale_service_mode_enum DEFAULT 'dine_in'::public.sale_service_mode_enum NOT NULL,
    CONSTRAINT sales_discount_total_check CHECK (((discount_total >= (0)::numeric) AND (discount_total <= subtotal))),
    CONSTRAINT sales_draft_commit_check CHECK ((((status = 'draft'::public.sale_status_enum) AND (committed_at IS NULL) AND (payment_status = 'pending'::public.payment_status_enum)) OR ((status <> 'draft'::public.sale_status_enum) AND (committed_at IS NOT NULL)))),
    CONSTRAINT sales_draft_sale_number_check CHECK ((((status = 'draft'::public.sale_status_enum) AND (sale_number IS NULL)) OR ((status <> 'draft'::public.sale_status_enum) AND (sale_number IS NOT NULL)))),
    CONSTRAINT sales_grand_total_check CHECK (((grand_total >= (0)::numeric) AND (grand_total = (subtotal - discount_total)))),
    CONSTRAINT sales_replacement_not_self_check CHECK (((replacement_of_sale_id IS NULL) OR (replacement_of_sale_id <> id))),
    CONSTRAINT sales_sale_number_metadata_check CHECK ((((status = 'draft'::public.sale_status_enum) AND (sale_number IS NULL) AND (sale_sequence_number IS NULL) AND (sale_period_key IS NULL)) OR ((status <> 'draft'::public.sale_status_enum) AND (sale_number IS NOT NULL) AND (sale_sequence_number IS NOT NULL) AND (sale_period_key IS NOT NULL) AND (length(TRIM(BOTH FROM sale_period_key)) > 0)))),
    CONSTRAINT sales_sale_sequence_number_check CHECK (((sale_sequence_number IS NULL) OR (sale_sequence_number > 0))),
    CONSTRAINT sales_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT sales_token_number_metadata_check CHECK ((((status = 'draft'::public.sale_status_enum) AND (token_number IS NULL) AND (token_sequence_number IS NULL) AND (token_period_key IS NULL)) OR ((status <> 'draft'::public.sale_status_enum) AND (((token_number IS NULL) AND (token_sequence_number IS NULL) AND (token_period_key IS NULL)) OR ((token_number IS NOT NULL) AND (token_sequence_number IS NOT NULL) AND (token_sequence_number > 0) AND (token_period_key IS NOT NULL) AND (length(TRIM(BOTH FROM token_period_key)) > 0)))))),
    CONSTRAINT sales_token_sequence_number_check CHECK (((token_sequence_number IS NULL) OR (token_sequence_number > 0))),
    CONSTRAINT sales_void_metadata_check CHECK (((status <> 'voided'::public.sale_status_enum) OR ((voided_at IS NOT NULL) AND (void_reason IS NOT NULL))))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: service_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_areas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    title character varying(128) NOT NULL,
    description character varying(1000),
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT service_areas_title_check CHECK ((length(btrim((title)::text)) > 0))
);


--
-- Name: service_tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    table_label character varying(64) NOT NULL,
    capacity integer,
    state public.service_table_state_enum DEFAULT 'free'::public.service_table_state_enum NOT NULL,
    current_sale_id uuid,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    service_area_id uuid,
    current_table_order_id uuid,
    CONSTRAINT service_tables_capacity_check CHECK (((capacity IS NULL) OR (capacity > 0))),
    CONSTRAINT service_tables_table_label_check CHECK ((length(btrim((table_label)::text)) > 0))
);


--
-- Name: store_access_grant_feature_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_access_grant_feature_snapshots (
    grant_id uuid NOT NULL,
    module_id uuid NOT NULL,
    feature_id uuid NOT NULL,
    feature_revision_id uuid CONSTRAINT store_access_grant_feature_snapsho_feature_revision_id_not_null NOT NULL,
    feature_key character varying(64) NOT NULL,
    feature_display_name character varying(255) CONSTRAINT store_access_grant_feature_snapsh_feature_display_name_not_null NOT NULL,
    CONSTRAINT store_access_grant_feature_snapshots_key_format CHECK (((feature_key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text))
);


--
-- Name: store_access_grant_module_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_access_grant_module_snapshots (
    grant_id uuid NOT NULL,
    module_id uuid NOT NULL,
    module_revision_id uuid NOT NULL,
    module_key character varying(64) NOT NULL,
    module_display_name character varying(255) CONSTRAINT store_access_grant_module_snapshot_module_display_name_not_null NOT NULL,
    CONSTRAINT store_access_grant_module_snapshots_key_format CHECK (((module_key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text))
);


--
-- Name: store_access_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_access_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    origin character varying(32) NOT NULL,
    term_kind character varying(32) NOT NULL,
    selection_kind character varying(32) NOT NULL,
    plan_id uuid,
    plan_revision_id uuid,
    plan_key character varying(64),
    plan_display_name character varying(255),
    plan_type character varying(32),
    term_count integer NOT NULL,
    term_unit character varying(16) NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_by_owner_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_access_grants_key_format CHECK (((plan_key IS NULL) OR ((plan_key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text))),
    CONSTRAINT store_access_grants_origin CHECK (((origin)::text = ANY ((ARRAY['legacy_migration'::character varying, 'administrator'::character varying])::text[]))),
    CONSTRAINT store_access_grants_origin_shape CHECK (((((origin)::text = 'legacy_migration'::text) AND (created_by_owner_user_id IS NULL) AND ((selection_kind)::text = 'all_current_modules'::text) AND ((term_kind)::text = 'complimentary'::text) AND (plan_id IS NULL) AND (plan_revision_id IS NULL) AND (plan_key IS NULL)) OR (((origin)::text = 'administrator'::text) AND (created_by_owner_user_id IS NOT NULL) AND ((selection_kind)::text = ANY ((ARRAY['plan'::character varying, 'module'::character varying])::text[]))))),
    CONSTRAINT store_access_grants_plan_type CHECK (((plan_type IS NULL) OR ((plan_type)::text = ANY ((ARRAY['trial'::character varying, 'paid'::character varying])::text[])))),
    CONSTRAINT store_access_grants_selection_kind CHECK (((selection_kind)::text = ANY ((ARRAY['plan'::character varying, 'module'::character varying, 'all_current_modules'::character varying])::text[]))),
    CONSTRAINT store_access_grants_term CHECK (((term_count >= 1) AND ((term_unit)::text = ANY ((ARRAY['day'::character varying, 'month'::character varying, 'year'::character varying])::text[])) AND (ends_at > starts_at))),
    CONSTRAINT store_access_grants_term_kind CHECK (((term_kind)::text = ANY ((ARRAY['seven_day'::character varying, 'extended'::character varying, 'complimentary'::character varying, 'custom_range'::character varying])::text[])))
);


--
-- Name: store_add_on_offerings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_add_on_offerings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    add_on_id uuid NOT NULL,
    price_override numeric(10,2),
    discount_override numeric(10,2),
    status public.add_on_status_enum DEFAULT 'active'::public.add_on_status_enum NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_add_on_offerings_discount_override_check CHECK (((discount_override IS NULL) OR (discount_override >= (0)::numeric))),
    CONSTRAINT store_add_on_offerings_price_override_check CHECK (((price_override IS NULL) OR (price_override >= (0)::numeric)))
);


--
-- Name: store_billing_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_billing_settings (
    store_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    sale_number_reset_period public.sale_number_reset_period_enum DEFAULT 'never'::public.sale_number_reset_period_enum NOT NULL,
    sale_number_timezone character varying(64) DEFAULT 'Asia/Kolkata'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    token_number_enabled boolean DEFAULT false NOT NULL,
    token_number_reset_period public.token_number_reset_period_enum DEFAULT 'daily'::public.token_number_reset_period_enum NOT NULL,
    kot_number_reset_period public.sale_number_reset_period_enum DEFAULT 'daily'::public.sale_number_reset_period_enum NOT NULL,
    CONSTRAINT store_billing_settings_timezone_check CHECK ((length(TRIM(BOTH FROM sale_number_timezone)) > 0))
);


--
-- Name: store_category_presentations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_category_presentations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    category_id uuid NOT NULL,
    visible boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_category_presentations_sort_order_check CHECK ((sort_order >= 0))
);


--
-- Name: store_co_term_add_on_feature_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_co_term_add_on_feature_snapshots (
    add_on_id uuid NOT NULL,
    feature_id uuid NOT NULL,
    feature_revision_id uuid CONSTRAINT store_co_term_add_on_feature_snaps_feature_revision_id_not_null NOT NULL,
    feature_key character varying(64) NOT NULL,
    feature_display_name character varying(255) CONSTRAINT store_co_term_add_on_feature_snap_feature_display_name_not_null NOT NULL,
    CONSTRAINT store_co_term_add_on_feature_snapshots_key_format CHECK (((feature_key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text))
);


--
-- Name: store_co_term_add_ons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_co_term_add_ons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    base_store_license_id uuid NOT NULL,
    module_id uuid NOT NULL,
    module_revision_id uuid NOT NULL,
    module_key character varying(64) NOT NULL,
    module_display_name character varying(255) NOT NULL,
    price_inr numeric(10,2) NOT NULL,
    charged_amount_inr numeric(10,2) NOT NULL,
    term_count integer NOT NULL,
    term_unit character varying(16) NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    commercial_quote_id uuid NOT NULL,
    revoked_at timestamp with time zone,
    created_by_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_co_term_add_ons_amounts CHECK (((price_inr >= (0)::numeric) AND (charged_amount_inr >= (0)::numeric) AND (charged_amount_inr <= price_inr))),
    CONSTRAINT store_co_term_add_ons_module_key_format CHECK (((module_key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text)),
    CONSTRAINT store_co_term_add_ons_term CHECK (((term_count >= 1) AND ((term_unit)::text = ANY ((ARRAY['day'::character varying, 'month'::character varying, 'year'::character varying])::text[])) AND (ends_at > starts_at)))
);


--
-- Name: store_device_pos_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_device_pos_settings (
    device_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    direct_barcode_scan_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
-- Name: store_invoice_appearance_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_invoice_appearance_settings (
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    uses_organization_default boolean DEFAULT true CONSTRAINT store_invoice_appearance_set_uses_organization_default_not_null NOT NULL,
    published_settings jsonb,
    draft_settings jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: store_kot_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_kot_sequences (
    store_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    period_key character varying(32) NOT NULL,
    next_sequence_number bigint DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_kot_sequences_next_number_check CHECK ((next_sequence_number > 0)),
    CONSTRAINT store_kot_sequences_period_key_check CHECK ((length(TRIM(BOTH FROM period_key)) > 0))
);


--
-- Name: store_license_feature_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_license_feature_snapshots (
    license_id uuid NOT NULL,
    module_id uuid NOT NULL,
    feature_id uuid NOT NULL,
    feature_revision_id uuid NOT NULL,
    feature_key character varying(64) NOT NULL,
    feature_display_name character varying(255) NOT NULL,
    CONSTRAINT store_license_feature_snapshots_key_format CHECK (((feature_key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text))
);


--
-- Name: store_license_module_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_license_module_snapshots (
    license_id uuid NOT NULL,
    module_id uuid NOT NULL,
    module_revision_id uuid NOT NULL,
    module_key character varying(64) NOT NULL,
    module_display_name character varying(255) NOT NULL,
    CONSTRAINT store_license_module_snapshots_key_format CHECK (((module_key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text))
);


--
-- Name: store_licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_licenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    source_kind character varying(32) NOT NULL,
    plan_id uuid NOT NULL,
    plan_revision_id uuid NOT NULL,
    plan_key character varying(64) NOT NULL,
    plan_display_name character varying(255) NOT NULL,
    plan_type character varying(32) NOT NULL,
    price_inr numeric(10,2) NOT NULL,
    term_count integer NOT NULL,
    term_unit character varying(16) NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_by_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    commercial_quote_id uuid,
    CONSTRAINT store_licenses_key_format CHECK (((plan_key)::text ~ '^[a-z][a-z0-9_]{0,63}$'::text)),
    CONSTRAINT store_licenses_plan_type CHECK (((plan_type)::text = ANY ((ARRAY['trial'::character varying, 'paid'::character varying])::text[]))),
    CONSTRAINT store_licenses_source_kind CHECK (((source_kind)::text = ANY ((ARRAY['trial'::character varying, 'paid'::character varying])::text[]))),
    CONSTRAINT store_licenses_term CHECK (((term_count >= 1) AND ((term_unit)::text = ANY ((ARRAY['day'::character varying, 'month'::character varying, 'year'::character varying])::text[])) AND (ends_at > starts_at)))
);


--
-- Name: store_money_account_payment_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_money_account_payment_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    payment_method public.money_account_payment_route_method_enum NOT NULL,
    money_account_id uuid NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: store_product_offerings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_product_offerings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    product_id uuid NOT NULL,
    status public.product_status_enum DEFAULT 'active'::public.product_status_enum NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    price_override numeric(10,2),
    discount_override numeric(10,2),
    CONSTRAINT store_product_offerings_discount_override_check CHECK (((discount_override IS NULL) OR (discount_override >= (0)::numeric))),
    CONSTRAINT store_product_offerings_price_override_check CHECK (((price_override IS NULL) OR (price_override >= (0)::numeric)))
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
-- Name: store_vendor_availabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_vendor_availabilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    CONSTRAINT store_vendor_availabilities_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: store_vendor_item_offerings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_vendor_item_offerings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    vendor_item_id uuid NOT NULL,
    default_purchase_price numeric(10,2) NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_vendor_item_offerings_price_non_negative CHECK ((default_purchase_price >= (0)::numeric))
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    review_platform character varying(100),
    review_link character varying(2048),
    social_media_name character varying(100),
    social_media_link character varying(2048),
    whatsapp_links jsonb DEFAULT '[]'::jsonb NOT NULL,
    whatsapp_message_templates jsonb DEFAULT '{}'::jsonb NOT NULL,
    kot_system_enabled boolean DEFAULT false NOT NULL,
    table_management_enabled boolean DEFAULT false NOT NULL,
    money_account_tracking_enabled boolean DEFAULT false NOT NULL,
    CONSTRAINT stores_review_destination_check CHECK ((((review_platform IS NULL) AND (review_link IS NULL)) OR ((review_platform IS NOT NULL) AND (review_link IS NOT NULL) AND (length(btrim((review_platform)::text)) > 0) AND (length(btrim((review_link)::text)) > 0)))),
    CONSTRAINT stores_social_destination_check CHECK ((((social_media_name IS NULL) AND (social_media_link IS NULL)) OR ((social_media_name IS NOT NULL) AND (social_media_link IS NOT NULL) AND (length(btrim((social_media_name)::text)) > 0) AND (length(btrim((social_media_link)::text)) > 0)))),
    CONSTRAINT stores_whatsapp_links_array_check CHECK ((jsonb_typeof(whatsapp_links) = 'array'::text)),
    CONSTRAINT stores_whatsapp_message_templates_object_check CHECK ((jsonb_typeof(whatsapp_message_templates) = 'object'::text))
);


--
-- Name: table_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.table_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    service_table_id uuid NOT NULL,
    customer_id uuid,
    sale_id uuid,
    status public.table_order_status_enum DEFAULT 'active'::public.table_order_status_enum NOT NULL,
    notes text,
    created_by_device_id uuid,
    updated_by_device_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT table_orders_active_sale_check CHECK ((((status = 'active'::public.table_order_status_enum) AND (sale_id IS NULL)) OR ((status = 'checked_out'::public.table_order_status_enum) AND (sale_id IS NOT NULL)) OR ((status = 'discarded'::public.table_order_status_enum) AND (sale_id IS NULL))))
);


--
-- Name: units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    label character varying(32) NOT NULL,
    kind public.unit_kind_enum NOT NULL,
    predefined_key character varying(64),
    status public.unit_status_enum DEFAULT 'active'::public.unit_status_enum NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT units_predefined_key_kind_check CHECK ((((kind = 'predefined'::public.unit_kind_enum) AND (predefined_key IS NOT NULL)) OR ((kind = 'custom'::public.unit_kind_enum) AND (predefined_key IS NULL))))
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_phone_e164_check CHECK (((phone)::text ~ '^[+][1-9][0-9]{7,14}$'::text))
);


--
-- Name: vendor_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    unit_id uuid NOT NULL,
    default_purchase_price numeric(10,2) NOT NULL,
    status public.vendor_item_status_enum DEFAULT 'active'::public.vendor_item_status_enum NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_items_price_non_negative CHECK ((default_purchase_price >= (0)::numeric))
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(1000),
    status public.vendor_status_enum DEFAULT 'active'::public.vendor_status_enum NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: whatsapp_account_stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_account_stores (
    organization_id uuid NOT NULL,
    whatsapp_account_id uuid NOT NULL,
    store_id uuid NOT NULL,
    is_default_for_inbound boolean DEFAULT false NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: whatsapp_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid,
    provider public.whatsapp_provider_enum DEFAULT 'baileys'::public.whatsapp_provider_enum NOT NULL,
    phone_number character varying(20) NOT NULL,
    phone_number_normalized character varying(20) NOT NULL,
    status public.whatsapp_account_status_enum DEFAULT 'pending_qr'::public.whatsapp_account_status_enum NOT NULL,
    session_reference character varying(255),
    last_connected_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    last_error_code character varying(100),
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    whatsapp_business_account_id uuid,
    cloud_phone_number_id character varying(64),
    cloud_verified_name character varying(255),
    cloud_quality_rating character varying(32),
    cloud_messaging_limit integer,
    cloud_limit_synced_at timestamp with time zone,
    cloud_status public.whatsapp_cloud_account_status_enum,
    cloud_last_error_code character varying(100),
    cloud_last_error_message text,
    cloud_last_webhook_at timestamp with time zone,
    cloud_last_graph_api_at timestamp with time zone,
    CONSTRAINT whatsapp_accounts_cloud_fields_provider_check CHECK ((((cloud_status IS NULL) AND (cloud_phone_number_id IS NULL) AND (whatsapp_business_account_id IS NULL)) OR (provider = 'cloud_api'::public.whatsapp_provider_enum))),
    CONSTRAINT whatsapp_accounts_cloud_identity_pair_check CHECK ((((cloud_phone_number_id IS NULL) AND (whatsapp_business_account_id IS NULL) AND (cloud_status = ANY (ARRAY['pending_authorization'::public.whatsapp_cloud_account_status_enum, 'provisioning'::public.whatsapp_cloud_account_status_enum, 'failed'::public.whatsapp_cloud_account_status_enum]))) OR ((cloud_phone_number_id IS NOT NULL) AND (whatsapp_business_account_id IS NOT NULL) AND (cloud_status IS NOT NULL)) OR ((provider <> 'cloud_api'::public.whatsapp_provider_enum) AND (cloud_phone_number_id IS NULL) AND (whatsapp_business_account_id IS NULL) AND (cloud_status IS NULL)))),
    CONSTRAINT whatsapp_accounts_cloud_messaging_limit_check CHECK (((cloud_messaging_limit IS NULL) OR (cloud_messaging_limit >= 0))),
    CONSTRAINT whatsapp_accounts_cloud_phone_number_id_check CHECK (((cloud_phone_number_id IS NULL) OR ((length(btrim((cloud_phone_number_id)::text)) >= 1) AND (length(btrim((cloud_phone_number_id)::text)) <= 64)))),
    CONSTRAINT whatsapp_accounts_phone_number_normalized_check CHECK (((phone_number_normalized)::text ~ '^[+][1-9][0-9]{7,14}$'::text))
);


--
-- Name: COLUMN whatsapp_accounts.store_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_accounts.store_id IS 'Default Store for inbound routing. Store assignments are stored in whatsapp_account_stores.';


--
-- Name: whatsapp_business_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_business_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    waba_id character varying(64),
    display_name character varying(255),
    credential_reference character varying(255),
    credential_key_version character varying(64),
    status public.whatsapp_cloud_account_status_enum DEFAULT 'pending_authorization'::public.whatsapp_cloud_account_status_enum NOT NULL,
    last_error_code character varying(100),
    last_error_message text,
    last_webhook_at timestamp with time zone,
    last_graph_api_at timestamp with time zone,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_business_accounts_credential_binding_check CHECK ((((credential_reference IS NULL) AND (credential_key_version IS NULL)) OR ((credential_reference IS NOT NULL) AND (credential_key_version IS NOT NULL)))),
    CONSTRAINT whatsapp_business_accounts_credential_reference_check CHECK (((credential_reference IS NULL) OR ((length(btrim((credential_reference)::text)) >= 1) AND (length(btrim((credential_reference)::text)) <= 255)))),
    CONSTRAINT whatsapp_business_accounts_identity_status_check CHECK (((status = ANY (ARRAY['pending_authorization'::public.whatsapp_cloud_account_status_enum, 'provisioning'::public.whatsapp_cloud_account_status_enum, 'failed'::public.whatsapp_cloud_account_status_enum])) OR ((waba_id IS NOT NULL) AND (credential_reference IS NOT NULL) AND (credential_key_version IS NOT NULL)))),
    CONSTRAINT whatsapp_business_accounts_waba_id_check CHECK (((waba_id IS NULL) OR ((length(btrim((waba_id)::text)) >= 1) AND (length(btrim((waba_id)::text)) <= 64))))
);


--
-- Name: whatsapp_campaign_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_campaign_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    phone_number character varying(20) NOT NULL,
    message_id uuid,
    outbox_id uuid,
    status public.whatsapp_outbox_status_enum DEFAULT 'pending'::public.whatsapp_outbox_status_enum NOT NULL,
    provider_message_id character varying(255),
    failure_code character varying(100),
    failure_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_campaign_recipients_phone_check CHECK (((phone_number)::text ~ '^[+][1-9][0-9]{7,14}$'::text))
);


--
-- Name: whatsapp_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    whatsapp_account_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    image_storage_key text,
    image_file_name character varying(255),
    image_mime_type character varying(255),
    status public.whatsapp_campaign_status_enum DEFAULT 'draft'::public.whatsapp_campaign_status_enum NOT NULL,
    total_recipients integer DEFAULT 0 NOT NULL,
    sent_recipients integer DEFAULT 0 NOT NULL,
    failed_recipients integer DEFAULT 0 NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_campaigns_body_check CHECK ((length(btrim(body)) > 0)),
    CONSTRAINT whatsapp_campaigns_failed_check CHECK ((failed_recipients >= 0)),
    CONSTRAINT whatsapp_campaigns_sent_check CHECK ((sent_recipients >= 0)),
    CONSTRAINT whatsapp_campaigns_title_check CHECK ((length(btrim((title)::text)) > 0)),
    CONSTRAINT whatsapp_campaigns_total_check CHECK ((total_recipients >= 0))
);


--
-- Name: whatsapp_cloud_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_cloud_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    owner_key character varying(255) NOT NULL,
    encrypted_token text NOT NULL,
    key_version character varying(64) NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_cloud_credentials_encrypted_token_check CHECK ((length(btrim(encrypted_token)) > 0)),
    CONSTRAINT whatsapp_cloud_credentials_key_version_check CHECK (((length(btrim((key_version)::text)) >= 1) AND (length(btrim((key_version)::text)) <= 64))),
    CONSTRAINT whatsapp_cloud_credentials_owner_key_check CHECK (((length(btrim((owner_key)::text)) >= 1) AND (length(btrim((owner_key)::text)) <= 255)))
);


--
-- Name: whatsapp_cloud_onboarding_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_cloud_onboarding_states (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    nonce_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_cloud_onboarding_states_consumed_at_check CHECK (((consumed_at IS NULL) OR (consumed_at >= created_at))),
    CONSTRAINT whatsapp_cloud_onboarding_states_expiry_check CHECK ((expires_at > created_at)),
    CONSTRAINT whatsapp_cloud_onboarding_states_nonce_hash_check CHECK (((nonce_hash)::text ~ '^[0-9a-f]{64}$'::text))
);


--
-- Name: whatsapp_cloud_operator_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_cloud_operator_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    actor_user_id uuid,
    outbox_id uuid NOT NULL,
    action character varying(32) NOT NULL,
    previous_status public.whatsapp_outbox_status_enum NOT NULL,
    next_status public.whatsapp_outbox_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_cloud_operator_action_name_check CHECK (((action)::text = ANY ((ARRAY['retry'::character varying, 'dead_letter'::character varying])::text[])))
);


--
-- Name: whatsapp_cloud_provisioning_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_cloud_provisioning_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    whatsapp_account_id uuid,
    whatsapp_business_account_id uuid,
    idempotency_key character varying(255) NOT NULL,
    status public.whatsapp_cloud_provisioning_status_enum DEFAULT 'running'::public.whatsapp_cloud_provisioning_status_enum NOT NULL,
    current_step public.whatsapp_cloud_provisioning_step_enum DEFAULT 'authorization_received'::public.whatsapp_cloud_provisioning_step_enum NOT NULL,
    completed_steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    provider_code character varying(100),
    safe_error_code character varying(100),
    safe_error_message text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_waba_id character varying(64),
    provider_phone_number_id character varying(64),
    credential_reference character varying(255),
    credential_key_version character varying(64),
    CONSTRAINT whatsapp_cloud_provisioning_attempts_completed_steps_check CHECK ((jsonb_typeof(completed_steps) = 'array'::text)),
    CONSTRAINT whatsapp_cloud_provisioning_attempts_idempotency_key_check CHECK (((length(btrim((idempotency_key)::text)) >= 1) AND (length(btrim((idempotency_key)::text)) <= 255))),
    CONSTRAINT whatsapp_cloud_provisioning_credential_pair_check CHECK (((credential_reference IS NULL) = (credential_key_version IS NULL))),
    CONSTRAINT whatsapp_cloud_provisioning_credential_reference_check CHECK (((credential_reference IS NULL) OR ((length(btrim((credential_reference)::text)) >= 1) AND (length(btrim((credential_reference)::text)) <= 255)))),
    CONSTRAINT whatsapp_cloud_provisioning_credential_version_check CHECK (((credential_key_version IS NULL) OR ((length(btrim((credential_key_version)::text)) >= 1) AND (length(btrim((credential_key_version)::text)) <= 64)))),
    CONSTRAINT whatsapp_cloud_provisioning_provider_phone_id_check CHECK (((provider_phone_number_id IS NULL) OR ((length(btrim((provider_phone_number_id)::text)) >= 1) AND (length(btrim((provider_phone_number_id)::text)) <= 64)))),
    CONSTRAINT whatsapp_cloud_provisioning_provider_waba_id_check CHECK (((provider_waba_id IS NULL) OR ((length(btrim((provider_waba_id)::text)) >= 1) AND (length(btrim((provider_waba_id)::text)) <= 64))))
);


--
-- Name: whatsapp_cloud_quota_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_cloud_quota_policies (
    organization_id uuid NOT NULL,
    monthly_message_limit bigint,
    monthly_budget_minor bigint,
    currency_code character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    account_send_interval_seconds integer DEFAULT 0 CONSTRAINT whatsapp_cloud_quota_polici_account_send_interval_seco_not_null NOT NULL,
    recipient_window_seconds integer DEFAULT 86400 NOT NULL,
    recipient_window_limit integer,
    customer_cooldown_seconds integer DEFAULT 0 CONSTRAINT whatsapp_cloud_quota_policie_customer_cooldown_seconds_not_null NOT NULL,
    CONSTRAINT whatsapp_cloud_quota_budget_check CHECK (((monthly_budget_minor IS NULL) OR (monthly_budget_minor >= 0))),
    CONSTRAINT whatsapp_cloud_quota_currency_check CHECK (((currency_code)::text ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT whatsapp_cloud_quota_customer_cooldown_check CHECK (((customer_cooldown_seconds >= 0) AND (customer_cooldown_seconds <= 2592000))),
    CONSTRAINT whatsapp_cloud_quota_message_limit_check CHECK (((monthly_message_limit IS NULL) OR (monthly_message_limit >= 0))),
    CONSTRAINT whatsapp_cloud_quota_send_interval_check CHECK (((account_send_interval_seconds >= 0) AND (account_send_interval_seconds <= 86400))),
    CONSTRAINT whatsapp_cloud_quota_window_limit_check CHECK (((recipient_window_limit IS NULL) OR (recipient_window_limit > 0))),
    CONSTRAINT whatsapp_cloud_quota_window_seconds_check CHECK (((recipient_window_seconds >= 60) AND (recipient_window_seconds <= 2592000)))
);


--
-- Name: whatsapp_cloud_quota_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_cloud_quota_reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    whatsapp_account_id uuid NOT NULL,
    store_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    period_start timestamp with time zone NOT NULL,
    units integer DEFAULT 1 NOT NULL,
    estimated_cost_minor bigint DEFAULT 0 NOT NULL,
    status public.whatsapp_cloud_quota_reservation_status_enum DEFAULT 'reserved'::public.whatsapp_cloud_quota_reservation_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    settled_at timestamp with time zone,
    released_at timestamp with time zone,
    campaign_key character varying(255),
    CONSTRAINT whatsapp_cloud_quota_campaign_key_check CHECK (((campaign_key IS NULL) OR ((length(btrim((campaign_key)::text)) >= 1) AND (length(btrim((campaign_key)::text)) <= 255)))),
    CONSTRAINT whatsapp_cloud_quota_reservation_cost_check CHECK ((estimated_cost_minor >= 0)),
    CONSTRAINT whatsapp_cloud_quota_reservation_units_check CHECK ((units > 0))
);


--
-- Name: whatsapp_cloud_template_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_cloud_template_audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    whatsapp_business_account_id uuid CONSTRAINT whatsapp_cloud_template_aud_whatsapp_business_account__not_null NOT NULL,
    store_id uuid,
    binding_id uuid,
    submission_id uuid,
    event_type character varying(64) NOT NULL,
    actor_id uuid,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_cloud_template_audit_events_details_check CHECK ((jsonb_typeof(details) = 'object'::text))
);


--
-- Name: whatsapp_cloud_template_bindings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_cloud_template_bindings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    local_template_id uuid NOT NULL,
    cloud_template_id uuid NOT NULL,
    whatsapp_business_account_id uuid CONSTRAINT whatsapp_cloud_template_bin_whatsapp_business_account__not_null NOT NULL,
    kind public.whatsapp_message_template_kind_enum NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    local_template_body text,
    variable_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    language_code character varying(64) DEFAULT 'en_US'::character varying NOT NULL,
    archived_at timestamp with time zone,
    archived_by uuid,
    CONSTRAINT whatsapp_cloud_template_bindings_language_check CHECK (((length(btrim((language_code)::text)) >= 1) AND (length(btrim((language_code)::text)) <= 64))),
    CONSTRAINT whatsapp_cloud_template_bindings_variable_mapping_check CHECK ((jsonb_typeof(variable_mapping) = 'object'::text))
);


--
-- Name: whatsapp_cloud_template_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_cloud_template_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    whatsapp_business_account_id uuid CONSTRAINT whatsapp_cloud_template_sub_whatsapp_business_account__not_null NOT NULL,
    originating_store_id uuid,
    local_template_id uuid,
    kind public.whatsapp_message_template_kind_enum NOT NULL,
    friendly_name character varying(120) NOT NULL,
    meta_template_name character varying(512) NOT NULL,
    language_code character varying(64) NOT NULL,
    category public.whatsapp_cloud_template_category_enum NOT NULL,
    requested_components jsonb DEFAULT '[]'::jsonb CONSTRAINT whatsapp_cloud_template_submissio_requested_components_not_null NOT NULL,
    sample_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    meta_template_id character varying(255),
    status public.whatsapp_cloud_template_submission_status_enum DEFAULT 'draft'::public.whatsapp_cloud_template_submission_status_enum NOT NULL,
    rejection_reason character varying(1000),
    last_error_code character varying(100),
    last_error_message character varying(1000),
    submitted_at timestamp with time zone,
    provider_updated_at timestamp with time zone,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_cloud_template_submissions_components_check CHECK ((jsonb_typeof(requested_components) = 'array'::text)),
    CONSTRAINT whatsapp_cloud_template_submissions_samples_check CHECK ((jsonb_typeof(sample_values) = 'object'::text))
);


--
-- Name: whatsapp_cloud_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_cloud_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    whatsapp_business_account_id uuid NOT NULL,
    meta_template_id character varying(255) NOT NULL,
    name character varying(512) NOT NULL,
    language_code character varying(64) NOT NULL,
    category public.whatsapp_cloud_template_category_enum DEFAULT 'unknown'::public.whatsapp_cloud_template_category_enum NOT NULL,
    status public.whatsapp_cloud_template_status_enum DEFAULT 'unknown'::public.whatsapp_cloud_template_status_enum NOT NULL,
    components jsonb DEFAULT '[]'::jsonb NOT NULL,
    rejection_reason character varying(1000),
    provider_updated_at timestamp with time zone,
    last_synced_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_cloud_templates_components_check CHECK ((jsonb_typeof(components) = 'array'::text)),
    CONSTRAINT whatsapp_cloud_templates_version_check CHECK ((version >= 1))
);


--
-- Name: whatsapp_cloud_usage_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_cloud_usage_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    reservation_id uuid NOT NULL,
    event_type public.whatsapp_cloud_quota_event_type_enum NOT NULL,
    period_start timestamp with time zone NOT NULL,
    units_delta integer NOT NULL,
    cost_minor_delta bigint NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_cloud_usage_ledger_delta_check CHECK (((units_delta <> 0) OR (cost_minor_delta <> 0) OR (event_type = 'settled'::public.whatsapp_cloud_quota_event_type_enum)))
);


--
-- Name: whatsapp_cloud_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_cloud_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_key character varying(64) NOT NULL,
    waba_id character varying(64),
    phone_number_id character varying(64),
    whatsapp_account_id uuid,
    payload jsonb NOT NULL,
    status public.whatsapp_cloud_webhook_event_status_enum DEFAULT 'pending'::public.whatsapp_cloud_webhook_event_status_enum NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    lease_owner character varying(255),
    lease_expires_at timestamp with time zone,
    last_error_code character varying(100),
    last_error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_cloud_webhook_events_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT whatsapp_cloud_webhook_events_event_key_check CHECK (((event_key)::text ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT whatsapp_cloud_webhook_events_payload_check CHECK ((jsonb_typeof(payload) = 'object'::text)),
    CONSTRAINT whatsapp_cloud_webhook_events_phone_number_id_check CHECK (((phone_number_id IS NULL) OR ((length(btrim((phone_number_id)::text)) >= 1) AND (length(btrim((phone_number_id)::text)) <= 64)))),
    CONSTRAINT whatsapp_cloud_webhook_events_waba_id_check CHECK (((waba_id IS NULL) OR ((length(btrim((waba_id)::text)) >= 1) AND (length(btrim((waba_id)::text)) <= 64))))
);


--
-- Name: whatsapp_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    whatsapp_account_id uuid NOT NULL,
    customer_id uuid,
    external_chat_id character varying(255) NOT NULL,
    contact_phone_number character varying(20) NOT NULL,
    display_name character varying(255) NOT NULL,
    last_message_at timestamp with time zone,
    unread_count integer DEFAULT 0 NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_conversations_contact_phone_check CHECK (((contact_phone_number)::text ~ '^[+][1-9][0-9]{7,14}$'::text)),
    CONSTRAINT whatsapp_conversations_unread_count_check CHECK ((unread_count >= 0))
);


--
-- Name: whatsapp_customer_consent_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_customer_consent_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    kind public.whatsapp_customer_consent_kind_enum NOT NULL,
    state public.whatsapp_customer_consent_state_enum NOT NULL,
    source public.whatsapp_customer_consent_source_enum NOT NULL,
    wording_version character varying(64),
    evidence_reference character varying(255),
    reason character varying(1000),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_customer_consent_events_evidence_reference_check CHECK (((evidence_reference IS NULL) OR ((length(btrim((evidence_reference)::text)) >= 1) AND (length(btrim((evidence_reference)::text)) <= 255)))),
    CONSTRAINT whatsapp_customer_consent_events_kind_state_check CHECK ((((kind = ANY (ARRAY['marketing'::public.whatsapp_customer_consent_kind_enum, 'utility'::public.whatsapp_customer_consent_kind_enum])) AND (state = ANY (ARRAY['opted_in'::public.whatsapp_customer_consent_state_enum, 'opted_out'::public.whatsapp_customer_consent_state_enum]))) OR ((kind = 'suppression'::public.whatsapp_customer_consent_kind_enum) AND (state = ANY (ARRAY['suppressed'::public.whatsapp_customer_consent_state_enum, 'cleared'::public.whatsapp_customer_consent_state_enum]))))),
    CONSTRAINT whatsapp_customer_consent_events_reason_check CHECK (((reason IS NULL) OR ((length(btrim((reason)::text)) >= 1) AND (length(btrim((reason)::text)) <= 1000)))),
    CONSTRAINT whatsapp_customer_consent_events_wording_version_check CHECK (((wording_version IS NULL) OR ((length(btrim((wording_version)::text)) >= 1) AND (length(btrim((wording_version)::text)) <= 64))))
);


--
-- Name: whatsapp_message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_message_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    kind public.whatsapp_message_template_kind_enum NOT NULL,
    name character varying(120) NOT NULL,
    body text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_message_templates_body_check CHECK ((length(btrim(body)) > 0)),
    CONSTRAINT whatsapp_message_templates_body_length_check CHECK ((length(body) <= 4096)),
    CONSTRAINT whatsapp_message_templates_name_check CHECK ((length(btrim((name)::text)) > 0))
);


--
-- Name: whatsapp_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    whatsapp_account_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    direction public.whatsapp_message_direction_enum NOT NULL,
    message_type public.whatsapp_message_type_enum NOT NULL,
    body text,
    caption text,
    attachment_storage_key text,
    attachment_file_name character varying(255),
    attachment_mime_type character varying(255),
    status public.whatsapp_message_status_enum DEFAULT 'queued'::public.whatsapp_message_status_enum NOT NULL,
    provider_message_id character varying(255),
    idempotency_key character varying(255) NOT NULL,
    failure_code character varying(100),
    failure_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    cloud_status_at timestamp with time zone,
    CONSTRAINT whatsapp_messages_content_check CHECK ((((message_type = 'text'::public.whatsapp_message_type_enum) AND (body IS NOT NULL) AND (length(btrim(body)) > 0)) OR ((message_type = 'document'::public.whatsapp_message_type_enum) AND (attachment_storage_key IS NOT NULL)) OR ((message_type = 'image'::public.whatsapp_message_type_enum) AND (attachment_storage_key IS NOT NULL)) OR ((message_type = 'template'::public.whatsapp_message_type_enum) AND (body IS NULL))))
);


--
-- Name: whatsapp_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    whatsapp_account_id uuid NOT NULL,
    message_id uuid NOT NULL,
    sale_id uuid,
    kind public.whatsapp_outbox_kind_enum NOT NULL,
    status public.whatsapp_outbox_status_enum DEFAULT 'pending'::public.whatsapp_outbox_status_enum NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    lease_owner character varying(255),
    lease_expires_at timestamp with time zone,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    last_error_code character varying(100),
    last_error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cloud_template_binding_id uuid,
    cloud_template_snapshot jsonb,
    cloud_quota_reservation_id uuid,
    CONSTRAINT whatsapp_outbox_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT whatsapp_outbox_cloud_template_snapshot_check CHECK (((cloud_template_snapshot IS NULL) OR (jsonb_typeof(cloud_template_snapshot) = 'object'::text)))
);


--
-- Name: whatsapp_provider_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_provider_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    whatsapp_account_id uuid NOT NULL,
    provider_event_id character varying(255) NOT NULL,
    payload jsonb NOT NULL,
    status public.whatsapp_provider_event_status_enum DEFAULT 'pending'::public.whatsapp_provider_event_status_enum NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    lease_owner character varying(255),
    lease_expires_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_provider_events_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT whatsapp_provider_events_payload_check CHECK ((jsonb_typeof(payload) = 'object'::text))
);


--
-- Name: whatsapp_public_invoice_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_public_invoice_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    sale_id uuid NOT NULL,
    token_hash character(64) NOT NULL,
    token_salt character varying(64) NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_public_invoice_links_token_hash_check CHECK ((token_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT whatsapp_public_invoice_links_token_salt_check CHECK (((length(btrim((token_salt)::text)) >= 16) AND (length(btrim((token_salt)::text)) <= 64)))
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
-- Name: catalog_commercial_operation_audits catalog_commercial_operation_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_commercial_operation_audits
    ADD CONSTRAINT catalog_commercial_operation_audits_pkey PRIMARY KEY (id);


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
-- Name: commercial_enforcement_launch commercial_enforcement_launch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_enforcement_launch
    ADD CONSTRAINT commercial_enforcement_launch_pkey PRIMARY KEY (id);


--
-- Name: commercial_feature_revisions commercial_feature_revisions_feature_revision_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_feature_revisions
    ADD CONSTRAINT commercial_feature_revisions_feature_revision_unique UNIQUE (feature_id, revision_number);


--
-- Name: commercial_feature_revisions commercial_feature_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_feature_revisions
    ADD CONSTRAINT commercial_feature_revisions_pkey PRIMARY KEY (id);


--
-- Name: commercial_features commercial_features_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_features
    ADD CONSTRAINT commercial_features_key_key UNIQUE (key);


--
-- Name: commercial_features commercial_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_features
    ADD CONSTRAINT commercial_features_pkey PRIMARY KEY (id);


--
-- Name: commercial_module_revision_features commercial_module_revision_features_one_feature; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_module_revision_features
    ADD CONSTRAINT commercial_module_revision_features_one_feature UNIQUE (module_revision_id, feature_id);


--
-- Name: commercial_module_revision_features commercial_module_revision_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_module_revision_features
    ADD CONSTRAINT commercial_module_revision_features_pkey PRIMARY KEY (module_revision_id, feature_revision_id);


--
-- Name: commercial_module_revisions commercial_module_revisions_module_revision_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_module_revisions
    ADD CONSTRAINT commercial_module_revisions_module_revision_unique UNIQUE (module_id, revision_number);


--
-- Name: commercial_module_revisions commercial_module_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_module_revisions
    ADD CONSTRAINT commercial_module_revisions_pkey PRIMARY KEY (id);


--
-- Name: commercial_modules commercial_modules_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_modules
    ADD CONSTRAINT commercial_modules_key_key UNIQUE (key);


--
-- Name: commercial_modules commercial_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_modules
    ADD CONSTRAINT commercial_modules_pkey PRIMARY KEY (id);


--
-- Name: commercial_payment_events commercial_payment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_payment_events
    ADD CONSTRAINT commercial_payment_events_pkey PRIMARY KEY (id);


--
-- Name: commercial_plan_revision_modules commercial_plan_revision_modules_one_module; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_plan_revision_modules
    ADD CONSTRAINT commercial_plan_revision_modules_one_module UNIQUE (plan_revision_id, module_id);


--
-- Name: commercial_plan_revision_modules commercial_plan_revision_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_plan_revision_modules
    ADD CONSTRAINT commercial_plan_revision_modules_pkey PRIMARY KEY (plan_revision_id, module_revision_id);


--
-- Name: commercial_plan_revisions commercial_plan_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_plan_revisions
    ADD CONSTRAINT commercial_plan_revisions_pkey PRIMARY KEY (id);


--
-- Name: commercial_plan_revisions commercial_plan_revisions_plan_revision_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_plan_revisions
    ADD CONSTRAINT commercial_plan_revisions_plan_revision_unique UNIQUE (plan_id, revision_number);


--
-- Name: commercial_plans commercial_plans_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_plans
    ADD CONSTRAINT commercial_plans_key_key UNIQUE (key);


--
-- Name: commercial_plans commercial_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_plans
    ADD CONSTRAINT commercial_plans_pkey PRIMARY KEY (id);


--
-- Name: commercial_quote_feature_snapshots commercial_quote_feature_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quote_feature_snapshots
    ADD CONSTRAINT commercial_quote_feature_snapshots_pkey PRIMARY KEY (quote_id, module_id, feature_id);


--
-- Name: commercial_quote_line_items commercial_quote_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quote_line_items
    ADD CONSTRAINT commercial_quote_line_items_pkey PRIMARY KEY (quote_id, "position");


--
-- Name: commercial_quote_module_snapshots commercial_quote_module_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quote_module_snapshots
    ADD CONSTRAINT commercial_quote_module_snapshots_pkey PRIMARY KEY (quote_id, module_id);


--
-- Name: commercial_quotes commercial_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quotes
    ADD CONSTRAINT commercial_quotes_pkey PRIMARY KEY (id);


--
-- Name: commercial_refunds commercial_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_refunds
    ADD CONSTRAINT commercial_refunds_pkey PRIMARY KEY (id);


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
-- Name: expense_categories expense_categories_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: google_contacts_connections google_contacts_connections_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_connections
    ADD CONSTRAINT google_contacts_connections_organization_id_key UNIQUE (organization_id);


--
-- Name: google_contacts_connections google_contacts_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_connections
    ADD CONSTRAINT google_contacts_connections_pkey PRIMARY KEY (id);


--
-- Name: google_contacts_credentials google_contacts_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_credentials
    ADD CONSTRAINT google_contacts_credentials_pkey PRIMARY KEY (id);


--
-- Name: google_contacts_customer_links google_contacts_customer_link_connection_id_google_resource_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_customer_links
    ADD CONSTRAINT google_contacts_customer_link_connection_id_google_resource_key UNIQUE (connection_id, google_resource_name);


--
-- Name: google_contacts_customer_links google_contacts_customer_links_connection_id_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_customer_links
    ADD CONSTRAINT google_contacts_customer_links_connection_id_customer_id_key UNIQUE (connection_id, customer_id);


--
-- Name: google_contacts_customer_links google_contacts_customer_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_customer_links
    ADD CONSTRAINT google_contacts_customer_links_pkey PRIMARY KEY (id);


--
-- Name: google_contacts_oauth_states google_contacts_oauth_states_nonce_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_oauth_states
    ADD CONSTRAINT google_contacts_oauth_states_nonce_hash_key UNIQUE (nonce_hash);


--
-- Name: google_contacts_oauth_states google_contacts_oauth_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_oauth_states
    ADD CONSTRAINT google_contacts_oauth_states_pkey PRIMARY KEY (id);


--
-- Name: google_contacts_sync_outbox google_contacts_sync_outbox_connection_id_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_sync_outbox
    ADD CONSTRAINT google_contacts_sync_outbox_connection_id_customer_id_key UNIQUE (connection_id, customer_id);


--
-- Name: google_contacts_sync_outbox google_contacts_sync_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_sync_outbox
    ADD CONSTRAINT google_contacts_sync_outbox_pkey PRIMARY KEY (id);


--
-- Name: internal_product_code_sequences internal_product_code_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_product_code_sequences
    ADD CONSTRAINT internal_product_code_sequences_pkey PRIMARY KEY (organization_id);


--
-- Name: kot_item_add_ons kot_item_add_ons_kot_item_id_add_on_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_add_ons
    ADD CONSTRAINT kot_item_add_ons_kot_item_id_add_on_id_key UNIQUE (kot_item_id, add_on_id);


--
-- Name: kot_item_add_ons kot_item_add_ons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_add_ons
    ADD CONSTRAINT kot_item_add_ons_pkey PRIMARY KEY (id);


--
-- Name: kot_item_bundle_component_add_ons kot_item_bundle_component_add_kot_item_bundle_component_id__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_component_add_ons
    ADD CONSTRAINT kot_item_bundle_component_add_kot_item_bundle_component_id__key UNIQUE (kot_item_bundle_component_id, add_on_id);


--
-- Name: kot_item_bundle_component_add_ons kot_item_bundle_component_add_ons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_component_add_ons
    ADD CONSTRAINT kot_item_bundle_component_add_ons_pkey PRIMARY KEY (id);


--
-- Name: kot_item_bundle_components kot_item_bundle_components_id_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_components
    ADD CONSTRAINT kot_item_bundle_components_id_scope_key UNIQUE (id, organization_id, store_id, kot_id, kot_item_id);


--
-- Name: kot_item_bundle_components kot_item_bundle_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_components
    ADD CONSTRAINT kot_item_bundle_components_pkey PRIMARY KEY (id);


--
-- Name: kot_items kot_items_id_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_items
    ADD CONSTRAINT kot_items_id_scope_key UNIQUE (id, organization_id, store_id, kot_id);


--
-- Name: kot_items kot_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_items
    ADD CONSTRAINT kot_items_pkey PRIMARY KEY (id);


--
-- Name: kots kots_id_organization_id_store_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kots
    ADD CONSTRAINT kots_id_organization_id_store_id_key UNIQUE (id, organization_id, store_id);


--
-- Name: kots kots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kots
    ADD CONSTRAINT kots_pkey PRIMARY KEY (id);


--
-- Name: label_templates label_templates_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.label_templates
    ADD CONSTRAINT label_templates_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: label_templates label_templates_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.label_templates
    ADD CONSTRAINT label_templates_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: label_templates label_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.label_templates
    ADD CONSTRAINT label_templates_pkey PRIMARY KEY (id);


--
-- Name: license_revocations license_revocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_revocations
    ADD CONSTRAINT license_revocations_pkey PRIMARY KEY (id);


--
-- Name: money_account_movements money_account_movements_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_account_movements
    ADD CONSTRAINT money_account_movements_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: money_account_movements money_account_movements_outgoing_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_account_movements
    ADD CONSTRAINT money_account_movements_outgoing_payment_id_key UNIQUE (outgoing_payment_id);


--
-- Name: money_account_movements money_account_movements_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_account_movements
    ADD CONSTRAINT money_account_movements_payment_id_key UNIQUE (payment_id);


--
-- Name: money_account_movements money_account_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_account_movements
    ADD CONSTRAINT money_account_movements_pkey PRIMARY KEY (id);


--
-- Name: money_account_movements money_account_movements_reversed_movement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_account_movements
    ADD CONSTRAINT money_account_movements_reversed_movement_id_key UNIQUE (reversed_movement_id);


--
-- Name: money_accounts money_accounts_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_accounts
    ADD CONSTRAINT money_accounts_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: money_accounts money_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_accounts
    ADD CONSTRAINT money_accounts_pkey PRIMARY KEY (id);


--
-- Name: organization_catalog_settings organization_catalog_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_catalog_settings
    ADD CONSTRAINT organization_catalog_settings_pkey PRIMARY KEY (organization_id);


--
-- Name: organization_invoice_appearance_settings organization_invoice_appearance_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invoice_appearance_settings
    ADD CONSTRAINT organization_invoice_appearance_settings_pkey PRIMARY KEY (organization_id);


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
-- Name: outgoing_payments outgoing_payments_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outgoing_payments
    ADD CONSTRAINT outgoing_payments_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: outgoing_payments outgoing_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outgoing_payments
    ADD CONSTRAINT outgoing_payments_pkey PRIMARY KEY (id);


--
-- Name: console_users owner_users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.console_users
    ADD CONSTRAINT owner_users_phone_key UNIQUE (phone);


--
-- Name: console_users owner_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.console_users
    ADD CONSTRAINT owner_users_pkey PRIMARY KEY (id);


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
-- Name: product_label_profiles product_label_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_label_profiles
    ADD CONSTRAINT product_label_profiles_pkey PRIMARY KEY (product_id);


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
-- Name: purchase_lines purchase_lines_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_lines
    ADD CONSTRAINT purchase_lines_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: purchase_lines purchase_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_lines
    ADD CONSTRAINT purchase_lines_pkey PRIMARY KEY (id);


--
-- Name: purchase_lines purchase_lines_purchase_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_lines
    ADD CONSTRAINT purchase_lines_purchase_id_position_key UNIQUE (purchase_id, "position");


--
-- Name: purchase_lines purchase_lines_unique_item_price_per_purchase; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_lines
    ADD CONSTRAINT purchase_lines_unique_item_price_per_purchase UNIQUE (purchase_id, vendor_item_id, agreed_unit_price);


--
-- Name: purchases purchases_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: released_internal_product_codes released_internal_product_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.released_internal_product_codes
    ADD CONSTRAINT released_internal_product_codes_pkey PRIMARY KEY (organization_id, product_code);


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
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: service_areas service_areas_id_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_areas
    ADD CONSTRAINT service_areas_id_scope_key UNIQUE (id, organization_id, store_id);


--
-- Name: service_areas service_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_areas
    ADD CONSTRAINT service_areas_pkey PRIMARY KEY (id);


--
-- Name: service_tables service_tables_id_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tables
    ADD CONSTRAINT service_tables_id_scope_key UNIQUE (id, organization_id, store_id);


--
-- Name: service_tables service_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tables
    ADD CONSTRAINT service_tables_pkey PRIMARY KEY (id);


--
-- Name: store_access_grant_feature_snapshots store_access_grant_feature_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_access_grant_feature_snapshots
    ADD CONSTRAINT store_access_grant_feature_snapshots_pkey PRIMARY KEY (grant_id, module_id, feature_id);


--
-- Name: store_access_grant_module_snapshots store_access_grant_module_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_access_grant_module_snapshots
    ADD CONSTRAINT store_access_grant_module_snapshots_pkey PRIMARY KEY (grant_id, module_id);


--
-- Name: store_access_grants store_access_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_access_grants
    ADD CONSTRAINT store_access_grants_pkey PRIMARY KEY (id);


--
-- Name: store_add_on_offerings store_add_on_offerings_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_add_on_offerings
    ADD CONSTRAINT store_add_on_offerings_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: store_add_on_offerings store_add_on_offerings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_add_on_offerings
    ADD CONSTRAINT store_add_on_offerings_pkey PRIMARY KEY (id);


--
-- Name: store_add_on_offerings store_add_on_offerings_store_id_add_on_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_add_on_offerings
    ADD CONSTRAINT store_add_on_offerings_store_id_add_on_id_key UNIQUE (store_id, add_on_id);


--
-- Name: store_billing_settings store_billing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_billing_settings
    ADD CONSTRAINT store_billing_settings_pkey PRIMARY KEY (store_id);


--
-- Name: store_category_presentations store_category_presentations_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_category_presentations
    ADD CONSTRAINT store_category_presentations_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: store_category_presentations store_category_presentations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_category_presentations
    ADD CONSTRAINT store_category_presentations_pkey PRIMARY KEY (id);


--
-- Name: store_category_presentations store_category_presentations_store_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_category_presentations
    ADD CONSTRAINT store_category_presentations_store_id_category_id_key UNIQUE (store_id, category_id);


--
-- Name: store_co_term_add_on_feature_snapshots store_co_term_add_on_feature_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_co_term_add_on_feature_snapshots
    ADD CONSTRAINT store_co_term_add_on_feature_snapshots_pkey PRIMARY KEY (add_on_id, feature_id);


--
-- Name: store_co_term_add_ons store_co_term_add_ons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_co_term_add_ons
    ADD CONSTRAINT store_co_term_add_ons_pkey PRIMARY KEY (id);


--
-- Name: store_device_pos_settings store_device_pos_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_device_pos_settings
    ADD CONSTRAINT store_device_pos_settings_pkey PRIMARY KEY (device_id);


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
-- Name: store_invoice_appearance_settings store_invoice_appearance_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_invoice_appearance_settings
    ADD CONSTRAINT store_invoice_appearance_settings_pkey PRIMARY KEY (organization_id, store_id);


--
-- Name: store_kot_sequences store_kot_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_kot_sequences
    ADD CONSTRAINT store_kot_sequences_pkey PRIMARY KEY (store_id, period_key);


--
-- Name: store_license_feature_snapshots store_license_feature_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_license_feature_snapshots
    ADD CONSTRAINT store_license_feature_snapshots_pkey PRIMARY KEY (license_id, module_id, feature_id);


--
-- Name: store_license_module_snapshots store_license_module_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_license_module_snapshots
    ADD CONSTRAINT store_license_module_snapshots_pkey PRIMARY KEY (license_id, module_id);


--
-- Name: store_licenses store_licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_licenses
    ADD CONSTRAINT store_licenses_pkey PRIMARY KEY (id);


--
-- Name: store_money_account_payment_routes store_money_account_payment_routes_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_money_account_payment_routes
    ADD CONSTRAINT store_money_account_payment_routes_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: store_money_account_payment_routes store_money_account_payment_routes_one_method_per_store; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_money_account_payment_routes
    ADD CONSTRAINT store_money_account_payment_routes_one_method_per_store UNIQUE (organization_id, store_id, payment_method);


--
-- Name: store_money_account_payment_routes store_money_account_payment_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_money_account_payment_routes
    ADD CONSTRAINT store_money_account_payment_routes_pkey PRIMARY KEY (id);


--
-- Name: store_product_offerings store_product_offerings_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_product_offerings
    ADD CONSTRAINT store_product_offerings_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: store_product_offerings store_product_offerings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_product_offerings
    ADD CONSTRAINT store_product_offerings_pkey PRIMARY KEY (id);


--
-- Name: store_product_offerings store_product_offerings_store_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_product_offerings
    ADD CONSTRAINT store_product_offerings_store_id_product_id_key UNIQUE (store_id, product_id);


--
-- Name: store_sale_sequences store_sale_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_sale_sequences
    ADD CONSTRAINT store_sale_sequences_pkey PRIMARY KEY (store_id, period_key);


--
-- Name: store_token_sequences store_token_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_token_sequences
    ADD CONSTRAINT store_token_sequences_pkey PRIMARY KEY (store_id, period_key);


--
-- Name: store_vendor_availabilities store_vendor_availabilities_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_availabilities
    ADD CONSTRAINT store_vendor_availabilities_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: store_vendor_availabilities store_vendor_availabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_availabilities
    ADD CONSTRAINT store_vendor_availabilities_pkey PRIMARY KEY (id);


--
-- Name: store_vendor_availabilities store_vendor_availabilities_store_id_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_availabilities
    ADD CONSTRAINT store_vendor_availabilities_store_id_vendor_id_key UNIQUE (store_id, vendor_id);


--
-- Name: store_vendor_item_offerings store_vendor_item_offerings_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_item_offerings
    ADD CONSTRAINT store_vendor_item_offerings_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: store_vendor_item_offerings store_vendor_item_offerings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_item_offerings
    ADD CONSTRAINT store_vendor_item_offerings_pkey PRIMARY KEY (id);


--
-- Name: store_vendor_item_offerings store_vendor_item_offerings_store_id_vendor_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_item_offerings
    ADD CONSTRAINT store_vendor_item_offerings_store_id_vendor_item_id_key UNIQUE (store_id, vendor_item_id);


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
-- Name: table_orders table_orders_id_organization_id_store_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_id_organization_id_store_id_key UNIQUE (id, organization_id, store_id);


--
-- Name: table_orders table_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_pkey PRIMARY KEY (id);


--
-- Name: units units_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


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
-- Name: vendor_items vendor_items_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_items
    ADD CONSTRAINT vendor_items_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: vendor_items vendor_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_items
    ADD CONSTRAINT vendor_items_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_account_stores whatsapp_account_stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_account_stores
    ADD CONSTRAINT whatsapp_account_stores_pkey PRIMARY KEY (whatsapp_account_id, store_id);


--
-- Name: whatsapp_account_stores whatsapp_account_stores_whatsapp_account_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_account_stores
    ADD CONSTRAINT whatsapp_account_stores_whatsapp_account_id_organization_id_key UNIQUE (whatsapp_account_id, organization_id, store_id);


--
-- Name: whatsapp_accounts whatsapp_accounts_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_accounts
    ADD CONSTRAINT whatsapp_accounts_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: whatsapp_accounts whatsapp_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_accounts
    ADD CONSTRAINT whatsapp_accounts_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_accounts whatsapp_accounts_provider_phone_number_normalized_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_accounts
    ADD CONSTRAINT whatsapp_accounts_provider_phone_number_normalized_key UNIQUE (provider, phone_number_normalized);


--
-- Name: whatsapp_business_accounts whatsapp_business_accounts_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_business_accounts
    ADD CONSTRAINT whatsapp_business_accounts_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: whatsapp_business_accounts whatsapp_business_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_business_accounts
    ADD CONSTRAINT whatsapp_business_accounts_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_campaign_recipients whatsapp_campaign_recipients_campaign_id_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaign_recipients
    ADD CONSTRAINT whatsapp_campaign_recipients_campaign_id_customer_id_key UNIQUE (campaign_id, customer_id);


--
-- Name: whatsapp_campaign_recipients whatsapp_campaign_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaign_recipients
    ADD CONSTRAINT whatsapp_campaign_recipients_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_campaigns whatsapp_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaigns
    ADD CONSTRAINT whatsapp_campaigns_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_cloud_credentials whatsapp_cloud_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_credentials
    ADD CONSTRAINT whatsapp_cloud_credentials_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_cloud_onboarding_states whatsapp_cloud_onboarding_states_nonce_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_onboarding_states
    ADD CONSTRAINT whatsapp_cloud_onboarding_states_nonce_hash_key UNIQUE (nonce_hash);


--
-- Name: whatsapp_cloud_onboarding_states whatsapp_cloud_onboarding_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_onboarding_states
    ADD CONSTRAINT whatsapp_cloud_onboarding_states_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_cloud_operator_actions whatsapp_cloud_operator_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_operator_actions
    ADD CONSTRAINT whatsapp_cloud_operator_actions_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_cloud_provisioning_attempts whatsapp_cloud_provisioning_a_organization_id_idempotency_k_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_provisioning_attempts
    ADD CONSTRAINT whatsapp_cloud_provisioning_a_organization_id_idempotency_k_key UNIQUE (organization_id, idempotency_key);


--
-- Name: whatsapp_cloud_provisioning_attempts whatsapp_cloud_provisioning_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_provisioning_attempts
    ADD CONSTRAINT whatsapp_cloud_provisioning_attempts_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_cloud_quota_policies whatsapp_cloud_quota_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_quota_policies
    ADD CONSTRAINT whatsapp_cloud_quota_policies_pkey PRIMARY KEY (organization_id);


--
-- Name: whatsapp_cloud_quota_reservations whatsapp_cloud_quota_reservat_organization_id_idempotency_k_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_quota_reservations
    ADD CONSTRAINT whatsapp_cloud_quota_reservat_organization_id_idempotency_k_key UNIQUE (organization_id, idempotency_key);


--
-- Name: whatsapp_cloud_quota_reservations whatsapp_cloud_quota_reservations_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_quota_reservations
    ADD CONSTRAINT whatsapp_cloud_quota_reservations_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: whatsapp_cloud_quota_reservations whatsapp_cloud_quota_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_quota_reservations
    ADD CONSTRAINT whatsapp_cloud_quota_reservations_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_cloud_template_audit_events whatsapp_cloud_template_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_audit_events
    ADD CONSTRAINT whatsapp_cloud_template_audit_events_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_cloud_template_bindings whatsapp_cloud_template_bindi_organization_id_store_id_loca_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_bindings
    ADD CONSTRAINT whatsapp_cloud_template_bindi_organization_id_store_id_loca_key UNIQUE (organization_id, store_id, local_template_id, cloud_template_id);


--
-- Name: whatsapp_cloud_template_bindings whatsapp_cloud_template_bindings_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_bindings
    ADD CONSTRAINT whatsapp_cloud_template_bindings_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: whatsapp_cloud_template_bindings whatsapp_cloud_template_bindings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_bindings
    ADD CONSTRAINT whatsapp_cloud_template_bindings_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_cloud_template_submissions whatsapp_cloud_template_submi_organization_id_whatsapp_busi_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_submissions
    ADD CONSTRAINT whatsapp_cloud_template_submi_organization_id_whatsapp_busi_key UNIQUE (organization_id, whatsapp_business_account_id, idempotency_key);


--
-- Name: whatsapp_cloud_template_submissions whatsapp_cloud_template_submissions_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_submissions
    ADD CONSTRAINT whatsapp_cloud_template_submissions_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: whatsapp_cloud_template_submissions whatsapp_cloud_template_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_submissions
    ADD CONSTRAINT whatsapp_cloud_template_submissions_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_cloud_templates whatsapp_cloud_templates_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_templates
    ADD CONSTRAINT whatsapp_cloud_templates_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: whatsapp_cloud_templates whatsapp_cloud_templates_id_waba_organization_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_templates
    ADD CONSTRAINT whatsapp_cloud_templates_id_waba_organization_key UNIQUE (id, whatsapp_business_account_id, organization_id);


--
-- Name: whatsapp_cloud_templates whatsapp_cloud_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_templates
    ADD CONSTRAINT whatsapp_cloud_templates_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_cloud_templates whatsapp_cloud_templates_whatsapp_business_account_id_meta__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_templates
    ADD CONSTRAINT whatsapp_cloud_templates_whatsapp_business_account_id_meta__key UNIQUE (whatsapp_business_account_id, meta_template_id);


--
-- Name: whatsapp_cloud_templates whatsapp_cloud_templates_whatsapp_business_account_id_name__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_templates
    ADD CONSTRAINT whatsapp_cloud_templates_whatsapp_business_account_id_name__key UNIQUE (whatsapp_business_account_id, name, language_code);


--
-- Name: whatsapp_cloud_usage_ledger whatsapp_cloud_usage_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_usage_ledger
    ADD CONSTRAINT whatsapp_cloud_usage_ledger_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_cloud_usage_ledger whatsapp_cloud_usage_ledger_reservation_id_event_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_usage_ledger
    ADD CONSTRAINT whatsapp_cloud_usage_ledger_reservation_id_event_type_key UNIQUE (reservation_id, event_type);


--
-- Name: whatsapp_cloud_webhook_events whatsapp_cloud_webhook_events_event_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_webhook_events
    ADD CONSTRAINT whatsapp_cloud_webhook_events_event_key_key UNIQUE (event_key);


--
-- Name: whatsapp_cloud_webhook_events whatsapp_cloud_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_webhook_events
    ADD CONSTRAINT whatsapp_cloud_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_conversations whatsapp_conversations_account_store_chat_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_account_store_chat_key UNIQUE (whatsapp_account_id, store_id, external_chat_id);


--
-- Name: whatsapp_conversations whatsapp_conversations_id_organization_id_store_id_whatsapp_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_id_organization_id_store_id_whatsapp_key UNIQUE (id, organization_id, store_id, whatsapp_account_id);


--
-- Name: whatsapp_conversations whatsapp_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_customer_consent_events whatsapp_customer_consent_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_customer_consent_events
    ADD CONSTRAINT whatsapp_customer_consent_events_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_message_templates whatsapp_message_templates_id_organization_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_message_templates
    ADD CONSTRAINT whatsapp_message_templates_id_organization_key UNIQUE (id, organization_id);


--
-- Name: whatsapp_message_templates whatsapp_message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_message_templates
    ADD CONSTRAINT whatsapp_message_templates_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_messages whatsapp_messages_id_organization_id_store_id_whatsapp_acco_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_id_organization_id_store_id_whatsapp_acco_key UNIQUE (id, organization_id, store_id, whatsapp_account_id);


--
-- Name: whatsapp_messages whatsapp_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_messages whatsapp_messages_whatsapp_account_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_whatsapp_account_id_idempotency_key_key UNIQUE (whatsapp_account_id, idempotency_key);


--
-- Name: whatsapp_outbox whatsapp_outbox_message_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_outbox
    ADD CONSTRAINT whatsapp_outbox_message_id_key UNIQUE (message_id);


--
-- Name: whatsapp_outbox whatsapp_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_outbox
    ADD CONSTRAINT whatsapp_outbox_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_provider_events whatsapp_provider_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_provider_events
    ADD CONSTRAINT whatsapp_provider_events_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_provider_events whatsapp_provider_events_whatsapp_account_id_provider_event_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_provider_events
    ADD CONSTRAINT whatsapp_provider_events_whatsapp_account_id_provider_event_key UNIQUE (whatsapp_account_id, provider_event_id);


--
-- Name: whatsapp_public_invoice_links whatsapp_public_invoice_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_public_invoice_links
    ADD CONSTRAINT whatsapp_public_invoice_links_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_public_invoice_links whatsapp_public_invoice_links_sale_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_public_invoice_links
    ADD CONSTRAINT whatsapp_public_invoice_links_sale_key UNIQUE (organization_id, store_id, sale_id);


--
-- Name: whatsapp_public_invoice_links whatsapp_public_invoice_links_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_public_invoice_links
    ADD CONSTRAINT whatsapp_public_invoice_links_token_hash_key UNIQUE (token_hash);


--
-- Name: commercial_feature_revisions_feature_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commercial_feature_revisions_feature_id_idx ON public.commercial_feature_revisions USING btree (feature_id, revision_number DESC);


--
-- Name: commercial_feature_revisions_one_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX commercial_feature_revisions_one_active ON public.commercial_feature_revisions USING btree (feature_id) WHERE (status = 'active'::public.commercial_catalog_revision_status);


--
-- Name: commercial_feature_revisions_one_draft; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX commercial_feature_revisions_one_draft ON public.commercial_feature_revisions USING btree (feature_id) WHERE (status = 'draft'::public.commercial_catalog_revision_status);


--
-- Name: commercial_module_revision_features_feature_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commercial_module_revision_features_feature_id_idx ON public.commercial_module_revision_features USING btree (feature_id);


--
-- Name: commercial_module_revision_features_feature_revision_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commercial_module_revision_features_feature_revision_idx ON public.commercial_module_revision_features USING btree (feature_revision_id);


--
-- Name: commercial_module_revisions_module_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commercial_module_revisions_module_id_idx ON public.commercial_module_revisions USING btree (module_id, revision_number DESC);


--
-- Name: commercial_module_revisions_one_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX commercial_module_revisions_one_active ON public.commercial_module_revisions USING btree (module_id) WHERE (status = 'active'::public.commercial_catalog_revision_status);


--
-- Name: commercial_module_revisions_one_draft; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX commercial_module_revisions_one_draft ON public.commercial_module_revisions USING btree (module_id) WHERE (status = 'draft'::public.commercial_catalog_revision_status);


--
-- Name: commercial_payment_events_quote_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commercial_payment_events_quote_idx ON public.commercial_payment_events USING btree (quote_id, created_at DESC);


--
-- Name: commercial_payment_events_razorpay_event_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX commercial_payment_events_razorpay_event_id_uidx ON public.commercial_payment_events USING btree (razorpay_event_id);


--
-- Name: commercial_plan_revision_modules_module_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commercial_plan_revision_modules_module_id_idx ON public.commercial_plan_revision_modules USING btree (module_id);


--
-- Name: commercial_plan_revision_modules_module_revision_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commercial_plan_revision_modules_module_revision_idx ON public.commercial_plan_revision_modules USING btree (module_revision_id);


--
-- Name: commercial_plan_revisions_one_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX commercial_plan_revisions_one_active ON public.commercial_plan_revisions USING btree (plan_id) WHERE (status = 'active'::public.commercial_catalog_revision_status);


--
-- Name: commercial_plan_revisions_one_draft; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX commercial_plan_revisions_one_draft ON public.commercial_plan_revisions USING btree (plan_id) WHERE (status = 'draft'::public.commercial_catalog_revision_status);


--
-- Name: commercial_plan_revisions_plan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commercial_plan_revisions_plan_id_idx ON public.commercial_plan_revisions USING btree (plan_id, revision_number DESC);


--
-- Name: commercial_quotes_razorpay_order_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX commercial_quotes_razorpay_order_id_uidx ON public.commercial_quotes USING btree (razorpay_order_id);


--
-- Name: commercial_quotes_store_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commercial_quotes_store_created_idx ON public.commercial_quotes USING btree (store_id, created_at DESC);


--
-- Name: commercial_refunds_payment_event_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX commercial_refunds_payment_event_uidx ON public.commercial_refunds USING btree (payment_event_id);


--
-- Name: commercial_refunds_razorpay_refund_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX commercial_refunds_razorpay_refund_id_uidx ON public.commercial_refunds USING btree (razorpay_refund_id);


--
-- Name: expense_categories_organization_normalized_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX expense_categories_organization_normalized_name_key ON public.expense_categories USING btree (organization_id, lower(btrim(regexp_replace((name)::text, '\s+'::text, ' '::text, 'g'::text))));


--
-- Name: expense_categories_organization_predefined_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX expense_categories_organization_predefined_key_key ON public.expense_categories USING btree (organization_id, predefined_key) WHERE (predefined_key IS NOT NULL);


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
-- Name: idx_catalog_commercial_operation_audits_organization_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_catalog_commercial_operation_audits_organization_created ON public.catalog_commercial_operation_audits USING btree (organization_id, created_at DESC);


--
-- Name: idx_categories_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_organization_id ON public.categories USING btree (organization_id);


--
-- Name: idx_categories_organization_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_organization_sort_order ON public.categories USING btree (organization_id, sort_order, id);


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
-- Name: idx_customers_organization_created_at_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_organization_created_at_id ON public.customers USING btree (organization_id, created_at DESC, id DESC);


--
-- Name: idx_customers_organization_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_organization_phone ON public.customers USING btree (organization_id, phone);


--
-- Name: idx_customers_whatsapp_marketing_eligibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_whatsapp_marketing_eligibility ON public.customers USING btree (organization_id, marketing_opted_in, whatsapp_suppressed, is_active) WHERE ((marketing_opted_in = true) AND (whatsapp_suppressed = false));


--
-- Name: idx_expense_categories_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_categories_organization_id ON public.expense_categories USING btree (organization_id);


--
-- Name: idx_expense_categories_organization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_categories_organization_status ON public.expense_categories USING btree (organization_id, status);


--
-- Name: idx_expenses_organization_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_organization_category ON public.expenses USING btree (organization_id, expense_category_id);


--
-- Name: idx_expenses_organization_effective_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_organization_effective_date ON public.expenses USING btree (organization_id, effective_date DESC);


--
-- Name: idx_expenses_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_organization_id ON public.expenses USING btree (organization_id);


--
-- Name: idx_expenses_organization_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_organization_lifecycle ON public.expenses USING btree (organization_id, lifecycle);


--
-- Name: idx_expenses_organization_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_organization_store ON public.expenses USING btree (organization_id, store_id);


--
-- Name: idx_google_contacts_credentials_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_google_contacts_credentials_active ON public.google_contacts_credentials USING btree (organization_id, updated_at DESC) WHERE (revoked_at IS NULL);


--
-- Name: idx_google_contacts_credentials_organization_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_google_contacts_credentials_organization_owner ON public.google_contacts_credentials USING btree (organization_id, owner_key, created_at DESC);


--
-- Name: idx_google_contacts_oauth_states_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_google_contacts_oauth_states_active ON public.google_contacts_oauth_states USING btree (organization_id, user_id, expires_at) WHERE (consumed_at IS NULL);


--
-- Name: idx_google_contacts_sync_outbox_claim; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_google_contacts_sync_outbox_claim ON public.google_contacts_sync_outbox USING btree (next_attempt_at, id) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying])::text[]));


--
-- Name: idx_google_contacts_sync_outbox_connection_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_google_contacts_sync_outbox_connection_status ON public.google_contacts_sync_outbox USING btree (connection_id, status);


--
-- Name: idx_kot_item_add_ons_kot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kot_item_add_ons_kot_id ON public.kot_item_add_ons USING btree (kot_id);


--
-- Name: idx_kot_item_add_ons_kot_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kot_item_add_ons_kot_item_id ON public.kot_item_add_ons USING btree (kot_item_id);


--
-- Name: idx_kot_item_bundle_component_add_ons_kot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kot_item_bundle_component_add_ons_kot_id ON public.kot_item_bundle_component_add_ons USING btree (kot_id);


--
-- Name: idx_kot_item_bundle_component_add_ons_kot_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kot_item_bundle_component_add_ons_kot_item_id ON public.kot_item_bundle_component_add_ons USING btree (kot_item_id);


--
-- Name: idx_kot_item_bundle_components_kot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kot_item_bundle_components_kot_id ON public.kot_item_bundle_components USING btree (kot_id);


--
-- Name: idx_kot_item_bundle_components_kot_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kot_item_bundle_components_kot_item_id ON public.kot_item_bundle_components USING btree (kot_item_id);


--
-- Name: idx_kot_items_kot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kot_items_kot_id ON public.kot_items USING btree (kot_id);


--
-- Name: idx_kots_pending_kitchen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kots_pending_kitchen ON public.kots USING btree (organization_id, store_id, created_at) WHERE (kitchen_completed_at IS NULL);


--
-- Name: idx_kots_table_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kots_table_order_id ON public.kots USING btree (table_order_id);


--
-- Name: idx_label_templates_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_label_templates_organization_id ON public.label_templates USING btree (organization_id);


--
-- Name: idx_label_templates_organization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_label_templates_organization_status ON public.label_templates USING btree (organization_id, status);


--
-- Name: idx_money_account_movements_account_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_money_account_movements_account_occurred_at ON public.money_account_movements USING btree (organization_id, money_account_id, occurred_at, id);


--
-- Name: idx_money_account_movements_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_money_account_movements_store ON public.money_account_movements USING btree (organization_id, store_id);


--
-- Name: idx_money_account_movements_transfer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_money_account_movements_transfer_id ON public.money_account_movements USING btree (organization_id, transfer_id) WHERE (transfer_id IS NOT NULL);


--
-- Name: idx_money_accounts_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_money_accounts_organization_id ON public.money_accounts USING btree (organization_id);


--
-- Name: idx_money_accounts_organization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_money_accounts_organization_status ON public.money_accounts USING btree (organization_id, status);


--
-- Name: idx_money_accounts_organization_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_money_accounts_organization_store ON public.money_accounts USING btree (organization_id, store_id);


--
-- Name: idx_money_accounts_organization_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_money_accounts_organization_type ON public.money_accounts USING btree (organization_id, type);


--
-- Name: idx_outgoing_payments_organization_expense; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outgoing_payments_organization_expense ON public.outgoing_payments USING btree (organization_id, expense_id);


--
-- Name: idx_outgoing_payments_organization_purchase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outgoing_payments_organization_purchase ON public.outgoing_payments USING btree (organization_id, purchase_id);


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
-- Name: idx_product_label_profiles_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_label_profiles_organization_id ON public.product_label_profiles USING btree (organization_id);


--
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);


--
-- Name: idx_products_organization_category_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_organization_category_sort_order ON public.products USING btree (organization_id, category_id, sort_order, id);


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
-- Name: idx_products_organization_unit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_organization_unit_id ON public.products USING btree (organization_id, unit_id);


--
-- Name: idx_purchase_lines_purchase_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_lines_purchase_id ON public.purchase_lines USING btree (purchase_id);


--
-- Name: idx_purchases_organization_effective_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_organization_effective_date ON public.purchases USING btree (organization_id, effective_date DESC);


--
-- Name: idx_purchases_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_organization_id ON public.purchases USING btree (organization_id);


--
-- Name: idx_purchases_organization_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_organization_lifecycle ON public.purchases USING btree (organization_id, lifecycle);


--
-- Name: idx_purchases_organization_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_organization_store ON public.purchases USING btree (organization_id, store_id);


--
-- Name: idx_purchases_organization_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_organization_vendor ON public.purchases USING btree (organization_id, vendor_id);


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
-- Name: idx_sales_service_table_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_service_table_id ON public.sales USING btree (organization_id, store_id, service_table_id) WHERE (service_table_id IS NOT NULL);


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
-- Name: idx_service_areas_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_areas_store ON public.service_areas USING btree (organization_id, store_id, created_at, id);


--
-- Name: idx_service_tables_service_area; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_tables_service_area ON public.service_tables USING btree (organization_id, store_id, service_area_id);


--
-- Name: idx_store_add_on_offerings_organization_add_on; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_add_on_offerings_organization_add_on ON public.store_add_on_offerings USING btree (organization_id, add_on_id);


--
-- Name: idx_store_add_on_offerings_organization_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_add_on_offerings_organization_store ON public.store_add_on_offerings USING btree (organization_id, store_id);


--
-- Name: idx_store_add_on_offerings_store_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_add_on_offerings_store_status ON public.store_add_on_offerings USING btree (store_id, status);


--
-- Name: idx_store_category_presentations_organization_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_category_presentations_organization_category ON public.store_category_presentations USING btree (organization_id, category_id);


--
-- Name: idx_store_category_presentations_organization_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_category_presentations_organization_store ON public.store_category_presentations USING btree (organization_id, store_id);


--
-- Name: idx_store_category_presentations_store_visible_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_category_presentations_store_visible_sort ON public.store_category_presentations USING btree (store_id, visible, sort_order, id);


--
-- Name: idx_store_devices_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_devices_store_id ON public.store_devices USING btree (store_id);


--
-- Name: idx_store_money_account_payment_routes_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_money_account_payment_routes_store ON public.store_money_account_payment_routes USING btree (organization_id, store_id);


--
-- Name: idx_store_product_offerings_organization_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_product_offerings_organization_product ON public.store_product_offerings USING btree (organization_id, product_id);


--
-- Name: idx_store_product_offerings_organization_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_product_offerings_organization_store ON public.store_product_offerings USING btree (organization_id, store_id);


--
-- Name: idx_store_product_offerings_store_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_product_offerings_store_status ON public.store_product_offerings USING btree (store_id, status);


--
-- Name: idx_store_vendor_availabilities_organization_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_vendor_availabilities_organization_store ON public.store_vendor_availabilities USING btree (organization_id, store_id);


--
-- Name: idx_store_vendor_availabilities_organization_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_vendor_availabilities_organization_vendor ON public.store_vendor_availabilities USING btree (organization_id, vendor_id);


--
-- Name: idx_store_vendor_item_offerings_organization_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_vendor_item_offerings_organization_store ON public.store_vendor_item_offerings USING btree (organization_id, store_id);


--
-- Name: idx_store_vendor_item_offerings_organization_vendor_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_vendor_item_offerings_organization_vendor_item ON public.store_vendor_item_offerings USING btree (organization_id, vendor_item_id);


--
-- Name: idx_stores_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stores_organization_id ON public.stores USING btree (organization_id);


--
-- Name: idx_table_orders_service_table_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_table_orders_service_table_id ON public.table_orders USING btree (service_table_id);


--
-- Name: idx_table_orders_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_table_orders_store_id ON public.table_orders USING btree (organization_id, store_id);


--
-- Name: idx_units_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_units_organization_id ON public.units USING btree (organization_id);


--
-- Name: idx_units_organization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_units_organization_status ON public.units USING btree (organization_id, status);


--
-- Name: idx_vendor_items_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_items_organization_id ON public.vendor_items USING btree (organization_id);


--
-- Name: idx_vendor_items_organization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_items_organization_status ON public.vendor_items USING btree (organization_id, status);


--
-- Name: idx_vendor_items_organization_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_items_organization_vendor ON public.vendor_items USING btree (organization_id, vendor_id);


--
-- Name: idx_vendors_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_organization_id ON public.vendors USING btree (organization_id);


--
-- Name: idx_vendors_organization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_organization_status ON public.vendors USING btree (organization_id, status);


--
-- Name: idx_whatsapp_account_stores_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_account_stores_organization ON public.whatsapp_account_stores USING btree (organization_id, store_id, whatsapp_account_id);


--
-- Name: idx_whatsapp_accounts_cloud_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_accounts_cloud_status ON public.whatsapp_accounts USING btree (organization_id, cloud_status, cloud_limit_synced_at);


--
-- Name: idx_whatsapp_accounts_organization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_accounts_organization_status ON public.whatsapp_accounts USING btree (organization_id, status);


--
-- Name: idx_whatsapp_business_accounts_organization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_business_accounts_organization_status ON public.whatsapp_business_accounts USING btree (organization_id, status, updated_at DESC);


--
-- Name: idx_whatsapp_campaign_recipients_dispatch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_campaign_recipients_dispatch ON public.whatsapp_campaign_recipients USING btree (campaign_id, status, created_at);


--
-- Name: idx_whatsapp_campaigns_store_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_campaigns_store_created ON public.whatsapp_campaigns USING btree (organization_id, store_id, created_at DESC);


--
-- Name: idx_whatsapp_cloud_credentials_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_credentials_active ON public.whatsapp_cloud_credentials USING btree (organization_id, updated_at DESC) WHERE (revoked_at IS NULL);


--
-- Name: idx_whatsapp_cloud_credentials_organization_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_credentials_organization_owner ON public.whatsapp_cloud_credentials USING btree (organization_id, owner_key, created_at DESC);


--
-- Name: idx_whatsapp_cloud_onboarding_states_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_onboarding_states_active ON public.whatsapp_cloud_onboarding_states USING btree (organization_id, user_id, expires_at) WHERE (consumed_at IS NULL);


--
-- Name: idx_whatsapp_cloud_operator_actions_org_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_operator_actions_org_created ON public.whatsapp_cloud_operator_actions USING btree (organization_id, created_at DESC);


--
-- Name: idx_whatsapp_cloud_operator_actions_outbox_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_operator_actions_outbox_created ON public.whatsapp_cloud_operator_actions USING btree (outbox_id, created_at DESC);


--
-- Name: idx_whatsapp_cloud_provisioning_attempts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_provisioning_attempts_active ON public.whatsapp_cloud_provisioning_attempts USING btree (organization_id, status, updated_at DESC);


--
-- Name: idx_whatsapp_cloud_provisioning_attempts_resume; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_provisioning_attempts_resume ON public.whatsapp_cloud_provisioning_attempts USING btree (organization_id, idempotency_key, status, updated_at DESC);


--
-- Name: idx_whatsapp_cloud_quota_recipient_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_quota_recipient_window ON public.whatsapp_cloud_quota_reservations USING btree (organization_id, whatsapp_account_id, created_at, status);


--
-- Name: idx_whatsapp_cloud_quota_reservations_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_quota_reservations_period ON public.whatsapp_cloud_quota_reservations USING btree (organization_id, period_start, status);


--
-- Name: idx_whatsapp_cloud_template_audit_events_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_template_audit_events_scope ON public.whatsapp_cloud_template_audit_events USING btree (organization_id, whatsapp_business_account_id, created_at DESC);


--
-- Name: idx_whatsapp_cloud_template_bindings_revision_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_template_bindings_revision_scope ON public.whatsapp_cloud_template_bindings USING btree (organization_id, store_id, whatsapp_business_account_id, kind, language_code, is_active, updated_at DESC);


--
-- Name: idx_whatsapp_cloud_template_bindings_store_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_template_bindings_store_kind ON public.whatsapp_cloud_template_bindings USING btree (organization_id, store_id, kind, is_active, updated_at DESC);


--
-- Name: idx_whatsapp_cloud_template_submissions_account_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_template_submissions_account_status ON public.whatsapp_cloud_template_submissions USING btree (organization_id, whatsapp_business_account_id, status, updated_at DESC);


--
-- Name: idx_whatsapp_cloud_template_submissions_store_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_template_submissions_store_kind ON public.whatsapp_cloud_template_submissions USING btree (organization_id, originating_store_id, kind, status, updated_at DESC);


--
-- Name: idx_whatsapp_cloud_templates_waba_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_templates_waba_status ON public.whatsapp_cloud_templates USING btree (organization_id, whatsapp_business_account_id, status, updated_at DESC);


--
-- Name: idx_whatsapp_cloud_usage_ledger_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_usage_ledger_period ON public.whatsapp_cloud_usage_ledger USING btree (organization_id, period_start, occurred_at);


--
-- Name: idx_whatsapp_cloud_webhook_events_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_webhook_events_account ON public.whatsapp_cloud_webhook_events USING btree (whatsapp_account_id, created_at DESC);


--
-- Name: idx_whatsapp_cloud_webhook_events_dispatch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_webhook_events_dispatch ON public.whatsapp_cloud_webhook_events USING btree (status, next_attempt_at, created_at);


--
-- Name: idx_whatsapp_cloud_webhook_events_route; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_cloud_webhook_events_route ON public.whatsapp_cloud_webhook_events USING btree (waba_id, phone_number_id, created_at DESC);


--
-- Name: idx_whatsapp_conversations_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_conversations_customer ON public.whatsapp_conversations USING btree (organization_id, customer_id);


--
-- Name: idx_whatsapp_conversations_store_last_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_conversations_store_last_message ON public.whatsapp_conversations USING btree (organization_id, store_id, last_message_at DESC);


--
-- Name: idx_whatsapp_customer_consent_events_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_customer_consent_events_customer ON public.whatsapp_customer_consent_events USING btree (organization_id, customer_id, kind, created_at DESC, id DESC);


--
-- Name: idx_whatsapp_message_templates_store_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_message_templates_store_kind ON public.whatsapp_message_templates USING btree (organization_id, store_id, kind, is_active, updated_at DESC);


--
-- Name: idx_whatsapp_messages_conversation_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_messages_conversation_created ON public.whatsapp_messages USING btree (conversation_id, created_at);


--
-- Name: idx_whatsapp_outbox_account_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_outbox_account_status ON public.whatsapp_outbox USING btree (whatsapp_account_id, status, next_attempt_at);


--
-- Name: idx_whatsapp_outbox_cloud_template_binding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_outbox_cloud_template_binding ON public.whatsapp_outbox USING btree (cloud_template_binding_id) WHERE (cloud_template_binding_id IS NOT NULL);


--
-- Name: idx_whatsapp_outbox_dispatch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_outbox_dispatch ON public.whatsapp_outbox USING btree (status, next_attempt_at, created_at);


--
-- Name: idx_whatsapp_provider_events_dispatch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_provider_events_dispatch ON public.whatsapp_provider_events USING btree (status, next_attempt_at, created_at);


--
-- Name: idx_whatsapp_public_invoice_links_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_public_invoice_links_sale ON public.whatsapp_public_invoice_links USING btree (organization_id, store_id, sale_id);


--
-- Name: kots_generation_request_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX kots_generation_request_key ON public.kots USING btree (organization_id, store_id, generation_request_id) WHERE (generation_request_id IS NOT NULL);


--
-- Name: kots_parcel_sale_batch_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX kots_parcel_sale_batch_key ON public.kots USING btree (sale_id, sale_batch_sequence) WHERE ((sale_id IS NOT NULL) AND (kot_type = 'parcel'::public.kot_type_enum) AND (sale_batch_sequence IS NOT NULL));


--
-- Name: kots_store_period_sequence_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX kots_store_period_sequence_key ON public.kots USING btree (store_id, kot_period_key, kot_sequence_number);


--
-- Name: license_revocations_access_source_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX license_revocations_access_source_uidx ON public.license_revocations USING btree (access_source_kind, access_source_id);


--
-- Name: license_revocations_refund_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX license_revocations_refund_uidx ON public.license_revocations USING btree (commercial_refund_id);


--
-- Name: money_accounts_one_active_cash_per_store; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX money_accounts_one_active_cash_per_store ON public.money_accounts USING btree (organization_id, store_id) WHERE ((type = 'cash'::public.money_account_type_enum) AND (status = 'active'::public.money_account_status_enum));


--
-- Name: products_organization_id_product_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_organization_id_product_code_key ON public.products USING btree (organization_id, product_code) WHERE (product_code IS NOT NULL);


--
-- Name: sales_store_completion_request_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sales_store_completion_request_id_key ON public.sales USING btree (store_id, completion_request_id) WHERE (completion_request_id IS NOT NULL);


--
-- Name: sales_store_sale_period_sequence_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sales_store_sale_period_sequence_key ON public.sales USING btree (store_id, sale_period_key, sale_sequence_number) WHERE ((sale_period_key IS NOT NULL) AND (sale_sequence_number IS NOT NULL));


--
-- Name: sales_store_token_period_sequence_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sales_store_token_period_sequence_key ON public.sales USING btree (store_id, token_period_key, token_sequence_number) WHERE ((token_period_key IS NOT NULL) AND (token_sequence_number IS NOT NULL));


--
-- Name: service_areas_store_title_lower_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX service_areas_store_title_lower_unique ON public.service_areas USING btree (store_id, lower(btrim((title)::text)));


--
-- Name: service_tables_current_sale_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX service_tables_current_sale_unique ON public.service_tables USING btree (current_sale_id) WHERE (current_sale_id IS NOT NULL);


--
-- Name: service_tables_current_table_order_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX service_tables_current_table_order_unique ON public.service_tables USING btree (current_table_order_id) WHERE (current_table_order_id IS NOT NULL);


--
-- Name: service_tables_store_table_label_lower_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX service_tables_store_table_label_lower_unique ON public.service_tables USING btree (store_id, lower(btrim((table_label)::text)));


--
-- Name: store_access_grant_feature_snapshots_feature_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX store_access_grant_feature_snapshots_feature_key_idx ON public.store_access_grant_feature_snapshots USING btree (feature_key);


--
-- Name: store_access_grants_one_legacy_migration_per_store; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX store_access_grants_one_legacy_migration_per_store ON public.store_access_grants USING btree (store_id) WHERE ((origin)::text = 'legacy_migration'::text);


--
-- Name: store_access_grants_store_timeline_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX store_access_grants_store_timeline_idx ON public.store_access_grants USING btree (store_id, starts_at DESC);


--
-- Name: store_co_term_add_ons_commercial_quote_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX store_co_term_add_ons_commercial_quote_id_uidx ON public.store_co_term_add_ons USING btree (commercial_quote_id);


--
-- Name: store_co_term_add_ons_one_active_module; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX store_co_term_add_ons_one_active_module ON public.store_co_term_add_ons USING btree (store_id, module_id) WHERE (revoked_at IS NULL);


--
-- Name: store_co_term_add_ons_store_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX store_co_term_add_ons_store_created_idx ON public.store_co_term_add_ons USING btree (store_id, created_at DESC);


--
-- Name: store_license_feature_snapshots_feature_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX store_license_feature_snapshots_feature_key_idx ON public.store_license_feature_snapshots USING btree (feature_key);


--
-- Name: store_licenses_one_paid_license_per_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX store_licenses_one_paid_license_per_quote ON public.store_licenses USING btree (commercial_quote_id) WHERE (commercial_quote_id IS NOT NULL);


--
-- Name: store_licenses_one_self_service_trial_per_store; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX store_licenses_one_self_service_trial_per_store ON public.store_licenses USING btree (store_id) WHERE ((source_kind)::text = 'trial'::text);


--
-- Name: store_licenses_store_timeline_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX store_licenses_store_timeline_idx ON public.store_licenses USING btree (store_id, starts_at DESC);


--
-- Name: table_orders_one_active_per_table; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX table_orders_one_active_per_table ON public.table_orders USING btree (service_table_id) WHERE (status = 'active'::public.table_order_status_enum);


--
-- Name: units_organization_normalized_label_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX units_organization_normalized_label_key ON public.units USING btree (organization_id, lower(btrim(regexp_replace((label)::text, '\s+'::text, ' '::text, 'g'::text))));


--
-- Name: units_organization_normalized_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX units_organization_normalized_name_key ON public.units USING btree (organization_id, lower(btrim(regexp_replace((name)::text, '\s+'::text, ' '::text, 'g'::text))));


--
-- Name: units_organization_predefined_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX units_organization_predefined_key_key ON public.units USING btree (organization_id, predefined_key) WHERE (predefined_key IS NOT NULL);


--
-- Name: whatsapp_account_stores_one_default_store_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX whatsapp_account_stores_one_default_store_key ON public.whatsapp_account_stores USING btree (whatsapp_account_id) WHERE is_default_for_inbound;


--
-- Name: whatsapp_account_stores_one_store_account_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX whatsapp_account_stores_one_store_account_key ON public.whatsapp_account_stores USING btree (organization_id, store_id);


--
-- Name: whatsapp_accounts_cloud_phone_number_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX whatsapp_accounts_cloud_phone_number_id_key ON public.whatsapp_accounts USING btree (cloud_phone_number_id) WHERE (cloud_phone_number_id IS NOT NULL);


--
-- Name: whatsapp_business_accounts_waba_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX whatsapp_business_accounts_waba_id_key ON public.whatsapp_business_accounts USING btree (waba_id) WHERE (waba_id IS NOT NULL);


--
-- Name: whatsapp_cloud_quota_campaign_recipient_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX whatsapp_cloud_quota_campaign_recipient_key ON public.whatsapp_cloud_quota_reservations USING btree (organization_id, campaign_key, customer_id) WHERE (campaign_key IS NOT NULL);


--
-- Name: whatsapp_cloud_template_bindings_one_default_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX whatsapp_cloud_template_bindings_one_default_key ON public.whatsapp_cloud_template_bindings USING btree (organization_id, store_id, whatsapp_business_account_id, kind, language_code) WHERE ((is_default = true) AND (is_active = true));


--
-- Name: whatsapp_cloud_template_submissions_active_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX whatsapp_cloud_template_submissions_active_name_key ON public.whatsapp_cloud_template_submissions USING btree (organization_id, whatsapp_business_account_id, meta_template_name, language_code) WHERE (status = ANY (ARRAY['draft'::public.whatsapp_cloud_template_submission_status_enum, 'submitting'::public.whatsapp_cloud_template_submission_status_enum, 'pending'::public.whatsapp_cloud_template_submission_status_enum]));


--
-- Name: whatsapp_cloud_template_submissions_provider_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX whatsapp_cloud_template_submissions_provider_id_key ON public.whatsapp_cloud_template_submissions USING btree (whatsapp_business_account_id, meta_template_id) WHERE (meta_template_id IS NOT NULL);


--
-- Name: whatsapp_message_templates_one_default_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX whatsapp_message_templates_one_default_key ON public.whatsapp_message_templates USING btree (store_id, kind) WHERE ((is_default = true) AND (is_active = true));


--
-- Name: whatsapp_message_templates_store_kind_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX whatsapp_message_templates_store_kind_name_key ON public.whatsapp_message_templates USING btree (store_id, kind, lower((name)::text));


--
-- Name: whatsapp_messages_provider_message_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX whatsapp_messages_provider_message_key ON public.whatsapp_messages USING btree (whatsapp_account_id, provider_message_id) WHERE (provider_message_id IS NOT NULL);


--
-- Name: whatsapp_outbox_one_invoice_per_sale_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX whatsapp_outbox_one_invoice_per_sale_key ON public.whatsapp_outbox USING btree (whatsapp_account_id, sale_id, kind) WHERE ((kind = 'invoice'::public.whatsapp_outbox_kind_enum) AND (sale_id IS NOT NULL));


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
-- Name: whatsapp_account_stores whatsapp_account_stores_default_store_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER whatsapp_account_stores_default_store_trigger AFTER INSERT OR DELETE OR UPDATE ON public.whatsapp_account_stores DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.ensure_whatsapp_account_default_store();


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
-- Name: catalog_commercial_operation_audits catalog_commercial_operation_audits_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_commercial_operation_audits
    ADD CONSTRAINT catalog_commercial_operation_audits_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: catalog_commercial_operation_audits catalog_commercial_operation_audits_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_commercial_operation_audits
    ADD CONSTRAINT catalog_commercial_operation_audits_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


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
-- Name: commercial_feature_revisions commercial_feature_revisions_created_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_feature_revisions
    ADD CONSTRAINT commercial_feature_revisions_created_by_owner_user_id_fkey FOREIGN KEY (created_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: commercial_feature_revisions commercial_feature_revisions_discarded_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_feature_revisions
    ADD CONSTRAINT commercial_feature_revisions_discarded_by_owner_user_id_fkey FOREIGN KEY (discarded_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: commercial_feature_revisions commercial_feature_revisions_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_feature_revisions
    ADD CONSTRAINT commercial_feature_revisions_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.commercial_features(id);


--
-- Name: commercial_feature_revisions commercial_feature_revisions_published_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_feature_revisions
    ADD CONSTRAINT commercial_feature_revisions_published_by_owner_user_id_fkey FOREIGN KEY (published_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: commercial_feature_revisions commercial_feature_revisions_retired_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_feature_revisions
    ADD CONSTRAINT commercial_feature_revisions_retired_by_owner_user_id_fkey FOREIGN KEY (retired_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: commercial_module_revision_features commercial_module_revision_features_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_module_revision_features
    ADD CONSTRAINT commercial_module_revision_features_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.commercial_features(id);


--
-- Name: commercial_module_revision_features commercial_module_revision_features_feature_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_module_revision_features
    ADD CONSTRAINT commercial_module_revision_features_feature_revision_id_fkey FOREIGN KEY (feature_revision_id) REFERENCES public.commercial_feature_revisions(id);


--
-- Name: commercial_module_revision_features commercial_module_revision_features_module_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_module_revision_features
    ADD CONSTRAINT commercial_module_revision_features_module_revision_id_fkey FOREIGN KEY (module_revision_id) REFERENCES public.commercial_module_revisions(id);


--
-- Name: commercial_module_revisions commercial_module_revisions_created_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_module_revisions
    ADD CONSTRAINT commercial_module_revisions_created_by_owner_user_id_fkey FOREIGN KEY (created_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: commercial_module_revisions commercial_module_revisions_discarded_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_module_revisions
    ADD CONSTRAINT commercial_module_revisions_discarded_by_owner_user_id_fkey FOREIGN KEY (discarded_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: commercial_module_revisions commercial_module_revisions_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_module_revisions
    ADD CONSTRAINT commercial_module_revisions_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.commercial_modules(id);


--
-- Name: commercial_module_revisions commercial_module_revisions_published_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_module_revisions
    ADD CONSTRAINT commercial_module_revisions_published_by_owner_user_id_fkey FOREIGN KEY (published_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: commercial_module_revisions commercial_module_revisions_retired_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_module_revisions
    ADD CONSTRAINT commercial_module_revisions_retired_by_owner_user_id_fkey FOREIGN KEY (retired_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: commercial_payment_events commercial_payment_events_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_payment_events
    ADD CONSTRAINT commercial_payment_events_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.commercial_quotes(id);


--
-- Name: commercial_plan_revision_modules commercial_plan_revision_modules_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_plan_revision_modules
    ADD CONSTRAINT commercial_plan_revision_modules_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.commercial_modules(id);


--
-- Name: commercial_plan_revision_modules commercial_plan_revision_modules_module_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_plan_revision_modules
    ADD CONSTRAINT commercial_plan_revision_modules_module_revision_id_fkey FOREIGN KEY (module_revision_id) REFERENCES public.commercial_module_revisions(id);


--
-- Name: commercial_plan_revision_modules commercial_plan_revision_modules_plan_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_plan_revision_modules
    ADD CONSTRAINT commercial_plan_revision_modules_plan_revision_id_fkey FOREIGN KEY (plan_revision_id) REFERENCES public.commercial_plan_revisions(id);


--
-- Name: commercial_plan_revisions commercial_plan_revisions_created_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_plan_revisions
    ADD CONSTRAINT commercial_plan_revisions_created_by_owner_user_id_fkey FOREIGN KEY (created_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: commercial_plan_revisions commercial_plan_revisions_discarded_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_plan_revisions
    ADD CONSTRAINT commercial_plan_revisions_discarded_by_owner_user_id_fkey FOREIGN KEY (discarded_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: commercial_plan_revisions commercial_plan_revisions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_plan_revisions
    ADD CONSTRAINT commercial_plan_revisions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.commercial_plans(id);


--
-- Name: commercial_plan_revisions commercial_plan_revisions_published_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_plan_revisions
    ADD CONSTRAINT commercial_plan_revisions_published_by_owner_user_id_fkey FOREIGN KEY (published_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: commercial_plan_revisions commercial_plan_revisions_retired_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_plan_revisions
    ADD CONSTRAINT commercial_plan_revisions_retired_by_owner_user_id_fkey FOREIGN KEY (retired_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: commercial_quote_feature_snapshots commercial_quote_feature_snapshots_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quote_feature_snapshots
    ADD CONSTRAINT commercial_quote_feature_snapshots_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.commercial_features(id);


--
-- Name: commercial_quote_feature_snapshots commercial_quote_feature_snapshots_feature_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quote_feature_snapshots
    ADD CONSTRAINT commercial_quote_feature_snapshots_feature_revision_id_fkey FOREIGN KEY (feature_revision_id) REFERENCES public.commercial_feature_revisions(id);


--
-- Name: commercial_quote_feature_snapshots commercial_quote_feature_snapshots_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quote_feature_snapshots
    ADD CONSTRAINT commercial_quote_feature_snapshots_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.commercial_modules(id);


--
-- Name: commercial_quote_feature_snapshots commercial_quote_feature_snapshots_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quote_feature_snapshots
    ADD CONSTRAINT commercial_quote_feature_snapshots_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.commercial_quotes(id) ON DELETE CASCADE;


--
-- Name: commercial_quote_line_items commercial_quote_line_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quote_line_items
    ADD CONSTRAINT commercial_quote_line_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.commercial_quotes(id) ON DELETE CASCADE;


--
-- Name: commercial_quote_module_snapshots commercial_quote_module_snapshots_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quote_module_snapshots
    ADD CONSTRAINT commercial_quote_module_snapshots_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.commercial_modules(id);


--
-- Name: commercial_quote_module_snapshots commercial_quote_module_snapshots_module_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quote_module_snapshots
    ADD CONSTRAINT commercial_quote_module_snapshots_module_revision_id_fkey FOREIGN KEY (module_revision_id) REFERENCES public.commercial_module_revisions(id);


--
-- Name: commercial_quote_module_snapshots commercial_quote_module_snapshots_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quote_module_snapshots
    ADD CONSTRAINT commercial_quote_module_snapshots_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.commercial_quotes(id) ON DELETE CASCADE;


--
-- Name: commercial_quotes commercial_quotes_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quotes
    ADD CONSTRAINT commercial_quotes_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: commercial_quotes commercial_quotes_fulfilled_co_term_add_on_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quotes
    ADD CONSTRAINT commercial_quotes_fulfilled_co_term_add_on_fk FOREIGN KEY (fulfilled_co_term_add_on_id) REFERENCES public.store_co_term_add_ons(id);


--
-- Name: commercial_quotes commercial_quotes_fulfilled_license_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quotes
    ADD CONSTRAINT commercial_quotes_fulfilled_license_fk FOREIGN KEY (fulfilled_license_id) REFERENCES public.store_licenses(id);


--
-- Name: commercial_quotes commercial_quotes_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quotes
    ADD CONSTRAINT commercial_quotes_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.commercial_modules(id);


--
-- Name: commercial_quotes commercial_quotes_module_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quotes
    ADD CONSTRAINT commercial_quotes_module_revision_id_fkey FOREIGN KEY (module_revision_id) REFERENCES public.commercial_module_revisions(id);


--
-- Name: commercial_quotes commercial_quotes_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quotes
    ADD CONSTRAINT commercial_quotes_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.commercial_plans(id);


--
-- Name: commercial_quotes commercial_quotes_plan_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quotes
    ADD CONSTRAINT commercial_quotes_plan_revision_id_fkey FOREIGN KEY (plan_revision_id) REFERENCES public.commercial_plan_revisions(id);


--
-- Name: commercial_quotes commercial_quotes_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_quotes
    ADD CONSTRAINT commercial_quotes_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: commercial_refunds commercial_refunds_created_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_refunds
    ADD CONSTRAINT commercial_refunds_created_by_owner_user_id_fkey FOREIGN KEY (created_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: commercial_refunds commercial_refunds_payment_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_refunds
    ADD CONSTRAINT commercial_refunds_payment_event_id_fkey FOREIGN KEY (payment_event_id) REFERENCES public.commercial_payment_events(id);


--
-- Name: commercial_refunds commercial_refunds_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_refunds
    ADD CONSTRAINT commercial_refunds_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.commercial_quotes(id);


--
-- Name: commercial_refunds commercial_refunds_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commercial_refunds
    ADD CONSTRAINT commercial_refunds_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


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
-- Name: expense_categories expense_categories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: expense_categories expense_categories_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: expense_categories expense_categories_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: expenses expenses_expense_category_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_expense_category_id_organization_id_fkey FOREIGN KEY (expense_category_id, organization_id) REFERENCES public.expense_categories(id, organization_id);


--
-- Name: expenses expenses_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id);


--
-- Name: expenses expenses_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: google_contacts_connections google_contacts_connections_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_connections
    ADD CONSTRAINT google_contacts_connections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: google_contacts_connections google_contacts_connections_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_connections
    ADD CONSTRAINT google_contacts_connections_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: google_contacts_credentials google_contacts_credentials_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_credentials
    ADD CONSTRAINT google_contacts_credentials_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: google_contacts_customer_links google_contacts_customer_links_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_customer_links
    ADD CONSTRAINT google_contacts_customer_links_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.google_contacts_connections(id) ON DELETE CASCADE;


--
-- Name: google_contacts_customer_links google_contacts_customer_links_customer_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_customer_links
    ADD CONSTRAINT google_contacts_customer_links_customer_id_organization_id_fkey FOREIGN KEY (customer_id, organization_id) REFERENCES public.customers(id, organization_id) ON DELETE CASCADE;


--
-- Name: google_contacts_customer_links google_contacts_customer_links_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_customer_links
    ADD CONSTRAINT google_contacts_customer_links_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: google_contacts_oauth_states google_contacts_oauth_states_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_oauth_states
    ADD CONSTRAINT google_contacts_oauth_states_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: google_contacts_oauth_states google_contacts_oauth_states_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_oauth_states
    ADD CONSTRAINT google_contacts_oauth_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: google_contacts_sync_outbox google_contacts_sync_outbox_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_sync_outbox
    ADD CONSTRAINT google_contacts_sync_outbox_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.google_contacts_connections(id) ON DELETE CASCADE;


--
-- Name: google_contacts_sync_outbox google_contacts_sync_outbox_customer_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_sync_outbox
    ADD CONSTRAINT google_contacts_sync_outbox_customer_id_organization_id_fkey FOREIGN KEY (customer_id, organization_id) REFERENCES public.customers(id, organization_id) ON DELETE CASCADE;


--
-- Name: google_contacts_sync_outbox google_contacts_sync_outbox_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_contacts_sync_outbox
    ADD CONSTRAINT google_contacts_sync_outbox_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: internal_product_code_sequences internal_product_code_sequences_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_product_code_sequences
    ADD CONSTRAINT internal_product_code_sequences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: kot_item_add_ons kot_item_add_ons_add_on_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_add_ons
    ADD CONSTRAINT kot_item_add_ons_add_on_id_organization_id_fkey FOREIGN KEY (add_on_id, organization_id) REFERENCES public.add_ons(id, organization_id) ON DELETE RESTRICT;


--
-- Name: kot_item_add_ons kot_item_add_ons_kot_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_add_ons
    ADD CONSTRAINT kot_item_add_ons_kot_id_organization_id_store_id_fkey FOREIGN KEY (kot_id, organization_id, store_id) REFERENCES public.kots(id, organization_id, store_id) ON DELETE CASCADE;


--
-- Name: kot_item_add_ons kot_item_add_ons_kot_item_id_organization_id_store_id_kot__fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_add_ons
    ADD CONSTRAINT kot_item_add_ons_kot_item_id_organization_id_store_id_kot__fkey FOREIGN KEY (kot_item_id, organization_id, store_id, kot_id) REFERENCES public.kot_items(id, organization_id, store_id, kot_id) ON DELETE CASCADE;


--
-- Name: kot_item_add_ons kot_item_add_ons_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_add_ons
    ADD CONSTRAINT kot_item_add_ons_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: kot_item_add_ons kot_item_add_ons_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_add_ons
    ADD CONSTRAINT kot_item_add_ons_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: kot_item_bundle_component_add_ons kot_item_bundle_component_add_kot_id_organization_id_store_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_component_add_ons
    ADD CONSTRAINT kot_item_bundle_component_add_kot_id_organization_id_store_fkey FOREIGN KEY (kot_id, organization_id, store_id) REFERENCES public.kots(id, organization_id, store_id) ON DELETE CASCADE;


--
-- Name: kot_item_bundle_component_add_ons kot_item_bundle_component_add_kot_item_bundle_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_component_add_ons
    ADD CONSTRAINT kot_item_bundle_component_add_kot_item_bundle_component_id_fkey FOREIGN KEY (kot_item_bundle_component_id, organization_id, store_id, kot_id, kot_item_id) REFERENCES public.kot_item_bundle_components(id, organization_id, store_id, kot_id, kot_item_id) ON DELETE CASCADE;


--
-- Name: kot_item_bundle_component_add_ons kot_item_bundle_component_add_kot_item_id_organization_id__fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_component_add_ons
    ADD CONSTRAINT kot_item_bundle_component_add_kot_item_id_organization_id__fkey FOREIGN KEY (kot_item_id, organization_id, store_id, kot_id) REFERENCES public.kot_items(id, organization_id, store_id, kot_id) ON DELETE CASCADE;


--
-- Name: kot_item_bundle_component_add_ons kot_item_bundle_component_add_on_add_on_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_component_add_ons
    ADD CONSTRAINT kot_item_bundle_component_add_on_add_on_id_organization_id_fkey FOREIGN KEY (add_on_id, organization_id) REFERENCES public.add_ons(id, organization_id) ON DELETE RESTRICT;


--
-- Name: kot_item_bundle_component_add_ons kot_item_bundle_component_add_ons_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_component_add_ons
    ADD CONSTRAINT kot_item_bundle_component_add_ons_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: kot_item_bundle_component_add_ons kot_item_bundle_component_add_ons_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_component_add_ons
    ADD CONSTRAINT kot_item_bundle_component_add_ons_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: kot_item_bundle_components kot_item_bundle_components_component_product_id_organizati_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_components
    ADD CONSTRAINT kot_item_bundle_components_component_product_id_organizati_fkey FOREIGN KEY (component_product_id, organization_id) REFERENCES public.products(id, organization_id) ON DELETE RESTRICT;


--
-- Name: kot_item_bundle_components kot_item_bundle_components_kot_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_components
    ADD CONSTRAINT kot_item_bundle_components_kot_id_organization_id_store_id_fkey FOREIGN KEY (kot_id, organization_id, store_id) REFERENCES public.kots(id, organization_id, store_id) ON DELETE CASCADE;


--
-- Name: kot_item_bundle_components kot_item_bundle_components_kot_item_id_organization_id_sto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_components
    ADD CONSTRAINT kot_item_bundle_components_kot_item_id_organization_id_sto_fkey FOREIGN KEY (kot_item_id, organization_id, store_id, kot_id) REFERENCES public.kot_items(id, organization_id, store_id, kot_id) ON DELETE CASCADE;


--
-- Name: kot_item_bundle_components kot_item_bundle_components_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_components
    ADD CONSTRAINT kot_item_bundle_components_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: kot_item_bundle_components kot_item_bundle_components_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_item_bundle_components
    ADD CONSTRAINT kot_item_bundle_components_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: kot_items kot_items_kot_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_items
    ADD CONSTRAINT kot_items_kot_id_organization_id_store_id_fkey FOREIGN KEY (kot_id, organization_id, store_id) REFERENCES public.kots(id, organization_id, store_id) ON DELETE CASCADE;


--
-- Name: kot_items kot_items_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_items
    ADD CONSTRAINT kot_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: kot_items kot_items_product_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_items
    ADD CONSTRAINT kot_items_product_id_organization_id_fkey FOREIGN KEY (product_id, organization_id) REFERENCES public.products(id, organization_id) ON DELETE RESTRICT;


--
-- Name: kot_items kot_items_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_items
    ADD CONSTRAINT kot_items_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: kot_items kot_items_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_items
    ADD CONSTRAINT kot_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;


--
-- Name: kot_items kot_items_unit_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kot_items
    ADD CONSTRAINT kot_items_unit_organization_fk FOREIGN KEY (unit_id, organization_id) REFERENCES public.units(id, organization_id);


--
-- Name: kots kots_created_by_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kots
    ADD CONSTRAINT kots_created_by_device_id_fkey FOREIGN KEY (created_by_device_id) REFERENCES public.store_devices(id) ON DELETE SET NULL;


--
-- Name: kots kots_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kots
    ADD CONSTRAINT kots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: kots kots_sale_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kots
    ADD CONSTRAINT kots_sale_id_organization_id_store_id_fkey FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES public.sales(id, organization_id, store_id) ON DELETE RESTRICT;


--
-- Name: kots kots_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kots
    ADD CONSTRAINT kots_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: kots kots_table_order_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kots
    ADD CONSTRAINT kots_table_order_fkey FOREIGN KEY (table_order_id, organization_id, store_id) REFERENCES public.table_orders(id, organization_id, store_id) ON DELETE RESTRICT;


--
-- Name: kots kots_updated_by_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kots
    ADD CONSTRAINT kots_updated_by_device_id_fkey FOREIGN KEY (updated_by_device_id) REFERENCES public.store_devices(id) ON DELETE SET NULL;


--
-- Name: label_templates label_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.label_templates
    ADD CONSTRAINT label_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: label_templates label_templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.label_templates
    ADD CONSTRAINT label_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: label_templates label_templates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.label_templates
    ADD CONSTRAINT label_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: license_revocations license_revocations_commercial_refund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_revocations
    ADD CONSTRAINT license_revocations_commercial_refund_id_fkey FOREIGN KEY (commercial_refund_id) REFERENCES public.commercial_refunds(id);


--
-- Name: license_revocations license_revocations_created_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_revocations
    ADD CONSTRAINT license_revocations_created_by_owner_user_id_fkey FOREIGN KEY (created_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: license_revocations license_revocations_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_revocations
    ADD CONSTRAINT license_revocations_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: money_account_movements money_account_movements_money_account_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_account_movements
    ADD CONSTRAINT money_account_movements_money_account_id_organization_id_fkey FOREIGN KEY (money_account_id, organization_id) REFERENCES public.money_accounts(id, organization_id) ON DELETE RESTRICT;


--
-- Name: money_account_movements money_account_movements_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_account_movements
    ADD CONSTRAINT money_account_movements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: money_account_movements money_account_movements_outgoing_payment_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_account_movements
    ADD CONSTRAINT money_account_movements_outgoing_payment_fk FOREIGN KEY (outgoing_payment_id, organization_id) REFERENCES public.outgoing_payments(id, organization_id) ON DELETE RESTRICT;


--
-- Name: money_account_movements money_account_movements_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_account_movements
    ADD CONSTRAINT money_account_movements_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE RESTRICT;


--
-- Name: money_account_movements money_account_movements_reversed_movement_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_account_movements
    ADD CONSTRAINT money_account_movements_reversed_movement_fk FOREIGN KEY (reversed_movement_id, organization_id) REFERENCES public.money_account_movements(id, organization_id) ON DELETE RESTRICT;


--
-- Name: money_account_movements money_account_movements_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_account_movements
    ADD CONSTRAINT money_account_movements_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE RESTRICT;


--
-- Name: money_accounts money_accounts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_accounts
    ADD CONSTRAINT money_accounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: money_accounts money_accounts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_accounts
    ADD CONSTRAINT money_accounts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: money_accounts money_accounts_store_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_accounts
    ADD CONSTRAINT money_accounts_store_organization_fk FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id);


--
-- Name: money_accounts money_accounts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.money_accounts
    ADD CONSTRAINT money_accounts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: organization_catalog_settings organization_catalog_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_catalog_settings
    ADD CONSTRAINT organization_catalog_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_invoice_appearance_settings organization_invoice_appearance_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invoice_appearance_settings
    ADD CONSTRAINT organization_invoice_appearance_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_invoice_appearance_settings organization_invoice_appearance_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invoice_appearance_settings
    ADD CONSTRAINT organization_invoice_appearance_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


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
-- Name: outgoing_payments outgoing_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outgoing_payments
    ADD CONSTRAINT outgoing_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: outgoing_payments outgoing_payments_expense_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outgoing_payments
    ADD CONSTRAINT outgoing_payments_expense_fk FOREIGN KEY (expense_id, organization_id) REFERENCES public.expenses(id, organization_id) ON DELETE RESTRICT;


--
-- Name: outgoing_payments outgoing_payments_money_account_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outgoing_payments
    ADD CONSTRAINT outgoing_payments_money_account_id_organization_id_fkey FOREIGN KEY (money_account_id, organization_id) REFERENCES public.money_accounts(id, organization_id) ON DELETE RESTRICT;


--
-- Name: outgoing_payments outgoing_payments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outgoing_payments
    ADD CONSTRAINT outgoing_payments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: outgoing_payments outgoing_payments_purchase_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outgoing_payments
    ADD CONSTRAINT outgoing_payments_purchase_id_organization_id_fkey FOREIGN KEY (purchase_id, organization_id) REFERENCES public.purchases(id, organization_id) ON DELETE RESTRICT;


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
-- Name: product_label_profiles product_label_profiles_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_label_profiles
    ADD CONSTRAINT product_label_profiles_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_label_profiles product_label_profiles_product_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_label_profiles
    ADD CONSTRAINT product_label_profiles_product_id_organization_id_fkey FOREIGN KEY (product_id, organization_id) REFERENCES public.products(id, organization_id) ON DELETE CASCADE;


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
-- Name: products products_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;


--
-- Name: products products_unit_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_unit_organization_fk FOREIGN KEY (unit_id, organization_id) REFERENCES public.units(id, organization_id);


--
-- Name: products products_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: purchase_lines purchase_lines_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_lines
    ADD CONSTRAINT purchase_lines_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: purchase_lines purchase_lines_purchase_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_lines
    ADD CONSTRAINT purchase_lines_purchase_id_organization_id_fkey FOREIGN KEY (purchase_id, organization_id) REFERENCES public.purchases(id, organization_id) ON DELETE CASCADE;


--
-- Name: purchase_lines purchase_lines_unit_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_lines
    ADD CONSTRAINT purchase_lines_unit_id_organization_id_fkey FOREIGN KEY (unit_id, organization_id) REFERENCES public.units(id, organization_id);


--
-- Name: purchase_lines purchase_lines_vendor_item_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_lines
    ADD CONSTRAINT purchase_lines_vendor_item_id_organization_id_fkey FOREIGN KEY (vendor_item_id, organization_id) REFERENCES public.vendor_items(id, organization_id);


--
-- Name: purchases purchases_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchases purchases_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: purchases purchases_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id);


--
-- Name: purchases purchases_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: purchases purchases_vendor_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_vendor_id_organization_id_fkey FOREIGN KEY (vendor_id, organization_id) REFERENCES public.vendors(id, organization_id);


--
-- Name: released_internal_product_codes released_internal_product_codes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.released_internal_product_codes
    ADD CONSTRAINT released_internal_product_codes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


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
-- Name: sale_items sale_items_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;


--
-- Name: sale_items sale_items_unit_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_unit_organization_fk FOREIGN KEY (unit_id, organization_id) REFERENCES public.units(id, organization_id);


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
-- Name: sales sales_service_table_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_service_table_fkey FOREIGN KEY (service_table_id, organization_id, store_id) REFERENCES public.service_tables(id, organization_id, store_id) ON DELETE RESTRICT;


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
-- Name: service_areas service_areas_store_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_areas
    ADD CONSTRAINT service_areas_store_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: service_tables service_tables_current_sale_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tables
    ADD CONSTRAINT service_tables_current_sale_fkey FOREIGN KEY (current_sale_id, organization_id, store_id) REFERENCES public.sales(id, organization_id, store_id) ON DELETE RESTRICT;


--
-- Name: service_tables service_tables_current_table_order_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tables
    ADD CONSTRAINT service_tables_current_table_order_fkey FOREIGN KEY (current_table_order_id, organization_id, store_id) REFERENCES public.table_orders(id, organization_id, store_id) ON DELETE RESTRICT;


--
-- Name: service_tables service_tables_service_area_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tables
    ADD CONSTRAINT service_tables_service_area_fkey FOREIGN KEY (service_area_id, organization_id, store_id) REFERENCES public.service_areas(id, organization_id, store_id) ON DELETE SET NULL (service_area_id);


--
-- Name: service_tables service_tables_store_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tables
    ADD CONSTRAINT service_tables_store_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_access_grant_feature_snapshots store_access_grant_feature_snapshots_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_access_grant_feature_snapshots
    ADD CONSTRAINT store_access_grant_feature_snapshots_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.commercial_features(id);


--
-- Name: store_access_grant_feature_snapshots store_access_grant_feature_snapshots_feature_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_access_grant_feature_snapshots
    ADD CONSTRAINT store_access_grant_feature_snapshots_feature_revision_id_fkey FOREIGN KEY (feature_revision_id) REFERENCES public.commercial_feature_revisions(id);


--
-- Name: store_access_grant_feature_snapshots store_access_grant_feature_snapshots_grant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_access_grant_feature_snapshots
    ADD CONSTRAINT store_access_grant_feature_snapshots_grant_id_fkey FOREIGN KEY (grant_id) REFERENCES public.store_access_grants(id) ON DELETE CASCADE;


--
-- Name: store_access_grant_feature_snapshots store_access_grant_feature_snapshots_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_access_grant_feature_snapshots
    ADD CONSTRAINT store_access_grant_feature_snapshots_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.commercial_modules(id);


--
-- Name: store_access_grant_module_snapshots store_access_grant_module_snapshots_grant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_access_grant_module_snapshots
    ADD CONSTRAINT store_access_grant_module_snapshots_grant_id_fkey FOREIGN KEY (grant_id) REFERENCES public.store_access_grants(id) ON DELETE CASCADE;


--
-- Name: store_access_grant_module_snapshots store_access_grant_module_snapshots_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_access_grant_module_snapshots
    ADD CONSTRAINT store_access_grant_module_snapshots_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.commercial_modules(id);


--
-- Name: store_access_grant_module_snapshots store_access_grant_module_snapshots_module_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_access_grant_module_snapshots
    ADD CONSTRAINT store_access_grant_module_snapshots_module_revision_id_fkey FOREIGN KEY (module_revision_id) REFERENCES public.commercial_module_revisions(id);


--
-- Name: store_access_grants store_access_grants_created_by_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_access_grants
    ADD CONSTRAINT store_access_grants_created_by_owner_user_id_fkey FOREIGN KEY (created_by_owner_user_id) REFERENCES public.console_users(id);


--
-- Name: store_access_grants store_access_grants_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_access_grants
    ADD CONSTRAINT store_access_grants_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.commercial_plans(id);


--
-- Name: store_access_grants store_access_grants_plan_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_access_grants
    ADD CONSTRAINT store_access_grants_plan_revision_id_fkey FOREIGN KEY (plan_revision_id) REFERENCES public.commercial_plan_revisions(id);


--
-- Name: store_access_grants store_access_grants_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_access_grants
    ADD CONSTRAINT store_access_grants_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_add_on_offerings store_add_on_offerings_add_on_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_add_on_offerings
    ADD CONSTRAINT store_add_on_offerings_add_on_id_organization_id_fkey FOREIGN KEY (add_on_id, organization_id) REFERENCES public.add_ons(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_add_on_offerings store_add_on_offerings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_add_on_offerings
    ADD CONSTRAINT store_add_on_offerings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: store_add_on_offerings store_add_on_offerings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_add_on_offerings
    ADD CONSTRAINT store_add_on_offerings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: store_add_on_offerings store_add_on_offerings_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_add_on_offerings
    ADD CONSTRAINT store_add_on_offerings_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_add_on_offerings store_add_on_offerings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_add_on_offerings
    ADD CONSTRAINT store_add_on_offerings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: store_billing_settings store_billing_settings_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_billing_settings
    ADD CONSTRAINT store_billing_settings_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_category_presentations store_category_presentations_category_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_category_presentations
    ADD CONSTRAINT store_category_presentations_category_id_organization_id_fkey FOREIGN KEY (category_id, organization_id) REFERENCES public.categories(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_category_presentations store_category_presentations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_category_presentations
    ADD CONSTRAINT store_category_presentations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: store_category_presentations store_category_presentations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_category_presentations
    ADD CONSTRAINT store_category_presentations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: store_category_presentations store_category_presentations_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_category_presentations
    ADD CONSTRAINT store_category_presentations_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_category_presentations store_category_presentations_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_category_presentations
    ADD CONSTRAINT store_category_presentations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: store_co_term_add_on_feature_snapshots store_co_term_add_on_feature_snapshots_add_on_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_co_term_add_on_feature_snapshots
    ADD CONSTRAINT store_co_term_add_on_feature_snapshots_add_on_id_fkey FOREIGN KEY (add_on_id) REFERENCES public.store_co_term_add_ons(id) ON DELETE CASCADE;


--
-- Name: store_co_term_add_on_feature_snapshots store_co_term_add_on_feature_snapshots_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_co_term_add_on_feature_snapshots
    ADD CONSTRAINT store_co_term_add_on_feature_snapshots_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.commercial_features(id);


--
-- Name: store_co_term_add_on_feature_snapshots store_co_term_add_on_feature_snapshots_feature_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_co_term_add_on_feature_snapshots
    ADD CONSTRAINT store_co_term_add_on_feature_snapshots_feature_revision_id_fkey FOREIGN KEY (feature_revision_id) REFERENCES public.commercial_feature_revisions(id);


--
-- Name: store_co_term_add_ons store_co_term_add_ons_base_store_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_co_term_add_ons
    ADD CONSTRAINT store_co_term_add_ons_base_store_license_id_fkey FOREIGN KEY (base_store_license_id) REFERENCES public.store_licenses(id);


--
-- Name: store_co_term_add_ons store_co_term_add_ons_commercial_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_co_term_add_ons
    ADD CONSTRAINT store_co_term_add_ons_commercial_quote_id_fkey FOREIGN KEY (commercial_quote_id) REFERENCES public.commercial_quotes(id);


--
-- Name: store_co_term_add_ons store_co_term_add_ons_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_co_term_add_ons
    ADD CONSTRAINT store_co_term_add_ons_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: store_co_term_add_ons store_co_term_add_ons_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_co_term_add_ons
    ADD CONSTRAINT store_co_term_add_ons_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.commercial_modules(id);


--
-- Name: store_co_term_add_ons store_co_term_add_ons_module_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_co_term_add_ons
    ADD CONSTRAINT store_co_term_add_ons_module_revision_id_fkey FOREIGN KEY (module_revision_id) REFERENCES public.commercial_module_revisions(id);


--
-- Name: store_co_term_add_ons store_co_term_add_ons_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_co_term_add_ons
    ADD CONSTRAINT store_co_term_add_ons_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_device_pos_settings store_device_pos_settings_device_id_organization_id_store__fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_device_pos_settings
    ADD CONSTRAINT store_device_pos_settings_device_id_organization_id_store__fkey FOREIGN KEY (device_id, organization_id, store_id) REFERENCES public.store_devices(id, organization_id, store_id) ON DELETE CASCADE;


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
-- Name: store_invoice_appearance_settings store_invoice_appearance_settings_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_invoice_appearance_settings
    ADD CONSTRAINT store_invoice_appearance_settings_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_invoice_appearance_settings store_invoice_appearance_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_invoice_appearance_settings
    ADD CONSTRAINT store_invoice_appearance_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: store_kot_sequences store_kot_sequences_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_kot_sequences
    ADD CONSTRAINT store_kot_sequences_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_license_feature_snapshots store_license_feature_snapshots_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_license_feature_snapshots
    ADD CONSTRAINT store_license_feature_snapshots_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.commercial_features(id);


--
-- Name: store_license_feature_snapshots store_license_feature_snapshots_feature_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_license_feature_snapshots
    ADD CONSTRAINT store_license_feature_snapshots_feature_revision_id_fkey FOREIGN KEY (feature_revision_id) REFERENCES public.commercial_feature_revisions(id);


--
-- Name: store_license_feature_snapshots store_license_feature_snapshots_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_license_feature_snapshots
    ADD CONSTRAINT store_license_feature_snapshots_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.store_licenses(id) ON DELETE CASCADE;


--
-- Name: store_license_feature_snapshots store_license_feature_snapshots_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_license_feature_snapshots
    ADD CONSTRAINT store_license_feature_snapshots_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.commercial_modules(id);


--
-- Name: store_license_module_snapshots store_license_module_snapshots_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_license_module_snapshots
    ADD CONSTRAINT store_license_module_snapshots_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.store_licenses(id) ON DELETE CASCADE;


--
-- Name: store_license_module_snapshots store_license_module_snapshots_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_license_module_snapshots
    ADD CONSTRAINT store_license_module_snapshots_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.commercial_modules(id);


--
-- Name: store_license_module_snapshots store_license_module_snapshots_module_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_license_module_snapshots
    ADD CONSTRAINT store_license_module_snapshots_module_revision_id_fkey FOREIGN KEY (module_revision_id) REFERENCES public.commercial_module_revisions(id);


--
-- Name: store_licenses store_licenses_commercial_quote_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_licenses
    ADD CONSTRAINT store_licenses_commercial_quote_fk FOREIGN KEY (commercial_quote_id) REFERENCES public.commercial_quotes(id);


--
-- Name: store_licenses store_licenses_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_licenses
    ADD CONSTRAINT store_licenses_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: store_licenses store_licenses_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_licenses
    ADD CONSTRAINT store_licenses_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.commercial_plans(id);


--
-- Name: store_licenses store_licenses_plan_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_licenses
    ADD CONSTRAINT store_licenses_plan_revision_id_fkey FOREIGN KEY (plan_revision_id) REFERENCES public.commercial_plan_revisions(id);


--
-- Name: store_licenses store_licenses_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_licenses
    ADD CONSTRAINT store_licenses_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_money_account_payment_routes store_money_account_payment_r_money_account_id_organizatio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_money_account_payment_routes
    ADD CONSTRAINT store_money_account_payment_r_money_account_id_organizatio_fkey FOREIGN KEY (money_account_id, organization_id) REFERENCES public.money_accounts(id, organization_id) ON DELETE RESTRICT;


--
-- Name: store_money_account_payment_routes store_money_account_payment_route_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_money_account_payment_routes
    ADD CONSTRAINT store_money_account_payment_route_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_money_account_payment_routes store_money_account_payment_routes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_money_account_payment_routes
    ADD CONSTRAINT store_money_account_payment_routes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: store_money_account_payment_routes store_money_account_payment_routes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_money_account_payment_routes
    ADD CONSTRAINT store_money_account_payment_routes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: store_money_account_payment_routes store_money_account_payment_routes_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_money_account_payment_routes
    ADD CONSTRAINT store_money_account_payment_routes_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: store_product_offerings store_product_offerings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_product_offerings
    ADD CONSTRAINT store_product_offerings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: store_product_offerings store_product_offerings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_product_offerings
    ADD CONSTRAINT store_product_offerings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: store_product_offerings store_product_offerings_product_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_product_offerings
    ADD CONSTRAINT store_product_offerings_product_id_organization_id_fkey FOREIGN KEY (product_id, organization_id) REFERENCES public.products(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_product_offerings store_product_offerings_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_product_offerings
    ADD CONSTRAINT store_product_offerings_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_product_offerings store_product_offerings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_product_offerings
    ADD CONSTRAINT store_product_offerings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


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
-- Name: store_vendor_availabilities store_vendor_availabilities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_availabilities
    ADD CONSTRAINT store_vendor_availabilities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: store_vendor_availabilities store_vendor_availabilities_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_availabilities
    ADD CONSTRAINT store_vendor_availabilities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: store_vendor_availabilities store_vendor_availabilities_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_availabilities
    ADD CONSTRAINT store_vendor_availabilities_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_vendor_availabilities store_vendor_availabilities_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_availabilities
    ADD CONSTRAINT store_vendor_availabilities_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: store_vendor_availabilities store_vendor_availabilities_vendor_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_availabilities
    ADD CONSTRAINT store_vendor_availabilities_vendor_id_organization_id_fkey FOREIGN KEY (vendor_id, organization_id) REFERENCES public.vendors(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_vendor_item_offerings store_vendor_item_offerings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_item_offerings
    ADD CONSTRAINT store_vendor_item_offerings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: store_vendor_item_offerings store_vendor_item_offerings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_item_offerings
    ADD CONSTRAINT store_vendor_item_offerings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: store_vendor_item_offerings store_vendor_item_offerings_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_item_offerings
    ADD CONSTRAINT store_vendor_item_offerings_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_vendor_item_offerings store_vendor_item_offerings_store_id_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_item_offerings
    ADD CONSTRAINT store_vendor_item_offerings_store_id_vendor_id_fkey FOREIGN KEY (store_id, vendor_id) REFERENCES public.store_vendor_availabilities(store_id, vendor_id) ON DELETE CASCADE;


--
-- Name: store_vendor_item_offerings store_vendor_item_offerings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_item_offerings
    ADD CONSTRAINT store_vendor_item_offerings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: store_vendor_item_offerings store_vendor_item_offerings_vendor_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_item_offerings
    ADD CONSTRAINT store_vendor_item_offerings_vendor_id_organization_id_fkey FOREIGN KEY (vendor_id, organization_id) REFERENCES public.vendors(id, organization_id) ON DELETE CASCADE;


--
-- Name: store_vendor_item_offerings store_vendor_item_offerings_vendor_item_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_vendor_item_offerings
    ADD CONSTRAINT store_vendor_item_offerings_vendor_item_id_organization_id_fkey FOREIGN KEY (vendor_item_id, organization_id) REFERENCES public.vendor_items(id, organization_id) ON DELETE CASCADE;


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
-- Name: table_orders table_orders_created_by_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_created_by_device_id_fkey FOREIGN KEY (created_by_device_id) REFERENCES public.store_devices(id) ON DELETE SET NULL;


--
-- Name: table_orders table_orders_customer_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_customer_id_organization_id_fkey FOREIGN KEY (customer_id, organization_id) REFERENCES public.customers(id, organization_id) ON DELETE RESTRICT;


--
-- Name: table_orders table_orders_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: table_orders table_orders_sale_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_sale_id_organization_id_store_id_fkey FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES public.sales(id, organization_id, store_id) ON DELETE RESTRICT;


--
-- Name: table_orders table_orders_service_table_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_service_table_id_organization_id_store_id_fkey FOREIGN KEY (service_table_id, organization_id, store_id) REFERENCES public.service_tables(id, organization_id, store_id) ON DELETE RESTRICT;


--
-- Name: table_orders table_orders_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: table_orders table_orders_updated_by_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_updated_by_device_id_fkey FOREIGN KEY (updated_by_device_id) REFERENCES public.store_devices(id) ON DELETE SET NULL;


--
-- Name: units units_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: units units_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: units units_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: vendor_items vendor_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_items
    ADD CONSTRAINT vendor_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: vendor_items vendor_items_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_items
    ADD CONSTRAINT vendor_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: vendor_items vendor_items_unit_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_items
    ADD CONSTRAINT vendor_items_unit_id_organization_id_fkey FOREIGN KEY (unit_id, organization_id) REFERENCES public.units(id, organization_id);


--
-- Name: vendor_items vendor_items_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_items
    ADD CONSTRAINT vendor_items_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: vendor_items vendor_items_vendor_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_items
    ADD CONSTRAINT vendor_items_vendor_id_organization_id_fkey FOREIGN KEY (vendor_id, organization_id) REFERENCES public.vendors(id, organization_id) ON DELETE CASCADE;


--
-- Name: vendors vendors_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: vendors vendors_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: whatsapp_account_stores whatsapp_account_stores_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_account_stores
    ADD CONSTRAINT whatsapp_account_stores_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_account_stores whatsapp_account_stores_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_account_stores
    ADD CONSTRAINT whatsapp_account_stores_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_account_stores whatsapp_account_stores_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_account_stores
    ADD CONSTRAINT whatsapp_account_stores_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: whatsapp_account_stores whatsapp_account_stores_whatsapp_account_id_organization_i_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_account_stores
    ADD CONSTRAINT whatsapp_account_stores_whatsapp_account_id_organization_i_fkey FOREIGN KEY (whatsapp_account_id, organization_id) REFERENCES public.whatsapp_accounts(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_accounts whatsapp_accounts_cloud_business_account_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_accounts
    ADD CONSTRAINT whatsapp_accounts_cloud_business_account_fkey FOREIGN KEY (whatsapp_business_account_id, organization_id) REFERENCES public.whatsapp_business_accounts(id, organization_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_accounts whatsapp_accounts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_accounts
    ADD CONSTRAINT whatsapp_accounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_accounts whatsapp_accounts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_accounts
    ADD CONSTRAINT whatsapp_accounts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: whatsapp_business_accounts whatsapp_business_accounts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_business_accounts
    ADD CONSTRAINT whatsapp_business_accounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_business_accounts whatsapp_business_accounts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_business_accounts
    ADD CONSTRAINT whatsapp_business_accounts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_business_accounts whatsapp_business_accounts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_business_accounts
    ADD CONSTRAINT whatsapp_business_accounts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: whatsapp_campaign_recipients whatsapp_campaign_recipients_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaign_recipients
    ADD CONSTRAINT whatsapp_campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE;


--
-- Name: whatsapp_campaign_recipients whatsapp_campaign_recipients_customer_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaign_recipients
    ADD CONSTRAINT whatsapp_campaign_recipients_customer_id_organization_id_fkey FOREIGN KEY (customer_id, organization_id) REFERENCES public.customers(id, organization_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_campaign_recipients whatsapp_campaign_recipients_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaign_recipients
    ADD CONSTRAINT whatsapp_campaign_recipients_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL;


--
-- Name: whatsapp_campaign_recipients whatsapp_campaign_recipients_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaign_recipients
    ADD CONSTRAINT whatsapp_campaign_recipients_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_campaign_recipients whatsapp_campaign_recipients_outbox_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaign_recipients
    ADD CONSTRAINT whatsapp_campaign_recipients_outbox_id_fkey FOREIGN KEY (outbox_id) REFERENCES public.whatsapp_outbox(id) ON DELETE SET NULL;


--
-- Name: whatsapp_campaign_recipients whatsapp_campaign_recipients_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaign_recipients
    ADD CONSTRAINT whatsapp_campaign_recipients_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_campaigns whatsapp_campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaigns
    ADD CONSTRAINT whatsapp_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_campaigns whatsapp_campaigns_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaigns
    ADD CONSTRAINT whatsapp_campaigns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_campaigns whatsapp_campaigns_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaigns
    ADD CONSTRAINT whatsapp_campaigns_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_campaigns whatsapp_campaigns_whatsapp_account_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaigns
    ADD CONSTRAINT whatsapp_campaigns_whatsapp_account_id_organization_id_fkey FOREIGN KEY (whatsapp_account_id, organization_id) REFERENCES public.whatsapp_accounts(id, organization_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_cloud_credentials whatsapp_cloud_credentials_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_credentials
    ADD CONSTRAINT whatsapp_cloud_credentials_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_onboarding_states whatsapp_cloud_onboarding_states_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_onboarding_states
    ADD CONSTRAINT whatsapp_cloud_onboarding_states_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_onboarding_states whatsapp_cloud_onboarding_states_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_onboarding_states
    ADD CONSTRAINT whatsapp_cloud_onboarding_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_operator_actions whatsapp_cloud_operator_actions_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_operator_actions
    ADD CONSTRAINT whatsapp_cloud_operator_actions_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: whatsapp_cloud_operator_actions whatsapp_cloud_operator_actions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_operator_actions
    ADD CONSTRAINT whatsapp_cloud_operator_actions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_operator_actions whatsapp_cloud_operator_actions_outbox_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_operator_actions
    ADD CONSTRAINT whatsapp_cloud_operator_actions_outbox_id_fkey FOREIGN KEY (outbox_id) REFERENCES public.whatsapp_outbox(id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_provisioning_attempts whatsapp_cloud_provisioning_a_whatsapp_account_id_organiza_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_provisioning_attempts
    ADD CONSTRAINT whatsapp_cloud_provisioning_a_whatsapp_account_id_organiza_fkey FOREIGN KEY (whatsapp_account_id, organization_id) REFERENCES public.whatsapp_accounts(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_provisioning_attempts whatsapp_cloud_provisioning_a_whatsapp_business_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_provisioning_attempts
    ADD CONSTRAINT whatsapp_cloud_provisioning_a_whatsapp_business_account_id_fkey FOREIGN KEY (whatsapp_business_account_id, organization_id) REFERENCES public.whatsapp_business_accounts(id, organization_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_cloud_provisioning_attempts whatsapp_cloud_provisioning_attempts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_provisioning_attempts
    ADD CONSTRAINT whatsapp_cloud_provisioning_attempts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_cloud_provisioning_attempts whatsapp_cloud_provisioning_attempts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_provisioning_attempts
    ADD CONSTRAINT whatsapp_cloud_provisioning_attempts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_quota_policies whatsapp_cloud_quota_policies_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_quota_policies
    ADD CONSTRAINT whatsapp_cloud_quota_policies_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_quota_reservations whatsapp_cloud_quota_reservat_whatsapp_account_id_organiza_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_quota_reservations
    ADD CONSTRAINT whatsapp_cloud_quota_reservat_whatsapp_account_id_organiza_fkey FOREIGN KEY (whatsapp_account_id, organization_id) REFERENCES public.whatsapp_accounts(id, organization_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_cloud_quota_reservations whatsapp_cloud_quota_reservati_customer_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_quota_reservations
    ADD CONSTRAINT whatsapp_cloud_quota_reservati_customer_id_organization_id_fkey FOREIGN KEY (customer_id, organization_id) REFERENCES public.customers(id, organization_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_cloud_quota_reservations whatsapp_cloud_quota_reservations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_quota_reservations
    ADD CONSTRAINT whatsapp_cloud_quota_reservations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_quota_reservations whatsapp_cloud_quota_reservations_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_quota_reservations
    ADD CONSTRAINT whatsapp_cloud_quota_reservations_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_cloud_template_audit_events whatsapp_cloud_template_audit_e_binding_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_audit_events
    ADD CONSTRAINT whatsapp_cloud_template_audit_e_binding_id_organization_id_fkey FOREIGN KEY (binding_id, organization_id) REFERENCES public.whatsapp_cloud_template_bindings(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_template_audit_events whatsapp_cloud_template_audit_eve_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_audit_events
    ADD CONSTRAINT whatsapp_cloud_template_audit_eve_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_template_audit_events whatsapp_cloud_template_audit_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_audit_events
    ADD CONSTRAINT whatsapp_cloud_template_audit_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: whatsapp_cloud_template_audit_events whatsapp_cloud_template_audit_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_audit_events
    ADD CONSTRAINT whatsapp_cloud_template_audit_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_template_audit_events whatsapp_cloud_template_audit_submission_id_organization_i_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_audit_events
    ADD CONSTRAINT whatsapp_cloud_template_audit_submission_id_organization_i_fkey FOREIGN KEY (submission_id, organization_id) REFERENCES public.whatsapp_cloud_template_submissions(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_template_audit_events whatsapp_cloud_template_audit_whatsapp_business_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_audit_events
    ADD CONSTRAINT whatsapp_cloud_template_audit_whatsapp_business_account_id_fkey FOREIGN KEY (whatsapp_business_account_id, organization_id) REFERENCES public.whatsapp_business_accounts(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_template_bindings whatsapp_cloud_template_bindi_cloud_template_id_organizati_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_bindings
    ADD CONSTRAINT whatsapp_cloud_template_bindi_cloud_template_id_organizati_fkey FOREIGN KEY (cloud_template_id, organization_id) REFERENCES public.whatsapp_cloud_templates(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_template_bindings whatsapp_cloud_template_bindi_whatsapp_business_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_bindings
    ADD CONSTRAINT whatsapp_cloud_template_bindi_whatsapp_business_account_id_fkey FOREIGN KEY (whatsapp_business_account_id, organization_id) REFERENCES public.whatsapp_business_accounts(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_template_bindings whatsapp_cloud_template_bindings_archived_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_bindings
    ADD CONSTRAINT whatsapp_cloud_template_bindings_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES public.users(id);


--
-- Name: whatsapp_cloud_template_bindings whatsapp_cloud_template_bindings_asset_waba_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_bindings
    ADD CONSTRAINT whatsapp_cloud_template_bindings_asset_waba_fkey FOREIGN KEY (cloud_template_id, whatsapp_business_account_id, organization_id) REFERENCES public.whatsapp_cloud_templates(id, whatsapp_business_account_id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_template_bindings whatsapp_cloud_template_bindings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_bindings
    ADD CONSTRAINT whatsapp_cloud_template_bindings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_cloud_template_bindings whatsapp_cloud_template_bindings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_bindings
    ADD CONSTRAINT whatsapp_cloud_template_bindings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_template_bindings whatsapp_cloud_template_bindings_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_bindings
    ADD CONSTRAINT whatsapp_cloud_template_bindings_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_template_bindings whatsapp_cloud_template_bindings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_bindings
    ADD CONSTRAINT whatsapp_cloud_template_bindings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: whatsapp_cloud_template_submissions whatsapp_cloud_template_submi_local_template_id_organizati_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_submissions
    ADD CONSTRAINT whatsapp_cloud_template_submi_local_template_id_organizati_fkey FOREIGN KEY (local_template_id, organization_id) REFERENCES public.whatsapp_message_templates(id, organization_id) ON DELETE SET NULL;


--
-- Name: whatsapp_cloud_template_submissions whatsapp_cloud_template_submi_originating_store_id_organiz_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_submissions
    ADD CONSTRAINT whatsapp_cloud_template_submi_originating_store_id_organiz_fkey FOREIGN KEY (originating_store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE SET NULL;


--
-- Name: whatsapp_cloud_template_submissions whatsapp_cloud_template_submi_whatsapp_business_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_submissions
    ADD CONSTRAINT whatsapp_cloud_template_submi_whatsapp_business_account_id_fkey FOREIGN KEY (whatsapp_business_account_id, organization_id) REFERENCES public.whatsapp_business_accounts(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_template_submissions whatsapp_cloud_template_submissions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_submissions
    ADD CONSTRAINT whatsapp_cloud_template_submissions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_cloud_template_submissions whatsapp_cloud_template_submissions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_submissions
    ADD CONSTRAINT whatsapp_cloud_template_submissions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_template_submissions whatsapp_cloud_template_submissions_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_template_submissions
    ADD CONSTRAINT whatsapp_cloud_template_submissions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: whatsapp_cloud_templates whatsapp_cloud_templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_templates
    ADD CONSTRAINT whatsapp_cloud_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_templates whatsapp_cloud_templates_whatsapp_business_account_id_orga_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_templates
    ADD CONSTRAINT whatsapp_cloud_templates_whatsapp_business_account_id_orga_fkey FOREIGN KEY (whatsapp_business_account_id, organization_id) REFERENCES public.whatsapp_business_accounts(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_usage_ledger whatsapp_cloud_usage_ledger_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_usage_ledger
    ADD CONSTRAINT whatsapp_cloud_usage_ledger_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_cloud_usage_ledger whatsapp_cloud_usage_ledger_reservation_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_usage_ledger
    ADD CONSTRAINT whatsapp_cloud_usage_ledger_reservation_id_organization_id_fkey FOREIGN KEY (reservation_id, organization_id) REFERENCES public.whatsapp_cloud_quota_reservations(id, organization_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_cloud_webhook_events whatsapp_cloud_webhook_events_whatsapp_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_cloud_webhook_events
    ADD CONSTRAINT whatsapp_cloud_webhook_events_whatsapp_account_id_fkey FOREIGN KEY (whatsapp_account_id) REFERENCES public.whatsapp_accounts(id) ON DELETE SET NULL;


--
-- Name: whatsapp_conversations whatsapp_conversations_customer_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_customer_id_organization_id_fkey FOREIGN KEY (customer_id, organization_id) REFERENCES public.customers(id, organization_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_conversations whatsapp_conversations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_conversations whatsapp_conversations_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_conversations whatsapp_conversations_whatsapp_account_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_whatsapp_account_fkey FOREIGN KEY (whatsapp_account_id, organization_id) REFERENCES public.whatsapp_accounts(id, organization_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_customer_consent_events whatsapp_customer_consent_even_customer_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_customer_consent_events
    ADD CONSTRAINT whatsapp_customer_consent_even_customer_id_organization_id_fkey FOREIGN KEY (customer_id, organization_id) REFERENCES public.customers(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_customer_consent_events whatsapp_customer_consent_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_customer_consent_events
    ADD CONSTRAINT whatsapp_customer_consent_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_customer_consent_events whatsapp_customer_consent_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_customer_consent_events
    ADD CONSTRAINT whatsapp_customer_consent_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_message_templates whatsapp_message_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_message_templates
    ADD CONSTRAINT whatsapp_message_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_message_templates whatsapp_message_templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_message_templates
    ADD CONSTRAINT whatsapp_message_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_message_templates whatsapp_message_templates_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_message_templates
    ADD CONSTRAINT whatsapp_message_templates_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_message_templates whatsapp_message_templates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_message_templates
    ADD CONSTRAINT whatsapp_message_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: whatsapp_messages whatsapp_messages_conversation_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_conversation_id_organization_id_store_id_fkey FOREIGN KEY (conversation_id, organization_id, store_id, whatsapp_account_id) REFERENCES public.whatsapp_conversations(id, organization_id, store_id, whatsapp_account_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_messages whatsapp_messages_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_messages whatsapp_messages_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_messages whatsapp_messages_whatsapp_account_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_whatsapp_account_fkey FOREIGN KEY (whatsapp_account_id, organization_id) REFERENCES public.whatsapp_accounts(id, organization_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_outbox whatsapp_outbox_cloud_quota_reservation_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_outbox
    ADD CONSTRAINT whatsapp_outbox_cloud_quota_reservation_fkey FOREIGN KEY (cloud_quota_reservation_id, organization_id) REFERENCES public.whatsapp_cloud_quota_reservations(id, organization_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_outbox whatsapp_outbox_cloud_template_binding_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_outbox
    ADD CONSTRAINT whatsapp_outbox_cloud_template_binding_fkey FOREIGN KEY (cloud_template_binding_id, organization_id) REFERENCES public.whatsapp_cloud_template_bindings(id, organization_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_outbox whatsapp_outbox_message_id_organization_id_store_id_whatsa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_outbox
    ADD CONSTRAINT whatsapp_outbox_message_id_organization_id_store_id_whatsa_fkey FOREIGN KEY (message_id, organization_id, store_id, whatsapp_account_id) REFERENCES public.whatsapp_messages(id, organization_id, store_id, whatsapp_account_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_outbox whatsapp_outbox_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_outbox
    ADD CONSTRAINT whatsapp_outbox_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_outbox whatsapp_outbox_sale_id_organization_id_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_outbox
    ADD CONSTRAINT whatsapp_outbox_sale_id_organization_id_store_id_fkey FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES public.sales(id, organization_id, store_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_outbox whatsapp_outbox_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_outbox
    ADD CONSTRAINT whatsapp_outbox_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: whatsapp_outbox whatsapp_outbox_whatsapp_account_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_outbox
    ADD CONSTRAINT whatsapp_outbox_whatsapp_account_fkey FOREIGN KEY (whatsapp_account_id, organization_id) REFERENCES public.whatsapp_accounts(id, organization_id) ON DELETE RESTRICT;


--
-- Name: whatsapp_provider_events whatsapp_provider_events_whatsapp_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_provider_events
    ADD CONSTRAINT whatsapp_provider_events_whatsapp_account_id_fkey FOREIGN KEY (whatsapp_account_id) REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE;


--
-- Name: whatsapp_public_invoice_links whatsapp_public_invoice_links_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_public_invoice_links
    ADD CONSTRAINT whatsapp_public_invoice_links_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_public_invoice_links whatsapp_public_invoice_links_sale_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_public_invoice_links
    ADD CONSTRAINT whatsapp_public_invoice_links_sale_fk FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES public.sales(id, organization_id, store_id) ON DELETE CASCADE;


--
-- Name: whatsapp_public_invoice_links whatsapp_public_invoice_links_store_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_public_invoice_links
    ADD CONSTRAINT whatsapp_public_invoice_links_store_fk FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


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
    ('20260809120000'),
    ('20260810120000'),
    ('20260810130000'),
    ('20260810140000'),
    ('20260811100000'),
    ('20260811120000'),
    ('20260813100000'),
    ('20260813110000'),
    ('20260813120000'),
    ('20260814100000'),
    ('20260814120000'),
    ('20260815100000'),
    ('20260816100000'),
    ('20260816110000'),
    ('20260816120000'),
    ('20260816150000'),
    ('20260816170000'),
    ('20260816190000'),
    ('20260816200000'),
    ('20260816201000'),
    ('20260816210000'),
    ('20260816210500'),
    ('20260816211000'),
    ('20260816220000'),
    ('20260817000000'),
    ('20260817090000'),
    ('20260817100000'),
    ('20260820100000'),
    ('20260821100000'),
    ('20260821120000'),
    ('20260821140000'),
    ('20260821150000'),
    ('20260821160000'),
    ('20260821170000'),
    ('20260821180000'),
    ('20260821181000'),
    ('20260821182000'),
    ('20260821183000'),
    ('20260822090000'),
    ('20260822100000'),
    ('20260822110000'),
    ('20260822120000'),
    ('20260822121000'),
    ('20260822140000'),
    ('20260822150000'),
    ('20260822160000'),
    ('20260822170000'),
    ('20260822180000'),
    ('20260822190000'),
    ('20260823090000'),
    ('20260823100000'),
    ('20260823110000'),
    ('20260823120000'),
    ('20260823120001'),
    ('20260823130000'),
    ('20260823130001'),
    ('20260823140000'),
    ('20260823140001'),
    ('20260823150000'),
    ('20260826100000'),
    ('20260826110000'),
    ('20260826120000'),
    ('20260826130000'),
    ('20260826140000'),
    ('20260826150000'),
    ('20260827120000'),
    ('20260828140000'),
    ('20260830120000'),
    ('20260830200000'),
    ('20260831010000'),
    ('20260831020000'),
    ('20260831030000'),
    ('20260831040000'),
    ('20260831040100'),
    ('20260831050000'),
    ('20260831050100'),
    ('20260831060000'),
    ('20260831060100'),
    ('20260831060200'),
    ('20260831060300'),
    ('20260831070000'),
    ('20260831080000'),
    ('20260831090000'),
    ('20260831100000'),
    ('20260831100100'),
    ('20260831100200'),
    ('20260831100300'),
    ('20260831100400'),
    ('20260831100500'),
    ('20260831100600'),
    ('20260831100700'),
    ('20260901010000'),
    ('20260901020000'),
    ('20260901020100'),
    ('20260901020200'),
    ('20260901020300'),
    ('20260901020400'),
    ('20260901020500'),
    ('20260903010000'),
    ('20260904010000'),
    ('20260904020000'),
    ('20260904030000'),
    ('20260904040000'),
    ('20260904050000'),
    ('20260904060000'),
    ('20260904070000'),
    ('20260904080000'),
    ('20260904090000'),
    ('20260906090000'),
    ('20260906100000'),
    ('20260906110000'),
    ('20260906120000'),
    ('20260907090000'),
    ('20260907100000'),
    ('20260907110000'),
    ('20260907120000'),
    ('20260907130000'),
    ('20260907140000'),
    ('20260907150000');

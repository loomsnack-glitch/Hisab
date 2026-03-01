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
-- Name: inventory_reference_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inventory_reference_type AS ENUM (
    'purchase',
    'sale',
    'manual',
    'return'
);


--
-- Name: inventory_transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inventory_transaction_type AS ENUM (
    'in',
    'out',
    'adjustment'
);


--
-- Name: ledger_entry_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ledger_entry_type AS ENUM (
    'sale',
    'payment',
    'adjustment',
    'refund'
);


--
-- Name: payment_direction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_direction AS ENUM (
    'in',
    'out'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'upi',
    'card',
    'credit',
    'other'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'partial'
);


--
-- Name: sale_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sale_status AS ENUM (
    'draft',
    'completed',
    'voided',
    'refunded'
);


--
-- Name: session_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.session_status AS ENUM (
    'open',
    'closed',
    'discrepancy'
);


--
-- Name: txn_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.txn_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'manager',
    'cashier'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    previous_state jsonb,
    new_state jsonb,
    ip_address character varying(45),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: cash_register_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_register_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    opened_by uuid NOT NULL,
    closed_by uuid,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    opening_balance numeric(12,2) DEFAULT 0.00 NOT NULL,
    closing_balance numeric(12,2),
    expected_balance numeric(12,2),
    status public.session_status DEFAULT 'open'::public.session_status NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cash_register_sessions_closing_balance_check CHECK ((closing_balance >= (0)::numeric)),
    CONSTRAINT cash_register_sessions_expected_balance_check CHECK ((expected_balance >= (0)::numeric)),
    CONSTRAINT cash_register_sessions_opening_balance_check CHECK ((opening_balance >= (0)::numeric))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    type public.ledger_entry_type NOT NULL,
    amount numeric(12,2) NOT NULL,
    balance_after numeric(12,2) NOT NULL,
    reference_type character varying(50),
    reference_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    phone character varying(20) NOT NULL,
    name character varying(255),
    loyalty_points integer DEFAULT 0,
    balance numeric(12,2) DEFAULT 0.00 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sync_id uuid DEFAULT gen_random_uuid(),
    sync_version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type public.inventory_transaction_type NOT NULL,
    quantity numeric(10,3) NOT NULL,
    reference_type public.inventory_reference_type NOT NULL,
    reference_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT inventory_transactions_quantity_check CHECK ((quantity <> (0)::numeric))
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    sale_id uuid,
    session_id uuid,
    amount numeric(12,2) NOT NULL,
    direction public.payment_direction DEFAULT 'in'::public.payment_direction NOT NULL,
    method public.payment_method NOT NULL,
    status public.txn_status DEFAULT 'completed'::public.txn_status NOT NULL,
    reference_number character varying(255),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid,
    category_id uuid,
    barcode character varying(255) NOT NULL,
    sku character varying(255),
    name character varying(255) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    cost_price numeric(10,2),
    tax_rate numeric(5,2) DEFAULT 0.00 NOT NULL,
    current_stock numeric(10,3) DEFAULT 0.000 NOT NULL,
    low_stock_threshold numeric(10,3) DEFAULT 0.000 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sync_id uuid DEFAULT gen_random_uuid(),
    sync_version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT products_cost_price_check CHECK ((cost_price >= (0)::numeric)),
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_tax_rate_check CHECK (((tax_rate >= (0)::numeric) AND (tax_rate <= (100)::numeric)))
);


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    sale_id uuid NOT NULL,
    product_id uuid,
    quantity numeric(10,3) NOT NULL,
    product_name_snapshot character varying(255) NOT NULL,
    price_snapshot numeric(10,2) NOT NULL,
    cost_price_snapshot numeric(10,2) NOT NULL,
    tax_rate_snapshot numeric(5,2) DEFAULT 0.00 NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    line_total numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sale_items_cost_price_snapshot_check CHECK ((cost_price_snapshot >= (0)::numeric)),
    CONSTRAINT sale_items_discount_amount_check CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT sale_items_price_snapshot_check CHECK ((price_snapshot >= (0)::numeric)),
    CONSTRAINT sale_items_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT sale_items_tax_rate_snapshot_check CHECK (((tax_rate_snapshot >= (0)::numeric) AND (tax_rate_snapshot <= (100)::numeric)))
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_number bigint NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    session_id uuid,
    customer_id uuid,
    user_id uuid NOT NULL,
    status public.sale_status DEFAULT 'draft'::public.sale_status NOT NULL,
    subtotal numeric(12,2) DEFAULT 0.00 NOT NULL,
    tax_total numeric(12,2) DEFAULT 0.00 NOT NULL,
    discount_total numeric(12,2) DEFAULT 0.00 NOT NULL,
    grand_total numeric(12,2) DEFAULT 0.00 NOT NULL,
    payment_status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    voided_at timestamp with time zone,
    void_reason text,
    cancelled_by uuid,
    sync_id uuid DEFAULT gen_random_uuid(),
    sync_version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sales_discount_total_check CHECK ((discount_total >= (0)::numeric)),
    CONSTRAINT sales_grand_total_check CHECK ((grand_total >= (0)::numeric)),
    CONSTRAINT sales_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT sales_tax_total_check CHECK ((tax_total >= (0)::numeric))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: store_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_counters (
    store_id uuid NOT NULL,
    sale_counter bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_stores (
    user_id uuid NOT NULL,
    store_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    store_id uuid,
    role public.user_role DEFAULT 'cashier'::public.user_role NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(20),
    pin_hash character varying(255),
    password_hash character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cash_register_sessions cash_register_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_sessions
    ADD CONSTRAINT cash_register_sessions_pkey PRIMARY KEY (id);


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
-- Name: customers customers_organization_id_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_organization_id_phone_key UNIQUE (organization_id, phone);


--
-- Name: customers customers_organization_id_sync_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_organization_id_sync_id_key UNIQUE (organization_id, sync_id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


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
-- Name: products products_organization_id_barcode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_organization_id_barcode_key UNIQUE (organization_id, barcode);


--
-- Name: products products_organization_id_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_organization_id_sku_key UNIQUE (organization_id, sku);


--
-- Name: products products_organization_id_sync_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_organization_id_sync_id_key UNIQUE (organization_id, sync_id);


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
-- Name: sales sales_organization_id_sync_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_organization_id_sync_id_key UNIQUE (organization_id, sync_id);


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
-- Name: store_counters store_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_counters
    ADD CONSTRAINT store_counters_pkey PRIMARY KEY (store_id);


--
-- Name: stores stores_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: user_stores user_stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stores
    ADD CONSTRAINT user_stores_pkey PRIMARY KEY (user_id, store_id);


--
-- Name: users users_organization_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_email_key UNIQUE (organization_id, email);


--
-- Name: users users_organization_id_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_phone_key UNIQUE (organization_id, phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (organization_id, created_at);


--
-- Name: idx_audit_logs_org_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_org_entity ON public.audit_logs USING btree (organization_id, entity_type, entity_id);


--
-- Name: idx_customers_org_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_org_phone ON public.customers USING btree (organization_id, phone);


--
-- Name: idx_customers_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_updated_at ON public.customers USING btree (updated_at);


--
-- Name: idx_inventory_txn_org_store_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_txn_org_store_created ON public.inventory_transactions USING btree (organization_id, store_id, created_at);


--
-- Name: idx_inventory_txn_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_txn_product ON public.inventory_transactions USING btree (product_id);


--
-- Name: idx_inventory_txn_product_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_txn_product_store ON public.inventory_transactions USING btree (product_id, store_id);


--
-- Name: idx_ledger_customer_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_customer_created ON public.customer_ledger USING btree (customer_id, created_at DESC);


--
-- Name: idx_payments_org_store_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_org_store_created ON public.payments USING btree (organization_id, store_id, created_at);


--
-- Name: idx_payments_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_sale_id ON public.payments USING btree (sale_id);


--
-- Name: idx_payments_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_updated_at ON public.payments USING btree (updated_at);


--
-- Name: idx_products_org_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_org_barcode ON public.products USING btree (organization_id, barcode);


--
-- Name: idx_products_store_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_store_active ON public.products USING btree (store_id, is_active);


--
-- Name: idx_products_store_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_store_created ON public.products USING btree (store_id, created_at);


--
-- Name: idx_products_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_updated_at ON public.products USING btree (updated_at);


--
-- Name: idx_sale_items_org_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_org_store ON public.sale_items USING btree (organization_id, store_id);


--
-- Name: idx_sale_items_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_sale_id ON public.sale_items USING btree (sale_id);


--
-- Name: idx_sales_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_customer ON public.sales USING btree (customer_id);


--
-- Name: idx_sales_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_number ON public.sales USING btree (store_id, sale_number);


--
-- Name: idx_sales_org_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_org_created ON public.sales USING btree (organization_id, created_at);


--
-- Name: idx_sales_store_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_store_session ON public.sales USING btree (store_id, session_id);


--
-- Name: idx_sales_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_updated_at ON public.sales USING btree (updated_at);


--
-- Name: idx_sessions_store_opened; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_store_opened ON public.cash_register_sessions USING btree (store_id, opened_at);


--
-- Name: sales prevent_sales_delete; Type: RULE; Schema: public; Owner: -
--

CREATE RULE prevent_sales_delete AS
    ON DELETE TO public.sales DO INSTEAD NOTHING;


--
-- Name: audit_logs audit_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cash_register_sessions cash_register_sessions_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_sessions
    ADD CONSTRAINT cash_register_sessions_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.users(id);


--
-- Name: cash_register_sessions cash_register_sessions_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_sessions
    ADD CONSTRAINT cash_register_sessions_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.users(id);


--
-- Name: cash_register_sessions cash_register_sessions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_sessions
    ADD CONSTRAINT cash_register_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: cash_register_sessions cash_register_sessions_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_sessions
    ADD CONSTRAINT cash_register_sessions_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: categories categories_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: customer_ledger customer_ledger_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_ledger
    ADD CONSTRAINT customer_ledger_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_ledger customer_ledger_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_ledger
    ADD CONSTRAINT customer_ledger_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: customers customers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payments payments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: payments payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE RESTRICT;


--
-- Name: payments payments_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.cash_register_sessions(id);


--
-- Name: payments payments_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: products products_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: products products_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: sale_items sale_items_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: sale_items sale_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sale_items sale_items_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE CASCADE;


--
-- Name: sales sales_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id);


--
-- Name: sales sales_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: sales sales_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: sales sales_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.cash_register_sessions(id);


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
-- Name: store_counters store_counters_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_counters
    ADD CONSTRAINT store_counters_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: stores stores_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: user_stores user_stores_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stores
    ADD CONSTRAINT user_stores_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: user_stores user_stores_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stores
    ADD CONSTRAINT user_stores_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: user_stores user_stores_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stores
    ADD CONSTRAINT user_stores_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id);


--
-- Name: user_stores user_stores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stores
    ADD CONSTRAINT user_stores_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: users users_store_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id) REFERENCES public.stores(id, organization_id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260301111014');

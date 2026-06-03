export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type RowBase = {
  id: string;
  created_at: string;
  updated_at: string;
};

type SoftDelete = {
  deleted_at: string | null;
};

type Mutable<T extends RowBase> = Partial<Omit<T, "id" | "created_at" | "updated_at">>;

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row extends RowBase, Insert = Partial<Row>, Update = Mutable<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationship[];
};

type AppendOnlyTable<Row extends { id: string; created_at: string }, Insert = Partial<Row>, Update = Partial<Omit<Row, "id" | "created_at">>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationship[];
};

export type Database = {
  public: {
    Tables: {
      departments: Table<
        RowBase &
          SoftDelete & {
            slug: string;
            canonical_name: string;
            multilingual_names: Json;
            aliases: string[];
            search_terms: string[];
            regional_priority: Json;
            seasonality: Json;
            perishability_class: Database["public"]["Enums"]["perishability_class"];
            image_requirements: Json;
            packaging_defaults: Json;
            fulfillment_constraints: Json;
            dietary_classification: Json;
            discovery_tags: string[];
            sort_order: number;
            is_active: boolean;
            status: string;
            is_mvp_enabled: boolean;
            quality_score: number;
            governance_metadata: Json;
          }
      >;
      subcategories: Table<
        RowBase &
          SoftDelete & {
            department_id: string;
            category_id: string;
            slug: string;
            canonical_name: string;
            multilingual_names: Json;
            aliases: string[];
            search_terms: string[];
            regional_priority: Json;
            seasonality: Json;
            perishability_class: Database["public"]["Enums"]["perishability_class"];
            image_requirements: Json;
            packaging_defaults: Json;
            fulfillment_constraints: Json;
            dietary_classification: Json;
            discovery_tags: string[];
            sort_order: number;
            is_active: boolean;
            status: string;
            is_mvp_enabled: boolean;
            quality_score: number;
            governance_metadata: Json;
          }
      >;
      product_families: Table<
        RowBase &
          SoftDelete & {
            department_id: string;
            category_id: string;
            subcategory_id: string | null;
            slug: string;
            canonical_name: string;
            product_group: string | null;
            multilingual_names: Json;
            aliases: string[];
            search_terms: string[];
            regional_priority: Json;
            seasonality: Json;
            perishability_class: Database["public"]["Enums"]["perishability_class"];
            image_requirements: Json;
            packaging_defaults: Json;
            fulfillment_constraints: Json;
            dietary_classification: Json;
            discovery_tags: string[];
            is_active: boolean;
            status: string;
            is_mvp_enabled: boolean;
            quality_score: number;
            governance_metadata: Json;
          }
      >;
      brands: Table<
        RowBase &
          SoftDelete & {
            slug: string;
            canonical_name: string;
            manufacturer: string | null;
            origin_region: Database["public"]["Enums"]["commerce_region"] | null;
            country_code: string;
            aliases: string[];
            is_local_brand: boolean;
            metadata: Json;
            status: string;
          }
      >;
      profiles: Table<
        RowBase &
          SoftDelete & {
            full_name: string;
            email: string;
            phone: string | null;
            avatar_url: string | null;
            default_role: Database["public"]["Enums"]["app_role"];
            onboarding_completed_at: string | null;
            metadata: Json;
          }
      >;
      user_roles: Table<
        RowBase &
          SoftDelete & {
            user_id: string;
            role: Database["public"]["Enums"]["app_role"];
            granted_by: string | null;
            granted_at: string;
          }
      >;
      addresses: Table<
        RowBase &
          SoftDelete & {
            user_id: string;
            label: string;
            type: Database["public"]["Enums"]["address_type"];
            recipient_name: string;
            phone: string;
            line1: string;
            line2: string | null;
            locality: string;
            city: string;
            region: string;
            postal_code: string;
            country_code: string;
            latitude: number | null;
            longitude: number | null;
            is_default: boolean;
          }
      >;
      vendors: Table<
        RowBase &
          SoftDelete & {
            owner_id: string;
            name: string;
            slug: string;
            description: string | null;
            status: Database["public"]["Enums"]["vendor_status"];
            email: string | null;
            phone: string | null;
            logo_url: string | null;
            banner_url: string | null;
            service_radius_km: number;
            rating_average: number;
            rating_count: number;
            metadata: Json;
          }
      >;
      vendor_members: Table<
        RowBase &
          SoftDelete & {
            vendor_id: string;
            user_id: string;
            role: Database["public"]["Enums"]["vendor_member_role"];
            invited_by: string | null;
            joined_at: string | null;
          }
      >;
      vendor_verification: Table<
        RowBase & {
          vendor_id: string;
          status: Database["public"]["Enums"]["verification_status"];
          legal_name: string | null;
          tax_id: string | null;
          document_urls: string[];
          reviewed_by: string | null;
          reviewed_at: string | null;
          rejection_reason: string | null;
          submitted_at: string | null;
        }
      >;
      seller_kyc_profiles: Table<
        RowBase & {
          vendor_id: string;
          owner_id: string | null;
          business_name: string;
          owner_name: string;
          business_type: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          aadhaar_last4: string | null;
          pan_masked: string | null;
          verification_state: Database["public"]["Enums"]["verification_state"];
          submitted_at: string | null;
          verified_at: string | null;
          suspended_at: string | null;
          suspension_reason: string | null;
          metadata: Json;
        }
      >;
      verification_documents: Table<
        RowBase & {
          kyc_profile_id: string;
          vendor_id: string;
          document_type: Database["public"]["Enums"]["verification_document_type"];
          status: Database["public"]["Enums"]["verification_state"];
          file_name: string | null;
          private_storage_path: string | null;
          uploaded_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          notes: string | null;
          rejection_reason: string | null;
          is_required: boolean;
          metadata: Json;
        }
      >;
      verification_reviews: AppendOnlyTable<{
        id: string;
        created_at: string;
        kyc_profile_id: string;
        vendor_id: string;
        document_id: string | null;
        reviewer_id: string | null;
        decision: Database["public"]["Enums"]["verification_state"];
        note: string;
        metadata: Json;
      }>;
      compliance_flags: Table<
        RowBase & {
          vendor_id: string;
          flag_type: string;
          severity: string;
          status: string;
          title: string;
          detail: string;
          owner: string;
          resolved_at: string | null;
          metadata: Json;
        }
      >;
      trust_scores: Table<
        RowBase & {
          vendor_id: string;
          score: number;
          trust_level: string;
          factors: Json;
          metadata: Json;
        }
      >;
      bank_verification_placeholders: Table<
        RowBase & {
          vendor_id: string;
          account_holder_name: string;
          bank_name: string | null;
          masked_account_number: string | null;
          ifsc: string | null;
          status: Database["public"]["Enums"]["verification_state"];
          payout_readiness: string;
          notes: string | null;
          metadata: Json;
        }
      >;
      gst_verification_placeholders: Table<
        RowBase & {
          vendor_id: string;
          gstin: string | null;
          legal_name: string | null;
          status: Database["public"]["Enums"]["verification_state"];
          invoice_enabled: boolean;
          notes: string | null;
          metadata: Json;
        }
      >;
      trust_audit_events: AppendOnlyTable<{
        id: string;
        created_at: string;
        vendor_id: string;
        actor_id: string | null;
        actor_type: string;
        action: string;
        metadata: Json;
      }>;
      vendor_settings: Table<
        RowBase & {
          vendor_id: string;
          accepts_orders: boolean;
          minimum_order_amount: number;
          average_prep_minutes: number;
          operating_hours: Json;
          notification_channels: Database["public"]["Enums"]["notification_channel"][];
        }
      >;
      categories: Table<
        RowBase &
          SoftDelete & {
            parent_id: string | null;
            name: string;
            slug: string;
            description: string | null;
            image_url: string | null;
            sort_order: number;
            is_active: boolean;
          }
      >;
      products: Table<
        RowBase &
          SoftDelete & {
            vendor_id: string;
            category_id: string;
            name: string;
            slug: string;
            description: string | null;
            status: Database["public"]["Enums"]["product_status"];
            base_price: number;
            currency: string;
            search_document: unknown;
            ai_index_metadata: Json;
            embedding: string | null;
            embedding_text: string | null;
            embedding_model: string | null;
            embedding_updated_at: string | null;
            embedding_refresh_state: string;
            embedding_refresh_error: string | null;
            embedding_refresh_requested_at: string;
            search_quality_score: number;
            discovery_metadata: Json;
            published_at: string | null;
          }
      >;
      product_images: Table<
        RowBase &
          SoftDelete & {
            product_id: string;
            storage_path: string;
            alt_text: string | null;
            sort_order: number;
            is_primary: boolean;
          }
      >;
      product_variants: Table<
        RowBase &
          SoftDelete & {
            product_id: string;
            sku: string;
            name: string;
            attributes: Json;
            price_delta: number;
            is_active: boolean;
          }
      >;
      inventory: Table<
        RowBase &
          SoftDelete & {
            vendor_id: string;
            product_id: string;
            variant_id: string | null;
            stock_quantity: number;
            reserved_quantity: number;
            low_stock_threshold: number;
            stock_status: Database["public"]["Enums"]["stock_status"];
            restock_eta: string | null;
          }
      >;
      inventory_movements: Table<
        RowBase & {
          inventory_id: string;
          vendor_id: string;
          movement_type: Database["public"]["Enums"]["inventory_movement_type"];
          quantity_delta: number;
          quantity_after: number;
          reason: string | null;
          reference_type: string | null;
          reference_id: string | null;
          actor_id: string | null;
        }
      >;
      cart_items: Table<
        RowBase &
          SoftDelete & {
            user_id: string;
            product_id: string;
            variant_id: string | null;
            quantity: number;
            reserved_until: string | null;
          }
      >;
      checkout_idempotency_keys: Table<
        RowBase & {
          user_id: string;
          key: string;
          request_hash: string;
          status: Database["public"]["Enums"]["checkout_transaction_state"];
          response: Json | null;
          locked_until: string;
          completed_at: string | null;
        }
      >;
      checkout_transactions: Table<
        RowBase & {
          buyer_id: string;
          idempotency_key_id: string;
          state: Database["public"]["Enums"]["checkout_transaction_state"];
          cart_snapshot: Json;
          delivery_address: Json;
          payment_method: string;
          payment_reference: string;
          amount_total: number;
          currency: string;
          failure_code: string | null;
          failure_message: string | null;
          recovery_after: string | null;
          metadata: Json;
        }
      >;
      inventory_reservations: Table<
        RowBase & {
          transaction_id: string;
          order_id: string | null;
          order_item_id: string | null;
          inventory_id: string;
          vendor_id: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          state: Database["public"]["Enums"]["reservation_state"];
          expires_at: string;
          released_at: string | null;
          release_reason: string | null;
        }
      >;
      payment_attempts: Table<
        RowBase & {
          transaction_id: string;
          order_id: string | null;
          provider: string;
          provider_order_id: string;
          provider_payment_id: string | null;
          provider_signature: string | null;
          idempotency_key: string;
          state: Database["public"]["Enums"]["payment_attempt_state"];
          amount: number;
          currency: string;
          raw_payload: Json;
          verified_at: string | null;
          failure_reason: string | null;
          financial_state: Database["public"]["Enums"]["payment_financial_state"];
          receipt: string | null;
          provider_order_status: string | null;
          provider_amount_due: number | null;
          provider_amount_paid: number | null;
          provider_created_at: string | null;
          expires_at: string | null;
          verification_attempts: number;
          last_verified_at: string | null;
          reconciliation_state: string;
          reconciliation_error: string | null;
        }
      >;
      payment_webhook_events: AppendOnlyTable<{
        id: string;
        created_at: string;
        provider: string;
        event_id: string;
        event_type: string;
        provider_order_id: string | null;
        provider_payment_id: string | null;
        signature_valid: boolean;
        processed_at: string | null;
        processing_error: string | null;
        raw_payload: Json;
      }>;
      payment_order_events: AppendOnlyTable<{
        id: string;
        created_at: string;
        payment_attempt_id: string;
        transaction_id: string;
        provider: string;
        event_type: string;
        financial_state: Database["public"]["Enums"]["payment_financial_state"];
        provider_order_id: string | null;
        provider_payment_id: string | null;
        amount: number;
        currency: string;
        metadata: Json;
      }>;
      refund_requests: Table<
        RowBase & {
          order_id: string;
          transaction_id: string | null;
          payment_attempt_id: string | null;
          requested_by: string | null;
          state: Database["public"]["Enums"]["refund_state"];
          amount: number;
          currency: string;
          reason: string;
          provider_refund_id: string | null;
          idempotency_key: string;
          raw_payload: Json;
          failure_reason: string | null;
          completed_at: string | null;
        }
      >;
      seller_payout_attributions: Table<
        RowBase & {
          order_id: string;
          transaction_id: string | null;
          vendor_id: string;
          payment_attempt_id: string | null;
          gross_amount: number;
          commission_amount: number;
          tax_withheld_amount: number;
          net_amount: number;
          currency: string;
          state: Database["public"]["Enums"]["payout_sync_state"];
          metadata: Json;
        }
      >;
      financial_reconciliation_runs: Table<
        RowBase & {
          run_type: string;
          state: Database["public"]["Enums"]["recovery_job_state"];
          started_at: string | null;
          completed_at: string | null;
          checked_count: number;
          repaired_count: number;
          alert_count: number;
          metadata: Json;
        }
      >;
      financial_ledger_journals: AppendOnlyTable<{
        id: string;
        created_at: string;
        posted_at: string;
        source_type: string;
        source_id: string;
        source_event_id: string;
        actor_id: string | null;
        actor_type: string;
        state: Database["public"]["Enums"]["financial_journal_state"];
        currency: string;
        total_debit: number;
        total_credit: number;
        description: string;
        metadata: Json;
        reversal_of_journal_id: string | null;
      }>;
      financial_ledger_entries: AppendOnlyTable<{
        id: string;
        created_at: string;
        journal_id: string;
        source_type: string;
        source_id: string;
        account_code: string;
        party_type: Database["public"]["Enums"]["ledger_party_type"];
        party_id: string | null;
        direction: Database["public"]["Enums"]["ledger_entry_direction"];
        amount: number;
        currency: string;
        order_id: string | null;
        transaction_id: string | null;
        vendor_id: string | null;
        payment_attempt_id: string | null;
        refund_request_id: string | null;
        payout_batch_id: string | null;
        description: string;
        metadata: Json;
        reversal_of_entry_id: string | null;
      }>;
      commission_rules: Table<
        RowBase & {
          name: string;
          scope_type: Database["public"]["Enums"]["commission_scope_type"];
          category_id: string | null;
          vendor_id: string | null;
          seller_tier: string | null;
          rate_bps: number;
          fixed_fee_amount: number;
          platform_fee_label: string;
          explanation: string;
          priority: number;
          effective_at: string;
          expires_at: string | null;
          is_active: boolean;
          created_by: string | null;
          metadata: Json;
        }
      >;
      order_commission_calculations: AppendOnlyTable<{
        id: string;
        created_at: string;
        order_id: string;
        vendor_id: string;
        commission_rule_id: string;
        basis_amount: number;
        rate_bps: number;
        fixed_fee_amount: number;
        commission_amount: number;
        currency: string;
        explanation: string;
        metadata: Json;
      }>;
      settlement_records: Table<
        RowBase & {
          order_id: string;
          transaction_id: string | null;
          payment_attempt_id: string | null;
          vendor_id: string;
          commission_calculation_id: string | null;
          gross_amount: number;
          commission_amount: number;
          refund_adjustment_amount: number;
          payout_deduction_amount: number;
          net_amount: number;
          available_amount: number;
          currency: string;
          lifecycle_state: Database["public"]["Enums"]["settlement_lifecycle_state"];
          expected_payout_at: string;
          settled_at: string | null;
          payout_released_at: string | null;
          hold_reason: string | null;
          idempotency_key: string;
          metadata: Json;
        }
      >;
      seller_payout_methods: Table<
        RowBase & {
          vendor_id: string;
          label: string;
          holder_name: string | null;
          bank_name: string | null;
          masked_account: string | null;
          ifsc_last4: string | null;
          readiness_state: string;
          is_default: boolean;
          metadata: Json;
        }
      >;
      seller_payout_batches: Table<
        RowBase & {
          vendor_id: string;
          payout_method_id: string | null;
          state: Database["public"]["Enums"]["payout_batch_state"];
          amount: number;
          currency: string;
          idempotency_key: string;
          retry_count: number;
          provider_payout_id: string | null;
          bank_reference: string | null;
          failure_code: string | null;
          failure_reason: string | null;
          scheduled_for: string;
          initiated_at: string | null;
          completed_at: string | null;
          reconciled_at: string | null;
          created_by: string | null;
          metadata: Json;
        }
      >;
      seller_payout_batch_items: AppendOnlyTable<{
        id: string;
        created_at: string;
        payout_batch_id: string;
        settlement_record_id: string;
        order_id: string;
        vendor_id: string;
        amount: number;
        currency: string;
      }>;
      financial_reconciliation_cases: Table<
        RowBase & {
          run_id: string | null;
          case_type: Database["public"]["Enums"]["reconciliation_case_type"];
          state: Database["public"]["Enums"]["reconciliation_case_state"];
          severity: string;
          vendor_id: string | null;
          order_id: string | null;
          transaction_id: string | null;
          payment_attempt_id: string | null;
          refund_request_id: string | null;
          payout_batch_id: string | null;
          expected_amount: number | null;
          observed_amount: number | null;
          currency: string;
          fingerprint: string;
          title: string;
          detail: string;
          recovery_action: string;
          metadata: Json;
          resolved_at: string | null;
        }
      >;
      financial_observability_events: AppendOnlyTable<{
        id: string;
        created_at: string;
        metric: string;
        value: number;
        vendor_id: string | null;
        order_id: string | null;
        transaction_id: string | null;
        payout_batch_id: string | null;
        tags: Json;
      }>;
      governance_cases: Table<
        RowBase & {
          case_type: Database["public"]["Enums"]["governance_case_type"];
          state: Database["public"]["Enums"]["governance_case_state"];
          severity: string;
          vendor_id: string | null;
          product_id: string | null;
          order_id: string | null;
          refund_request_id: string | null;
          payout_batch_id: string | null;
          assigned_to: string | null;
          title: string;
          summary: string;
          explanation: string;
          recommended_action: string;
          locale: string;
          fingerprint: string;
          resolved_at: string | null;
          metadata: Json;
        }
      >;
      governance_risk_signals: AppendOnlyTable<{
        id: string;
        created_at: string;
        signal_type: Database["public"]["Enums"]["governance_risk_signal_type"];
        vendor_id: string | null;
        buyer_id: string | null;
        order_id: string | null;
        product_id: string | null;
        refund_request_id: string | null;
        payout_batch_id: string | null;
        score: number;
        severity: string;
        evidence: Json;
        explanation: string;
        source: string;
        fingerprint: string;
      }>;
      governance_enforcement_actions: Table<
        RowBase & {
          vendor_id: string;
          case_id: string | null;
          enforcement_type: Database["public"]["Enums"]["governance_enforcement_type"];
          state: Database["public"]["Enums"]["governance_enforcement_state"];
          severity: string;
          reason: string;
          reversible: boolean;
          starts_at: string;
          expires_at: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
          reversal_reason: string | null;
          created_by: string | null;
          metadata: Json;
        }
      >;
      marketplace_disputes: Table<
        RowBase & {
          dispute_type: Database["public"]["Enums"]["dispute_type"];
          state: Database["public"]["Enums"]["dispute_state"];
          vendor_id: string | null;
          buyer_id: string | null;
          order_id: string | null;
          delivery_id: string | null;
          refund_request_id: string | null;
          payout_batch_id: string | null;
          opened_by: string | null;
          assigned_to: string | null;
          title: string;
          description: string;
          resolution: string | null;
          locale: string;
          resolved_at: string | null;
          metadata: Json;
        }
      >;
      dispute_evidence: AppendOnlyTable<{
        id: string;
        created_at: string;
        dispute_id: string;
        submitted_by: string | null;
        actor_type: string;
        evidence_type: string;
        storage_path: string | null;
        redacted_summary: string;
        private_notes: string | null;
        metadata: Json;
      }>;
      governance_observability_events: AppendOnlyTable<{
        id: string;
        created_at: string;
        metric: string;
        value: number;
        vendor_id: string | null;
        case_id: string | null;
        dispute_id: string | null;
        tags: Json;
      }>;
      transaction_audit_events: AppendOnlyTable<{
        id: string;
        created_at: string;
        transaction_id: string | null;
        order_id: string | null;
        actor_id: string | null;
        actor_type: string;
        action: string;
        state: Database["public"]["Enums"]["checkout_transaction_state"] | null;
        metadata: Json;
      }>;
      transaction_outbox_events: Table<
        RowBase & {
          transaction_id: string | null;
          aggregate_type: string;
          aggregate_id: string;
          event_type: string;
          payload: Json;
          state: Database["public"]["Enums"]["transaction_outbox_state"];
          published_at: string | null;
          attempts: number;
          last_error: string | null;
        }
      >;
      transaction_recovery_jobs: Table<
        RowBase & {
          transaction_id: string | null;
          job_type: string;
          state: Database["public"]["Enums"]["recovery_job_state"];
          run_after: string;
          attempts: number;
          last_error: string | null;
          metadata: Json;
        }
      >;
      transaction_integrity_alerts: Table<
        RowBase & {
          severity: string;
          code: string;
          state: Database["public"]["Enums"]["integrity_alert_state"];
          transaction_id: string | null;
          order_id: string | null;
          message: string;
          metadata: Json;
          resolved_at: string | null;
        }
      >;
      checkout_observability_events: AppendOnlyTable<{
        id: string;
        created_at: string;
        transaction_id: string | null;
        metric: string;
        value: number;
        tags: Json;
      }>;
      wishlists: Table<RowBase & SoftDelete & { user_id: string; product_id: string }>;
      reviews: Table<
        RowBase &
          SoftDelete & {
            user_id: string;
            product_id: string;
            order_item_id: string | null;
            rating: number;
            title: string | null;
            body: string | null;
            is_verified_purchase: boolean;
            moderation_status: string;
          }
      >;
      review_votes: Table<RowBase & { user_id: string; review_id: string; is_helpful: boolean }>;
      orders: Table<
        RowBase &
          SoftDelete & {
            buyer_id: string;
            vendor_id: string;
            order_number: string;
            status: Database["public"]["Enums"]["order_status"];
            subtotal_amount: number;
            tax_amount: number;
            delivery_fee_amount: number;
            discount_amount: number;
            total_amount: number;
            currency: string;
            payment_reference: string | null;
            payment_status: string;
            fulfillment_reference: string | null;
            delivery_address: Json;
            metadata: Json;
          }
      >;
      deliveries: Table<
        RowBase & {
          order_id: string;
          vendor_id: string;
          buyer_id: string;
          delivery_partner_id: string | null;
          mode: Database["public"]["Enums"]["delivery_mode"];
          status: Database["public"]["Enums"]["delivery_status"];
          assigned_to: string | null;
          assigned_phone: string | null;
          pickup_location: unknown | null;
          dropoff_location: unknown | null;
          distance_km: number | null;
          eta_minutes: number | null;
          eta_confidence: string;
          promised_at: string | null;
          delivered_at: string | null;
          failed_at: string | null;
          failure_reason: string | null;
          metadata: Json;
        }
      >;
      delivery_tracking_events: AppendOnlyTable<{
        id: string;
        created_at: string;
        delivery_id: string;
        status: Database["public"]["Enums"]["delivery_status"];
        event_type: string;
        title: string;
        body: string;
        actor_id: string | null;
        actor_type: string;
        location: unknown | null;
        location_label: string | null;
        eta_minutes: number | null;
        metadata: Json;
      }>;
      order_items: Table<
        RowBase &
          SoftDelete & {
            order_id: string;
            product_id: string;
            variant_id: string | null;
            vendor_id: string;
            product_name: string;
            variant_name: string | null;
            quantity: number;
            unit_price: number;
            total_price: number;
            fulfillment_status: Database["public"]["Enums"]["order_status"];
          }
      >;
      order_status_history: Table<RowBase & { order_id: string; status: Database["public"]["Enums"]["order_status"]; changed_by: string | null; note: string | null; metadata: Json }>;
      order_notes: Table<RowBase & SoftDelete & { order_id: string; author_id: string | null; visibility: string; body: string }>;
      notifications: Table<
        RowBase &
          SoftDelete & {
            recipient_id: string | null;
            vendor_id: string | null;
            type: Database["public"]["Enums"]["notification_type"];
            channel: Database["public"]["Enums"]["notification_channel"];
            title: string;
            body: string;
            action_url: string | null;
            read_at: string | null;
            metadata: Json;
          }
      >;
      notification_preferences: Table<
        RowBase & {
          user_id: string;
          order_updates: Database["public"]["Enums"]["notification_channel"][];
          seller_alerts: Database["public"]["Enums"]["notification_channel"][];
          admin_alerts: Database["public"]["Enums"]["notification_channel"][];
          marketing_enabled: boolean;
        }
      >;
      audit_logs: Table<RowBase & { actor_id: string | null; vendor_id: string | null; action: string; entity_table: string; entity_id: string | null; old_values: Json | null; new_values: Json | null; ip_address: string | null; metadata: Json }>;
      system_flags: Table<RowBase & { key: string; value: Json; value_type: Database["public"]["Enums"]["flag_value_type"]; description: string | null; managed_by: string | null }>;
      feature_flags: Table<RowBase & { key: string; description: string | null; is_enabled: boolean; rollout_percentage: number; audience: Json }>;
      sessions_metadata: Table<RowBase & { user_id: string; auth_session_id: string | null; ip_address: string | null; user_agent: string | null; device_label: string | null; last_seen_at: string; revoked_at: string | null }>;
      search_events: AppendOnlyTable<{
        id: string;
        created_at: string;
        user_id: string | null;
        query: string;
        corrected_query: string | null;
        mode: string;
        result_count: number;
        latency_ms: number;
        fallback_used: boolean;
        metadata: Json;
      }>;
      ai_retrieval_events: AppendOnlyTable<{
        id: string;
        created_at: string;
        user_id: string | null;
        event_type: string;
        query: string | null;
        locale: string | null;
        retrieval_mode: string;
        candidate_count: number;
        result_count: number;
        latency_ms: number;
        fallback_used: boolean;
        metadata: Json;
      }>;
      seller_intelligence_snapshots: Table<
        RowBase & {
          vendor_id: string;
          generated_for_date: string;
          health_score: number;
          demand_score: number;
          inventory_score: number;
          fulfillment_score: number;
          discoverability_score: number;
          fairness_score: number;
          snapshot: Json;
          stale_at: string;
        }
      >;
      seller_intelligence_alerts: Table<
        RowBase & {
          vendor_id: string;
          product_id: string | null;
          domain: string;
          severity: string;
          title: string;
          explanation: string;
          action: string;
          evidence: Json;
          state: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
          acknowledged_at: string | null;
          resolved_at: string | null;
          metadata: Json;
        }
      >;
      seller_forecast_observability_events: AppendOnlyTable<{
        id: string;
        created_at: string;
        vendor_id: string | null;
        metric: string;
        latency_ms: number;
        forecast_count: number;
        alert_count: number;
        stale: boolean;
        metadata: Json;
      }>;
    };
    Views: {
      ai_embedding_freshness_admin: {
        Row: {
          id: string;
          name: string;
          slug: string;
          updated_at: string;
          embedding_model: string | null;
          embedding_updated_at: string | null;
          embedding_refresh_state: string;
          embedding_refresh_requested_at: string;
          embedding_refresh_error: string | null;
          search_quality_score: number;
          freshness_state: string;
        };
        Relationships: Relationship[];
      };
      seller_intelligence_health_admin: {
        Row: {
          vendor_id: string;
          vendor_name: string;
          generated_for_date: string | null;
          created_at: string | null;
          stale_at: string | null;
          health_score: number | null;
          demand_score: number | null;
          inventory_score: number | null;
          fulfillment_score: number | null;
          discoverability_score: number | null;
          fairness_score: number | null;
          open_alerts: number;
          critical_alerts: number;
        };
        Relationships: Relationship[];
      };
    };
    Functions: {
      current_user_has_role: {
        Args: { required_roles: Database["public"]["Enums"]["app_role"][] };
        Returns: boolean;
      };
      current_user_is_vendor_member: {
        Args: { target_vendor_id: string };
        Returns: boolean;
      };
      build_product_embedding_text: {
        Args: { target_product_id: string };
        Returns: string;
      };
      search_products_hybrid: {
        Args: { query_text: string; query_embedding?: string | null; match_count?: number; category_filter?: string | null };
        Returns: Array<{
          id: string;
          name: string;
          slug: string;
          description: string | null;
          base_price: number;
          currency: string;
          vendor_id: string;
          category_id: string;
          semantic_score: number;
          fuzzy_score: number;
          keyword_score: number;
          operational_score: number;
          hybrid_score: number;
        }>;
      };
      related_products_by_vector: {
        Args: { source_product_id: string; match_count?: number };
        Returns: Array<{ id: string; name: string; slug: string; similarity: number; reason: string }>;
      };
      atomic_checkout: {
        Args: { checkout_idempotency_key: string; delivery_address: Json; payment_method: string; checkout_metadata?: Json };
        Returns: Json;
      };
      release_expired_inventory_reservations: {
        Args: { batch_size?: number };
        Returns: Json;
      };
      release_failed_transaction_reservations: {
        Args: { target_transaction_id: string; reason?: string };
        Returns: Json;
      };
      reconcile_payment_webhook: {
        Args: {
          provider_name: string;
          event_id: string;
          event_type: string;
          provider_order_id: string;
          provider_payment_id: string | null;
          signature_valid: boolean;
          raw_payload: Json;
        };
        Returns: Json;
      };
      register_live_razorpay_order: {
        Args: {
          target_transaction_id: string;
          razorpay_order_id: string;
          receipt: string;
          provider_status: string;
          amount_due: number;
          amount_paid: number;
          provider_created_at: string;
          raw_provider_payload: Json;
        };
        Returns: Json;
      };
      record_payment_signature_verification: {
        Args: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
          signature_valid: boolean;
          raw_verification_payload: Json;
        };
        Returns: Json;
      };
      request_order_refund: {
        Args: {
          target_order_id: string;
          refund_amount: number;
          refund_reason: string;
          refund_idempotency_key: string;
        };
        Returns: Json;
      };
      run_financial_reconciliation: {
        Args: { batch_size?: number };
        Returns: Json;
      };
      record_financial_metric: {
        Args: {
          metric_name: string;
          metric_value?: number;
          target_vendor_id?: string | null;
          target_order_id?: string | null;
          target_transaction_id?: string | null;
          target_payout_batch_id?: string | null;
          event_tags?: Json;
        };
        Returns: string;
      };
      post_financial_journal: {
        Args: {
          source_type: string;
          source_id: string;
          source_event_id: string;
          actor_id: string | null;
          actor_type: string;
          journal_currency: string;
          description: string;
          entries: Json;
          metadata?: Json;
        };
        Returns: string;
      };
      resolve_order_commission: {
        Args: { target_order_id: string };
        Returns: Json;
      };
      post_order_financial_settlement: {
        Args: { target_order_id: string; source_event_id: string; actor_id?: string | null };
        Returns: Json;
      };
      advance_settlement_lifecycle: {
        Args: { batch_size?: number };
        Returns: Json;
      };
      post_refund_financial_adjustment: {
        Args: { target_refund_id: string; source_event_id?: string | null };
        Returns: Json;
      };
      create_seller_payout_batch: {
        Args: { target_vendor_id: string; batch_idempotency_key: string; batch_limit?: number };
        Returns: Json;
      };
      complete_seller_payout_batch: {
        Args: { target_batch_id: string; provider_payout_id?: string | null; bank_reference?: string | null };
        Returns: Json;
      };
      fail_seller_payout_batch: {
        Args: { target_batch_id: string; failure_code: string; failure_reason: string };
        Returns: Json;
      };
      retry_failed_payout_batch: {
        Args: { target_batch_id: string };
        Returns: Json;
      };
      record_governance_metric: {
        Args: {
          metric_name: string;
          metric_value?: number;
          target_vendor_id?: string | null;
          target_case_id?: string | null;
          target_dispute_id?: string | null;
          event_tags?: Json;
        };
        Returns: string;
      };
      compute_vendor_trust_score: {
        Args: { target_vendor_id: string };
        Returns: Json;
      };
      create_governance_case: {
        Args: {
          target_case_type: Database["public"]["Enums"]["governance_case_type"];
          target_vendor_id: string | null;
          case_title: string;
          case_summary: string;
          case_explanation: string;
          case_recommended_action: string;
          case_severity?: string;
          case_fingerprint?: string | null;
          case_metadata?: Json;
        };
        Returns: string;
      };
      detect_vendor_governance_risk: {
        Args: { target_vendor_id: string };
        Returns: Json;
      };
      run_governance_detection: {
        Args: { batch_size?: number };
        Returns: Json;
      };
      apply_governance_enforcement: {
        Args: {
          target_vendor_id: string;
          target_case_id: string | null;
          target_enforcement_type: Database["public"]["Enums"]["governance_enforcement_type"];
          enforcement_reason: string;
          enforcement_severity?: string;
          expires_at?: string | null;
        };
        Returns: Json;
      };
      reverse_governance_enforcement: {
        Args: { target_action_id: string; reason: string };
        Returns: Json;
      };
      open_marketplace_dispute: {
        Args: {
          target_dispute_type: Database["public"]["Enums"]["dispute_type"];
          target_order_id: string;
          dispute_title: string;
          dispute_description: string;
          dispute_locale?: string;
        };
        Returns: Json;
      };
      assert_product_available: {
        Args: { target_product_id: string; target_variant_id?: string | null; requested_quantity?: number };
        Returns: Json;
      };
      upsert_live_cart_item: {
        Args: { target_product_id: string; target_variant_id?: string | null; target_quantity?: number };
        Returns: Database["public"]["Tables"]["cart_items"]["Row"];
      };
      remove_live_cart_item: {
        Args: { target_cart_item_id: string };
        Returns: void;
      };
      clear_live_cart: {
        Args: Record<string, never>;
        Returns: number;
      };
      toggle_live_wishlist: {
        Args: { target_product_id: string };
        Returns: Json;
      };
      update_live_inventory: {
        Args: { target_inventory_id: string; target_stock_quantity: number; reason?: string };
        Returns: Database["public"]["Tables"]["inventory"]["Row"];
      };
      record_live_search_event: {
        Args: {
          query_text: string;
          corrected_query_text?: string | null;
          search_mode?: string;
          result_count?: number;
          latency_ms?: number;
          fallback_used?: boolean;
          event_metadata?: Json;
        };
        Returns: string;
      };
      record_ai_retrieval_event: {
        Args: {
          event_type: string;
          query_text?: string | null;
          query_locale?: string;
          retrieval_mode?: string;
          candidate_count?: number;
          result_count?: number;
          latency_ms?: number;
          fallback_used?: boolean;
          event_metadata?: Json;
        };
        Returns: string;
      };
      record_seller_forecast_observability: {
        Args: {
          target_vendor_id: string | null;
          event_metric: string;
          latency_ms?: number;
          forecast_count?: number;
          alert_count?: number;
          stale?: boolean;
          event_metadata?: Json;
        };
        Returns: string;
      };
      mark_notification_read: {
        Args: { target_notification_id: string };
        Returns: Database["public"]["Tables"]["notifications"]["Row"];
      };
      ensure_current_user_vendor_member: {
        Args: { target_vendor_id: string };
        Returns: void;
      };
      update_live_order_status: {
        Args: { target_order_id: string; target_status: Database["public"]["Enums"]["order_status"]; status_note?: string | null };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      moderate_live_vendor: {
        Args: { target_vendor_id: string; target_status: Database["public"]["Enums"]["vendor_status"]; moderation_note?: string | null };
        Returns: Database["public"]["Tables"]["vendors"]["Row"];
      };
      moderate_live_product: {
        Args: { target_product_id: string; target_status: Database["public"]["Enums"]["product_status"]; moderation_note?: string | null };
        Returns: Database["public"]["Tables"]["products"]["Row"];
      };
    };
    Enums: {
      commerce_region: "TN" | "KL" | "KA" | "AP" | "TS";
      perishability_class: "ULTRA_FRESH" | "SAME_DAY_FRESH" | "SHORT_SHELF" | "MEDIUM_SHELF" | "LONG_SHELF" | "FROZEN" | "DRY_STABLE";
      app_role: "BUYER" | "SELLER" | "ADMIN" | "SUPER_ADMIN";
      vendor_member_role: "OWNER" | "MANAGER" | "STAFF";
      vendor_status: "DRAFT" | "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "CLOSED";
      verification_status: "NOT_STARTED" | "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_INFO";
      verification_state: "NOT_SUBMITTED" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED" | "RESUBMISSION_REQUIRED" | "SUSPENDED";
      verification_document_type: "AADHAAR" | "PAN" | "GST_CERTIFICATE" | "BUSINESS_REGISTRATION" | "BANK_PROOF" | "ADDRESS_PROOF";
      product_status: "DRAFT" | "ACTIVE" | "ARCHIVED" | "SUSPENDED";
      stock_status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "RESERVED" | "DISCONTINUED";
      inventory_movement_type: "INITIAL" | "RESTOCK" | "SALE" | "RESERVATION" | "RELEASE" | "ADJUSTMENT" | "RETURN" | "DAMAGE";
      order_status: "PENDING" | "CONFIRMED" | "PROCESSING" | "PACKED" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED" | "REFUNDED";
      notification_channel: "IN_APP" | "EMAIL" | "SMS" | "PUSH";
      notification_type: "ORDER_UPDATE" | "SELLER_ALERT" | "ADMIN_ALERT" | "INVENTORY_ALERT" | "SYSTEM";
      flag_value_type: "BOOLEAN" | "STRING" | "NUMBER" | "JSON";
      address_type: "HOME" | "WORK" | "OTHER";
      checkout_transaction_state:
        | "CHECKOUT_STARTED"
        | "INVENTORY_LOCKED"
        | "PAYMENT_PENDING"
        | "PAYMENT_CONFIRMED"
        | "ORDER_CREATED"
        | "INVENTORY_RESERVED"
        | "FULFILLMENT_PENDING"
        | "FAILED"
        | "ROLLED_BACK";
      payment_attempt_state: "INTENT_CREATED" | "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "COD_PENDING" | "COD_CONFIRMED" | "REFUND_PENDING" | "REFUNDED";
      payment_financial_state:
        | "PAYMENT_CREATED"
        | "PAYMENT_PENDING"
        | "PAYMENT_AUTHORIZED"
        | "PAYMENT_CAPTURED"
        | "PAYMENT_FAILED"
        | "PAYMENT_CANCELLED"
        | "PAYMENT_EXPIRED"
        | "PAYMENT_REFUNDED"
        | "PAYMENT_RECONCILING"
        | "PAYMENT_DISPUTED";
      refund_state:
        | "REFUND_REQUESTED"
        | "REFUND_APPROVED"
        | "REFUND_INITIATED"
        | "REFUND_PROCESSING"
        | "REFUND_SUCCEEDED"
        | "REFUND_FAILED"
        | "REFUND_REJECTED"
        | "REFUND_RECONCILING";
      payout_sync_state: "PAYOUT_PENDING" | "PAYOUT_ELIGIBLE" | "PAYOUT_ON_HOLD" | "PAYOUT_SYNCED" | "PAYOUT_FAILED";
      ledger_party_type: "BUYER" | "SELLER" | "PLATFORM" | "PAYMENT_PROVIDER" | "BANK" | "SYSTEM";
      ledger_entry_direction: "DEBIT" | "CREDIT";
      financial_journal_state: "POSTED" | "REVERSED";
      commission_scope_type: "DEFAULT" | "CATEGORY" | "SELLER_TIER" | "SELLER_OVERRIDE" | "PROMOTIONAL_OVERRIDE";
      settlement_lifecycle_state:
        | "PENDING_SETTLEMENT"
        | "PROCESSING_SETTLEMENT"
        | "SETTLED"
        | "PAYOUT_PENDING"
        | "PAYOUT_PROCESSING"
        | "PAYOUT_COMPLETED"
        | "PAYOUT_FAILED"
        | "REFUND_ADJUSTED"
        | "DISPUTED";
      payout_batch_state: "DRAFT" | "PROCESSING" | "COMPLETED" | "FAILED" | "RETRYING" | "CANCELLED";
      reconciliation_case_state: "OPEN" | "INVESTIGATING" | "RECOVERED" | "WAIVED" | "ESCALATED";
      reconciliation_case_type:
        | "ORPHAN_PAYMENT"
        | "PAYOUT_MISMATCH"
        | "REFUND_MISMATCH"
        | "SETTLEMENT_DRIFT"
        | "DUPLICATE_FINANCIAL_EVENT"
        | "LEDGER_IMBALANCE"
        | "MISSING_LEDGER_POSTING";
      governance_case_type:
        | "SELLER_VERIFICATION"
        | "SELLER_MODERATION"
        | "PRODUCT_MODERATION"
        | "REVIEW_MODERATION"
        | "PAYOUT_REVIEW"
        | "REFUND_REVIEW"
        | "DELIVERY_DISPUTE"
        | "ORDER_DISPUTE"
        | "TRUST_ESCALATION"
        | "FRAUD_REVIEW";
      governance_case_state: "OPEN" | "UNDER_REVIEW" | "ESCALATED" | "ACTION_REQUIRED" | "RESOLVED" | "DISMISSED" | "APPEALED";
      governance_risk_signal_type:
        | "REFUND_ABUSE"
        | "PAYOUT_ABUSE"
        | "FAKE_INVENTORY"
        | "ORDER_BURST"
        | "SELLER_MANIPULATION"
        | "ACCOUNT_FARMING"
        | "CANCELLATION_SPIKE"
        | "DELIVERY_FAILURE_SPIKE"
        | "MODERATION_HISTORY"
        | "KYC_INCOMPLETE";
      governance_enforcement_type:
        | "SELLER_THROTTLE"
        | "PAYOUT_HOLD"
        | "LISTING_HIDE"
        | "VERIFICATION_REQUIRED"
        | "MANUAL_REVIEW"
        | "SELLER_SUSPENSION"
        | "WARNING";
      governance_enforcement_state: "ACTIVE" | "REVERSED" | "EXPIRED" | "SUPERSEDED";
      dispute_state: "OPEN" | "EVIDENCE_REQUESTED" | "UNDER_REVIEW" | "RESOLVED_BUYER" | "RESOLVED_SELLER" | "RESOLVED_PLATFORM" | "DISMISSED" | "APPEALED";
      dispute_type: "ORDER" | "DELIVERY" | "REFUND" | "PAYOUT" | "MODERATION_APPEAL" | "SELLER_APPEAL";
      reservation_state: "ACTIVE" | "CONSUMED" | "RELEASED" | "EXPIRED";
      transaction_outbox_state: "PENDING" | "PUBLISHED" | "FAILED";
      recovery_job_state: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
      integrity_alert_state: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
      delivery_mode: "SELLER_SELF" | "SHIPROCKET" | "PORTER" | "DUNZO";
      delivery_status:
        | "PENDING_DISPATCH"
        | "ASSIGNED"
        | "PICKUP_PENDING"
        | "PICKED_UP"
        | "IN_TRANSIT"
        | "NEARBY"
        | "DELIVERED"
        | "FAILED"
        | "RETURN_INITIATED"
        | "RETURNED";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];

import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { registerRoutes } from "./routes";
import { registerAgentRoutes } from "./agentRoutes";
import { registerAcpRoutes } from "./acpHandler";
import { startCronJobs } from "./cronJobs";
import { startScheduledEmailJob } from './scheduledEmailJob';
import { isLocalPreviewBackgroundJobsDisabled, logLocalPreviewBackgroundJobsDisabled } from "./backgroundJobs";
import { db } from "./db";
import { sql, type SQL } from "drizzle-orm";

// Ensure database schema has required columns (runs on startup)
async function ensureDatabaseSchema() {
  console.log("[DB] Starting schema migration...");
  
  const migrations: Array<{ name: string; sql: SQL; required?: boolean }> = [
    { name: 'inquiries.sentiment', sql: sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS sentiment text` },
    { name: 'inquiries.sentiment_score', sql: sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS sentiment_score integer` },
    { name: 'inquiries.sentiment_analysis', sql: sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS sentiment_analysis jsonb` },
    { name: 'artist_profiles.login_code', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS login_code varchar(255)` },
    { name: 'artist_profiles.login_code_expires_at', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS login_code_expires_at timestamp` },
    { name: 'schedule_appointments.inspiration_photos', sql: sql`ALTER TABLE schedule_appointments ADD COLUMN IF NOT EXISTS inspiration_photos text[]` },

    // --- Scoped permission / human action decision hardening ---
    { name: 'scoped_permission_decisions.required_approver_user_ids', sql: sql`ALTER TABLE scoped_permission_decisions ADD COLUMN IF NOT EXISTS required_approver_user_ids jsonb NOT NULL DEFAULT '[]'::jsonb` },
    { name: 'human_action_decisions.actual_action', sql: sql`ALTER TABLE human_action_decisions ADD COLUMN IF NOT EXISTS actual_action text` },
    { name: 'human_action_decisions.actual_scope_text', sql: sql`ALTER TABLE human_action_decisions ADD COLUMN IF NOT EXISTS actual_scope_text text` },
    { name: 'human_action_decisions.expires_at', sql: sql`ALTER TABLE human_action_decisions ADD COLUMN IF NOT EXISTS expires_at timestamp` },
    { name: 'human_action_decisions.withdrawn_at', sql: sql`ALTER TABLE human_action_decisions ADD COLUMN IF NOT EXISTS withdrawn_at timestamp` },

    // --- Handoff accountability slice (YC submission session) ---
    { name: 'thread_referrals.urgency_hours', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS urgency_hours integer` },
    { name: 'thread_referrals.payment_secured_status', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS payment_secured_status text` },
    { name: 'thread_referrals.contract_attached_id', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS contract_attached_id varchar(255)` },
    { name: 'thread_referrals.scope_summary', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS scope_summary text` },
    { name: 'thread_referrals.helper_reported_outcome', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS helper_reported_outcome text` },
    { name: 'thread_referrals.helper_paid_at', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS helper_paid_at timestamp` },
    { name: 'thread_referrals.helper_payment_note', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS helper_payment_note text` },
    { name: 'thread_referrals.helper_private_note', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS helper_private_note text` },
    { name: 'thread_referrals.helper_outcome_reported_at', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS helper_outcome_reported_at timestamp` },
    { name: 'thread_referrals.helper_wants_to_share_advice', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS helper_wants_to_share_advice boolean DEFAULT false` },
    { name: 'thread_referrals.helper_advice_draft', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS helper_advice_draft text` },
    { name: 'thread_referrals.originator_advice_prompted_at', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS originator_advice_prompted_at timestamp` },
    { name: 'thread_referrals.originator_advice_consent', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS originator_advice_consent text` },
    { name: 'thread_referrals.originator_advice_consent_at', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS originator_advice_consent_at timestamp` },
    { name: 'trusted_circle.quietly_removed', sql: sql`ALTER TABLE trusted_circle ADD COLUMN IF NOT EXISTS quietly_removed boolean DEFAULT false` },
    { name: 'trusted_circle.removed_at', sql: sql`ALTER TABLE trusted_circle ADD COLUMN IF NOT EXISTS removed_at timestamp` },
    { name: 'trusted_circle.removed_reason', sql: sql`ALTER TABLE trusted_circle ADD COLUMN IF NOT EXISTS removed_reason text` },

    // --- Inbound SMS (Step 1: headless coordination) ---
    { name: 'inbound_sms_messages.table', sql: sql`CREATE TABLE IF NOT EXISTS inbound_sms_messages (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      message_sid varchar UNIQUE NOT NULL,
      from_number text NOT NULL,
      to_number text NOT NULL,
      body text NOT NULL DEFAULT '',
      matched_user_id varchar,
      matched_contact_id varchar,
      matched_inquiry_id varchar,
      matched_referral_id varchar,
      match_status text NOT NULL DEFAULT 'unmatched',
      trust_event_id varchar,
      raw_payload jsonb,
      received_at timestamp NOT NULL DEFAULT now(),
      created_at timestamp NOT NULL DEFAULT now()
    )` },
    // Context-based matching (additive â€” safe on tables that already exist)
    { name: 'inbound_sms_messages.match_confidence', sql: sql`ALTER TABLE inbound_sms_messages ADD COLUMN IF NOT EXISTS match_confidence integer` },
    { name: 'inbound_sms_messages.suggested_matches', sql: sql`ALTER TABLE inbound_sms_messages ADD COLUMN IF NOT EXISTS suggested_matches jsonb` },

    // --- Square OAuth state storage (additive, optional Square setup support) ---
    { name: 'oauth_states.table', sql: sql`CREATE TABLE IF NOT EXISTS oauth_states (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      state varchar UNIQUE NOT NULL,
      user_id varchar NOT NULL,
      artist_slug text,
      return_base_url text,
      callback_url text,
      provider text NOT NULL DEFAULT 'square',
      expires_at timestamp NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )` },

    // --- Contract Vault: operator-managed metadata (additive only) ---
    { name: 'contracts.contract_url', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_url text` },
    { name: 'contracts.contract_source', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_source text` },
    { name: 'contracts.contract_notes', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_notes text` },
    { name: 'contracts.payment_status', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'payment_not_requested'` },
    { name: 'contracts.payment_method', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_method text` },
    { name: 'contracts.amount_paid', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS amount_paid integer` },
    { name: 'contracts.payment_due_date', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_due_date text` },
    { name: 'contracts.payment_link', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_link text` },
    { name: 'contracts.payment_notes', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_notes text` },

    // --- Assistant delivery preferences + unified prompt queue (headless layer) ---
    { name: 'artist_profiles.preferred_delivery_channel', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS preferred_delivery_channel text DEFAULT 'email'` },
    { name: 'artist_profiles.assistant_phone_enabled', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS assistant_phone_enabled boolean DEFAULT false` },
    { name: 'artist_profiles.assistant_email_enabled', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS assistant_email_enabled boolean DEFAULT false` },
    { name: 'artist_profiles.assistant_quiet_hours_start', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS assistant_quiet_hours_start integer` },
    { name: 'artist_profiles.assistant_quiet_hours_end', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS assistant_quiet_hours_end integer` },
    { name: 'artist_profiles.assistant_timezone', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS assistant_timezone text` },
    { name: 'artist_profiles.assistant_prompt_mode', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS assistant_prompt_mode text DEFAULT 'immediate'` },
    { name: 'artist_profiles.assistant_dry_run', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS assistant_dry_run boolean DEFAULT false` },
    { name: 'assistant_prompts.table', sql: sql`CREATE TABLE IF NOT EXISTS assistant_prompts (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      inquiry_id varchar,
      referral_id varchar,
      contact_id varchar,
      prompt_type text NOT NULL,
      title text NOT NULL,
      body text NOT NULL,
      recommended_actions jsonb,
      delivery_channel text,
      delivery_status text NOT NULL DEFAULT 'pending',
      delivery_error text,
      created_at timestamp NOT NULL DEFAULT now(),
      sent_at timestamp,
      acted_on_at timestamp
    )` },
    { name: 'route_targets.table', sql: sql`CREATE TABLE IF NOT EXISTS route_targets (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      name text NOT NULL,
      email text,
      phone text,
      role_label text,
      tags text[],
      capabilities text[],
      is_internal boolean DEFAULT false,
      is_agent boolean DEFAULT false,
      active boolean DEFAULT true,
      preferred boolean DEFAULT false,
      availability_source text,
      trusted_circle_id varchar,
      linked_user_id varchar,
      notes text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )` },
    { name: 'inquiry_routes.table', sql: sql`CREATE TABLE IF NOT EXISTS inquiry_routes (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      inquiry_id varchar,
      route_target_id varchar NOT NULL,
      route_type text NOT NULL DEFAULT 'referral',
      status text NOT NULL DEFAULT 'draft',
      target_label_snapshot text,
      preflight_channel text,
      preflight_message text,
      preflight_sent_at timestamp,
      response_raw text,
      responded_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )` },
    { name: 'inquiry_route_candidates.table', sql: sql`CREATE TABLE IF NOT EXISTS inquiry_route_candidates (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      route_target_id varchar NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      match_score integer,
      match_reasons jsonb,
      matched_capabilities jsonb,
      matched_tags jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )` },
    { name: 'inquiry_route_candidates.unique', sql: sql`CREATE UNIQUE INDEX IF NOT EXISTS inquiry_route_candidates_operator_inquiry_target_unique
      ON inquiry_route_candidates (operator_id, inquiry_id, route_target_id)` },
    { name: 'coordination_paths.table', sql: sql`CREATE TABLE IF NOT EXISTS coordination_paths (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      route_target_id varchar,
      candidate_route_id varchar,
      status text NOT NULL DEFAULT 'active',
      context_captured boolean NOT NULL DEFAULT false,
      timing_constraints jsonb DEFAULT '{}'::jsonb,
      authority_state text NOT NULL DEFAULT 'unclear',
      availability_state text NOT NULL DEFAULT 'unknown',
      handoff_state text NOT NULL DEFAULT 'not_started',
      escalation_state text NOT NULL DEFAULT 'none',
      recovery_capacity text NOT NULL DEFAULT 'unknown',
      commitment_state text NOT NULL DEFAULT 'uncommitted',
      outcome_verification_state text NOT NULL DEFAULT 'not_ready',
      path_risk jsonb DEFAULT '[]'::jsonb,
      signal_provenance jsonb DEFAULT '[]'::jsonb,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )` },
    { name: 'coordination_paths.operator_inquiry_idx', sql: sql`CREATE INDEX IF NOT EXISTS coordination_paths_operator_inquiry_idx
      ON coordination_paths (operator_id, inquiry_id)` },
    { name: 'coordination_paths.route_target_idx', sql: sql`CREATE INDEX IF NOT EXISTS coordination_paths_route_target_idx
      ON coordination_paths (route_target_id)` },
    { name: 'coordination_events.table', sql: sql`CREATE TABLE IF NOT EXISTS coordination_events (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      path_id varchar NOT NULL,
      operator_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      event_type text NOT NULL,
      event_source text NOT NULL DEFAULT 'manual',
      summary text NOT NULL,
      signal_provenance jsonb DEFAULT '[]'::jsonb,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamp NOT NULL DEFAULT now()
    )` },
    { name: 'coordination_events.path_idx', sql: sql`CREATE INDEX IF NOT EXISTS coordination_events_path_idx
      ON coordination_events (path_id)` },
    { name: 'coordination_events.operator_inquiry_idx', sql: sql`CREATE INDEX IF NOT EXISTS coordination_events_operator_inquiry_idx
      ON coordination_events (operator_id, inquiry_id)` },
    { name: 'coordination_assessments.table', sql: sql`CREATE TABLE IF NOT EXISTS coordination_assessments (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      path_id varchar NOT NULL,
      operator_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      permission_decision text NOT NULL,
      confidence integer NOT NULL,
      risk_factors jsonb DEFAULT '[]'::jsonb,
      missing_signals jsonb DEFAULT '[]'::jsonb,
      recommended_next_action text NOT NULL,
      explanation text NOT NULL,
      signal_provenance jsonb DEFAULT '[]'::jsonb,
      human_judgment_required boolean NOT NULL DEFAULT false,
      escalation_reasons jsonb DEFAULT '[]'::jsonb,
      outcome_verification text NOT NULL DEFAULT 'NOT_READY',
      created_at timestamp NOT NULL DEFAULT now()
    )` },
    { name: 'coordination_assessments.path_idx', sql: sql`CREATE INDEX IF NOT EXISTS coordination_assessments_path_idx
      ON coordination_assessments (path_id)` },
    { name: 'coordination_assessments.operator_inquiry_idx', sql: sql`CREATE INDEX IF NOT EXISTS coordination_assessments_operator_inquiry_idx
      ON coordination_assessments (operator_id, inquiry_id)` },
    { name: 'inquiry_internal_notes.table', sql: sql`CREATE TABLE IF NOT EXISTS inquiry_internal_notes (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      body text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )` },
    { name: 'inquiry_internal_notes.unique', sql: sql`CREATE UNIQUE INDEX IF NOT EXISTS inquiry_internal_notes_operator_inquiry_unique
      ON inquiry_internal_notes (operator_id, inquiry_id)` },
    { name: 'human_attestations.table', required: true, sql: sql`CREATE TABLE IF NOT EXISTS human_attestations (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      author_user_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      claim_text text NOT NULL,
      author_capacity text NOT NULL,
      knowledge_basis text NOT NULL,
      lifecycle_action text NOT NULL DEFAULT 'attestation',
      related_attestation_id varchar,
      created_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT human_attestations_operator_fk
        FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT human_attestations_author_fk
        FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT human_attestations_inquiry_fk
        FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE RESTRICT,
      CONSTRAINT human_attestations_related_fk
        FOREIGN KEY (related_attestation_id) REFERENCES human_attestations(id) ON DELETE RESTRICT,
      CONSTRAINT human_attestations_knowledge_basis_check
        CHECK (knowledge_basis IN ('firsthand', 'relayed', 'evidence_review')),
      CONSTRAINT human_attestations_lifecycle_action_check
        CHECK (lifecycle_action IN ('attestation', 'correction', 'withdrawal', 'challenge', 'supersession')),
      CONSTRAINT human_attestations_lifecycle_link_check
        CHECK (
          (lifecycle_action = 'attestation' AND related_attestation_id IS NULL)
          OR (lifecycle_action <> 'attestation' AND related_attestation_id IS NOT NULL)
        )
    )` },
    { name: 'human_attestations.foreign_keys', required: true, sql: sql`DO $human_attestation_fks$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'human_attestations'::regclass
            AND conname = 'human_attestations_operator_fk'
        ) THEN
          ALTER TABLE human_attestations
            ADD CONSTRAINT human_attestations_operator_fk
            FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'human_attestations'::regclass
            AND conname = 'human_attestations_author_fk'
        ) THEN
          ALTER TABLE human_attestations
            ADD CONSTRAINT human_attestations_author_fk
            FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'human_attestations'::regclass
            AND conname = 'human_attestations_inquiry_fk'
        ) THEN
          ALTER TABLE human_attestations
            ADD CONSTRAINT human_attestations_inquiry_fk
            FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE RESTRICT NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'human_attestations'::regclass
            AND conname = 'human_attestations_related_fk'
        ) THEN
          ALTER TABLE human_attestations
            ADD CONSTRAINT human_attestations_related_fk
            FOREIGN KEY (related_attestation_id) REFERENCES human_attestations(id) ON DELETE RESTRICT NOT VALID;
        END IF;
      END;
      $human_attestation_fks$` },
    { name: 'human_attestations.check_constraints', required: true, sql: sql`DO $human_attestation_checks$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'human_attestations'::regclass
            AND conname = 'human_attestations_knowledge_basis_check'
        ) THEN
          ALTER TABLE human_attestations
            ADD CONSTRAINT human_attestations_knowledge_basis_check
            CHECK (knowledge_basis IN ('firsthand', 'relayed', 'evidence_review')) NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'human_attestations'::regclass
            AND conname = 'human_attestations_lifecycle_action_check'
        ) THEN
          ALTER TABLE human_attestations
            ADD CONSTRAINT human_attestations_lifecycle_action_check
            CHECK (lifecycle_action IN ('attestation', 'correction', 'withdrawal', 'challenge', 'supersession')) NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'human_attestations'::regclass
            AND conname = 'human_attestations_lifecycle_link_check'
        ) THEN
          ALTER TABLE human_attestations
            ADD CONSTRAINT human_attestations_lifecycle_link_check
            CHECK (
              (lifecycle_action = 'attestation' AND related_attestation_id IS NULL)
              OR (lifecycle_action <> 'attestation' AND related_attestation_id IS NOT NULL)
            ) NOT VALID;
        END IF;
      END;
      $human_attestation_checks$` },
    { name: 'human_attestations.operator_fk.validate', required: true, sql: sql`ALTER TABLE human_attestations
      VALIDATE CONSTRAINT human_attestations_operator_fk` },
    { name: 'human_attestations.author_fk.validate', required: true, sql: sql`ALTER TABLE human_attestations
      VALIDATE CONSTRAINT human_attestations_author_fk` },
    { name: 'human_attestations.inquiry_fk.validate', required: true, sql: sql`ALTER TABLE human_attestations
      VALIDATE CONSTRAINT human_attestations_inquiry_fk` },
    { name: 'human_attestations.related_fk.validate', required: true, sql: sql`ALTER TABLE human_attestations
      VALIDATE CONSTRAINT human_attestations_related_fk` },
    { name: 'human_attestations.knowledge_basis_check.validate', required: true, sql: sql`ALTER TABLE human_attestations
      VALIDATE CONSTRAINT human_attestations_knowledge_basis_check` },
    { name: 'human_attestations.lifecycle_action_check.validate', required: true, sql: sql`ALTER TABLE human_attestations
      VALIDATE CONSTRAINT human_attestations_lifecycle_action_check` },
    { name: 'human_attestations.lifecycle_link_check.validate', required: true, sql: sql`ALTER TABLE human_attestations
      VALIDATE CONSTRAINT human_attestations_lifecycle_link_check` },
    { name: 'human_attestations.operator_inquiry_created_idx', sql: sql`CREATE INDEX IF NOT EXISTS human_attestations_operator_inquiry_created_idx
      ON human_attestations (operator_id, inquiry_id, created_at, id)` },
    { name: 'human_attestations.related_idx', sql: sql`CREATE INDEX IF NOT EXISTS human_attestations_related_idx
      ON human_attestations (related_attestation_id)` },
    { name: 'coordination_judgments.table', required: true, sql: sql`CREATE TABLE IF NOT EXISTS coordination_judgments (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      author_user_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      subject_text text NOT NULL,
      scope_text text NOT NULL,
      judgment_text text NOT NULL,
      rationale_text text NOT NULL,
      evidence_basis text NOT NULL,
      lifecycle_action text NOT NULL DEFAULT 'judgment',
      related_judgment_id varchar,
      created_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT coordination_judgments_operator_fk
        FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT coordination_judgments_author_fk
        FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT coordination_judgments_inquiry_fk
        FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE RESTRICT,
      CONSTRAINT coordination_judgments_related_fk
        FOREIGN KEY (related_judgment_id) REFERENCES coordination_judgments(id) ON DELETE RESTRICT,
      CONSTRAINT coordination_judgments_lifecycle_action_check
        CHECK (lifecycle_action IN ('judgment', 'correction', 'challenge', 'withdrawal', 'supersession')),
      CONSTRAINT coordination_judgments_lifecycle_link_check
        CHECK (
          (lifecycle_action = 'judgment' AND related_judgment_id IS NULL)
          OR (lifecycle_action <> 'judgment' AND related_judgment_id IS NOT NULL)
        )
    )` },
    { name: 'coordination_judgments.foreign_keys', required: true, sql: sql`DO $coordination_judgment_fks$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'coordination_judgments'::regclass
            AND conname = 'coordination_judgments_operator_fk'
        ) THEN
          ALTER TABLE coordination_judgments
            ADD CONSTRAINT coordination_judgments_operator_fk
            FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'coordination_judgments'::regclass
            AND conname = 'coordination_judgments_author_fk'
        ) THEN
          ALTER TABLE coordination_judgments
            ADD CONSTRAINT coordination_judgments_author_fk
            FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'coordination_judgments'::regclass
            AND conname = 'coordination_judgments_inquiry_fk'
        ) THEN
          ALTER TABLE coordination_judgments
            ADD CONSTRAINT coordination_judgments_inquiry_fk
            FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE RESTRICT NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'coordination_judgments'::regclass
            AND conname = 'coordination_judgments_related_fk'
        ) THEN
          ALTER TABLE coordination_judgments
            ADD CONSTRAINT coordination_judgments_related_fk
            FOREIGN KEY (related_judgment_id) REFERENCES coordination_judgments(id) ON DELETE RESTRICT NOT VALID;
        END IF;
      END;
      $coordination_judgment_fks$` },
    { name: 'coordination_judgments.check_constraints', required: true, sql: sql`DO $coordination_judgment_checks$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'coordination_judgments'::regclass
            AND conname = 'coordination_judgments_lifecycle_action_check'
        ) THEN
          ALTER TABLE coordination_judgments
            ADD CONSTRAINT coordination_judgments_lifecycle_action_check
            CHECK (lifecycle_action IN ('judgment', 'correction', 'challenge', 'withdrawal', 'supersession')) NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'coordination_judgments'::regclass
            AND conname = 'coordination_judgments_lifecycle_link_check'
        ) THEN
          ALTER TABLE coordination_judgments
            ADD CONSTRAINT coordination_judgments_lifecycle_link_check
            CHECK (
              (lifecycle_action = 'judgment' AND related_judgment_id IS NULL)
              OR (lifecycle_action <> 'judgment' AND related_judgment_id IS NOT NULL)
            ) NOT VALID;
        END IF;
      END;
      $coordination_judgment_checks$` },
    { name: 'coordination_judgments.operator_fk.validate', required: true, sql: sql`ALTER TABLE coordination_judgments
      VALIDATE CONSTRAINT coordination_judgments_operator_fk` },
    { name: 'coordination_judgments.author_fk.validate', required: true, sql: sql`ALTER TABLE coordination_judgments
      VALIDATE CONSTRAINT coordination_judgments_author_fk` },
    { name: 'coordination_judgments.inquiry_fk.validate', required: true, sql: sql`ALTER TABLE coordination_judgments
      VALIDATE CONSTRAINT coordination_judgments_inquiry_fk` },
    { name: 'coordination_judgments.related_fk.validate', required: true, sql: sql`ALTER TABLE coordination_judgments
      VALIDATE CONSTRAINT coordination_judgments_related_fk` },
    { name: 'coordination_judgments.lifecycle_action_check.validate', required: true, sql: sql`ALTER TABLE coordination_judgments
      VALIDATE CONSTRAINT coordination_judgments_lifecycle_action_check` },
    { name: 'coordination_judgments.lifecycle_link_check.validate', required: true, sql: sql`ALTER TABLE coordination_judgments
      VALIDATE CONSTRAINT coordination_judgments_lifecycle_link_check` },
    { name: 'coordination_judgments.operator_inquiry_created_idx', required: true, sql: sql`CREATE INDEX IF NOT EXISTS coordination_judgments_operator_inquiry_created_idx
      ON coordination_judgments (operator_id, inquiry_id, created_at, id)` },
    { name: 'coordination_judgments.related_idx', required: true, sql: sql`CREATE INDEX IF NOT EXISTS coordination_judgments_related_idx
      ON coordination_judgments (related_judgment_id)` },
    { name: 'coordination_judgment_attestations.table', required: true, sql: sql`CREATE TABLE IF NOT EXISTS coordination_judgment_attestations (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      judgment_id varchar NOT NULL,
      attestation_id varchar NOT NULL,
      position integer NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT coordination_judgment_attestations_judgment_fk
        FOREIGN KEY (judgment_id) REFERENCES coordination_judgments(id) ON DELETE RESTRICT,
      CONSTRAINT coordination_judgment_attestations_attestation_fk
        FOREIGN KEY (attestation_id) REFERENCES human_attestations(id) ON DELETE RESTRICT,
      CONSTRAINT coordination_judgment_attestations_position_check
        CHECK (position >= 0)
    )` },
    { name: 'coordination_judgment_attestations.foreign_keys', required: true, sql: sql`DO $coordination_judgment_attestation_fks$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'coordination_judgment_attestations'::regclass
            AND conname = 'coordination_judgment_attestations_judgment_fk'
        ) THEN
          ALTER TABLE coordination_judgment_attestations
            ADD CONSTRAINT coordination_judgment_attestations_judgment_fk
            FOREIGN KEY (judgment_id) REFERENCES coordination_judgments(id) ON DELETE RESTRICT NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'coordination_judgment_attestations'::regclass
            AND conname = 'coordination_judgment_attestations_attestation_fk'
        ) THEN
          ALTER TABLE coordination_judgment_attestations
            ADD CONSTRAINT coordination_judgment_attestations_attestation_fk
            FOREIGN KEY (attestation_id) REFERENCES human_attestations(id) ON DELETE RESTRICT NOT VALID;
        END IF;
      END;
      $coordination_judgment_attestation_fks$` },
    { name: 'coordination_judgment_attestations.check_constraints', required: true, sql: sql`DO $coordination_judgment_attestation_checks$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'coordination_judgment_attestations'::regclass
            AND conname = 'coordination_judgment_attestations_position_check'
        ) THEN
          ALTER TABLE coordination_judgment_attestations
            ADD CONSTRAINT coordination_judgment_attestations_position_check
            CHECK (position >= 0) NOT VALID;
        END IF;
      END;
      $coordination_judgment_attestation_checks$` },
    { name: 'coordination_judgment_attestations.judgment_fk.validate', required: true, sql: sql`ALTER TABLE coordination_judgment_attestations
      VALIDATE CONSTRAINT coordination_judgment_attestations_judgment_fk` },
    { name: 'coordination_judgment_attestations.attestation_fk.validate', required: true, sql: sql`ALTER TABLE coordination_judgment_attestations
      VALIDATE CONSTRAINT coordination_judgment_attestations_attestation_fk` },
    { name: 'coordination_judgment_attestations.position_check.validate', required: true, sql: sql`ALTER TABLE coordination_judgment_attestations
      VALIDATE CONSTRAINT coordination_judgment_attestations_position_check` },
    { name: 'coordination_judgment_attestations.unique', required: true, sql: sql`CREATE UNIQUE INDEX IF NOT EXISTS coordination_judgment_attestations_unique
      ON coordination_judgment_attestations (judgment_id, attestation_id)` },
    { name: 'coordination_judgment_attestations.position_unique', required: true, sql: sql`CREATE UNIQUE INDEX IF NOT EXISTS coordination_judgment_attestations_position_unique
      ON coordination_judgment_attestations (judgment_id, position)` },
    { name: 'coordination_judgment_attestations.attestation_idx', required: true, sql: sql`CREATE INDEX IF NOT EXISTS coordination_judgment_attestations_attestation_idx
      ON coordination_judgment_attestations (attestation_id)` },
    { name: 'scoped_permission_decisions.table', required: true, sql: sql`CREATE TABLE IF NOT EXISTS scoped_permission_decisions (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      decision_maker_user_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      actor_reference text NOT NULL,
      actor_description text NOT NULL,
      proposed_action text NOT NULL,
      task_context text NOT NULL,
      environment_context text NOT NULL,
      scope_text text NOT NULL,
      consequence_level text NOT NULL,
      demonstrated_capability text NOT NULL,
      capability_evidence_basis text NOT NULL,
      capability_scope_assessment text NOT NULL,
      capability_fit text NOT NULL,
      authorization_source text NOT NULL,
      authorization_state text NOT NULL,
      judgment_currency_basis text NOT NULL,
      blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
      required_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
      required_approver_user_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
      decision text NOT NULL,
      expires_at timestamp,
      mandatory_review_trigger text,
      lifecycle_action text NOT NULL DEFAULT 'decision',
      related_permission_decision_id varchar,
      created_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT scoped_permission_decisions_operator_fk
        FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT scoped_permission_decisions_decision_maker_fk
        FOREIGN KEY (decision_maker_user_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT scoped_permission_decisions_inquiry_fk
        FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE RESTRICT,
      CONSTRAINT scoped_permission_decisions_related_fk
        FOREIGN KEY (related_permission_decision_id) REFERENCES scoped_permission_decisions(id) ON DELETE RESTRICT,
      CONSTRAINT scoped_permission_decisions_decision_check
        CHECK (decision IN ('permitted', 'permitted_with_conditions', 'wait', 'clarification_required', 'escalation_required', 'not_permitted')),
      CONSTRAINT scoped_permission_decisions_capability_fit_check
        CHECK (capability_fit IN ('within_scope', 'partial_or_lower_scope', 'not_demonstrated', 'uncertain')),
      CONSTRAINT scoped_permission_decisions_authorization_state_check
        CHECK (authorization_state IN ('established', 'conditional', 'missing', 'unclear')),
      CONSTRAINT scoped_permission_decisions_lifecycle_action_check
        CHECK (lifecycle_action IN ('decision', 'correction', 'withdrawal', 'supersession')),
      CONSTRAINT scoped_permission_decisions_lifecycle_link_check
        CHECK (
          (lifecycle_action = 'decision' AND related_permission_decision_id IS NULL)
          OR (lifecycle_action <> 'decision' AND related_permission_decision_id IS NOT NULL)
        ),
      CONSTRAINT scoped_permission_decisions_withdrawal_check
        CHECK (lifecycle_action <> 'withdrawal' OR decision = 'not_permitted'),
      CONSTRAINT scoped_permission_decisions_review_trigger_check
        CHECK (expires_at IS NOT NULL OR NULLIF(BTRIM(mandatory_review_trigger), '') IS NOT NULL),
      CONSTRAINT scoped_permission_decisions_json_arrays_check
        CHECK (jsonb_typeof(blockers) = 'array' AND jsonb_typeof(required_conditions) = 'array' AND jsonb_typeof(required_approver_user_ids) = 'array'),
      CONSTRAINT scoped_permission_decisions_permission_inputs_check
        CHECK (
          decision NOT IN ('permitted', 'permitted_with_conditions')
          OR (capability_fit = 'within_scope' AND authorization_state IN ('established', 'conditional'))
        ),
      CONSTRAINT scoped_permission_decisions_permission_shape_check
        CHECK (
          (decision = 'permitted'
            AND authorization_state = 'established'
            AND jsonb_array_length(blockers) = 0
            AND jsonb_array_length(required_conditions) = 0)
          OR (decision = 'permitted_with_conditions'
            AND jsonb_array_length(blockers) = 0
            AND jsonb_array_length(required_conditions) > 0)
          OR (decision NOT IN ('permitted', 'permitted_with_conditions')
            AND jsonb_array_length(blockers) > 0)
        )
    )` },
    { name: 'scoped_permission_decisions.foreign_keys', required: true, sql: sql`DO $scoped_permission_decision_fks$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'scoped_permission_decisions'::regclass
            AND conname = 'scoped_permission_decisions_operator_fk'
        ) THEN
          ALTER TABLE scoped_permission_decisions
            ADD CONSTRAINT scoped_permission_decisions_operator_fk
            FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'scoped_permission_decisions'::regclass
            AND conname = 'scoped_permission_decisions_decision_maker_fk'
        ) THEN
          ALTER TABLE scoped_permission_decisions
            ADD CONSTRAINT scoped_permission_decisions_decision_maker_fk
            FOREIGN KEY (decision_maker_user_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'scoped_permission_decisions'::regclass
            AND conname = 'scoped_permission_decisions_inquiry_fk'
        ) THEN
          ALTER TABLE scoped_permission_decisions
            ADD CONSTRAINT scoped_permission_decisions_inquiry_fk
            FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE RESTRICT NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'scoped_permission_decisions'::regclass
            AND conname = 'scoped_permission_decisions_related_fk'
        ) THEN
          ALTER TABLE scoped_permission_decisions
            ADD CONSTRAINT scoped_permission_decisions_related_fk
            FOREIGN KEY (related_permission_decision_id) REFERENCES scoped_permission_decisions(id) ON DELETE RESTRICT NOT VALID;
        END IF;
      END;
      $scoped_permission_decision_fks$` },
    { name: 'scoped_permission_decisions.check_constraints', required: true, sql: sql`DO $scoped_permission_decision_checks$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'scoped_permission_decisions'::regclass AND conname = 'scoped_permission_decisions_decision_check') THEN
          ALTER TABLE scoped_permission_decisions ADD CONSTRAINT scoped_permission_decisions_decision_check
            CHECK (decision IN ('permitted', 'permitted_with_conditions', 'wait', 'clarification_required', 'escalation_required', 'not_permitted')) NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'scoped_permission_decisions'::regclass AND conname = 'scoped_permission_decisions_capability_fit_check') THEN
          ALTER TABLE scoped_permission_decisions ADD CONSTRAINT scoped_permission_decisions_capability_fit_check
            CHECK (capability_fit IN ('within_scope', 'partial_or_lower_scope', 'not_demonstrated', 'uncertain')) NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'scoped_permission_decisions'::regclass AND conname = 'scoped_permission_decisions_authorization_state_check') THEN
          ALTER TABLE scoped_permission_decisions ADD CONSTRAINT scoped_permission_decisions_authorization_state_check
            CHECK (authorization_state IN ('established', 'conditional', 'missing', 'unclear')) NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'scoped_permission_decisions'::regclass AND conname = 'scoped_permission_decisions_lifecycle_action_check') THEN
          ALTER TABLE scoped_permission_decisions ADD CONSTRAINT scoped_permission_decisions_lifecycle_action_check
            CHECK (lifecycle_action IN ('decision', 'correction', 'withdrawal', 'supersession')) NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'scoped_permission_decisions'::regclass AND conname = 'scoped_permission_decisions_lifecycle_link_check') THEN
          ALTER TABLE scoped_permission_decisions ADD CONSTRAINT scoped_permission_decisions_lifecycle_link_check
            CHECK ((lifecycle_action = 'decision' AND related_permission_decision_id IS NULL)
              OR (lifecycle_action <> 'decision' AND related_permission_decision_id IS NOT NULL)) NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'scoped_permission_decisions'::regclass AND conname = 'scoped_permission_decisions_withdrawal_check') THEN
          ALTER TABLE scoped_permission_decisions ADD CONSTRAINT scoped_permission_decisions_withdrawal_check
            CHECK (lifecycle_action <> 'withdrawal' OR decision = 'not_permitted') NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'scoped_permission_decisions'::regclass AND conname = 'scoped_permission_decisions_review_trigger_check') THEN
          ALTER TABLE scoped_permission_decisions ADD CONSTRAINT scoped_permission_decisions_review_trigger_check
            CHECK (expires_at IS NOT NULL OR NULLIF(BTRIM(mandatory_review_trigger), '') IS NOT NULL) NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'scoped_permission_decisions'::regclass AND conname = 'scoped_permission_decisions_json_arrays_check') THEN
          ALTER TABLE scoped_permission_decisions ADD CONSTRAINT scoped_permission_decisions_json_arrays_check
            CHECK (jsonb_typeof(blockers) = 'array' AND jsonb_typeof(required_conditions) = 'array') NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'scoped_permission_decisions'::regclass AND conname = 'scoped_permission_decisions_permission_inputs_check') THEN
          ALTER TABLE scoped_permission_decisions ADD CONSTRAINT scoped_permission_decisions_permission_inputs_check
            CHECK (decision NOT IN ('permitted', 'permitted_with_conditions')
              OR (capability_fit = 'within_scope' AND authorization_state IN ('established', 'conditional'))) NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'scoped_permission_decisions'::regclass AND conname = 'scoped_permission_decisions_permission_shape_check') THEN
          ALTER TABLE scoped_permission_decisions ADD CONSTRAINT scoped_permission_decisions_permission_shape_check
            CHECK ((decision = 'permitted'
                AND authorization_state = 'established'
                AND jsonb_array_length(blockers) = 0
                AND jsonb_array_length(required_conditions) = 0)
              OR (decision = 'permitted_with_conditions'
                AND jsonb_array_length(blockers) = 0
                AND jsonb_array_length(required_conditions) > 0)
              OR (decision NOT IN ('permitted', 'permitted_with_conditions')
                AND jsonb_array_length(blockers) > 0)) NOT VALID;
        END IF;
      END;
      $scoped_permission_decision_checks$` },
    { name: 'scoped_permission_decisions.operator_fk.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decisions VALIDATE CONSTRAINT scoped_permission_decisions_operator_fk` },
    { name: 'scoped_permission_decisions.decision_maker_fk.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decisions VALIDATE CONSTRAINT scoped_permission_decisions_decision_maker_fk` },
    { name: 'scoped_permission_decisions.inquiry_fk.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decisions VALIDATE CONSTRAINT scoped_permission_decisions_inquiry_fk` },
    { name: 'scoped_permission_decisions.related_fk.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decisions VALIDATE CONSTRAINT scoped_permission_decisions_related_fk` },
    { name: 'scoped_permission_decisions.decision_check.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decisions VALIDATE CONSTRAINT scoped_permission_decisions_decision_check` },
    { name: 'scoped_permission_decisions.capability_fit_check.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decisions VALIDATE CONSTRAINT scoped_permission_decisions_capability_fit_check` },
    { name: 'scoped_permission_decisions.authorization_state_check.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decisions VALIDATE CONSTRAINT scoped_permission_decisions_authorization_state_check` },
    { name: 'scoped_permission_decisions.lifecycle_action_check.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decisions VALIDATE CONSTRAINT scoped_permission_decisions_lifecycle_action_check` },
    { name: 'scoped_permission_decisions.lifecycle_link_check.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decisions VALIDATE CONSTRAINT scoped_permission_decisions_lifecycle_link_check` },
    { name: 'scoped_permission_decisions.withdrawal_check.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decisions VALIDATE CONSTRAINT scoped_permission_decisions_withdrawal_check` },
    { name: 'scoped_permission_decisions.review_trigger_check.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decisions VALIDATE CONSTRAINT scoped_permission_decisions_review_trigger_check` },
    { name: 'scoped_permission_decisions.json_arrays_check.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decisions VALIDATE CONSTRAINT scoped_permission_decisions_json_arrays_check` },
    { name: 'scoped_permission_decisions.permission_inputs_check.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decisions VALIDATE CONSTRAINT scoped_permission_decisions_permission_inputs_check` },
    { name: 'scoped_permission_decisions.permission_shape_check.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decisions VALIDATE CONSTRAINT scoped_permission_decisions_permission_shape_check` },
    { name: 'scoped_permission_decisions.operator_inquiry_created_idx', required: true, sql: sql`CREATE INDEX IF NOT EXISTS scoped_permission_decisions_operator_inquiry_created_idx
      ON scoped_permission_decisions (operator_id, inquiry_id, created_at, id)` },
    { name: 'scoped_permission_decisions.related_idx', required: true, sql: sql`CREATE INDEX IF NOT EXISTS scoped_permission_decisions_related_idx
      ON scoped_permission_decisions (related_permission_decision_id)` },
    { name: 'scoped_permission_decision_judgments.table', required: true, sql: sql`CREATE TABLE IF NOT EXISTS scoped_permission_decision_judgments (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      permission_decision_id varchar NOT NULL,
      judgment_id varchar NOT NULL,
      position integer NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT scoped_permission_decision_judgments_decision_fk
        FOREIGN KEY (permission_decision_id) REFERENCES scoped_permission_decisions(id) ON DELETE RESTRICT,
      CONSTRAINT scoped_permission_decision_judgments_judgment_fk
        FOREIGN KEY (judgment_id) REFERENCES coordination_judgments(id) ON DELETE RESTRICT,
      CONSTRAINT scoped_permission_decision_judgments_position_check
        CHECK (position >= 0)
    )` },
    { name: 'scoped_permission_decision_judgments.foreign_keys', required: true, sql: sql`DO $scoped_permission_decision_judgment_fks$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'scoped_permission_decision_judgments'::regclass AND conname = 'scoped_permission_decision_judgments_decision_fk') THEN
          ALTER TABLE scoped_permission_decision_judgments ADD CONSTRAINT scoped_permission_decision_judgments_decision_fk
            FOREIGN KEY (permission_decision_id) REFERENCES scoped_permission_decisions(id) ON DELETE RESTRICT NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'scoped_permission_decision_judgments'::regclass AND conname = 'scoped_permission_decision_judgments_judgment_fk') THEN
          ALTER TABLE scoped_permission_decision_judgments ADD CONSTRAINT scoped_permission_decision_judgments_judgment_fk
            FOREIGN KEY (judgment_id) REFERENCES coordination_judgments(id) ON DELETE RESTRICT NOT VALID;
        END IF;
      END;
      $scoped_permission_decision_judgment_fks$` },
    { name: 'scoped_permission_decision_judgments.check_constraints', required: true, sql: sql`DO $scoped_permission_decision_judgment_checks$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'scoped_permission_decision_judgments'::regclass AND conname = 'scoped_permission_decision_judgments_position_check') THEN
          ALTER TABLE scoped_permission_decision_judgments ADD CONSTRAINT scoped_permission_decision_judgments_position_check
            CHECK (position >= 0) NOT VALID;
        END IF;
      END;
      $scoped_permission_decision_judgment_checks$` },
    { name: 'scoped_permission_decision_judgments.decision_fk.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decision_judgments VALIDATE CONSTRAINT scoped_permission_decision_judgments_decision_fk` },
    { name: 'scoped_permission_decision_judgments.judgment_fk.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decision_judgments VALIDATE CONSTRAINT scoped_permission_decision_judgments_judgment_fk` },
    { name: 'scoped_permission_decision_judgments.position_check.validate', required: true, sql: sql`ALTER TABLE scoped_permission_decision_judgments VALIDATE CONSTRAINT scoped_permission_decision_judgments_position_check` },
    { name: 'scoped_permission_decision_judgments.unique', required: true, sql: sql`CREATE UNIQUE INDEX IF NOT EXISTS scoped_permission_decision_judgments_unique
      ON scoped_permission_decision_judgments (permission_decision_id, judgment_id)` },
    { name: 'scoped_permission_decision_judgments.position_unique', required: true, sql: sql`CREATE UNIQUE INDEX IF NOT EXISTS scoped_permission_decision_judgments_position_unique
      ON scoped_permission_decision_judgments (permission_decision_id, position)` },
    { name: 'scoped_permission_decision_judgments.judgment_idx', required: true, sql: sql`CREATE INDEX IF NOT EXISTS scoped_permission_decision_judgments_judgment_idx
      ON scoped_permission_decision_judgments (judgment_id)` },
    { name: 'scoped_permission_decisions.agreement_snapshot', required: true, sql: sql`ALTER TABLE scoped_permission_decisions ADD COLUMN IF NOT EXISTS agreement_snapshot jsonb` },
    { name: 'human_action_decisions.table', required: true, sql: sql`CREATE TABLE IF NOT EXISTS human_action_decisions (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      decision_maker_user_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      permission_decision_id varchar NOT NULL,
      decision_origin text NOT NULL DEFAULT 'authenticated_human',
      choice text NOT NULL,
      permission_review_summary text NOT NULL,
      rationale_text text NOT NULL,
      condition_confirmations jsonb NOT NULL DEFAULT '[]'::jsonb,
      actual_action text,
      actual_scope_text text,
      expires_at timestamp,
      withdrawn_at timestamp,
      lifecycle_action text NOT NULL DEFAULT 'decision',
      related_human_action_decision_id varchar,
      created_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT human_action_decisions_operator_fk
        FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT human_action_decisions_decision_maker_fk
        FOREIGN KEY (decision_maker_user_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT human_action_decisions_inquiry_fk
        FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE RESTRICT,
      CONSTRAINT human_action_decisions_permission_fk
        FOREIGN KEY (permission_decision_id) REFERENCES scoped_permission_decisions(id) ON DELETE RESTRICT,
      CONSTRAINT human_action_decisions_related_fk
        FOREIGN KEY (related_human_action_decision_id) REFERENCES human_action_decisions(id) ON DELETE RESTRICT,
      CONSTRAINT human_action_decisions_choice_check
        CHECK (choice IN ('proceed', 'wait', 'clarify', 'escalate', 'stop')),
      CONSTRAINT human_action_decisions_origin_check
        CHECK (decision_origin = 'authenticated_human'),
      CONSTRAINT human_action_decisions_lifecycle_action_check
        CHECK (lifecycle_action IN ('decision', 'correction', 'withdrawal', 'supersession')),
      CONSTRAINT human_action_decisions_lifecycle_link_check
        CHECK (
          (lifecycle_action = 'decision' AND related_human_action_decision_id IS NULL)
          OR (lifecycle_action <> 'decision' AND related_human_action_decision_id IS NOT NULL)
        ),
      CONSTRAINT human_action_decisions_withdrawal_check
        CHECK (lifecycle_action <> 'withdrawal' OR choice = 'stop'),
      CONSTRAINT human_action_decisions_condition_confirmations_check
        CHECK (jsonb_typeof(condition_confirmations) = 'array'),
      CONSTRAINT human_action_decisions_condition_shape_check
        CHECK (choice = 'proceed' OR jsonb_array_length(condition_confirmations) = 0)
    )` },
    { name: 'human_action_decisions.foreign_keys', required: true, sql: sql`DO $human_action_decision_fks$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'human_action_decisions'::regclass AND conname = 'human_action_decisions_operator_fk') THEN
          ALTER TABLE human_action_decisions ADD CONSTRAINT human_action_decisions_operator_fk
            FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'human_action_decisions'::regclass AND conname = 'human_action_decisions_decision_maker_fk') THEN
          ALTER TABLE human_action_decisions ADD CONSTRAINT human_action_decisions_decision_maker_fk
            FOREIGN KEY (decision_maker_user_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'human_action_decisions'::regclass AND conname = 'human_action_decisions_inquiry_fk') THEN
          ALTER TABLE human_action_decisions ADD CONSTRAINT human_action_decisions_inquiry_fk
            FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE RESTRICT NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'human_action_decisions'::regclass AND conname = 'human_action_decisions_permission_fk') THEN
          ALTER TABLE human_action_decisions ADD CONSTRAINT human_action_decisions_permission_fk
            FOREIGN KEY (permission_decision_id) REFERENCES scoped_permission_decisions(id) ON DELETE RESTRICT NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'human_action_decisions'::regclass AND conname = 'human_action_decisions_related_fk') THEN
          ALTER TABLE human_action_decisions ADD CONSTRAINT human_action_decisions_related_fk
            FOREIGN KEY (related_human_action_decision_id) REFERENCES human_action_decisions(id) ON DELETE RESTRICT NOT VALID;
        END IF;
      END;
      $human_action_decision_fks$` },
    { name: 'human_action_decisions.check_constraints', required: true, sql: sql`DO $human_action_decision_checks$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'human_action_decisions'::regclass AND conname = 'human_action_decisions_choice_check') THEN
          ALTER TABLE human_action_decisions ADD CONSTRAINT human_action_decisions_choice_check
            CHECK (choice IN ('proceed', 'wait', 'clarify', 'escalate', 'stop')) NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'human_action_decisions'::regclass AND conname = 'human_action_decisions_origin_check') THEN
          ALTER TABLE human_action_decisions ADD CONSTRAINT human_action_decisions_origin_check
            CHECK (decision_origin = 'authenticated_human') NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'human_action_decisions'::regclass AND conname = 'human_action_decisions_lifecycle_action_check') THEN
          ALTER TABLE human_action_decisions ADD CONSTRAINT human_action_decisions_lifecycle_action_check
            CHECK (lifecycle_action IN ('decision', 'correction', 'withdrawal', 'supersession')) NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'human_action_decisions'::regclass AND conname = 'human_action_decisions_lifecycle_link_check') THEN
          ALTER TABLE human_action_decisions ADD CONSTRAINT human_action_decisions_lifecycle_link_check
            CHECK ((lifecycle_action = 'decision' AND related_human_action_decision_id IS NULL)
              OR (lifecycle_action <> 'decision' AND related_human_action_decision_id IS NOT NULL)) NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'human_action_decisions'::regclass AND conname = 'human_action_decisions_withdrawal_check') THEN
          ALTER TABLE human_action_decisions ADD CONSTRAINT human_action_decisions_withdrawal_check
            CHECK (lifecycle_action <> 'withdrawal' OR choice = 'stop') NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'human_action_decisions'::regclass AND conname = 'human_action_decisions_condition_confirmations_check') THEN
          ALTER TABLE human_action_decisions ADD CONSTRAINT human_action_decisions_condition_confirmations_check
            CHECK (jsonb_typeof(condition_confirmations) = 'array') NOT VALID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'human_action_decisions'::regclass AND conname = 'human_action_decisions_condition_shape_check') THEN
          ALTER TABLE human_action_decisions ADD CONSTRAINT human_action_decisions_condition_shape_check
            CHECK (choice = 'proceed' OR jsonb_array_length(condition_confirmations) = 0) NOT VALID;
        END IF;
      END;
      $human_action_decision_checks$` },
    { name: 'human_action_decisions.operator_fk.validate', required: true, sql: sql`ALTER TABLE human_action_decisions VALIDATE CONSTRAINT human_action_decisions_operator_fk` },
    { name: 'human_action_decisions.decision_maker_fk.validate', required: true, sql: sql`ALTER TABLE human_action_decisions VALIDATE CONSTRAINT human_action_decisions_decision_maker_fk` },
    { name: 'human_action_decisions.inquiry_fk.validate', required: true, sql: sql`ALTER TABLE human_action_decisions VALIDATE CONSTRAINT human_action_decisions_inquiry_fk` },
    { name: 'human_action_decisions.permission_fk.validate', required: true, sql: sql`ALTER TABLE human_action_decisions VALIDATE CONSTRAINT human_action_decisions_permission_fk` },
    { name: 'human_action_decisions.related_fk.validate', required: true, sql: sql`ALTER TABLE human_action_decisions VALIDATE CONSTRAINT human_action_decisions_related_fk` },
    { name: 'human_action_decisions.choice_check.validate', required: true, sql: sql`ALTER TABLE human_action_decisions VALIDATE CONSTRAINT human_action_decisions_choice_check` },
    { name: 'human_action_decisions.origin_check.validate', required: true, sql: sql`ALTER TABLE human_action_decisions VALIDATE CONSTRAINT human_action_decisions_origin_check` },
    { name: 'human_action_decisions.lifecycle_action_check.validate', required: true, sql: sql`ALTER TABLE human_action_decisions VALIDATE CONSTRAINT human_action_decisions_lifecycle_action_check` },
    { name: 'human_action_decisions.lifecycle_link_check.validate', required: true, sql: sql`ALTER TABLE human_action_decisions VALIDATE CONSTRAINT human_action_decisions_lifecycle_link_check` },
    { name: 'human_action_decisions.withdrawal_check.validate', required: true, sql: sql`ALTER TABLE human_action_decisions VALIDATE CONSTRAINT human_action_decisions_withdrawal_check` },
    { name: 'human_action_decisions.condition_confirmations_check.validate', required: true, sql: sql`ALTER TABLE human_action_decisions VALIDATE CONSTRAINT human_action_decisions_condition_confirmations_check` },
    { name: 'human_action_decisions.condition_shape_check.validate', required: true, sql: sql`ALTER TABLE human_action_decisions VALIDATE CONSTRAINT human_action_decisions_condition_shape_check` },
    { name: 'human_action_decisions.operator_inquiry_created_idx', required: true, sql: sql`CREATE INDEX IF NOT EXISTS human_action_decisions_operator_inquiry_created_idx
      ON human_action_decisions (operator_id, inquiry_id, created_at, id)` },
    { name: 'human_action_decisions.permission_idx', required: true, sql: sql`CREATE INDEX IF NOT EXISTS human_action_decisions_permission_idx
      ON human_action_decisions (permission_decision_id)` },
    { name: 'human_action_decisions.related_idx', required: true, sql: sql`CREATE INDEX IF NOT EXISTS human_action_decisions_related_idx
      ON human_action_decisions (related_human_action_decision_id)` },
    { name: 'inquiry_responses.table', sql: sql`CREATE TABLE IF NOT EXISTS inquiry_responses (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      response_type text NOT NULL,
      channel text DEFAULT 'email',
      personal_note text,
      body text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      sent_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )` },

    // --- Schedule Drafts: Google-Docs-style editable table builder (additive, isolated) ---
    { name: 'schedule_drafts.table', sql: sql`CREATE TABLE IF NOT EXISTS schedule_drafts (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      artist_id varchar NOT NULL,
      inquiry_id varchar,
      contract_id varchar,
      booking_id varchar,
      title text,
      event_date text,
      location text,
      notes text,
      columns jsonb DEFAULT '[]'::jsonb,
      rows jsonb DEFAULT '[]'::jsonb,
      service_defaults jsonb DEFAULT '[]'::jsonb,
      providers jsonb DEFAULT '[]'::jsonb,
      status text DEFAULT 'draft',
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )` },
    { name: 'schedule_drafts.engine_metadata', sql: sql`ALTER TABLE schedule_drafts ADD COLUMN IF NOT EXISTS engine_metadata jsonb DEFAULT '{}'::jsonb` },
  ];
  
  for (const migration of migrations) {
    try {
      await db.execute(migration.sql);
      console.log(`[DB] Migration OK: ${migration.name}`);
    } catch (error: any) {
      console.error(`[DB] Migration FAILED: ${migration.name}`, error.message);
      if (migration.required) {
        throw error;
      }
    }
  }
  
  console.log("[DB] Schema migration completed");
}

const app = express();

// Trust proxy - required for rate limiting behind reverse proxy (Replit deployment)
// This ensures req.ip returns the real client IP, not the proxy IP
app.set('trust proxy', 1);

// CORS configuration for external form submissions
const allowedOrigins = [
  'https://briarwood.ai',
  'https://www.briarwood.ai',
  'https://themakeupdolls.com',
  'https://www.themakeupdolls.com',
  // Allow localhost for development
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.log(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Serve attached_assets as static files
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

// Briarwood marketing landing â€” served when host is briarwood.ai (or www.briarwood.ai)
// This runs before everything else so the SPA never claims `/` on this domain.
const BRIARWOOD_LANDING_HOSTS = new Set([
  'briarwood.ai',
  'www.briarwood.ai',
  'briarwood.com',
  'www.briarwood.com',
  'briarwood.ai',
  'www.briarwood.ai',
]);
const briarwoodLandingPath = path.join(process.cwd(), 'briarwood-landing', 'index.html');
app.use((req, res, next) => {
  const host = (req.hostname || '').toLowerCase();
  if (!BRIARWOOD_LANDING_HOSTS.has(host)) return next();
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path === '/' || req.path === '/index.html') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.sendFile(briarwoodLandingPath);
  }
  return next();
});

// Health check endpoints - MUST be first, before any middleware
// This ensures deployment health checks can succeed immediately
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// API readiness check endpoint for deployment systems
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: Date.now() });
});

app.get("/_health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      frameSrc: ["'self'"],
      frameAncestors: ["'self'", "https://themakeupdolls.com", "https://www.themakeupdolls.com", "https://briarwood.ai"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding external resources
}));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Apply JSON middleware for all other routes - increased limit for photo uploads
app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const logResponseBody = process.env.NODE_ENV !== "production";
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    if (logResponseBody) {
      capturedJsonResponse = bodyJson;
    }
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (logResponseBody && capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Run startup migrations to ensure schema is up to date
    await ensureDatabaseSchema();
    
    registerAgentRoutes(app);
    registerAcpRoutes(app);
    const httpServer = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // Headless API server: frontend/static serving is handled outside this process.

    // ALWAYS serve the API on the port specified in the environment variable PORT.
    // Other ports may be firewalled. Default to 5000 if not specified.
    const port = parseInt(process.env.PORT || "5000", 10);
    const devServerHost = process.env.DEV_SERVER_HOST?.trim();
    const host = devServerHost || "0.0.0.0";
    const reusePort = process.env.DEV_SERVER_REUSE_PORT === "true" || !devServerHost;
    const listenOptions = {
      port,
      host,
      ...(reusePort ? { reusePort: true } : {}),
    };
    httpServer.listen(
      listenOptions,
      () => {
        log(`serving on ${host}:${port}${reusePort ? " with reusePort" : ""}`);
        if (isLocalPreviewBackgroundJobsDisabled()) {
          logLocalPreviewBackgroundJobsDisabled();
          return;
        }

        // Start scheduled email job
        startScheduledEmailJob();
        // Start cron jobs (hold-expirer, SLA enforcer)
        startCronJobs();
      },
    );
  } catch (error) {
    console.error('[STARTUP ERROR]', error);
    process.exit(1);
  }
})();

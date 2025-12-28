CREATE TABLE "ai_chat_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text DEFAULT 'New Chat',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"conversation_id" varchar,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb,
	"extracted_entities" jsonb,
	"action_taken" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"artist_id" varchar,
	"client_id" varchar,
	"inquiry_id" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artist_form_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" varchar NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artist_intakes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"business_name" text,
	"years_experience" integer,
	"service_types" jsonb,
	"service_areas" jsonb,
	"price_range" text,
	"portfolio_url" text,
	"instagram_handle" text,
	"website_url" text,
	"insurance_info" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "artist_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"business_name" text,
	"bio" text,
	"location" text,
	"price_range" text,
	"specialties" jsonb,
	"portfolio_urls" jsonb,
	"portfolio_url" text,
	"instagram_handle" text,
	"tiktok_handle" text,
	"pinterest_handle" text,
	"website_url" text,
	"stripe_account_id" text,
	"square_merchant_id" text,
	"square_access_token" text,
	"square_refresh_token" text,
	"square_token_expires_at" timestamp,
	"square_location_id" text,
	"square_environment" text DEFAULT 'sandbox',
	"services_menu_url" text,
	"contract_template" text,
	"pretty_links" jsonb,
	"logo_url" text,
	"info_sheet_type" text DEFAULT 'template',
	"info_sheet_content" text,
	"info_sheet_pdf_url" text,
	"info_sheet_enabled" boolean DEFAULT true,
	"verification_status" text DEFAULT 'pending',
	"verified_at" timestamp,
	"verified_by" varchar,
	"rejection_reason" text,
	"artist_slug" varchar,
	"referral_artists" jsonb,
	"responsive_badge" boolean DEFAULT false,
	"avg_response_time_minutes" integer,
	"total_chats_answered" integer DEFAULT 0,
	"response_rate" integer DEFAULT 0,
	"last_chat_response_at" timestamp,
	"onboarding_completed" boolean DEFAULT false,
	"calendar_connected" boolean DEFAULT false,
	"google_calendar_id" text,
	"default_hold_hours" integer DEFAULT 72,
	"sla_targets" jsonb,
	"onboarding_preferences" jsonb,
	"edit_token" varchar,
	"form_success_message" text,
	"auto_responder_mode" text DEFAULT 'off',
	"polite_decline_template" text,
	"referral_list_template" text,
	"pricing_info" text,
	"custom_response" text,
	"planner_info_sheet" text,
	"planner_pricing" text,
	"login_code" varchar,
	"login_code_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artist_profiles_artist_slug_unique" UNIQUE("artist_slug"),
	CONSTRAINT "artist_profiles_edit_token_unique" UNIQUE("edit_token"),
	CONSTRAINT "artist_profiles_login_code_unique" UNIQUE("login_code")
);
--> statement-breakpoint
CREATE TABLE "artist_services" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer,
	"duration" integer,
	"category" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"actor_role" text,
	"action" text NOT NULL,
	"action_version" integer DEFAULT 1,
	"resource_type" text NOT NULL,
	"resource_id" varchar,
	"description" text,
	"email_sent" boolean DEFAULT false,
	"email_sent_to" text,
	"metadata" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_dates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" varchar NOT NULL,
	"blocked_date" text NOT NULL,
	"reason" text DEFAULT 'Pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_checklists" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" varchar NOT NULL,
	"vendor_id" varchar NOT NULL,
	"checklist_type" text DEFAULT 'day_of_readiness' NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"all_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar,
	"client_contact_id" varchar,
	"artist_id" varchar,
	"planner_id" varchar,
	"status" text NOT NULL,
	"event_date" timestamp NOT NULL,
	"location" text NOT NULL,
	"service_type" text NOT NULL,
	"amount" integer,
	"notes" text,
	"inspiration_photos" jsonb,
	"stripe_payment_link_id" text,
	"stripe_payment_link_url" text,
	"square_invoice_id" text,
	"square_payment_link_url" text,
	"square_order_id" text,
	"payment_status" text DEFAULT 'pending',
	"day_of_reminders" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_chat_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar NOT NULL,
	"conversation_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"pivot_type" text,
	"pivot_severity" integer,
	"urgency_level" integer DEFAULT 1 NOT NULL,
	"client_impact" text,
	"client_impact_score" integer DEFAULT 0 NOT NULL,
	"task_type" text,
	"estimated_labor_minutes" integer,
	"sentiment" text DEFAULT 'neutral' NOT NULL,
	"confidence_score" integer DEFAULT 0 NOT NULL,
	"ai_summary" text,
	"related_client_id" varchar,
	"related_booking_id" varchar,
	"cdi_event_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"content" text NOT NULL,
	"message_type" text DEFAULT 'text' NOT NULL,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdi_admin_overrides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insight_id" varchar NOT NULL,
	"admin_id" varchar NOT NULL,
	"original_decision" text NOT NULL,
	"override_decision" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdi_ai_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"message_id" varchar,
	"sentiment" text NOT NULL,
	"confidence_score" integer NOT NULL,
	"haco_decision" text NOT NULL,
	"distress_signals" jsonb,
	"raw_metrics" jsonb,
	"suggested_action" text,
	"ai_rationale" text,
	"quantum_state" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdi_behavioral_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"actor_role" text NOT NULL,
	"target_user_id" varchar,
	"target_role" text,
	"booking_id" varchar,
	"event_category" text NOT NULL,
	"event_type" text NOT NULL,
	"dimension" text NOT NULL,
	"signal_strength" integer NOT NULL,
	"response_latency_ms" integer,
	"tone_vector" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdi_composite_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"composite_score" integer NOT NULL,
	"trust_level" text NOT NULL,
	"emotional_fidelity_score" integer NOT NULL,
	"choreography_awareness_score" integer NOT NULL,
	"role_specific_recall_score" integer NOT NULL,
	"emotional_fidelity_weight" integer DEFAULT 40 NOT NULL,
	"choreography_awareness_weight" integer DEFAULT 30 NOT NULL,
	"role_specific_recall_weight" integer DEFAULT 30 NOT NULL,
	"haco_overall_decision" text NOT NULL,
	"predicted_success" integer,
	"intervention_recommended" boolean DEFAULT false NOT NULL,
	"intervention_reason" text,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdi_dimension_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"dimension" text NOT NULL,
	"score" integer NOT NULL,
	"confidence" integer NOT NULL,
	"haco_decision" text NOT NULL,
	"components" jsonb,
	"evidence_payload" jsonb,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdi_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"booking_id" varchar,
	"event_type" text NOT NULL,
	"severity" integer NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdi_feedback_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"composite_score_id" varchar,
	"booking_id" varchar,
	"feedback_type" text NOT NULL,
	"feedback_source" text NOT NULL,
	"source_user_id" varchar,
	"outcome_success" boolean,
	"satisfaction_score" integer,
	"dimension" text,
	"original_prediction" jsonb,
	"actual_outcome" jsonb,
	"learning_signal" integer,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdi_learning_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_type" text NOT NULL,
	"dimension" text,
	"feedback_events_processed" integer NOT NULL,
	"threshold_adjustments" jsonb,
	"pattern_library_updates" jsonb,
	"accuracy" jsonb,
	"audit_trail" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cdi_pattern_library" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_name" text NOT NULL,
	"pattern_category" text NOT NULL,
	"dimension" text NOT NULL,
	"pattern_sequence" jsonb,
	"success_weight" integer DEFAULT 100 NOT NULL,
	"validated_by" text NOT NULL,
	"sample_size" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cdi_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"score" integer NOT NULL,
	"risk_level" text NOT NULL,
	"factors" jsonb,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdi_thresholds" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"epsilon" integer DEFAULT 10 NOT NULL,
	"delta" integer DEFAULT 80 NOT NULL,
	"emotional_fidelity_weight" integer DEFAULT 40 NOT NULL,
	"choreography_awareness_weight" integer DEFAULT 30 NOT NULL,
	"role_specific_recall_weight" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_invite_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_invite_id" varchar NOT NULL,
	"sender_type" text NOT NULL,
	"sender_name" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_invites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" varchar NOT NULL,
	"invitee_email" text NOT NULL,
	"invitee_user_id" varchar,
	"status" text NOT NULL,
	"booking_id" varchar,
	"inquiry_id" varchar,
	"token" varchar,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" varchar NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"linked_user_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_intakes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"service_type" text,
	"event_type" text,
	"event_date" timestamp,
	"event_location" text,
	"party_size" integer,
	"budget" text,
	"preferred_styles" jsonb,
	"special_requirements" text,
	"how_heard" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "communication_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" varchar NOT NULL,
	"recipient_name" text NOT NULL,
	"recipient_email" text,
	"recipient_phone" text,
	"communication_type" text NOT NULL,
	"subject" text,
	"content" text,
	"metadata" jsonb,
	"status" text DEFAULT 'sent',
	"sent_via" text DEFAULT 'ai_chat',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" varchar NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"default_package_details" text,
	"default_total_amount" integer,
	"default_deposit_amount" integer,
	"default_deposit_percent" integer,
	"payment_schedule" text,
	"cancellation_policy" text,
	"late_fees" text,
	"travel_policy" text,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" varchar NOT NULL,
	"artist_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"package_details" text NOT NULL,
	"total_amount" integer NOT NULL,
	"deposit_amount" integer,
	"deposit_paid_at" timestamp,
	"remaining_amount" integer,
	"status" text DEFAULT 'draft',
	"signed_at" timestamp,
	"file_url" text,
	"open_sign_document_id" text,
	"open_sign_signing_url" text,
	"open_sign_certificate_url" text,
	"service_items" jsonb,
	"event_dates" text,
	"event_location" text,
	"service_start_time" text,
	"service_end_time" text,
	"client_name" text,
	"client_contact" text,
	"photographer_info" text,
	"venmo_handle" text,
	"paypal_email" text,
	"balance_due_date" text,
	"signing_token" text,
	"client_signature" text,
	"signed_by_name" text,
	"signed_by_email" text,
	"signed_on_behalf_of" text,
	"contract_html" text,
	"sent_for_signing_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "contracts_signing_token_unique" UNIQUE("signing_token")
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" varchar,
	"title" varchar,
	"channel_type" text DEFAULT 'client' NOT NULL,
	"owner_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_day_schedules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" varchar NOT NULL,
	"booking_id" varchar,
	"event_name" text NOT NULL,
	"event_date" timestamp NOT NULL,
	"session_details" text,
	"event_location" text,
	"ready_by_time" text,
	"notes" text,
	"recipient_emails" text,
	"guest_notes" text,
	"share_token" varchar,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_token" varchar DEFAULT gen_random_uuid(),
	"vendor_id" varchar NOT NULL,
	"client_id" varchar,
	"client_email" text NOT NULL,
	"client_name" text NOT NULL,
	"client_phone" text,
	"event_date" timestamp NOT NULL,
	"event_type" text,
	"event_location" text,
	"service_type" text NOT NULL,
	"party_size" integer,
	"message" text,
	"budget" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"response_mode" text DEFAULT 'auto',
	"deposit_paid_at" timestamp,
	"info_sheet_sent_at" timestamp,
	"chat_invite_sent_at" timestamp,
	"booking_id" varchar,
	"converted_to_booking_id" varchar,
	"converted_to_contract_id" varchar,
	"declined_reason" text,
	"referral_source_inquiry_id" varchar,
	"referral_source_vendor_id" varchar,
	"referral_sent_at" timestamp,
	"status_reason" text,
	"next_action" text,
	"next_action_due_at" timestamp,
	"owner_id" varchar,
	"hold" jsonb,
	"hold_placed_at" timestamp,
	"hold_expires_at" timestamp,
	"hold_owner_id" varchar,
	"hold_reason" text,
	"first_response_at" timestamp,
	"last_action_at" timestamp,
	"next_sla_due" timestamp,
	"escalation_state" text DEFAULT 'none',
	"breach_flags" jsonb,
	"proposal_id" varchar,
	"proposed_dates" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "inquiries_thread_token_unique" UNIQUE("thread_token")
);
--> statement-breakpoint
CREATE TABLE "inquiry_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" varchar NOT NULL,
	"type" text NOT NULL,
	"channel" text NOT NULL,
	"actor_system" text,
	"recipient_email" text,
	"recipient_phone" text,
	"subject" text,
	"content" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" text NOT NULL,
	"booking_id" varchar,
	"invited_by" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"accepted_at" timestamp,
	"accepted_user_id" varchar,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "iqs_interaction_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_score_id" varchar NOT NULL,
	"vendor_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"details" jsonb,
	"expected_at" timestamp,
	"occurred_at" timestamp NOT NULL,
	"score_impact" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iqs_lead_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" varchar NOT NULL,
	"client_user_id" varchar,
	"client_contact_id" varchar,
	"booking_id" varchar,
	"score" integer DEFAULT 50 NOT NULL,
	"risk_level" text DEFAULT 'unknown' NOT NULL,
	"factors" jsonb,
	"active_red_flags" jsonb,
	"vendor_rating" text,
	"vendor_notes" text,
	"outcome" text,
	"outcome_notes" text,
	"ai_summary" text,
	"last_analyzed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "iqs_learning_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"status" text DEFAULT 'running' NOT NULL,
	"feedback_processed" integer DEFAULT 0,
	"patterns_updated" integer DEFAULT 0,
	"new_patterns_discovered" integer DEFAULT 0,
	"results" jsonb
);
--> statement-breakpoint
CREATE TABLE "iqs_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"detection_criteria" jsonb,
	"base_severity" integer DEFAULT 5 NOT NULL,
	"base_weight" integer DEFAULT 10 NOT NULL,
	"times_triggered" integer DEFAULT 0,
	"times_confirmed_by_vendor" integer DEFAULT 0,
	"times_rejected_by_vendor" integer DEFAULT 0,
	"adjusted_weight" integer,
	"is_active" boolean DEFAULT true,
	"is_system_pattern" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "iqs_vendor_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" varchar NOT NULL,
	"lead_score_id" varchar,
	"feedback_type" text NOT NULL,
	"rating" text,
	"notes" text,
	"pattern_id" varchar,
	"event_id" varchar,
	"was_accurate" boolean,
	"actual_outcome" text,
	"processed_for_learning" boolean DEFAULT false,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" varchar NOT NULL,
	"recipient_id" varchar NOT NULL,
	"booking_id" varchar,
	"content" text NOT NULL,
	"sentiment_score" integer,
	"is_escalated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"status" text NOT NULL,
	"stripe_invoice_id" text,
	"stripe_payment_intent_id" text,
	"square_invoice_id" text,
	"square_payment_id" text,
	"due_date" timestamp NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_intakes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"company_name" text,
	"years_experience" integer,
	"specialization_type" text,
	"service_areas" jsonb,
	"typical_budget_range" text,
	"vendor_network_size" integer,
	"instagram_handle" text,
	"website_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profile_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reported_user_id" varchar NOT NULL,
	"reporter_id" varchar NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending',
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"action_taken" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" varchar NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text NOT NULL,
	"client_phone" text,
	"client_company" text,
	"event_date" timestamp,
	"event_location" text,
	"event_type" text,
	"completion_time" text,
	"line_items" jsonb,
	"subtotal" integer,
	"travel_fee" integer DEFAULT 0,
	"discount" integer DEFAULT 0,
	"total" integer,
	"notes" text,
	"terms" text,
	"valid_until" timestamp,
	"status" text DEFAULT 'draft',
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"responded_at" timestamp,
	"booking_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_appointments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" varchar NOT NULL,
	"team_member_id" varchar,
	"client_name" text NOT NULL,
	"service_type" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_vip" boolean DEFAULT false,
	"is_buffer" boolean DEFAULT false,
	"block_type" text DEFAULT 'service',
	"location_name" text,
	"location_address" text,
	"notes" text,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" varchar NOT NULL,
	"sender_name" text NOT NULL,
	"sender_type" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_team_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" varchar NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'stylist' NOT NULL,
	"service_type" text,
	"color" text,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_emails" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" varchar NOT NULL,
	"booking_id" varchar,
	"email_type" text NOT NULL,
	"recipient_email" text NOT NULL,
	"recipient_name" text NOT NULL,
	"subject" text,
	"email_data" jsonb,
	"scheduled_for" timestamp NOT NULL,
	"status" text DEFAULT 'pending',
	"sent_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" varchar NOT NULL,
	"artist_name" text NOT NULL,
	"num_artists" integer NOT NULL,
	"num_services" integer NOT NULL,
	"start_time" text NOT NULL,
	"timeline" jsonb,
	"day_of_reminders" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_cases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"booking_id" varchar,
	"priority" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"assigned_to" varchar,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar NOT NULL,
	"member_id" varchar,
	"member_email" text NOT NULL,
	"member_name" text NOT NULL,
	"role" text DEFAULT 'team_member' NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "thread_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" varchar NOT NULL,
	"actor_type" text NOT NULL,
	"body" text NOT NULL,
	"attachment_urls" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" varchar NOT NULL,
	"referred_artist_profile_id" varchar NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_public_token" varchar NOT NULL,
	"artist_profile_id" varchar NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text NOT NULL,
	"client_phone" text,
	"status" text DEFAULT 'inquiry' NOT NULL,
	"event_date" timestamp,
	"event_type" text,
	"service_type" text,
	"message" text,
	"source" text DEFAULT 'embed',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "threads_thread_public_token_unique" UNIQUE("thread_public_token")
);
--> statement-breakpoint
CREATE TABLE "trusted_circle" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" varchar NOT NULL,
	"referee_name" text NOT NULL,
	"referee_email" text,
	"referee_instagram" text,
	"invite_token" varchar,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trusted_circle_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50),
	"email" text,
	"password" text,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" text,
	"phone" text,
	"intake_completed" boolean DEFAULT false,
	"stripe_account_id" varchar,
	"square_merchant_id" varchar,
	"square_access_token" text,
	"square_refresh_token" text,
	"square_token_expires_at" timestamp,
	"venmo_handle" varchar,
	"cdi_consent_given" boolean DEFAULT false,
	"cdi_consent_date" timestamp,
	"cdi_opt_out" boolean DEFAULT false,
	"notification_preferences" jsonb,
	"is_beta_user" boolean DEFAULT false,
	"shared_to_instagram" boolean DEFAULT false,
	"password_reset_token" varchar,
	"password_reset_expires" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waitlist_signups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"source" text,
	"event_date" timestamp,
	"location" text,
	"services_needed" jsonb,
	"inspiration_images" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "waitlist_signups_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_chat_conversations" ADD CONSTRAINT "ai_chat_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_conversation_id_ai_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_chat_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_form_configs" ADD CONSTRAINT "artist_form_configs_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_intakes" ADD CONSTRAINT "artist_intakes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD CONSTRAINT "artist_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD CONSTRAINT "artist_profiles_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_services" ADD CONSTRAINT "artist_services_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_checklists" ADD CONSTRAINT "booking_checklists_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_checklists" ADD CONSTRAINT "booking_checklists_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_contact_id_client_contacts_id_fk" FOREIGN KEY ("client_contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_planner_id_users_id_fk" FOREIGN KEY ("planner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_chat_insights" ADD CONSTRAINT "business_chat_insights_message_id_business_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."business_chat_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_chat_insights" ADD CONSTRAINT "business_chat_insights_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_chat_insights" ADD CONSTRAINT "business_chat_insights_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_chat_insights" ADD CONSTRAINT "business_chat_insights_related_client_id_users_id_fk" FOREIGN KEY ("related_client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_chat_insights" ADD CONSTRAINT "business_chat_insights_related_booking_id_bookings_id_fk" FOREIGN KEY ("related_booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_chat_insights" ADD CONSTRAINT "business_chat_insights_cdi_event_id_cdi_events_id_fk" FOREIGN KEY ("cdi_event_id") REFERENCES "public"."cdi_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_chat_messages" ADD CONSTRAINT "business_chat_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_chat_messages" ADD CONSTRAINT "business_chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_admin_overrides" ADD CONSTRAINT "cdi_admin_overrides_insight_id_cdi_ai_insights_id_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."cdi_ai_insights"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_admin_overrides" ADD CONSTRAINT "cdi_admin_overrides_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_ai_insights" ADD CONSTRAINT "cdi_ai_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_ai_insights" ADD CONSTRAINT "cdi_ai_insights_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_behavioral_events" ADD CONSTRAINT "cdi_behavioral_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_behavioral_events" ADD CONSTRAINT "cdi_behavioral_events_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_behavioral_events" ADD CONSTRAINT "cdi_behavioral_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_composite_scores" ADD CONSTRAINT "cdi_composite_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_dimension_scores" ADD CONSTRAINT "cdi_dimension_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_events" ADD CONSTRAINT "cdi_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_events" ADD CONSTRAINT "cdi_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_feedback_events" ADD CONSTRAINT "cdi_feedback_events_composite_score_id_cdi_composite_scores_id_fk" FOREIGN KEY ("composite_score_id") REFERENCES "public"."cdi_composite_scores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_feedback_events" ADD CONSTRAINT "cdi_feedback_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_feedback_events" ADD CONSTRAINT "cdi_feedback_events_source_user_id_users_id_fk" FOREIGN KEY ("source_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_scores" ADD CONSTRAINT "cdi_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdi_thresholds" ADD CONSTRAINT "cdi_thresholds_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_invite_messages" ADD CONSTRAINT "chat_invite_messages_chat_invite_id_chat_invites_id_fk" FOREIGN KEY ("chat_invite_id") REFERENCES "public"."chat_invites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_invites" ADD CONSTRAINT "chat_invites_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_invites" ADD CONSTRAINT "chat_invites_invitee_user_id_users_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_invites" ADD CONSTRAINT "chat_invites_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_linked_user_id_users_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_intakes" ADD CONSTRAINT "client_intakes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_day_schedules" ADD CONSTRAINT "event_day_schedules_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_day_schedules" ADD CONSTRAINT "event_day_schedules_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_converted_to_booking_id_bookings_id_fk" FOREIGN KEY ("converted_to_booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_converted_to_contract_id_contracts_id_fk" FOREIGN KEY ("converted_to_contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_referral_source_vendor_id_users_id_fk" FOREIGN KEY ("referral_source_vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_hold_owner_id_users_id_fk" FOREIGN KEY ("hold_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_notifications" ADD CONSTRAINT "inquiry_notifications_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_user_id_users_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iqs_interaction_events" ADD CONSTRAINT "iqs_interaction_events_lead_score_id_iqs_lead_scores_id_fk" FOREIGN KEY ("lead_score_id") REFERENCES "public"."iqs_lead_scores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iqs_interaction_events" ADD CONSTRAINT "iqs_interaction_events_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iqs_lead_scores" ADD CONSTRAINT "iqs_lead_scores_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iqs_lead_scores" ADD CONSTRAINT "iqs_lead_scores_client_user_id_users_id_fk" FOREIGN KEY ("client_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iqs_lead_scores" ADD CONSTRAINT "iqs_lead_scores_client_contact_id_client_contacts_id_fk" FOREIGN KEY ("client_contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iqs_lead_scores" ADD CONSTRAINT "iqs_lead_scores_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iqs_patterns" ADD CONSTRAINT "iqs_patterns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iqs_vendor_feedback" ADD CONSTRAINT "iqs_vendor_feedback_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iqs_vendor_feedback" ADD CONSTRAINT "iqs_vendor_feedback_lead_score_id_iqs_lead_scores_id_fk" FOREIGN KEY ("lead_score_id") REFERENCES "public"."iqs_lead_scores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iqs_vendor_feedback" ADD CONSTRAINT "iqs_vendor_feedback_pattern_id_iqs_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."iqs_patterns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iqs_vendor_feedback" ADD CONSTRAINT "iqs_vendor_feedback_event_id_iqs_interaction_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."iqs_interaction_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_intakes" ADD CONSTRAINT "planner_intakes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_reports" ADD CONSTRAINT "profile_reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_reports" ADD CONSTRAINT "profile_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_reports" ADD CONSTRAINT "profile_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_appointments" ADD CONSTRAINT "schedule_appointments_schedule_id_event_day_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."event_day_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_appointments" ADD CONSTRAINT "schedule_appointments_team_member_id_schedule_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."schedule_team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_chat_messages" ADD CONSTRAINT "schedule_chat_messages_schedule_id_event_day_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."event_day_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_team_members" ADD CONSTRAINT "schedule_team_members_schedule_id_event_day_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."event_day_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_emails" ADD CONSTRAINT "scheduled_emails_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_emails" ADD CONSTRAINT "scheduled_emails_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_referrals" ADD CONSTRAINT "thread_referrals_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_referrals" ADD CONSTRAINT "thread_referrals_referred_artist_profile_id_artist_profiles_id_fk" FOREIGN KEY ("referred_artist_profile_id") REFERENCES "public"."artist_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_artist_profile_id_artist_profiles_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."artist_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_circle" ADD CONSTRAINT "trusted_circle_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_analytics_events_type" ON "analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_analytics_events_created" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_threads_token" ON "threads" USING btree ("thread_public_token");--> statement-breakpoint
CREATE INDEX "idx_threads_artist" ON "threads" USING btree ("artist_profile_id");
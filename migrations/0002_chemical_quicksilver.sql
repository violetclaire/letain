CREATE TABLE "direct_chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"direct_chat_id" varchar NOT NULL,
	"sender_type" text NOT NULL,
	"sender_name" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "direct_chats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" varchar NOT NULL,
	"participant_name" text NOT NULL,
	"participant_email" text NOT NULL,
	"participant_role" text DEFAULT 'contact' NOT NULL,
	"thread_token" varchar DEFAULT gen_random_uuid(),
	"participant_token" varchar DEFAULT gen_random_uuid(),
	"subject" text,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "direct_chats_thread_token_unique" UNIQUE("thread_token"),
	CONSTRAINT "direct_chats_participant_token_unique" UNIQUE("participant_token")
);
--> statement-breakpoint
ALTER TABLE "contracts" ALTER COLUMN "booking_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "contract_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "inquiry_id" varchar;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "client_thread_token" varchar DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "schedule_team_members" ADD COLUMN "assignment_link" text;--> statement-breakpoint
ALTER TABLE "direct_chat_messages" ADD CONSTRAINT "direct_chat_messages_direct_chat_id_direct_chats_id_fk" FOREIGN KEY ("direct_chat_id") REFERENCES "public"."direct_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_chats" ADD CONSTRAINT "direct_chats_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_client_thread_token_unique" UNIQUE("client_thread_token");
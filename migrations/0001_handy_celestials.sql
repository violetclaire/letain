ALTER TABLE "inquiries" ADD COLUMN "sentiment" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "sentiment_score" integer;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "sentiment_analysis" jsonb;
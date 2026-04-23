CREATE TABLE "shared_counter_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"counter_key" text NOT NULL,
	"delta" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."shared_counter_event" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "shared_counter_event_select_all" ON "public"."shared_counter_event" FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY "shared_counter_event_insert_all" ON "public"."shared_counter_event" FOR INSERT WITH CHECK (true);

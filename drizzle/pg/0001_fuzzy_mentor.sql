DROP INDEX "shared_counter_singleton";--> statement-breakpoint
ALTER TABLE "shared_counter" ADD COLUMN "key" text DEFAULT 'singleton' NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_counter" ADD COLUMN "value" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_counter" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "shared_counter_singleton" ON "shared_counter" USING btree ("key");
--> statement-breakpoint
ALTER TABLE "public"."shared_counter" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "shared_counter_select_all" ON "public"."shared_counter" FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY "shared_counter_insert_all" ON "public"."shared_counter" FOR INSERT WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "shared_counter_update_all" ON "public"."shared_counter" FOR UPDATE USING (true) WITH CHECK (true);
--> statement-breakpoint
INSERT INTO "public"."shared_counter" ("key", "value") VALUES ('singleton', 0)
ON CONFLICT ("key") DO NOTHING;
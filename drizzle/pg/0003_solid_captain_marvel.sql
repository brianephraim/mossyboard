CREATE TABLE "demo_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket" text NOT NULL,
	"order" integer NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "demo_item_bucket_order_unique" ON "demo_item" USING btree ("bucket","order");
--> statement-breakpoint
ALTER TABLE "public"."demo_item" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "demo_item_select_all" ON "public"."demo_item" FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY "demo_item_insert_all" ON "public"."demo_item" FOR INSERT WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "demo_item_update_all" ON "public"."demo_item" FOR UPDATE USING (true) WITH CHECK (true);
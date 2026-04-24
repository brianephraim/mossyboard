CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"column_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"position" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "columns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"board_id" uuid NOT NULL,
	"title" text NOT NULL,
	"position" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_column_id_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."columns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "columns" ADD CONSTRAINT "columns_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "boards_owner_updated_at_idx" ON "boards" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "cards_column_position_idx" ON "cards" USING btree ("column_id","position");--> statement-breakpoint
CREATE INDEX "columns_board_position_idx" ON "columns" USING btree ("board_id","position");--> statement-breakpoint
ALTER TABLE "public"."boards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."columns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "boards_select_none" ON "public"."boards" FOR SELECT TO anon, authenticated USING (false);--> statement-breakpoint
CREATE POLICY "boards_insert_none" ON "public"."boards" FOR INSERT TO anon, authenticated WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "boards_update_none" ON "public"."boards" FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "boards_delete_none" ON "public"."boards" FOR DELETE TO anon, authenticated USING (false);--> statement-breakpoint
CREATE POLICY "columns_select_none" ON "public"."columns" FOR SELECT TO anon, authenticated USING (false);--> statement-breakpoint
CREATE POLICY "columns_insert_none" ON "public"."columns" FOR INSERT TO anon, authenticated WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "columns_update_none" ON "public"."columns" FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "columns_delete_none" ON "public"."columns" FOR DELETE TO anon, authenticated USING (false);--> statement-breakpoint
CREATE POLICY "cards_select_none" ON "public"."cards" FOR SELECT TO anon, authenticated USING (false);--> statement-breakpoint
CREATE POLICY "cards_insert_none" ON "public"."cards" FOR INSERT TO anon, authenticated WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "cards_update_none" ON "public"."cards" FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "cards_delete_none" ON "public"."cards" FOR DELETE TO anon, authenticated USING (false);

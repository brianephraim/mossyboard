CREATE TABLE "card_subtasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"card_id" uuid NOT NULL,
	"title" text NOT NULL,
	"is_done" boolean DEFAULT false NOT NULL,
	"position" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "priority" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "card_subtasks" ADD CONSTRAINT "card_subtasks_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_subtasks_card_position_idx" ON "card_subtasks" USING btree ("card_id","position");
--> statement-breakpoint
ALTER TABLE "public"."cards" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."card_subtasks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "card_subtasks_select_none" ON "public"."card_subtasks" FOR SELECT TO anon, authenticated USING (false);
--> statement-breakpoint
CREATE POLICY "card_subtasks_insert_none" ON "public"."card_subtasks" FOR INSERT TO anon, authenticated WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "card_subtasks_update_none" ON "public"."card_subtasks" FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "card_subtasks_delete_none" ON "public"."card_subtasks" FOR DELETE TO anon, authenticated USING (false);

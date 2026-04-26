CREATE TABLE "card_tags" (
	"card_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_tags_card_id_tag_id_pk" PRIMARY KEY("card_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DROP TABLE "card_subtasks" CASCADE;--> statement-breakpoint
ALTER TABLE "card_tags" ADD CONSTRAINT "card_tags_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_tags" ADD CONSTRAINT "card_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_tags_tag_idx" ON "card_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "card_tags_card_idx" ON "card_tags" USING btree ("card_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_owner_normalized_unique" ON "tags" USING btree ("owner_id","normalized_name");--> statement-breakpoint
ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."card_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tags_select_none" ON "public"."tags" FOR SELECT TO anon, authenticated USING (false);--> statement-breakpoint
CREATE POLICY "tags_insert_none" ON "public"."tags" FOR INSERT TO anon, authenticated WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "tags_update_none" ON "public"."tags" FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "tags_delete_none" ON "public"."tags" FOR DELETE TO anon, authenticated USING (false);--> statement-breakpoint
CREATE POLICY "card_tags_select_none" ON "public"."card_tags" FOR SELECT TO anon, authenticated USING (false);--> statement-breakpoint
CREATE POLICY "card_tags_insert_none" ON "public"."card_tags" FOR INSERT TO anon, authenticated WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "card_tags_update_none" ON "public"."card_tags" FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "card_tags_delete_none" ON "public"."card_tags" FOR DELETE TO anon, authenticated USING (false);
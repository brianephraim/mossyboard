CREATE TABLE "shared_counter" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shared_counter_singleton" ON "shared_counter" USING btree ("id");
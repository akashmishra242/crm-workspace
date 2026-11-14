CREATE TABLE "bulk_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"tag_id" uuid,
	"tag_name" text NOT NULL,
	"tag_color" text NOT NULL,
	"requested_count" integer NOT NULL,
	"updated_count" integer NOT NULL,
	"unchanged_count" integer NOT NULL,
	"not_found_count" integer NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "bulk_actions" ADD CONSTRAINT "bulk_actions_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_actions" ADD CONSTRAINT "bulk_actions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bulk_actions_created_id" ON "bulk_actions" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_company_trgm" ON "contacts" USING gin (lower("company") gin_trgm_ops);--> statement-breakpoint
-- Backfill authors for existing contacts from their activity history.
UPDATE "contacts" AS c SET "created_by" = a."actor_id"
FROM "contact_activities" AS a
WHERE a."contact_id" = c."id" AND a."type" = 'CONTACT_CREATED' AND a."actor_id" IS NOT NULL;--> statement-breakpoint
UPDATE "contacts" AS c SET "updated_by" = latest."actor_id"
FROM (
	SELECT DISTINCT ON ("contact_id") "contact_id", "actor_id"
	FROM "contact_activities"
	ORDER BY "contact_id", "created_at" DESC, "id" DESC
) AS latest
WHERE latest."contact_id" = c."id";

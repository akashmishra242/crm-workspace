ALTER TYPE "public"."activity_type" ADD VALUE 'CONTACT_DELETED';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'CONTACT_RESTORED';--> statement-breakpoint
DROP INDEX "contacts_email_unique";--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_email_unique" ON "contacts" USING btree ("email") WHERE "contacts"."email" is not null and "contacts"."deleted_at" is null;
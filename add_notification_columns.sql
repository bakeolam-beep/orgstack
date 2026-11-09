-- Add missing columns to Tenant A schema (Ede Electronics)
ALTER TABLE "tenant_379a3d3b-710c-4ee8-8d2f-0044aa8805d2"."notifications" ADD COLUMN IF NOT EXISTS "title" VARCHAR(255);
ALTER TABLE "tenant_379a3d3b-710c-4ee8-8d2f-0044aa8805d2"."notifications" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Add missing columns to Tenant B schema (Osogbo Groceries)
ALTER TABLE "tenant_a2198807-2049-4aae-86d5-cfca448650da"."notifications" ADD COLUMN IF NOT EXISTS "title" VARCHAR(255);
ALTER TABLE "tenant_a2198807-2049-4aae-86d5-cfca448650da"."notifications" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Also add to public schema (for any future tenants)
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "title" VARCHAR(255);
ALTER TABLE "public"."notifications" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
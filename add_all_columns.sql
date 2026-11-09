-- Add missing columns to Tenant A schema (Ede Electronics)
ALTER TABLE "tenant_379a3d3b-710c-4ee8-8d2f-0044aa8805d2"."sales" ADD COLUMN IF NOT EXISTS "paystackReference" VARCHAR(255);
ALTER TABLE "tenant_379a3d3b-710c-4ee8-8d2f-0044aa8805d2"."sale_items" ADD COLUMN IF NOT EXISTS "productName" VARCHAR(255);

-- Add missing columns to Tenant B schema (Osogbo Groceries)
ALTER TABLE "tenant_a2198807-2049-4aae-86d5-cfca448650da"."sales" ADD COLUMN IF NOT EXISTS "paystackReference" VARCHAR(255);
ALTER TABLE "tenant_a2198807-2049-4aae-86d5-cfca448650da"."sale_items" ADD COLUMN IF NOT EXISTS "productName" VARCHAR(255);

-- Also add to public schema (for any future tenants)
ALTER TABLE "public"."sales" ADD COLUMN IF NOT EXISTS "paystackReference" VARCHAR(255);
ALTER TABLE "public"."sale_items" ADD COLUMN IF NOT EXISTS "productName" VARCHAR(255);
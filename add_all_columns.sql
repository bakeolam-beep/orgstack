-- Add missing columns to Tenant A schema (Ede Electronics)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'tenant_379a3d3b-710c-4ee8-8d2f-0044aa8805d2' AND table_name = 'sales' AND column_name = 'paystackReference') THEN
        ALTER TABLE "tenant_379a3d3b-710c-4ee8-8d2f-0044aa8805d2"."sales" ADD COLUMN "paystackReference" VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'tenant_379a3d3b-710c-4ee8-8d2f-0044aa8805d2' AND table_name = 'sale_items' AND column_name = 'productName') THEN
        ALTER TABLE "tenant_379a3d3b-710c-4ee8-8d2f-0044aa8805d2"."sale_items" ADD COLUMN "productName" VARCHAR(255);
    END IF;
END $$;

-- Add missing columns to Tenant B schema (Osogbo Groceries)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'tenant_a2198807-2049-4aae-86d5-cfca448650da' AND table_name = 'sales' AND column_name = 'paystackReference') THEN
        ALTER TABLE "tenant_a2198807-2049-4aae-86d5-cfca448650da"."sales" ADD COLUMN "paystackReference" VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'tenant_a2198807-2049-4aae-86d5-cfca448650da' AND table_name = 'sale_items' AND column_name = 'productName') THEN
        ALTER TABLE "tenant_a2198807-2049-4aae-86d5-cfca448650da"."sale_items" ADD COLUMN "productName" VARCHAR(255);
    END IF;
END $$;

-- Also add to public schema (for any future tenants)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'paystackReference') THEN
        ALTER TABLE "public"."sales" ADD COLUMN "paystackReference" VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sale_items' AND column_name = 'productName') THEN
        ALTER TABLE "public"."sale_items" ADD COLUMN "productName" VARCHAR(255);
    END IF;
END $$;
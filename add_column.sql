DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'tenant_379a3d3b-710c-4ee8-8d2f-0044aa8805d2' AND table_name = 'sales' AND column_name = 'paystackReference') THEN
        ALTER TABLE "tenant_379a3d3b-710c-4ee8-8d2f-0044aa8805d2"."sales" ADD COLUMN "paystackReference" VARCHAR(255);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'tenant_a2198807-2049-4aae-86d5-cfca448650da' AND table_name = 'sales' AND column_name = 'paystackReference') THEN
        ALTER TABLE "tenant_a2198807-2049-4aae-86d5-cfca448650da"."sales" ADD COLUMN "paystackReference" VARCHAR(255);
    END IF;
END $$;
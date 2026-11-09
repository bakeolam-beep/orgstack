import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module.js';
import { DatabaseInitService } from './src/database-init.service.js';
(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error','warn','log'] });
  try { await app.get(DatabaseInitService).initialize(); } catch {}
  const { AuthService } = await import('./src/auth/auth.service.js');
  const s = app.get(AuthService);
  try {
    const r = await s.register({ adminEmail: `dbg${Date.now()}@test.local`, adminPassword: 'ProbePass123!', businessName: 'Dbg Biz' });
    console.log('OK', JSON.stringify(r));
  } catch (e) {
    console.error('ERRMSG', e?.message);
    console.error('ERRSTACK', e?.stack);
  }
  await app.close();
})();

import 'reflect-metadata'; import 'dotenv/config'; import {NestFactory} from '@nestjs/core'; import {AppModule} from './src/app.module.js';
const app=await NestFactory.createApplicationContext(AppModule,{logger:['error','warn','log']});
const {AuthService}=await import('./src/auth/auth.service.js');
const s=app.get(AuthService);
try{ const r=await s.register({adminEmail:'dbg1@test.local',adminPassword:'ProbePass123!',businessName:'Dbg Biz'}); console.log('OK',JSON.stringify(r)); }catch(e){ console.error('ERR', e?.stack||e); }
await app.close();

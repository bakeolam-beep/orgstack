import 'reflect-metadata'; import 'dotenv/config';
import {NestFactory} from '@nestjs/core'; import {AppModule} from './src/app.module.js';
import {DataSource} from 'typeorm';
(async()=>{
  const app=await NestFactory.createApplicationContext(AppModule,{logger:['error','warn']});
  const {InventoryService}=await import('./src/inventory/inventory.service.js');
  const s=app.get(InventoryService) as any;
  console.log('ds?', !!s.dataSource, 'tcs?', !!s.tenantConnectionService);
  console.log('ds prop names', Object.keys(s).slice(0,20));
  await app.close();
})();

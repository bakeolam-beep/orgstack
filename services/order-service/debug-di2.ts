import 'reflect-metadata'; import 'dotenv/config';
import {NestFactory} from '@nestjs/core'; import {AppModule} from './src/app.module.js';
(async()=>{
  const app=await NestFactory.createApplicationContext(AppModule,{logger:['error','warn']});
  const {OrderService}=await import('./src/order/order.service.js');
  const s=app.get(OrderService) as any;
  console.log('ds?', !!s.dataSource, 'tcs?', !!s.tenantConnectionService, 'inv?', !!s.inventoryClientService);
  await app.close();
})();

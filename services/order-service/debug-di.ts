import 'reflect-metadata'; import 'dotenv/config';
import {NestFactory} from '@nestjs/core';
import {AppModule} from './src/app.module.js';
(async()=>{
  const app=await NestFactory.createApplicationContext(AppModule,{logger:['error','warn','log']});
  try{
    const {OrderService}=await import('./src/order/order.service.js');
    console.log('has', !!app.get(OrderService));
  }catch(e){console.error('ERR',e?.stack||e)}
  await app.close();
})();

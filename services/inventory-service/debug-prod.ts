import 'reflect-metadata'; import 'dotenv/config';
import {NestFactory} from '@nestjs/core'; import {AppModule} from './src/app.module.js';
(async()=>{
  const app=await NestFactory.createApplicationContext(AppModule,{logger:['error','warn']});
  const {InventoryService}=await import('./src/inventory/inventory.service.js');
  const s=app.get(InventoryService);
  const tid='d9a5f3a1-1f3b-410f-9bed-cbe8e68801ae';
  try{
    const r=await s.createProduct(tid,{name:'Dbg P',sku:'DBG-1',description:'d',unitPrice:10,reorderLevel:1});
    console.log('OK', JSON.stringify(r));
  }catch(e){console.error('ERR', e?.message); console.error(e?.stack)}
  await app.close();
})();

import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.initialize();
    } catch (e) {
      console.error('[DatabaseInitService] init skipped:', (e as Error)?.message ?? e);
    }
  }

  async initialize(): Promise<void> {
    if (!this.dataSource?.createQueryRunner) return;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "platform"');
    } finally {
      await queryRunner.release();
    }
  }
}

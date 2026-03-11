import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService 
  extends PrismaClient 
  implements OnModuleInit, OnModuleDestroy {
  
  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, 
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
    });

    // Create the PrismaPg adapter with the pool
    const adapter = new PrismaPg(pool);
    
    // Initialize PrismaClient with the adapter
    super({ adapter });
  }

  async onModuleInit() {
    try {
      console.log('Attempting to connect with URL:', process.env.DATABASE_URL?.split('?')[0]); // Hide credentials in log
      await this.$connect();
      console.log('✅ Database connected successfully');
      
      // Test the connection with a simple query
      await this.$queryRaw`SELECT 1 as connection_test`;
      console.log('✅ Test query successful');
    } catch (error) {
      console.error('❌ Database connection failed:');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      // Optional: Rethrow if you want the application to fail on startup
      // throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('✅ Database disconnected successfully');
  }
}
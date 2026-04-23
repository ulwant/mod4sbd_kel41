import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config(); // Memuat variabel dari .env 

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true
  }
});

pool.on('connect', () => {
  console.log('Database terhubung dengan sukses.');
});

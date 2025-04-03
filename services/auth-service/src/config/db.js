const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

const connect = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL database');
    return pool;
  } catch (err) {
    console.error('Error connecting to PostgreSQL database', err);
    throw err;
  }
};

module.exports = {
  connect,
  pool,
};

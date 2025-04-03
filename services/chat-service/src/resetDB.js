const { pool } = require('./config/db');

async function reset() {
  try {
    await pool.query(`
      DROP TABLE IF EXISTS reactions;
      DROP TABLE IF EXISTS blocked_users;
      DROP TABLE IF EXISTS messages;
      DROP TABLE IF EXISTS chat_members;
      DROP TABLE IF EXISTS chats;
    `);
    console.log('Database tables dropped successfully');
    process.exit(0);
  } catch (err) {
    console.error('Database reset failed:', err);
    process.exit(1);
  }
}

reset();

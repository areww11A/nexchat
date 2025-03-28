import knex from 'knex';
import knexConfig from '../knexfile.js';

const db = knex(knexConfig.test);

async function checkUsersTable() {
  try {
    const columns = await db('users').columnInfo();
    console.log('Users table columns:', Object.keys(columns));
    
    const hasRecoveryCode = 'recoveryCode' in columns;
    console.log('Has recoveryCode column:', hasRecoveryCode);
    
    if (!hasRecoveryCode) {
      console.log('Adding missing columns...');
      await db.schema.alterTable('users', table => {
        table.string('recoveryCode').nullable();
        table.timestamp('recoveryCodeExpires').nullable();
      });
      console.log('Columns added successfully');
    }
  } catch (error) {
    console.error('Error checking users table:', error);
  } finally {
    await db.destroy();
  }
}

checkUsersTable();

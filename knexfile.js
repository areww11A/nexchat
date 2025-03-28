import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './data/db.sqlite'
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    useNullAsDefault: true
  },
  test: {
    client: 'sqlite3',
    connection: {
      filename: './data/test_db.sqlite'
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    useNullAsDefault: true,
    debug: true // Добавлено логирование SQL
  },
  production: {
    client: 'sqlite3',
    connection: {
      filename: '/app/data/db.sqlite'
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    useNullAsDefault: true
  }
};

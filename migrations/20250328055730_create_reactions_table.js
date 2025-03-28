export async function up(knex) {
  return knex.schema.createTable('reactions', (table) => {
    table.increments('id').primary();
    table.integer('messageId').unsigned().notNullable()
      .references('id').inTable('messages').onDelete('CASCADE');
    table.integer('userId').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('emoji', 10).notNullable();
    table.timestamps(true, true);
    table.unique(['messageId', 'userId', 'emoji']);
  });
}

export async function down(knex) {
  return knex.schema.dropTable('reactions');
}

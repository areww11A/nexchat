export async function up(knex) {
  return knex.schema.createTable('chat_members', (table) => {
    table.increments('id').primary();
    table.integer('chatId').unsigned().notNullable()
      .references('id').inTable('chats').onDelete('CASCADE');
    table.integer('userId').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.boolean('isAdmin').defaultTo(false);
    table.timestamp('joinedAt').defaultTo(knex.fn.now());
    table.unique(['chatId', 'userId']);
  });
}

export async function down(knex) {
  return knex.schema.dropTable('chat_members');
}

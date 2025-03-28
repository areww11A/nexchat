export async function up(knex) {
  return knex.schema.createTable('chats', (table) => {
    table.increments('id').primary();
    table.string('name', 100).nullable();
    table.string('type').notNullable().defaultTo('personal'); // 'personal' or 'group'
    table.string('avatarUrl').nullable();
    table.timestamp('lastMessageAt').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  return knex.schema.dropTable('chats');
}

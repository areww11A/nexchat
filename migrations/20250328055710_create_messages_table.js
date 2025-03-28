export async function up(knex) {
  return knex.schema.createTable('messages', (table) => {
    table.increments('id').primary();
    table.integer('chatId').unsigned().notNullable()
      .references('id').inTable('chats').onDelete('CASCADE');
    table.integer('userId').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.text('content').nullable();
    table.string('voiceUrl').nullable();
    table.integer('duration').nullable();
    table.text('transcription').nullable();
    table.boolean('isEdited').defaultTo(false);
    table.boolean('isDeleted').defaultTo(false);
    table.timestamp('readAt').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  return knex.schema.dropTable('messages');
}

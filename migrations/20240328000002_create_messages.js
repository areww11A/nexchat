exports.up = function(knex) {
  return knex.schema
    .createTable('messages', function(table) {
      table.increments('id').primary();
      table.integer('chatId').unsigned().notNullable();
      table.integer('userId').unsigned().notNullable();
      table.text('content').notNullable();
      table.integer('replyToId').unsigned().nullable();
      table.integer('forwardFromId').unsigned().nullable();
      table.boolean('isEdited').defaultTo(false);
      table.boolean('isDeleted').defaultTo(false);
      table.timestamp('deletedAt').nullable();
      table.json('metadata').nullable(); // Для хранения дополнительной информации
      table.timestamps(true, true);

      table.foreign('chatId').references('chats.id').onDelete('CASCADE');
      table.foreign('userId').references('users.id').onDelete('CASCADE');
      table.foreign('replyToId').references('messages.id').onDelete('SET NULL');
      table.foreign('forwardFromId').references('messages.id').onDelete('SET NULL');
    })
    .createTable('message_reactions', function(table) {
      table.increments('id').primary();
      table.integer('messageId').unsigned().notNullable();
      table.integer('userId').unsigned().notNullable();
      table.string('reaction', 32).notNullable();
      table.timestamps(true, true);

      table.foreign('messageId').references('messages.id').onDelete('CASCADE');
      table.foreign('userId').references('users.id').onDelete('CASCADE');
      table.unique(['messageId', 'userId', 'reaction']);
    })
    .createTable('message_read_status', function(table) {
      table.increments('id').primary();
      table.integer('messageId').unsigned().notNullable();
      table.integer('userId').unsigned().notNullable();
      table.timestamp('readAt').notNullable();
      table.timestamps(true, true);

      table.foreign('messageId').references('messages.id').onDelete('CASCADE');
      table.foreign('userId').references('users.id').onDelete('CASCADE');
      table.unique(['messageId', 'userId']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('message_read_status')
    .dropTable('message_reactions')
    .dropTable('messages');
}; 
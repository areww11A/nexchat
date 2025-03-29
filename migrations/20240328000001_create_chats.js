exports.up = function(knex) {
  return knex.schema
    .createTable('chats', function(table) {
      table.increments('id').primary();
      table.string('type').notNullable().defaultTo('personal'); // personal или group
      table.string('name').nullable(); // для групповых чатов
      table.string('description', 500).nullable();
      table.string('avatarUrl').nullable();
      table.boolean('isPrivate').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('chat_members', function(table) {
      table.increments('id').primary();
      table.integer('chatId').unsigned().notNullable();
      table.integer('userId').unsigned().notNullable();
      table.boolean('isAdmin').notNullable().defaultTo(false);
      table.boolean('isMuted').notNullable().defaultTo(false);
      table.timestamp('lastReadAt').nullable();
      table.timestamp('joined_at').notNullable().defaultTo(knex.fn.now());
      table.timestamps(true, true);

      table.foreign('chatId').references('chats.id').onDelete('CASCADE');
      table.foreign('userId').references('users.id').onDelete('CASCADE');
      table.unique(['chatId', 'userId']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('chat_members')
    .dropTable('chats');
}; 
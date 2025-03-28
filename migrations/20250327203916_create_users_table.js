export async function up(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username', 50).notNullable().unique();
    table.string('passwordHash').notNullable();
    table.string('email').notNullable().unique();
    table.string('phone', 20).nullable();
    table.string('status', 50).nullable();
    table.date('birthDate').nullable();
    table.boolean('transcribeVoice').defaultTo(false);
    table.string('notificationSoundUrl').nullable();
    table.boolean('isOnline').defaultTo(false);
    table.timestamp('lastSeen').nullable();
    table.boolean('showTyping').defaultTo(true);
    table.boolean('showReadTimestamps').defaultTo(false);
    table.string('recoveryCode').nullable();
    table.timestamp('recoveryCodeExpires').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  return knex.schema.dropTable('users');
}

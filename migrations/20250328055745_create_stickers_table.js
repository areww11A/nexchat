export async function up(knex) {
  return knex.schema.createTable('stickers', (table) => {
    table.increments('id').primary();
    table.integer('userId').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('fileUrl').notNullable();
    table.string('fileType').notNullable(); // 'png' or 'gif'
    table.integer('fileSize').notNullable(); // in bytes
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  return knex.schema.dropTable('stickers');
}

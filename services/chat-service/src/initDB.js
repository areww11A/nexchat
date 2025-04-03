const Chat = require('./models/chat');
const { connect } = require('./config/db');

async function initialize() {
  try {
    await connect();
    await Chat.createTables();
    console.log('Database initialized successfully');
    process.exit(0);
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
}

initialize();

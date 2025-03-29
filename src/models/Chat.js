const { getDb } = require('../db');

class Chat {
  static async createPersonalChat(user1Id, user2Id) {
    const db = getDb();
    const [chat] = await db('chats')
      .insert({
        type: 'personal',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning(['id', 'type']);

    await db('chat_members').insert([
      {
        chatId: chat.id,
        userId: user1Id,
        isAdmin: true,
        joined_at: db.fn.now()
      },
      {
        chatId: chat.id,
        userId: user2Id,
        isAdmin: false,
        joined_at: db.fn.now()
      }
    ]);

    return chat;
  }

  static async createGroupChat(chatData) {
    const db = getDb();
    const [chat] = await db('chats')
      .insert({
        type: 'group',
        name: chatData.name,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning(['id', 'type', 'name']);

    await db('chat_members').insert({
      chatId: chat.id,
      userId: chatData.creatorId,
      isAdmin: true,
      joined_at: db.fn.now()
    });

    return chat;
  }

  static async addMember(chatId, userId) {
    const db = getDb();
    await db('chat_members').insert({
      chatId,
      userId,
      isAdmin: false,
      joined_at: db.fn.now()
    });
  }

  static async getChatMembers(chatId) {
    const db = getDb();
    const members = await db('chat_members')
      .select('users.username', 'chat_members.isAdmin')
      .join('users', 'chat_members.userId', 'users.id')
      .where('chat_members.chatId', chatId);
    
    return members.map(member => ({
      ...member,
      isAdmin: Boolean(member.isAdmin)
    }));
  }

  static async getUserChats(userId) {
    const db = getDb();
    return db('chats')
      .select('chats.*')
      .join('chat_members', 'chats.id', 'chat_members.chatId')
      .where('chat_members.userId', userId);
  }
}

module.exports = Chat; 
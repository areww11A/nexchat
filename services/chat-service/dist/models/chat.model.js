"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModel = void 0;
const db_1 = require("../db");
class ChatModel {
    static async createPersonalChat(userId1, userId2) {
        const result = await (0, db_1.query)(`INSERT INTO chats (type) VALUES ('personal') RETURNING *`);
        const chat = result.rows[0];
        await (0, db_1.query)(`INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)`, [chat.id, userId1, userId2]);
        return chat;
    }
    static async createGroupChat(userId, memberIds) {
        const result = await (0, db_1.query)(`INSERT INTO chats (type) VALUES ('group') RETURNING *`);
        const chat = result.rows[0];
        const values = memberIds.map(id => `(${chat.id}, ${id}, ${id === userId ? 'true' : 'false'})`).join(',');
        await (0, db_1.query)(`INSERT INTO chat_members (chat_id, user_id, is_admin) VALUES ${values}`);
        return chat;
    }
    static async getChatById(chatId) {
        const result = await (0, db_1.query)(`SELECT * FROM chats WHERE id = $1`, [chatId]);
        return result.rows[0] || null;
    }
    static async getChatMembers(chatId) {
        const result = await (0, db_1.query)(`SELECT * FROM chat_members WHERE chat_id = $1`, [chatId]);
        return result.rows;
    }
    static async isUserMemberOfChat(chatId, userId) {
        const result = await (0, db_1.query)(`SELECT EXISTS(SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2)`, [chatId, userId]);
        return result.rows[0].exists;
    }
    static async isUserBlocked(chatId, userId) {
        const result = await (0, db_1.query)(`SELECT EXISTS(SELECT 1 FROM blocked_users WHERE chat_id = $1 AND user_id = $2)`, [chatId, userId]);
        return result.rows[0].exists;
    }
    static async blockUser(chatId, userId, blockedByUserId) {
        await (0, db_1.query)(`INSERT INTO blocked_users (chat_id, user_id, blocked_by_user_id) VALUES ($1, $2, $3)`, [chatId, userId, blockedByUserId]);
    }
    static async unblockUser(chatId, userId) {
        await (0, db_1.query)(`DELETE FROM blocked_users WHERE chat_id = $1 AND user_id = $2`, [chatId, userId]);
    }
    static async getBlockedUsers(chatId) {
        const result = await (0, db_1.query)(`SELECT * FROM blocked_users WHERE chat_id = $1`, [chatId]);
        return result.rows;
    }
}
exports.ChatModel = ChatModel;

import { SocketCustom } from 'socket';
import { Server } from 'socket.io';
import Chat from '../../models/chat';

// 获取用户未读消息数量并发送通知
export const notifyUserUnreadCount = async (
  userId: string,
  io: Server,
): Promise<void> => {
  const unreadCount = await Chat.countDocuments({
    user: userId,
    isRead: false,
    isSoftDeleted: false,
    sender: 'customer',
  });
  console.log(`用户 ${userId} 的未读消息数量:`, unreadCount);
  io.emit('unreadUserMessageCountUpdated', { count: unreadCount });
};

// 获取客户未读消息数量并发送通知
export const notifyCustomerUnreadCount = async (
  customerId: string,
  io: Server,
): Promise<void> => {
  const unreadCount = await Chat.countDocuments({
    customer: customerId,
    isRead: false,
    isSoftDeleted: false,
    sender: 'user',
  });
  console.log(`客户 ${customerId} 的未读消息数量:`, unreadCount);
  io.emit('unreadCustomerMessageCountUpdated', { count: unreadCount });
};

export const messageCountUpdatedHandler = (
  socket: SocketCustom,
  io: Server,
) => {
  // 后台读取了客户消息或客户读取了消息
  socket.on('getUnreadMessageCount', async () => {
    try {
      const user = socket.user;
      const customer = socket.customer;

      if (user) {
        await notifyUserUnreadCount(user._id, io);
      }

      if (customer) {
        await notifyCustomerUnreadCount(customer._id, io);
      }
    } catch (error) {
      console.error('获取未读消息数量时发生错误:', error);
    }
  });
};

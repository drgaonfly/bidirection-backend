import { Server } from 'socket.io';
import http from 'http';
import User from '../models/user';
import Customer from '../models/customer';

let io: Server;

// 更新用户在线状态和最后在线时间
const updateUserStatus = async (userId: string, isOnline: boolean) => {
  return await User.findByIdAndUpdate(userId, {
    isOn: isOnline,
    lastOnline: new Date(),
  });
};

// 更新客户在线状态和最后在线时间
const updateCustomerStatus = async (customerId: string, isOnline: boolean) => {
  return await Customer.findByIdAndUpdate(customerId, {
    isOn: isOnline,
    lastOnline: new Date(),
  });
};

// 处理用户加入房间
const handleUserJoin = async (socket: any, userId: string) => {
  socket.join(`user-${userId}`);
  const user = await updateUserStatus(userId, true);
  console.log(
    `用户 ${userId} 加入房间, 最后在线时间: ${user.lastOnline?.toLocaleString()}, 当前在线人数: ${
      io.engine.clientsCount
    }`,
  );
};

// 处理客户加入房间
const handleCustomerJoin = async (socket: any, customerId: string) => {
  socket.join(`customer-${customerId}`);
  const customer = await updateCustomerStatus(customerId, true);
  console.log(
    `客户 ${customerId} 加入房间, 最后在线时间: ${customer.lastOnline?.toLocaleString()}, 当前在线人数: ${
      io.engine.clientsCount
    }`,
  );
};

// 处理用户离开房间
const handleUserLeave = async (socket: any, userId: string) => {
  socket.leave(`user-${userId}`);
  const user = await updateUserStatus(userId, false);
  console.log(
    `用户 ${userId} 离开房间, 最后在线时间: ${user.lastOnline?.toLocaleString()}, 当前在线人数: ${
      io.engine.clientsCount
    }`,
  );
};

// 处理客户离开房间
const handleCustomerLeave = async (socket: any, customerId: string) => {
  socket.leave(`customer-${customerId}`);
  const customer = await updateCustomerStatus(customerId, false);
  console.log(
    `客户 ${customerId} 离开房间, 最后在线时间: ${customer.lastOnline?.toLocaleString()}, 当前在线人数: ${
      io.engine.clientsCount
    }`,
  );
};

export const setupSocket = async (server: http.Server): Promise<Server> => {
  io = new Server(server);

  io.on('connection', async (socket: any) => {
    const token = socket.handshake.auth.token;
    const userId = socket.handshake.query.userId as string;
    const customerId = socket.handshake.query.customerId as string;

    console.log(`连接: ${socket.id}, token: ${token}`);
    console.log(`用户连接: ${socket.id}, userId: ${userId}`);
    console.log(`客户连接: ${socket.id}, customerId: ${customerId}`);

    // 处理用户和客户加入房间
    if (userId && userId !== 'undefined') {
      await handleUserJoin(socket, userId);
    }
    if (customerId && customerId !== 'undefined') {
      await handleCustomerJoin(socket, customerId);
    }

    socket.on('disconnect', async () => {
      console.log(`客户端断开连接: ${socket.id}`);

      // 处理用户和客户离开房间
      if (userId && userId !== 'undefined') {
        await handleUserLeave(socket, userId);
      }
      if (customerId && customerId !== 'undefined') {
        await handleCustomerLeave(socket, customerId);
      }
    });
  });

  return io;
};

export const getSocketIO = (): Server => {
  return io;
};

export { io };

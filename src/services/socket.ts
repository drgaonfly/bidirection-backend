import { Server } from 'socket.io';
import http from 'http';

let io: Server;

export const setupSocket = async (server: http.Server): Promise<Server> => {
  io = new Server(server);

  io.on('connection', async (socket: any) => {
    const token = socket.handshake.auth.token;

    console.log(`用户连接: ${socket.id}, token: ${token}`);

    const userId = socket.handshake.query.userId as string;

    console.log(`用户连接: ${socket.id}, userId: ${userId}`);
    // 后台用户加入房间
    if (userId) {
      socket.join(`user-${userId}`);
    }

    const customerId = socket.handshake.query.customerId as string;
    console.log(`客户连接: ${socket.id}, customerId: ${customerId}`);
    // 前端客户加入房间
    if (customerId) {
      socket.join(`customer-${customerId}`);
    }

    socket.on('disconnect', () => {
      console.log('客户端断开连接');
    });
  });

  return io;
};

export const getSocketIO = (): Server => {
  return io;
};

export { io };

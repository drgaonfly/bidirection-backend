import { Socket } from 'socket.io';
import { IUser } from '../models/user';
import { ICustomer } from '../models/customer';

export interface SocketCustom extends Socket {
  user: IUser;
  customer: ICustomer;
  nsp: any;
}

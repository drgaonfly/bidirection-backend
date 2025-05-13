// src/composers/index.ts
import { Composer } from 'grammy';
import addOperatorCommand from './add';
import showOperatorCommand from './show';
import removeOperatorCommand from './delete';
import { isGroupCreator } from '../../../../bot/middlewares/isGroupCreator';

// 创建一个新的 Composer 实例
const operatorComposer = new Composer();

operatorComposer.use(isGroupCreator, addOperatorCommand.middleware());
operatorComposer.use(isGroupCreator, showOperatorCommand.middleware());
operatorComposer.use(isGroupCreator, removeOperatorCommand.middleware());

export default operatorComposer;

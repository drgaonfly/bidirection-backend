import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { useCustomerService } from '../../../../utils/useEjsMessage';
import createDebug from 'debug';

const customerServiceCommand = new Composer<MyContext>();
const debug = createDebug('bot:customer-service');

// 监听"联系客服"文本消息
customerServiceCommand.hears('联系客服', async (ctx) => {
  debug('联系客服命令被触发');

  const bot = ctx.currentBot;

  const renderCustomerService = useCustomerService();
  const message = await renderCustomerService({
    url: bot.customer_service_link,
    channel: bot.customer_service_link,
    group: bot.customer_service_link,
  });

  // 直接回复客服链接
  await ctx.reply(message, {
    parse_mode: 'HTML',
  });
});

export default customerServiceCommand;

// src/menus/inline/exampleInlineMenu.ts
import { InlineKeyboard } from 'grammy';

const exampleInlineMenu = new InlineKeyboard()
  .text('按钮1', 'button1_callback')
  .text('按钮2', 'button2_callback')
  .row()
  .url('访问官网', 'https://yourwebsite.com')
  .text('返回主菜单', 'main_menu');

export default exampleInlineMenu;

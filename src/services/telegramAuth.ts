import puppeteer, { Browser, Page } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';

interface SessionInfo {
  browser: Browser;
  page: Page;
}

export class TelegramAuthService {
  private sessions = new Map<string, SessionInfo>();

  public async enterPhoneNumber(phoneNumber: string): Promise<string> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto('https://web.telegram.org/k/', {
      waitUntil: 'networkidle2',
    });

    // 等待并输入手机号
    await page.waitForSelector('input[type="tel"]');
    await page.type('input[type="tel"]', phoneNumber);

    // 点击下一步
    await page.click('button[type="submit"]');

    const sessionId = uuidv4();
    this.sessions.set(sessionId, { browser, page });
    return sessionId;
  }

  public async enterCode(sessionId: string, code: string): Promise<any[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('会话已过期');
    }

    const { page, browser } = session;

    // 等待并输入验证码
    await page.waitForSelector('input.input-field');
    await page.type('input.input-field', code);

    // 等待登录完成
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // 获取 cookies
    const cookies = await page.cookies();

    await browser.close();
    this.sessions.delete(sessionId);

    return cookies;
  }
}

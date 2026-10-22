export function htmlToTelegramHtml(html: string): string {
  return (
    html
      // 块级标签 → 换行
      .replace(/<\/?(p|div|h[1-6]|li|br|tr)[^>]*>/gi, '\n')
      // 保留 Telegram 支持的行内标签
      .replace(/<(\/?)strong([^>]*)>/gi, '<$1b>')
      .replace(/<(\/?)em([^>]*)>/gi, '<$1i>')
      // <a href="..."> 保留
      .replace(/<a\s+href="([^"]*)"[^>]*>/gi, '<a href="$1">')
      .replace(/<\/a>/gi, '</a>')
      // 剥掉其余所有标签（img、span、ul、ol 等）
      .replace(/<(?!\/?(b|i|u|s|code|pre|a)[\s>])[^>]+>/gi, '')
      // 去掉 HTML 实体的多余转义，保留 & < >
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&nbsp;/gi, ' ')
      // 多余空行合并
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

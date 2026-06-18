export const ITEMS_PER_PAGE = 20;

export const ROLES = {
  SuperAdmin: '管理员',
  Proxy: '代理', // 代理
} as const;

export const countryMapping: { [key: string]: string } = {
  越南胡志明: 'Vietnam Ho Chi Minh',
  越南河内: 'Vietnam Hanoi',
  泰国: 'Thailand',
  马来西亚: 'Malaysia',
  菲律宾: 'Philippines',
  印尼: 'Indonesia',
};

export const countryCodeMapping: { [key: string]: string } = {
  'Vietnam Ho Chi Minh': 'VNH',
  'Vietnam Hanoi': 'VN',
  Thailand: 'TH',
  Malaysia: 'MY',
  Philippines: 'PH',
  Indonesia: 'ID',
};

export const reversedCountryCodeMapping: { [key: string]: string } =
  Object.entries(countryCodeMapping).reduce(
    (acc, [key, value]) => {
      acc[value] = key;
      return acc;
    },
    {} as { [key: string]: string },
  );

export const platformMapping: { [key: string]: string } = {
  Shopee: 'Shopee',
  Lazada: 'Lazada',
  TikTok: 'TikTok',
};

export const ROLES = {
  SuperAdmin: 'SUPER_ADMIN',
  Admin: 'ADMIN', // Added Admin role
  Customer: 'CUSTOMER',
  OrderClerk: 'ORDER_CLERK',
  FinancialStaff: 'FINANCIAL_STAFF',
} as const;

export const countryMapping = {
  '越南胡志明': 'Vietnam Ho Chi Minh',
  '越南河内': 'Vietnam Hanoi',
  '泰国': 'Thailand',
  '马来西亚': 'Malaysia',
  '菲律宾': 'Philippines',
  '印尼': 'Indonesia'
};

export const platformMapping = {
  'Shopee': 'Shopee',
  'Lazada': 'Lazada',
  'TikTok': 'TikTok'
};
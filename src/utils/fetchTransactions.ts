const API_KEYS = [
  '41720408-8a6a-4abc-b934-1c44e33719cc',
  '29475d12-d3ec-4b30-b457-529b85db312d',
  '6e526565-2246-4071-b302-6b18c3d73026',
];

function getRandomApiKey(): string {
  const index = Math.floor(Math.random() * API_KEYS.length);
  return API_KEYS[index];
}

export async function fetchTransactions(address: string) {
  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions`;
  const apiKey = getRandomApiKey();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'TRON-PRO-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Transactions:', data);
    return data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
  }
}

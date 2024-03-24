type Rule = {
  value?: string;
  [key: string]: string;
};

type Params = {
  [key: string]: Rule;
};

type OrderParams = string;

const filterSearch = (params: Params): Params => {
  const hash: Params = {};

  for (const [key, rule] of Object.entries(params)) {
    if (rule.value && rule.value !== '') {
      delete rule['value'];
      hash[key] = rule;
    }
  }

  return hash;
};

const filterSorter = (params: OrderParams): { [key: string]: string } => {
  const order = params ? JSON.parse(params) : {};

  const hash: { [key: string]: string } = {};

  for (const [key, value] of Object.entries(order)) {
    console.log(`${key}: ${value}`);
    if (typeof value === 'string') {
      hash[key] = value.replace(/end/g, '');
    }
  }

  return hash;
};

const exclude = <T>(object: T, ...keys: (keyof T)[]): T => {
  for (const key of keys) {
    delete object[key];
  }
  return object;
};

export { filterSearch, filterSorter, exclude };

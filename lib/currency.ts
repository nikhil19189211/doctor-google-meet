export type CurrencyCode =
  | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CHF'
  | 'HKD' | 'SGD' | 'NOK' | 'SEK' | 'DKK' | 'NZD' | 'MXN'
  | 'PHP' | 'PLN' | 'THB' | 'INR';

type CurrencyInfo = {
  symbol: string;
  name: string;
  rate: number;
  zeroDecimal?: boolean;
  stripeOnly?: boolean;
};

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  USD: { symbol: '$',   name: 'US Dollar',         rate: 1     },
  EUR: { symbol: '€',   name: 'Euro',               rate: 0.92  },
  GBP: { symbol: '£',   name: 'British Pound',      rate: 0.79  },
  CAD: { symbol: 'CA$', name: 'Canadian Dollar',    rate: 1.36  },
  AUD: { symbol: 'A$',  name: 'Australian Dollar',  rate: 1.53  },
  JPY: { symbol: '¥',   name: 'Japanese Yen',       rate: 154,  zeroDecimal: true },
  CHF: { symbol: 'Fr',  name: 'Swiss Franc',        rate: 0.90  },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar',   rate: 7.82  },
  SGD: { symbol: 'S$',  name: 'Singapore Dollar',   rate: 1.34  },
  NOK: { symbol: 'kr',  name: 'Norwegian Krone',    rate: 10.5  },
  SEK: { symbol: 'kr',  name: 'Swedish Krona',      rate: 10.4  },
  DKK: { symbol: 'kr',  name: 'Danish Krone',       rate: 6.88  },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar', rate: 1.64  },
  MXN: { symbol: 'MX$', name: 'Mexican Peso',       rate: 17.1  },
  PHP: { symbol: '₱',   name: 'Philippine Peso',    rate: 56.5  },
  PLN: { symbol: 'zł',  name: 'Polish Złoty',       rate: 3.95  },
  THB: { symbol: '฿',   name: 'Thai Baht',          rate: 35.5  },
  INR: { symbol: '₹',   name: 'Indian Rupee',       rate: 83.5, stripeOnly: true },
};

export function convertFromUSD(usdAmount: number, currency: CurrencyCode): number {
  const { rate, zeroDecimal } = CURRENCIES[currency];
  const converted = usdAmount * rate;
  return zeroDecimal ? Math.round(converted) : Math.round(converted * 100) / 100;
}

export function formatAmount(amount: number, currency: CurrencyCode): string {
  const { symbol, zeroDecimal } = CURRENCIES[currency];
  if (zeroDecimal) return `${symbol}${Math.round(amount).toLocaleString()}`;
  return `${symbol}${amount.toFixed(2)}`;
}

export function toStripeAmount(amount: number, currency: CurrencyCode): number {
  const { zeroDecimal } = CURRENCIES[currency];
  return zeroDecimal ? Math.round(amount) : Math.round(amount * 100);
}

export const PAYPAL_CURRENCIES = Object.entries(CURRENCIES)
  .filter(([, v]) => !v.stripeOnly)
  .map(([k]) => k as CurrencyCode);

export function detectDefaultCurrency(): CurrencyCode {
  if (typeof navigator === 'undefined') return 'USD';
  const locale = navigator.language || 'en-US';
  const map: [string, CurrencyCode][] = [
    ['en-GB', 'GBP'], ['en-AU', 'AUD'], ['en-CA', 'CAD'], ['en-NZ', 'NZD'],
    ['de-CH', 'CHF'], ['fr-CH', 'CHF'], ['it-CH', 'CHF'],
    ['de', 'EUR'], ['fr', 'EUR'], ['it', 'EUR'], ['es-ES', 'EUR'],
    ['pt-BR', 'MXN'], ['es-MX', 'MXN'],
    ['zh-HK', 'HKD'], ['zh', 'HKD'],
    ['ms', 'SGD'],
    ['ja', 'JPY'],
    ['nb', 'NOK'], ['nn', 'NOK'],
    ['sv', 'SEK'],
    ['da', 'DKK'],
    ['pl', 'PLN'],
    ['th', 'THB'],
    ['fil', 'PHP'],
    ['hi', 'INR'], ['ta', 'INR'], ['te', 'INR'], ['mr', 'INR'],
  ];
  for (const [prefix, currency] of map) {
    if (locale.startsWith(prefix)) return currency;
  }
  return 'USD';
}

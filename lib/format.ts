// Country -> currency/timezone presets + money/date formatting helpers (client & server safe)

export const COUNTRIES: { code: string; name: string; currency: string; timezone: string }[] = [
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', timezone: 'Asia/Riyadh' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai' },
  { code: 'QA', name: 'Qatar', currency: 'QAR', timezone: 'Asia/Qatar' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', timezone: 'Asia/Kuwait' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD', timezone: 'Asia/Bahrain' },
  { code: 'OM', name: 'Oman', currency: 'OMR', timezone: 'Asia/Muscat' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', timezone: 'Asia/Karachi' },
  { code: 'IN', name: 'India', currency: 'INR', timezone: 'Asia/Kolkata' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', timezone: 'Asia/Dhaka' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', timezone: 'Asia/Colombo' },
  { code: 'NP', name: 'Nepal', currency: 'NPR', timezone: 'Asia/Kathmandu' },
  { code: 'AF', name: 'Afghanistan', currency: 'AFN', timezone: 'Asia/Kabul' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', timezone: 'Asia/Jakarta' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', timezone: 'Asia/Singapore' },
  { code: 'BN', name: 'Brunei', currency: 'BND', timezone: 'Asia/Brunei' },
  { code: 'TR', name: 'Turkey', currency: 'TRY', timezone: 'Europe/Istanbul' },
  { code: 'EG', name: 'Egypt', currency: 'EGP', timezone: 'Africa/Cairo' },
  { code: 'JO', name: 'Jordan', currency: 'JOD', timezone: 'Asia/Amman' },
  { code: 'LB', name: 'Lebanon', currency: 'LBP', timezone: 'Asia/Beirut' },
  { code: 'IQ', name: 'Iraq', currency: 'IQD', timezone: 'Asia/Baghdad' },
  { code: 'SY', name: 'Syria', currency: 'SYP', timezone: 'Asia/Damascus' },
  { code: 'YE', name: 'Yemen', currency: 'YER', timezone: 'Asia/Aden' },
  { code: 'SD', name: 'Sudan', currency: 'SDG', timezone: 'Africa/Khartoum' },
  { code: 'MA', name: 'Morocco', currency: 'MAD', timezone: 'Africa/Casablanca' },
  { code: 'DZ', name: 'Algeria', currency: 'DZD', timezone: 'Africa/Algiers' },
  { code: 'TN', name: 'Tunisia', currency: 'TND', timezone: 'Africa/Tunis' },
  { code: 'LY', name: 'Libya', currency: 'LYD', timezone: 'Africa/Tripoli' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', timezone: 'Africa/Lagos' },
  { code: 'KE', name: 'Kenya', currency: 'KES', timezone: 'Africa/Nairobi' },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB', timezone: 'Africa/Addis_Ababa' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', timezone: 'Africa/Accra' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', timezone: 'Africa/Dar_es_Salaam' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', timezone: 'Africa/Johannesburg' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London' },
  { code: 'US', name: 'United States', currency: 'USD', timezone: 'America/New_York' },
  { code: 'CA', name: 'Canada', currency: 'CAD', timezone: 'America/Toronto' },
  { code: 'DE', name: 'Germany', currency: 'EUR', timezone: 'Europe/Berlin' },
  { code: 'FR', name: 'France', currency: 'EUR', timezone: 'Europe/Paris' },
  { code: 'IT', name: 'Italy', currency: 'EUR', timezone: 'Europe/Rome' },
  { code: 'ES', name: 'Spain', currency: 'EUR', timezone: 'Europe/Madrid' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', timezone: 'Europe/Amsterdam' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', timezone: 'Europe/Stockholm' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', timezone: 'Europe/Zurich' },
  { code: 'PL', name: 'Poland', currency: 'PLN', timezone: 'Europe/Warsaw' },
  { code: 'AZ', name: 'Azerbaijan', currency: 'AZN', timezone: 'Asia/Baku' },
  { code: 'KZ', name: 'Kazakhstan', currency: 'KZT', timezone: 'Asia/Almaty' },
  { code: 'UZ', name: 'Uzbekistan', currency: 'UZS', timezone: 'Asia/Tashkent' },
  { code: 'CN', name: 'China', currency: 'CNY', timezone: 'Asia/Shanghai' },
  { code: 'JP', name: 'Japan', currency: 'JPY', timezone: 'Asia/Tokyo' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', timezone: 'Asia/Seoul' },
  { code: 'TH', name: 'Thailand', currency: 'THB', timezone: 'Asia/Bangkok' },
  { code: 'VN', name: 'Vietnam', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', timezone: 'Asia/Manila' },
  { code: 'AU', name: 'Australia', currency: 'AUD', timezone: 'Australia/Sydney' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', timezone: 'Pacific/Auckland' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', timezone: 'America/Sao_Paulo' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', timezone: 'America/Mexico_City' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires' },
];

export const agencyOf = (ctx: any) => ctx?.agency || ctx?.profile?.agencies || {};

// Format money in the agency's currency. Falls back to "CODE 0.00" if Intl rejects the code.
export function money(v: unknown, currency?: string | null): string {
  const c = (currency || 'USD').toUpperCase();
  const n = Number(v) || 0;
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' }).format(n);
  } catch {
    return `${c} ${n.toFixed(2)}`;
  }
}

// PDF-safe (ASCII only — Helvetica can't encode currency symbols like ﷼ or ₹)
export function moneyAscii(v: unknown, currency?: string | null): string {
  const c = (currency || 'USD').toUpperCase();
  return `${c} ${(Number(v) || 0).toFixed(2)}`;
}

export function dayTz(d: string | Date | null | undefined, tz?: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: tz || undefined });
  } catch {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

export function timeTz(d: string | Date | null | undefined, tz?: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tz || undefined });
  } catch {
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

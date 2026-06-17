const MONTH_NUM: Record<string, string> = {
  'January': '01', 'February': '02', 'March': '03', 'April': '04',
  'May': '05', 'June': '06', 'July': '07', 'August': '08',
  'September': '09', 'October': '10', 'November': '11', 'December': '12',
};

export function monthToApi(month: string, year: string): string {
  const num = MONTH_NUM[month];
  if (!num) throw new Error(`Invalid month name: ${month}`);
  return `${year}-${num}-01`;
}

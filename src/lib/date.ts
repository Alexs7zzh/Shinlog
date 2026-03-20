const READABLE_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'long',
  timeZone: 'UTC',
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});

const HTML_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
  year: 'numeric',
});

function formatYearMonthDay(date: Date): string {
  const parts = HTML_DATE_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to format date: ${date.toISOString()}`);
  }

  return `${year}-${month}-${day}`;
}

export function formatReadableDate(date: Date): string {
  return READABLE_DATE_FORMATTER.format(date);
}

export function formatShortDate(date: Date): string {
  return SHORT_DATE_FORMATTER.format(date);
}

export function formatHtmlDate(date: Date): string {
  return formatYearMonthDay(date);
}

export function toUppercaseDisplayText(text: string, lang?: string): string {
  if (lang && lang !== 'en') {
    return text;
  }

  return text.toLocaleUpperCase('en-US');
}

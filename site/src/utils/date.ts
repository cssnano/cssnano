const dateFormatter = new Intl.DateTimeFormat('en-IE', {
  dateStyle: 'long',
  timeZone: 'UTC',
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

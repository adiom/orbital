const numberFormat = new Intl.NumberFormat("ru-RU");

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatTime(value?: string | Date | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function plural(count: number, forms: [string, string, string]): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) {
    return forms[2];
  }
  if (mod10 === 1) {
    return forms[0];
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return forms[1];
  }
  return forms[2];
}

/** "5 минут назад", "3 дня назад", "—" when there is nothing to show. */
export function formatRelative(value?: string | Date | null): string {
  if (!value) {
    return "—";
  }
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) {
    return "—";
  }

  const minutes = Math.floor((Date.now() - then) / 60_000);

  if (minutes < 1) {
    return "только что";
  }
  if (minutes < 60) {
    return `${minutes} ${plural(minutes, ["минуту", "минуты", "минут"])} назад`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ${plural(hours, ["час", "часа", "часов"])} назад`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} ${plural(days, ["день", "дня", "дней"])} назад`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} ${plural(months, ["месяц", "месяца", "месяцев"])} назад`;
  }

  const years = Math.floor(months / 12);
  return `${years} ${plural(years, ["год", "года", "лет"])} назад`;
}

/** "не приходил 12 дней" for the people register. */
export function formatAbsence(days: number | null): string {
  if (days === null) {
    return "ни разу не писал";
  }
  if (days === 0) {
    return "был сегодня";
  }
  if (days === 1) {
    return "был вчера";
  }
  return `тишина ${days} ${plural(days, ["день", "дня", "дней"])}`;
}

export function formatCount(count: number, forms: [string, string, string]): string {
  return `${formatNumber(count)} ${plural(count, forms)}`;
}

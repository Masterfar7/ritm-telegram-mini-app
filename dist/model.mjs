const DAY = 86_400_000;

export function localDay(now = new Date()) {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString().slice(0, 10);
}

export function addDays(day, count) {
  return new Date(Date.parse(day) + count * DAY).toISOString().slice(0, 10);
}

export function weekStart(day) {
  const weekday = new Date(day).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

export function setCompletion(habit, day) {
  const dates = habit.dates.includes(day)
    ? habit.dates.filter(value => value !== day)
    : [...habit.dates, day].sort();
  return { ...habit, dates };
}

export function streak(habit, day) {
  const dates = new Set(habit.dates);
  let cursor = dates.has(day) ? day : addDays(day, -1);
  let total = 0;
  while (dates.has(cursor)) {
    total += 1;
    cursor = addDays(cursor, -1);
  }
  return total;
}

export function dailyProgress(habits, day) {
  const active = habits.filter(habit => habit.created <= day);
  return { active, complete: active.filter(habit => habit.dates.includes(day)).length };
}

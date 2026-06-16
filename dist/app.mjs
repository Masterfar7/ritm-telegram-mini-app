import { addDays, dailyProgress, localDay, setCompletion, streak, weekStart } from './model.mjs';

const telegram = window.Telegram?.WebApp;
const inTelegram = Boolean(telegram?.initData);
const key = 'ritm.habits.v1';
const get = id => document.getElementById(id);
const form = get('form');
const editor = get('editor');
const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const dateLabel = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
let today = localDay();
let selected = today;
let monday = weekStart(today);
let editing = null;

if (inTelegram) {
  function applyTheme() {
    document.documentElement.dataset.theme = telegram.colorScheme;
  }
  applyTheme();
  telegram.onEvent('themeChanged', applyTheme);
  telegram.expand();
}

function load() {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw);
  } catch {
    get('status').textContent = 'Не удалось прочитать сохранённые привычки.';
  }
  return [
    { id: 'water', name: 'Выпить стакан воды', icon: '💧', created: addDays(today, -6), dates: [addDays(today, -1), today] },
    { id: 'book', name: 'Прочитать 10 страниц', icon: '📖', created: addDays(today, -6), dates: [addDays(today, -1)] },
    { id: 'walk', name: 'Выйти на прогулку', icon: '🏃', created: addDays(today, -6), dates: [] },
  ];
}

let habits = load();

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function render() {
  get('today').textContent = dateLabel.format(new Date(today));
  get('range').textContent = dayFormat.formatRange(new Date(monday), new Date(addDays(monday, 6)));
  get('next').disabled = monday >= weekStart(today);
  get('week').replaceChildren(...weekdays.map((weekday, index) => {
    const day = addDays(monday, index);
    const button = element('button', '', 'day');
    const { active, complete } = dailyProgress(habits, day);
    button.append(element('span', weekday), element('strong', String(Number(day.slice(-2)))));
    button.type = 'button';
    button.disabled = day > today;
    button.dataset.done = String(active.length > 0 && complete === active.length);
    button.setAttribute('aria-pressed', String(day === selected));
    button.setAttribute('aria-label', dateLabel.format(new Date(day)));
    button.addEventListener('click', () => {
      selected = day;
      render();
      get('week').children[index].focus();
    });
    return button;
  }));

  const { active, complete } = dailyProgress(habits, selected);
  get('progress').max = active.length || 1;
  get('progress').value = complete;
  get('progress-label').textContent = 'Выполнено ' + complete + ' из ' + active.length;
  get('day-title').textContent = selected === today ? 'Сегодня' : dayFormat.format(new Date(selected));
  get('empty').hidden = active.length > 0;
  get('empty').textContent = selected === today ? 'Добавьте первую привычку.' : 'В этот день привычек ещё не было.';
  get('list').replaceChildren(...active.map(habit => {
    const item = element('li', '', 'habit');
    const done = habit.dates.includes(selected);
    const toggle = element('button', done ? '✓' : '', 'toggle');
    toggle.dataset.habit = habit.id;
    toggle.setAttribute('aria-label', habit.name + ', отметка выполнения');
    toggle.setAttribute('aria-pressed', String(done));
    toggle.addEventListener('click', () => {
      const next = habits.map(row => row.id === habit.id ? setCompletion(row, selected) : row);
      if (save(next, done ? 'Отметка снята.' : 'Привычка выполнена.')) {
        [...get('list').querySelectorAll('.toggle')].find(button => button.dataset.habit === habit.id)?.focus();
        if (inTelegram && !done) telegram.HapticFeedback?.notificationOccurred('success');
      }
    });

    const details = element('div', '', 'details');
    const icon = element('span', habit.icon, 'icon');
    icon.setAttribute('aria-hidden', 'true');
    details.append(icon, element('strong', habit.name), element('small', 'Серия: ' + streak(habit, selected) + ' дн.'));
    const edit = element('button', '⋯', 'edit');
    edit.setAttribute('aria-label', 'Изменить привычку «' + habit.name + '»');
    edit.addEventListener('click', () => openEditor(habit));
    item.append(toggle, details, edit);
    return item;
  }));
}

function openEditor(habit) {
  editing = habit?.id ?? null;
  form.reset();
  form.elements.name.value = habit?.name ?? '';
  form.elements.icon.value = habit?.icon ?? '🌱';
  get('form-title').textContent = habit ? 'Изменить привычку' : 'Новая привычка';
  get('remove').hidden = !habit;
  get('remove').textContent = 'Удалить';
  get('error').hidden = true;
  editor.showModal();
}

function save(next, message) {
  const status = editor.open ? get('error') : get('status');
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    status.textContent = 'Не удалось сохранить изменения.';
    status.hidden = false;
    return false;
  }
  habits = next;
  if (editor.open) {
    editor.close();
    get('add').focus();
  }
  get('status').textContent = message;
  render();
  return true;
}

get('prev').addEventListener('click', () => {
  monday = addDays(monday, -7);
  selected = monday;
  render();
});
get('next').addEventListener('click', () => {
  monday = addDays(monday, 7);
  selected = monday === weekStart(today) ? today : monday;
  render();
});
get('add').addEventListener('click', () => openEditor());
get('cancel').addEventListener('click', () => editor.close());
get('remove').addEventListener('click', event => {
  if (event.currentTarget.textContent === 'Удалить') {
    event.currentTarget.textContent = 'Подтвердить удаление';
    return;
  }
  save(habits.filter(habit => habit.id !== editing), 'Привычка удалена.');
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const name = data.get('name').trim();
  if (!name) {
    get('error').textContent = 'Введите название привычки.';
    get('error').hidden = false;
    return;
  }

  const fields = { name, icon: data.get('icon') };
  if (!editing) {
    today = localDay();
    selected = today;
    monday = weekStart(today);
  }
  const next = editing
    ? habits.map(habit => habit.id === editing ? { ...habit, ...fields } : habit)
    : [...habits, { ...fields, id: `habit-${Date.now()}-${Math.random().toString(36).slice(2)}`, created: today, dates: [] }];
  save(next, 'Привычка сохранена.');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  const currentDay = localDay();
  if (today !== currentDay && selected === today) {
    selected = currentDay;
    monday = weekStart(selected);
  }
  today = currentDay;
  render();
});
render();
if (inTelegram) telegram.ready();

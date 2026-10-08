// UI strings. A value can be a plain string or a plural map ({ one, few, many, other }) picked with Intl.PluralRules.
// "{name}" placeholders are filled from the vars passed to t().

const en = {
  'tab.todo': 'To-do', 'tab.day': 'Day', 'tab.week': 'Week', 'tab.month': 'Month', 'tab.habits': 'Habits', 'tab.lists': 'Lists',
  'common.today': 'Today', 'common.new': 'New', 'common.cancel': 'Cancel', 'common.save': 'Save', 'common.done': 'Done', 'common.delete': 'Delete',

  'todo.title': 'To-do List',
  'todo.left': { one: '{n} item left to schedule or complete', other: '{n} items left to schedule or complete' },
  'todo.quick': 'Add a task for today…', 'todo.add': 'Add',
  'todo.overdue': 'Overdue', 'todo.today': 'Today · {date}', 'todo.upcoming': 'Upcoming', 'todo.someday': 'Someday',
  'todo.empty': 'Nothing here.', 'todo.emptyUpcoming': 'Nothing planned yet.',

  'day.tapHint': 'tap the timeline to add something', 'day.tasks': 'Tasks', 'day.noTasks': 'No loose tasks today.', 'day.habits': 'Habits',
  'week.title': 'Week',
  'month.hint': 'Tap a day to open it', 'month.more': '+{n} more',

  'repeat.none': 'Never', 'repeat.daily': 'Every day', 'repeat.weekdays': 'Weekdays', 'repeat.weekly': 'Every week',

  'item.new': 'New', 'item.edit': 'Edit', 'item.titlePh': "What's the plan?", 'item.notes': 'Notes',
  'item.someday': 'Someday (no date)', 'item.date': 'Date', 'item.timed': 'Set a time', 'item.time': 'Time', 'item.repeat': 'Repeat',
  'item.colour': 'Colour', 'item.list': 'List', 'item.tags': 'Tags', 'item.nameFirst': 'Give it a name first',
  'item.confirmDelete': 'Delete "{title}"?', 'item.confirmDeleteRepeat': 'Delete "{title}" and all its repeats?',

  'habits.title': 'Habits', 'habits.empty': 'No habits yet. Start with one small thing.', 'habits.add': 'Add a habit',
  'habits.streak': '{n}-day streak', 'habits.month': '{n}% this month',
  'habit.new': 'New habit', 'habit.edit': 'Edit habit', 'habit.namePh': 'e.g. Drink water', 'habit.days': 'Days',
  'habit.confirmDelete': 'Delete the habit "{name}" and its history?',
  'lock.label': 'Lock timeline', 'lock.on': 'Timeline locked — tasks won’t move', 'lock.off': 'Timeline unlocked — drag to move or resize',

  'lists.empty': 'Nothing here yet. Tap New to add something.', 'lists.all': 'All',
  'status.planned': 'Planned', 'status.ongoing': 'In progress', 'status.completed': 'Completed', 'status.dropped': 'Dropped',
  'col.books': 'Books', 'col.games': 'Games', 'col.movies': 'Movies', 'col.series': 'Series',
  'entry.new': 'New entry', 'entry.edit': 'Edit entry', 'entry.titlePh': 'Title', 'entry.cover': 'Add cover', 'entry.removeCover': 'Remove cover',
  'entry.collection': 'List', 'entry.status': 'Status', 'entry.rating': 'Rating', 'entry.note': 'Notes', 'entry.confirmDelete': 'Delete "{title}"?',
  'colsheet.new': 'New list', 'colsheet.edit': 'Edit list', 'colsheet.namePh': 'e.g. Anime',
  'colsheet.confirmDelete': 'Delete the list "{name}" and everything in it?',

  'decor.button': 'Decorate', 'decor.select': 'Move stickers', 'decor.pen': 'Pen', 'decor.hl': 'Highlighter', 'decor.eraser': 'Eraser',
  'decor.stickers': 'Stickers', 'decor.undo': 'Undo', 'decor.finger': 'Draw with finger', 'decor.nothingUndo': 'Nothing to undo',
  'stickers.title': 'Stickers', 'stickers.add': 'Add from Photos', 'stickers.mine': 'Yours', 'stickers.pack': 'Starter pack',

  'settings.title': 'Settings', 'settings.background': 'Background', 'settings.photo': 'Choose a photo', 'settings.blur': 'Blur', 'settings.dim': 'Dim',
  'settings.language': 'Language', 'settings.data': 'Data', 'settings.export': 'Export backup', 'settings.import': 'Import backup',
  'settings.clearDone': 'Clear completed tasks', 'settings.install': 'To install: tap Share, then Add to Home Screen.',

  'toast.saveFail': 'Could not save. Storage is unavailable.', 'toast.restored': 'Backup restored', 'toast.badFile': "That file isn't a Sprout backup",
  'toast.cleared': { one: 'Cleared {n} completed task', other: 'Cleared {n} completed tasks' }, 'toast.nothingClear': 'Nothing to clear',
  'toast.imageFail': "Couldn't open that image", 'import.confirm': 'Replace everything with this backup ({n} items)?',

  'seed.water': 'Drink water', 'seed.read': 'Read before bed',
};

const ru = {
  'tab.todo': 'Задачи', 'tab.day': 'День', 'tab.week': 'Неделя', 'tab.month': 'Месяц', 'tab.habits': 'Привычки', 'tab.lists': 'Списки',
  'common.today': 'Сегодня', 'common.new': 'Новое', 'common.cancel': 'Отмена', 'common.save': 'Сохранить', 'common.done': 'Готово', 'common.delete': 'Удалить',

  'todo.title': 'Список задач', 'todo.left': 'Осталось задач: {n}',
  'todo.quick': 'Добавить задачу на сегодня…', 'todo.add': 'Добавить',
  'todo.overdue': 'Просрочено', 'todo.today': 'Сегодня · {date}', 'todo.upcoming': 'Предстоящие', 'todo.someday': 'Когда-нибудь',
  'todo.empty': 'Здесь пусто.', 'todo.emptyUpcoming': 'Пока ничего не запланировано.',

  'day.tapHint': 'нажмите на шкалу времени, чтобы добавить', 'day.tasks': 'Задачи', 'day.noTasks': 'Задач без времени на сегодня нет.', 'day.habits': 'Привычки',
  'week.title': 'Неделя',
  'month.hint': 'Нажмите на день, чтобы открыть его', 'month.more': 'ещё {n}',

  'repeat.none': 'Никогда', 'repeat.daily': 'Каждый день', 'repeat.weekdays': 'По будням', 'repeat.weekly': 'Каждую неделю',

  'item.new': 'Новое', 'item.edit': 'Изменить', 'item.titlePh': 'Что в планах?', 'item.notes': 'Заметки',
  'item.someday': 'Когда-нибудь (без даты)', 'item.date': 'Дата', 'item.timed': 'Указать время', 'item.time': 'Время', 'item.repeat': 'Повтор',
  'item.colour': 'Цвет', 'item.list': 'Список', 'item.tags': 'Теги', 'item.nameFirst': 'Сначала дайте название',
  'item.confirmDelete': 'Удалить «{title}»?', 'item.confirmDeleteRepeat': 'Удалить «{title}» и все повторы?',

  'habits.title': 'Привычки', 'habits.empty': 'Привычек пока нет. Начните с чего-нибудь маленького.', 'habits.add': 'Добавить привычку',
  'habits.streak': { one: '{n} день подряд', few: '{n} дня подряд', many: '{n} дней подряд', other: '{n} дня подряд' },
  'habits.month': '{n}% за месяц',
  'habit.new': 'Новая привычка', 'habit.edit': 'Изменить привычку', 'habit.namePh': 'Например, пить воду', 'habit.days': 'Дни',
  'habit.confirmDelete': 'Удалить привычку «{name}» вместе с историей?',
  'lock.label': 'Закрепить расписание', 'lock.on': 'Расписание закреплено — задачи не сдвинутся', 'lock.off': 'Расписание откреплено — задачи можно двигать и растягивать',

  'lists.empty': 'Здесь пока пусто. Нажмите «Новое», чтобы добавить.', 'lists.all': 'Все',
  'status.planned': 'В планах', 'status.ongoing': 'В процессе', 'status.completed': 'Завершено', 'status.dropped': 'Брошено',
  'col.books': 'Книги', 'col.games': 'Игры', 'col.movies': 'Фильмы', 'col.series': 'Сериалы',
  'entry.new': 'Новая запись', 'entry.edit': 'Изменить запись', 'entry.titlePh': 'Название', 'entry.cover': 'Добавить обложку', 'entry.removeCover': 'Убрать обложку',
  'entry.collection': 'Список', 'entry.status': 'Статус', 'entry.rating': 'Оценка', 'entry.note': 'Заметки', 'entry.confirmDelete': 'Удалить «{title}»?',
  'colsheet.new': 'Новый список', 'colsheet.edit': 'Изменить список', 'colsheet.namePh': 'Например, аниме',
  'colsheet.confirmDelete': 'Удалить список «{name}» и всё, что в нём?',

  'decor.button': 'Украсить', 'decor.select': 'Двигать стикеры', 'decor.pen': 'Ручка', 'decor.hl': 'Маркер', 'decor.eraser': 'Ластик',
  'decor.stickers': 'Стикеры', 'decor.undo': 'Отменить', 'decor.finger': 'Рисовать пальцем', 'decor.nothingUndo': 'Нечего отменять',
  'stickers.title': 'Стикеры', 'stickers.add': 'Добавить из Фото', 'stickers.mine': 'Ваши', 'stickers.pack': 'Базовый набор',

  'settings.title': 'Настройки', 'settings.background': 'Фон', 'settings.photo': 'Выбрать фото', 'settings.blur': 'Размытие', 'settings.dim': 'Затемнение',
  'settings.language': 'Язык', 'settings.data': 'Данные', 'settings.export': 'Сохранить резервную копию', 'settings.import': 'Восстановить из копии',
  'settings.clearDone': 'Удалить выполненные задачи', 'settings.install': 'Чтобы установить: нажмите «Поделиться», затем «На экран „Домой“».',

  'toast.saveFail': 'Не удалось сохранить: хранилище недоступно.', 'toast.restored': 'Копия восстановлена', 'toast.badFile': 'Это не резервная копия Sprout',
  'toast.cleared': 'Удалено выполненных задач: {n}', 'toast.nothingClear': 'Нечего удалять',
  'toast.imageFail': 'Не удалось открыть изображение', 'import.confirm': 'Заменить всё содержимым этой копии (записей: {n})?',

  'seed.water': 'Пить воду', 'seed.read': 'Читать перед сном',
};

const ja = {
  'tab.todo': 'やること', 'tab.day': '日', 'tab.week': '週', 'tab.month': '月', 'tab.habits': '習慣', 'tab.lists': 'リスト',
  'common.today': '今日', 'common.new': '新規', 'common.cancel': 'キャンセル', 'common.save': '保存', 'common.done': '完了', 'common.delete': '削除',

  'todo.title': 'やることリスト', 'todo.left': '残り {n} 件',
  'todo.quick': '今日のタスクを追加…', 'todo.add': '追加',
  'todo.overdue': '期限切れ', 'todo.today': '今日 · {date}', 'todo.upcoming': '今後の予定', 'todo.someday': 'いつか',
  'todo.empty': 'ここには何もありません。', 'todo.emptyUpcoming': 'まだ予定はありません。',

  'day.tapHint': 'タイムラインをタップして追加', 'day.tasks': 'タスク', 'day.noTasks': '時間未定のタスクはありません。', 'day.habits': '習慣',
  'week.title': '週',
  'month.hint': '日付をタップして開く', 'month.more': '他 {n} 件',

  'repeat.none': 'なし', 'repeat.daily': '毎日', 'repeat.weekdays': '平日', 'repeat.weekly': '毎週',

  'item.new': '新規', 'item.edit': '編集', 'item.titlePh': '予定は？', 'item.notes': 'メモ',
  'item.someday': 'いつか（日付なし）', 'item.date': '日付', 'item.timed': '時間を設定', 'item.time': '時間', 'item.repeat': '繰り返し',
  'item.colour': '色', 'item.list': 'リスト', 'item.tags': 'タグ', 'item.nameFirst': 'まず名前を入力してください',
  'item.confirmDelete': '「{title}」を削除しますか？', 'item.confirmDeleteRepeat': '「{title}」とすべての繰り返しを削除しますか？',

  'habits.title': '習慣', 'habits.empty': 'まだ習慣がありません。小さなことから始めましょう。', 'habits.add': '習慣を追加',
  'habits.streak': '{n}日連続', 'habits.month': '今月 {n}%',
  'habit.new': '新しい習慣', 'habit.edit': '習慣を編集', 'habit.namePh': '例：水を飲む', 'habit.days': '曜日',
  'habit.confirmDelete': '習慣「{name}」と記録を削除しますか？',
  'lock.label': 'タイムラインをロック', 'lock.on': 'タイムラインをロックしました', 'lock.off': 'ロック解除 — ドラッグで移動・長さ変更',

  'lists.empty': 'まだ何もありません。「新規」から追加しましょう。', 'lists.all': 'すべて',
  'status.planned': '予定', 'status.ongoing': '進行中', 'status.completed': '完了', 'status.dropped': '中断',
  'col.books': '本', 'col.games': 'ゲーム', 'col.movies': '映画', 'col.series': 'ドラマ',
  'entry.new': '新しい項目', 'entry.edit': '項目を編集', 'entry.titlePh': 'タイトル', 'entry.cover': 'カバーを追加', 'entry.removeCover': 'カバーを削除',
  'entry.collection': 'リスト', 'entry.status': 'ステータス', 'entry.rating': '評価', 'entry.note': 'メモ', 'entry.confirmDelete': '「{title}」を削除しますか？',
  'colsheet.new': '新しいリスト', 'colsheet.edit': 'リストを編集', 'colsheet.namePh': '例：アニメ',
  'colsheet.confirmDelete': 'リスト「{name}」と中身をすべて削除しますか？',

  'decor.button': 'デコ', 'decor.select': 'ステッカーを移動', 'decor.pen': 'ペン', 'decor.hl': 'マーカー', 'decor.eraser': '消しゴム',
  'decor.stickers': 'ステッカー', 'decor.undo': '元に戻す', 'decor.finger': '指で描く', 'decor.nothingUndo': '元に戻す操作はありません',
  'stickers.title': 'ステッカー', 'stickers.add': '写真から追加', 'stickers.mine': 'マイステッカー', 'stickers.pack': 'スターターパック',

  'settings.title': '設定', 'settings.background': '背景', 'settings.photo': '写真を選ぶ', 'settings.blur': 'ぼかし', 'settings.dim': '暗さ',
  'settings.language': '言語', 'settings.data': 'データ', 'settings.export': 'バックアップを書き出す', 'settings.import': 'バックアップを読み込む',
  'settings.clearDone': '完了したタスクを削除', 'settings.install': 'インストール：共有ボタンから「ホーム画面に追加」をタップ。',

  'toast.saveFail': '保存できませんでした。ストレージが使用できません。', 'toast.restored': 'バックアップを復元しました', 'toast.badFile': 'Sproutのバックアップファイルではありません',
  'toast.cleared': '完了したタスクを{n}件削除しました', 'toast.nothingClear': '削除するものはありません',
  'toast.imageFail': '画像を開けませんでした', 'import.confirm': 'このバックアップ（{n}件）ですべてを置き換えますか？',

  'seed.water': '水を飲む', 'seed.read': '寝る前に読書',
};

export const LANGS = {
  en: { name: 'English', locale: 'en-GB', dict: en },
  ru: { name: 'Русский', locale: 'ru-RU', dict: ru },
  ja: { name: '日本語', locale: 'ja-JP', dict: ja },
};

let lang = 'en';
let plural = new Intl.PluralRules('en');

export function setLang(l) {
  lang = LANGS[l] ? l : 'en';
  plural = new Intl.PluralRules(LANGS[lang].locale);
  document.documentElement.lang = lang;
}
export const getLang = () => lang;
export const locale = () => LANGS[lang].locale;

export function detectLang() {
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return LANGS[nav] ? nav : 'en';
}

export function t(key, vars = {}) {
  let v = LANGS[lang].dict[key] ?? en[key] ?? key;
  if (typeof v === 'object') v = v[plural.select(vars.n ?? 0)] ?? v.other;
  return v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

// Fill static markup: data-i18n (text), data-i18n-ph (placeholder), data-i18n-aria (aria-label + title).
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
  root.querySelectorAll('[data-i18n-ph]').forEach((n) => { n.placeholder = t(n.dataset.i18nPh); });
  root.querySelectorAll('[data-i18n-aria]').forEach((n) => { n.setAttribute('aria-label', t(n.dataset.i18nAria)); n.title = t(n.dataset.i18nAria); });
}

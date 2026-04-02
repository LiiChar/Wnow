# 📚 Wnow — Полная документация проекта

**Дата обновления:** 2 апреля 2026 г.
**Версия приложения:** 0.1.0

---

## 📖 Оглавление

1. [Обзор проекта](#1-обзор-проекта)
2. [Технологический стек](#2-технологический-стек)
3. [Структура проекта](#3-структура-проекта)
4. [Конфигурационные файлы](#4-конфигурационные-файлы)
5. [Архитектура приложения](#5-архитектура-приложения)
6. [Функциональность](#6-функциональность)
7. [Горячие клавиши](#7-горячие-клавиши)
8. [База данных](#8-база-данных)
9. [Сборка и запуск](#9-сборка-и-запуск)
10. [Карта файлов](#10-карта-файлов)
11. [API команды (Tauri)](#11-api-команды-tauri)
12. [Компоненты фронтенда](#12-компоненты-фронтенда)
13. [Модули бэкенда (Rust)](#13-модули-бэкенда-rust)
14. [Контакты и поддержка](#14-контакты-и-поддержка)

---

## 1. Обзор проекта

**Wnow** — это десктопное приложение-переводчик с функциями изучения слов, построенное на стеке **Tauri 2 + Solid.js + TypeScript + Rust**.

### Основное назначение:
- 🔍 **Перевод текста с экрана** (OCR + перевод)
- 🎯 **Перевод слова под курсором** по горячей клавише
- 📐 **Перевод выделенной области экрана**
- 📋 **Перевод выделенного текста** из буфера обмена
- 📚 **Словарь** с сохранением переведённых слов
- 🎓 **Система изучения слов** (flashcards с интервальным повторением)
- 🌐 **Офлайн-перевод** через локальные ML-модели + онлайн-перевод (Google Translate)

### Платформы:
- ✅ Windows
- ✅ macOS
- ✅ Linux

---

## 2. Технологический стек

### Frontend

| Категория | Технологии |
|-----------|------------|
| **Фреймворк** | Solid.js ^1.9.3 |
| **Роутинг** | @solidjs/router ^0.16.1 |
| **UI-компоненты** | @kobalte/core ^0.13.11 |
| **Стили** | Tailwind CSS ^4.1.18, tailwind-merge, class-variance-authority, clsx |
| **Иконки** | lucide-solid ^1.0.-rc.1 |
| **Tauri API** | @tauri-apps/api, @tauri-apps/plugin-clipboard-manager, @tauri-apps/plugin-log, @tauri-apps/plugin-opener, @tauri-apps/plugin-shell, @tauri-apps/plugin-store |
| **OCR/Графика** | concaveman, round-polygon |
| **Логирование** | pino, pino-pretty |
| **Утилиты** | fitty (автомасштабирование текста) |

### Backend (Rust)

| Категория | Зависимости |
|-----------|-------------|
| **Tauri** | tauri v2, tauri-plugin-* |
| **OCR** | ocr-rs 2.2.0, ocrs 0.10, rten 0.21 |
| **Перевод** | ct2rs 0.9.17 (CTranslate2) |
| **Сеть** | reqwest, tokio |
| **База данных** | rusqlite (SQLite) |
| **Изображения** | image, imageproc, fast_image_resize, scrap, xcap |
| **Ввод/вывод** | enigo (симуляция ввода), rdev (глобальные хоткеи), keyboard |
| **Шрифты** | rusttype, ab_glyph |
| **Утилиты** | serde, dashmap, once_cell, regex, chrono, rand, strsim, base64, futures |
| **Tauri плагины** | tauri-plugin-store, tauri-plugin-log, tauri-plugin-shell, tauri-plugin-clipboard-manager, tauri-plugin-notification, tauri-plugin-global-shortcut, tauri-plugin-opener |

---

## 3. Структура проекта

```
E:\code\pet-project\Wnow\
│
├── 📁 src-tauri/                    # Rust бэкенд Tauri
│   ├── 📁 src/
│   │   ├── 📁 commands/             # Tauri команды (API для фронтенда)
│   │   │   ├── common.rs            # Общие команды (лог, мышь, быстрый перевод)
│   │   │   ├── database.rs          # CRUD операции с БД
│   │   │   ├── model.rs             # Управление ML-моделями
│   │   │   ├── translate.rs         # OCR + перевод области экрана
│   │   │   ├── translation.rs       # Логика перевода (онлайн/офлайн)
│   │   │   ├── monitor.rs           # Информация о мониторах
│   │   │   ├── notification.rs      # Отправка уведомлений
│   │   │   ├── text_replacement.rs  # Перевод с заменой текста
│   │   │   └── mod.rs
│   │   ├── 📁 handlers/             # Обработчики событий
│   │   │   ├── show_translate.rs    # Показать перевод всего экрана
│   │   │   ├── show_translate_with_replacement.rs  # Перевод с заменой
│   │   │   ├── translate_word_at_cursor.rs  # Перевод слова под курсором
│   │   │   ├── translate_selected_text.rs   # Перевод выделенного текста
│   │   │   └── mod.rs
│   │   ├── 📁 capture/              # Захват экрана
│   │   │   └── capture.rs
│   │   ├── 📁 mouse/                # Управление мышью
│   │   │   └── mouse.rs
│   │   ├── 📁 keyboard/             # Работа с клавиатурой
│   │   ├── 📁 ocr/                  # Оптическое распознавание текста
│   │   │   ├── ocr.rs               # Основной OCR движок
│   │   │   ├── preproccesor.rs      # Предобработка изображений
│   │   │   ├── postprocess.rs       # Постобработка результатов
│   │   │   └── mod.rs
│   │   ├── 📁 translation/          # Перевод текста
│   │   │   ├── translation.rs       # Онлайн перевод (Google, DeepL и др.)
│   │   │   ├── local.rs             # Локальный перевод (словари + ML)
│   │   │   └── mod.rs
│   │   ├── 📁 storage/              # Хранилище данных
│   │   │   ├── database.rs          # SQLite операции
│   │   │   ├── models.rs            # Модели данных
│   │   │   └── mod.rs
│   │   ├── 📁 source/               # Источники текста (буфер, выделение)
│   │   ├── 📁 setup/                # Инициализация приложения
│   │   │   ├── windows.rs           # Настройка окон
│   │   │   ├── tray.rs              # Системный трей
│   │   │   ├── shortcuts.rs         # Горячие клавиши
│   │   │   ├── database.rs          # Инициализация БД
│   │   │   └── mod.rs
│   │   ├── 📁 platform/             # Платформенно-специфичный код
│   │   │   ├── windows.rs           # Windows API (topmost окна)
│   │   │   ├── macos.rs
│   │   │   ├── linux.rs
│   │   │   └── mod.rs
│   │   ├── 📁 utils/                # Утилиты
│   │   │   ├── resource.rs          # Работа с ресурсами
│   │   │   ├── hash.rs              # Хэш-функции
│   │   │   └── mod.rs
│   │   ├── 📁 img/                  # Обработка изображений
│   │   ├── 📁 windows/              # Управление окнами
│   │   ├── 📁 notification/         # Система уведомлений
│   │   │   ├── mod.rs
│   │   │   └── notification.rs
│   │   ├── 📁 overlay/              # Overlay компоненты (Rust)
│   │   ├── main.rs                  # Точка входа
│   │   └── lib.rs                   # Основной модуль
│   ├── 📁 models/                   # ML модели (скачиваемые)
│   │   ├── 📁 ocr/                  # OCR модели
│   │   └── 📁 translate/            # Модели перевода
│   ├── 📁 resources/                # Ресурсы приложения
│   │   ├── 📁 dictionary/           # Словари для офлайн-перевода
│   │   │   ├── en_ru.json           # Англо-русский словарь (6662 строки)
│   │   │   └── ru_en.json           # Русско-английский словарь
│   │   └── debug_*.png              # Отладочные скриншоты
│   ├── 📁 icons/                    # Иконки приложения
│   ├── 📁 capabilities/             # Tauri permissions
│   ├── tauri.conf.json              # Конфигурация Tauri
│   ├── Cargo.toml                   # Rust зависимости
│   └── Cargo.lock
│
├── 📁 src/                          # TypeScript/React фронтенд
│   ├── 📁 windows/                  # Точки входа для окон
│   │   ├── 📁 main/
│   │   │   ├── index.tsx            # Инициализация главного окна
│   │   │   └── Main.tsx             # Корневой компонент
│   │   ├── 📁 overlay/
│   │   │   ├── index.tsx            # Инициализация overlay окна
│   │   │   └── Overlay.tsx          # Компонент overlay
│   │   └── 📁 notification/
│   │       ├── index.tsx            # Инициализация notification окна
│   │       └── Notification.tsx     # Компонент notification
│   ├── 📁 app/                      # Приложение
│   │   ├── 📁 layout/
│   │   │   ├── Layout.tsx           # Основной layout
│   │   │   ├── Header.tsx           # Шапка с заголовком
│   │   │   └── Footer.tsx           # Навигационная панель
│   │   └── 📁 router/
│   │       └── Router.tsx           # Маршрутизация
│   ├── 📁 pages/                    # Страницы приложения
│   │   ├── DictionaryPage.tsx       # Страница словаря
│   │   ├── StudyPage.tsx            # Страница изучения слов
│   │   └── SettingsPage.tsx         # Страница настроек
│   ├── 📁 components/               # UI компоненты
│   │   ├── 📁 ui/                   # Базовые UI компоненты (Kobalte)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── AlertDialog.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Switch.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Combobox.tsx
│   │   │   ├── HotkeyInput.tsx      # Ввод горячих клавиш
│   │   │   ├── Label.tsx
│   │   │   ├── Progres.tsx
│   │   │   └── Toast.tsx            # Уведомления
│   │   ├── 📁 box/                  # Компоненты для выделения областей
│   │   │   ├── BoxCanvas.tsx        # Холст с полигонами
│   │   │   └── BoxElement.tsx       # Отдельный блок текста
│   │   ├── 📁 overlay/              # Overlay компоненты
│   │   │   ├── FloatingTranslation.tsx  # Плавающий перевод
│   │   │   └── SelectionArea.tsx    # Выделение области
│   │   ├── 📁 dialog/
│   │   │   └── Alert.tsx            # Диалог подтверждения
│   │   ├── 📁 layout/
│   │   │   └── BottomPadding.tsx    # Отступ для навигации
│   │   ├── 📁 model/
│   │   │   └── ModelElement.tsx     # Элемент модели перевода
│   │   ├── 📁 toaster/
│   │   │   └── ToastStatus.tsx      # Статус тоста
│   │   └── 📁 notification/
│   │       └── Notification.tsx     # Компонент уведомления
│   ├── 📁 widget/                   # Виджеты
│   │   ├── 📁 overlay/
│   │   │   └── TranslatorOverlay.tsx    # Основной overlay переводчика
│   │   ├── 📁 settings/
│   │   │   └── Models.tsx           # Управление моделями
│   │   ├── 📁 translate/
│   │   │   └── Translate.tsx        # Виджет перевода текста
│   │   └── 📁 notification/
│   │       └── Notification.tsx     # Виджет уведомления
│   ├── 📁 shared/                   # Общие модули
│   │   ├── 📁 api/                  # API вызовы к бэкенду
│   │   │   ├── log.ts
│   │   │   ├── model.ts             # API моделей
│   │   │   ├── settings.ts          # API настроек
│   │   │   ├── stude.ts             # API изучения слов
│   │   │   └── translate.ts         # API перевода
│   │   ├── 📁 hooks/                # Solid хуки
│   │   │   ├── useDebounceCallback.ts
│   │   │   ├── useHeader.ts         # Управление заголовком
│   │   │   └── useSpeechRecognition.ts  # Распознавание речи
│   │   ├── 📁 lib/                  # Утилиты
│   │   │   ├── language.ts          # Список языков (140+ языков)
│   │   │   ├── log.ts               # Логирование
│   │   │   ├── points.ts            # Геометрия (convex hull, группировка)
│   │   │   └── utils.ts             # cn() для классов
│   │   ├── 📁 stores/               # Solid stores
│   │   │   ├── layout.ts            # Состояние layout
│   │   │   └── settings.ts          # Настройки приложения
│   │   ├── 📁 types/                # TypeScript типы
│   │   │   ├── language.ts
│   │   │   ├── monitor.ts           # Типы мониторов
│   │   │   ├── notification.ts      # Типы уведомлений
│   │   │   ├── ocr.ts               # Типы OCR (TextBox)
│   │   │   └── storage.ts           # Типы БД (SavedWord, AppSettings)
│   │   └── 📁 locales/              # Локализация интерфейса
│   │       ├── en.ts, ru.ts, de.ts, fr.ts, es.ts, it.ts, pt.ts, ja.ts, ko.ts, zh.ts
│   │       └── index.ts
│   ├── 📁 assets/
│   │   ├── 📁 style/
│   │   │   └── index.css            # Глобальные стили (Tailwind + CSS vars)
│   │   └── logo.svg                 # Логотип
│   └── vite-env.d.ts
│
├── 📁 public/                       # Статические файлы
│   ├── tauri.svg
│   ├── vite.svg
│   └── test.txt                     # Тестовый текст (Гарри Поттер)
│
├── index.html                       # Главное окно (словарь)
├── overlay.html                     # Overlay окно (перевод)
├── notification.html                # Notification окно (уведомления)
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── README.md
└── .gitignore
```

---

## 4. Конфигурационные файлы

### vite.config.ts
```typescript
// Порт: 1420 (фиксированный для Tauri)
// Плагины: vite-plugin-solid, @tailwindcss/vite
// Алиасы: @ → ./src
// Сборка: мульти-ентри (index.html, overlay.html)
```

### tsconfig.json
```json
// Target: ES2020
// JSX: preserve (Solid.js)
// Strict mode: включён
// Paths: @/* → ./src/*
```

### tailwind.config.js
```javascript
// Тема: кастомные CSS переменные (oklch цвета)
// Dark mode: класс .dark
// Плагины: tw-animate-css, @tailwindcss/typography
```

### tauri.conf.json
```json
// Идентификатор: com.litav.wnow
// Версия: 0.1.0
// CSP: разрешает asset:// протокол для ресурсов
// Bundle: включает все иконки и ресурсы
```

---

## 5. Архитектура приложения

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Solid.js)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Main      │  │   Overlay   │  │     Components      │  │
│  │   Window    │  │   Window    │  │  (UI, Widgets)      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │            │
│         └────────────────┼─────────────────────┘            │
│                          │                                  │
│                    Tauri API (invoke)                       │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                     Backend (Rust)                          │
│  ┌─────────────┐  ┌─────┴──────┐  ┌─────────────────────┐   │
│  │  Commands   │  │  Handlers  │  │      Services       │   │
│  │  (API)      │  │  (Events)  │  │  (OCR, Translate)   │   │
│  └─────────────┘  └────────────┘  └──────────┬──────────┘   │
│                                              │              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────┴──────────┐   │
│  │  Database   │  │   Models    │  │     Resources      │   │
│  │  (SQLite)   │  │   (ML)      │  │  (Dict, OCR)       │   │
│  └─────────────┘  └─────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Notification Window                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Notification.tsx (Frontend) ←→ Rust Notification   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Поток данных

1. **Пользователь** нажимает горячую клавишу
2. **Frontend** отправляет команду через `invoke()`
3. **Backend (Rust)** обрабатывает команду:
   - Захватывает экран
   - Выполняет OCR
   - Переводит текст
   - Сохраняет в БД
4. **Backend** возвращает результат
5. **Frontend** отображает перевод в overlay

### Окна приложения

| Окно | Файл | Назначение |
|------|------|------------|
| Main | `index.html` | Словарь, изучение, настройки |
| Overlay | `overlay.html` | Перевод поверх экрана |
| Notification | `notification.html` | Системные уведомления |

---

## 6. Функциональность

### 6.1 Перевод

#### 6.1.1 Перевод слова под курсором (`Ctrl+U`)
- Захват области вокруг курсора
- OCR распознавание
- Поиск слова под курсором
- Показ перевода в popup

#### 6.1.2 Перевод выделенной области (`Ctrl+Y`)
- Режим выделения области
- OCR + перевод
- Полигональное выделение текста

#### 6.1.3 Перевод всего экрана (`Ctrl+T`)
- Захват всего экрана
- Массовый OCR
- Показ всех переведённых блоков
- ⚠️ Функция закомментирована в `lib.rs`

#### 6.1.4 Перевод выделенного текста (`Ctrl+Shift+C`)
- Копирование через Ctrl+C
- Перевод из буфера
- Восстановление буфера

#### 6.1.5 Перевод с заменой текста
- Перевод фрагментов текста с заменой
- Перевод изображений с заменой текста

### 6.2 Словарь
- Автосохранение переведённых слов
- Поиск по словам и переводам
- Статистика: количество повторений, точность, уровень владения

### 6.3 Изучение слов
- **Алгоритм интервального повторения** (SM-2 подобный)
- Flashcards с показом/скрытием ответа
- Статистика сессии
- Прогресс-бар сессии

### 6.4 Настройки
- **Тема**: светлая/тёмная/системная
- **Языки**: 10 предустановленных (EN, RU, DE, FR, ES, IT, PT, JA, KO, ZH)
- **Режим перевода**:
  - 🔒 Онлайн (с офлайн fallback)
  - 🔐 Только офлайн
  - 🌐 Только онлайн
- **Горячие клавиши**: настраиваемые
- **Модели**: скачивание ML-моделей для офлайн-перевода

### 6.5 Уведомления
- Системные уведомления через `tauri-plugin-notification`
- Уведомления о событиях приложения
- Кастомные уведомления из фронтенда

---

## 7. Горячие клавиши

| Действие | Комбинация | Файл реализации |
|----------|------------|-----------------|
| Перевод слова под курсором | `Ctrl+U` | `src-tauri/src/handlers/translate_word_at_cursor.rs` |
| Выделить область для перевода | `Ctrl+Y` | `src-tauri/src/handlers/show_translate.rs` |
| Перевод всего экрана | `Ctrl+T` | `src-tauri/src/handlers/show_translate.rs` (закомментировано) |
| Перевод выделенного текста | `Ctrl+Shift+C` | `src-tauri/src/handlers/translate_selected_text.rs` |
| Закрыть overlay | `Ctrl+I` | `src-tauri/src/lib.rs` |

---

## 8. База данных

### SQLite схема

#### Таблица `words`
| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Первичный ключ |
| word | TEXT | Слово |
| translation | TEXT | Перевод |
| context | TEXT | Контекст |
| mastery_level | REAL | Уровень владения (0-5) |
| next_review | INTEGER | Следующее повторение (timestamp) |
| ease_factor | REAL | Фактор лёгкости (SM-2) |
| interval | INTEGER | Интервал до следующего повторения (дни) |
| repetitions | INTEGER | Количество повторений |

#### Таблица `settings`
| Поле | Тип | Описание |
|------|-----|----------|
| key | TEXT | Ключ настройки |
| value | TEXT | Значение (JSON) |

#### Таблица `stats`
| Поле | Тип | Описание |
|------|-----|----------|
| id | INTEGER | Первичный ключ |
| total_reviews | INTEGER | Всего повторений |
| correct_reviews | INTEGER | Правильных ответов |
| streak_days | INTEGER | Дней подряд |

---

## 9. Сборка и запуск

### Требования
- Node.js >= 18
- Rust >= 1.70
- cargo-tauri: `npm install -g @tauri-apps/cli`

### Установка зависимостей
```bash
npm install
```

### Разработка
```bash
# Запуск Vite dev-сервера
npm run start

# Запуск Tauri приложения в режиме разработки
cargo tauri dev
```

### Сборка
```bash
# Сборка фронтенда
npm run build

# Сборка релиза Tauri
cargo tauri build
```

### Скрипты (package.json)
| Скрипт | Команда | Описание |
|--------|---------|----------|
| `start` | `vite` | Запуск dev-сервера |
| `dev` | `vite` | Разработка |
| `build` | `vite build` | Сборка продакшн |
| `serve` | `vite preview` | Предпросмотр сборки |
| `tauri` | `tauri` | Tauri CLI |

---

## 10. Карта файлов

### Конфигурация
| Файл | Назначение |
|------|------------|
| `package.json` | Зависимости и скрипты Node.js |
| `vite.config.ts` | Конфигурация Vite |
| `tsconfig.json` | Конфигурация TypeScript |
| `tailwind.config.js` | Конфигурация Tailwind CSS |
| `src-tauri/tauri.conf.json` | Конфигурация Tauri |
| `src-tauri/Cargo.toml` | Зависимости Rust |

### HTML точки входа
| Файл | Назначение |
|------|------------|
| `index.html` | Главное окно (словарь, настройки) |
| `overlay.html` | Overlay окно (перевод поверх экрана) |
| `notification.html` | Notification окно (уведомления) |

### Ключевые компоненты фронтенда
| Файл | Назначение |
|------|------------|
| `src/windows/main/Main.tsx` | Корневой компонент главного окна |
| `src/windows/overlay/Overlay.tsx` | Корневой компонент overlay |
| `src/windows/notification/Notification.tsx` | Корневой компонент notification |
| `src/widget/overlay/TranslatorOverlay.tsx` | Основной компонент перевода |
| `src/pages/DictionaryPage.tsx` | Страница словаря |
| `src/pages/StudyPage.tsx` | Страница изучения слов |
| `src/pages/SettingsPage.tsx` | Страница настроек |

### Ключевые модули бэкенда
| Файл | Назначение |
|------|------------|
| `src-tauri/src/lib.rs` | Основной модуль Rust |
| `src-tauri/src/commands/translate.rs` | Команда перевода области |
| `src-tauri/src/commands/text_replacement.rs` | Перевод с заменой текста |
| `src-tauri/src/storage/database.rs` | Операции с SQLite |
| `src-tauri/src/translation/translation.rs` | Логика онлайн-перевода |
| `src-tauri/src/ocr/ocr.rs` | OCR движок |

### Ресурсы
| Файл | Назначение |
|------|------------|
| `src-tauri/resources/dictionary/en_ru.json` | Англо-русский словарь |
| `src-tauri/resources/dictionary/ru_en.json` | Русско-английский словарь |
| `src-tauri/models/` | ML модели (скачиваемые) |

---

## 11. API команды (Tauri)

### Команды перевода
| Команда | Описание | Файл |
|---------|----------|------|
| `translate` | Перевод текста | `commands/translate.rs` |
| `get_block_translate` | Получить перевод блока | `commands/translate.rs` |
| `get_block_image_translate` | Получить перевод изображения | `commands/translate.rs` |
| `stop_floating_translate` | Остановить плавающий перевод | `commands/translate.rs` |
| `start_floating_translate` | Запустить плавающий перевод | `commands/translate.rs` |
| `start_floating_image_translate` | Запустить плавающий перевод изображения | `commands/translate.rs` |
| `quick_translate` | Быстрый перевод | `commands/common.rs` |
| `batch_translate` | Пакетный перевод | `commands/common.rs` |
| `translate_text` | Перевод текста | `commands/translation.rs` |
| `translate_image_with_replacement` | Перевод изображения с заменой | `commands/text_replacement.rs` |
| `translate_fragment` | Перевод фрагмента | `commands/text_replacement.rs` |

### Команды базы данных
| Команда | Описание | Файл |
|---------|----------|------|
| `get_all_words` | Получить все слова | `commands/database.rs` |
| `add_word_to_study` | Добавить слово | `commands/database.rs` |
| `delete_word` | Удалить слово | `commands/database.rs` |
| `update_word_progress` | Обновить прогресс слова | `commands/database.rs` |
| `get_words_for_study` | Получить слова для изучения | `commands/database.rs` |
| `get_learning_stats` | Получить статистику обучения | `commands/database.rs` |
| `get_settings` | Получить настройки | `commands/database.rs` |
| `save_settings` | Сохранить настройки | `commands/database.rs` |

### Команды моделей
| Команда | Описание | Файл |
|---------|----------|------|
| `get_model_list` | Получить список моделей | `commands/model.rs` |
| `get_available_models` | Получить доступные модели | `commands/model.rs` |
| `download_model` | Скачать модель | `commands/model.rs` |
| `get_translation_models` | Получить модели перевода | `commands/translation.rs` |
| `is_model_available` | Проверить доступность модели | `commands/translation.rs` |

### Команды мониторов
| Команда | Описание | Файл |
|---------|----------|------|
| `get_monitors` | Получить список мониторов | `commands/monitor.rs` |
| `get_main_monitor` | Получить главный монитор | `commands/monitor.rs` |

### Команды уведомлений
| Команда | Описание | Файл |
|---------|----------|------|
| `show_notification` | Показать уведомление | `commands/notification.rs` |

### Общие команды
| Команда | Описание | Файл |
|---------|----------|------|
| `log` | Логирование | `commands/common.rs` |
| `set_clickthrough` | Установить прозрачность кликов | `commands/common.rs` |
| `get_mouse_position` | Получить позицию мыши | `commands/common.rs` |

---

## 12. Компоненты фронтенда

### UI компоненты (`src/components/ui/`)
| Компонент | Назначение |
|-----------|------------|
| `Button.tsx` | Кнопка с вариантами (variant) |
| `Input.tsx` | Поле ввода текста |
| `Dialog.tsx` | Модальное окно |
| `AlertDialog.tsx` | Диалог подтверждения |
| `Card.tsx` | Карточка контента |
| `Select.tsx` | Выпадающий список |
| `Switch.tsx` | Переключатель |
| `Badge.tsx` | Бейдж/тег |
| `Combobox.tsx` | Комбобокс с поиском |
| `HotkeyInput.tsx` | Ввод горячей клавиши |
| `Toast.tsx` | Уведомление |
| `Label.tsx` | Подпись для полей |
| `Progres.tsx` | Индикатор прогресса |

### Виджеты (`src/widget/`)
| Виджет | Назначение |
|--------|------------|
| `TranslatorOverlay.tsx` | Overlay для показа перевода |
| `Translate.tsx` | Форма ручного перевода |
| `Models.tsx` | Управление ML-моделями |
| `Notification.tsx` | Компонент уведомления |

### Хуки (`src/shared/hooks/`)
| Хук | Назначение |
|-----|------------|
| `useDebounceCallback.ts` | Debounce для callback |
| `useHeader.ts` | Управление заголовком окна |
| `useSpeechRecognition.ts` | Распознавание речи |

### Stores (`src/shared/stores/`)
| Store | Назначение |
|-------|------------|
| `layout.ts` | Состояние layout (заголовок, footer) |
| `settings.ts` | Глобальные настройки приложения |

### Типы (`src/shared/types/`)
| Тип | Назначение |
|-----|------------|
| `language.ts` | Типы языков |
| `ocr.ts` | Типы OCR (TextBox) |
| `storage.ts` | Типы БД (SavedWord, AppSettings) |
| `monitor.ts` | Типы мониторов |
| `notification.ts` | Типы уведомлений |

### Локализация (`src/shared/locales/`)
| Язык | Файл |
|------|------|
| 🇺🇸 English | `en.ts` |
| 🇷🇺 Русский | `ru.ts` |
| 🇩🇪 Deutsch | `de.ts` |
| 🇫🇷 Français | `fr.ts` |
| 🇪🇸 Español | `es.ts` |
| 🇮🇹 Italiano | `it.ts` |
| 🇵🇹 Português | `pt.ts` |
| 🇯🇵 日本語 | `ja.ts` |
| 🇰🇷 한국어 | `ko.ts` |
| 🇨🇳 中文 | `zh.ts` |

---

## 13. Модули бэкенда (Rust)

### Commands (`src-tauri/src/commands/`)
| Модуль | Назначение |
|--------|------------|
| `common.rs` | Общие команды (лог, мышь, настройки, быстрый перевод) |
| `database.rs` | CRUD операции с БД, статистика, настройки |
| `model.rs` | Управление ML-моделями |
| `translate.rs` | OCR + перевод области, плавающий перевод |
| `translation.rs` | Логика перевода, режимы, модели |
| `monitor.rs` | Информация о мониторах |
| `notification.rs` | Отправка системных уведомлений |
| `text_replacement.rs` | Перевод с заменой текста |

### Handlers (`src-tauri/src/handlers/`)
| Модуль | Назначение |
|--------|------------|
| `show_translate.rs` | Обработчик перевода экрана |
| `show_translate_with_replacement.rs` | Перевод с заменой текста |
| `translate_word_at_cursor.rs` | Перевод слова под курсором |
| `translate_selected_text.rs` | Перевод выделенного текста |

### Services
| Модуль | Назначение |
|--------|------------|
| `ocr/ocr.rs` | OCR распознавание |
| `ocr/preproccesor.rs` | Предобработка изображений |
| `ocr/postprocess.rs` | Постобработка результатов |
| `translation/translation.rs` | Онлайн перевод |
| `translation/local.rs` | Офлайн перевод |
| `storage/database.rs` | SQLite операции |
| `capture/capture.rs` | Захват экрана |
| `mouse/mouse.rs` | Управление мышью |
| `source/` | Источники текста |
| `img/` | Обработка изображений |

### Setup (`src-tauri/src/setup/`)
| Модуль | Назначение |
|--------|------------|
| `windows.rs` | Настройка окон |
| `tray.rs` | Системный трей |
| `shortcuts.rs` | Горячие клавиши |
| `database.rs` | Инициализация БД |

### Platform (`src-tauri/src/platform/`)
| Модуль | Назначение |
|--------|------------|
| `windows.rs` | Windows API (topmost окна) |
| `macos.rs` | macOS специфичный код |
| `linux.rs` | Linux специфичный код |

### Utils (`src-tauri/src/utils/`)
| Модуль | Назначение |
|--------|------------|
| `resource.rs` | Работа с ресурсами |
| `hash.rs` | Хэш-функции |

### Notification (`src-tauri/src/notification/`)
| Модуль | Назначение |
|--------|------------|
| `notification.rs` | Логика уведомлений |

---

## 14. Контакты и поддержка

При возникновении вопросов обращайтесь к исходному коду:
- **Фронтенд:** `src/` директория
- **Бэкенд:** `src-tauri/src/` директория
- **Ресурсы:** `src-tauri/resources/`

---

*Документация сгенерирована автоматически на основе анализа кодовой базы.*

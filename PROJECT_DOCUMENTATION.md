# 📚 Wnow — Полная документация проекта

**Дата обновления:** 29 марта 2026 г.  
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
| **Изображения** | image, imageproc, fast_image_resize, scrap |
| **Ввод/вывод** | enigo (симуляция ввода), rdev (глобальные хоткеи) |
| **Утилиты** | serde, dashmap, once_cell, regex, chrono |

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
│   │   │   └── mod.rs
│   │   ├── 📁 handlers/             # Обработчики событий
│   │   │   ├── show_translate.rs    # Показать перевод всего экрана
│   │   │   ├── translate_word_at_cursor.rs  # Перевод слова под курсором
│   │   │   ├── translate_selected_text.rs   # Перевод выделенного текста
│   │   │   └── mod.rs
│   │   ├── 📁 capture/              # Захват экрана
│   │   │   └── capture.rs
│   │   ├── 📁 mouse/                # Управление мышью
│   │   │   └── mouse.rs
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
│   │   ├── main.rs                  # Точка входа
│   │   └── lib.rs                   # Основной модуль
│   ├── 📁 resources/                # Ресурсы приложения
│   │   ├── 📁 dictionary/           # Словари для офлайн-перевода
│   │   │   ├── en_ru.json           # Англо-русский словарь (6662 строки)
│   │   │   └── ru_en.json           # Русско-английский словарь
│   │   ├── 📁 ocr-model/            # Модели OCR
│   │   │   ├── PP-OCRv5_mobile_det_fp16.mnn
│   │   │   ├── cyrillic_PP-OCRv5_mobile_rec_infer.mnn
│   │   │   ├── ppocr_keys_cyrillic.txt
│   │   │   └── ocr-new/
│   │   ├── 📁 translate-model/      # Модели перевода (скачиваемые)
│   │   │   ├── en-ru/
│   │   │   └── ru-en/
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
│   │   └── 📁 overlay/
│   │       ├── index.tsx            # Инициализация overlay окна
│   │       └── Overlay.tsx          # Компонент overlay
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
│   │   └── 📁 toaster/
│   │       └── ToastStatus.tsx      # Статус тоста
│   ├── 📁 widget/                   # Виджеты
│   │   ├── 📁 overlay/
│   │   │   └── TranslatorOverlay.tsx    # Основной overlay переводчика
│   │   ├── 📁 settings/
│   │   │   └── Models.tsx           # Управление моделями
│   │   └── 📁 translate/
│   │       └── Translate.tsx        # Виджет перевода текста
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
│   │   └── 📁 types/                # TypeScript типы
│   │       ├── language.ts
│   │       ├── ocr.ts               # Типы OCR (TextBox)
│   │       └── storage.ts           # Типы БД (SavedWord, AppSettings)
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

#### 6.1.4 Перевод выделенного текста (`Ctrl+Shift+C`)
- Копирование через Ctrl+C
- Перевод из буфера
- Восстановление буфера

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

---

## 7. Горячие клавиши

| Действие | Комбинация | Файл реализации |
|----------|------------|-----------------|
| Перевод слова под курсором | `Ctrl+U` | `src-tauri/src/handlers/translate_word_at_cursor.rs` |
| Выделить область для перевода | `Ctrl+Y` | `src-tauri/src/handlers/show_translate.rs` |
| Перевод всего экрана | `Ctrl+T` | `src-tauri/src/handlers/show_translate.rs` |
| Перевод выделенного текста | `Ctrl+Shift+C` | `src-tauri/src/handlers/translate_selected_text.rs` |
| Закрыть overlay | `Ctrl+I` | `src/windows/overlay/Overlay.tsx` |

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
| value | TEXT | Значение |

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

### Ключевые компоненты фронтенда
| Файл | Назначение |
|------|------------|
| `src/windows/main/Main.tsx` | Корневой компонент главного окна |
| `src/windows/overlay/Overlay.tsx` | Корневой компонент overlay |
| `src/widget/overlay/TranslatorOverlay.tsx` | Основной компонент перевода |
| `src/pages/DictionaryPage.tsx` | Страница словаря |
| `src/pages/StudyPage.tsx` | Страница изучения слов |
| `src/pages/SettingsPage.tsx` | Страница настроек |

### Ключевые модули бэкенда
| Файл | Назначение |
|------|------------|
| `src-tauri/src/lib.rs` | Основной модуль Rust |
| `src-tauri/src/commands/translate.rs` | Команда перевода области |
| `src-tauri/src/storage/database.rs` | Операции с SQLite |
| `src-tauri/src/translation/translation.rs` | Логика онлайн-перевода |
| `src-tauri/src/ocr/ocr.rs` | OCR движок |

### Ресурсы
| Файл | Назначение |
|------|------------|
| `src-tauri/resources/dictionary/en_ru.json` | Англо-русский словарь |
| `src-tauri/resources/dictionary/ru_en.json` | Русско-английский словарь |
| `src-tauri/resources/ocr-model/` | Модели OCR |
| `src-tauri/resources/translate-model/` | Модели перевода |

---

## 11. API команды (Tauri)

### Команды перевода
| Команда | Описание | Файл |
|---------|----------|------|
| `translate_area` | Перевод области экрана | `commands/translate.rs` |
| `translate_word` | Перевод слова | `commands/translate.rs` |
| `translate_text` | Перевод текста | `commands/translation.rs` |

### Команды базы данных
| Команда | Описание | Файл |
|---------|----------|------|
| `get_words` | Получить все слова | `commands/database.rs` |
| `add_word` | Добавить слово | `commands/database.rs` |
| `delete_word` | Удалить слово | `commands/database.rs` |
| `update_word` | Обновить слово | `commands/database.rs` |

### Команды моделей
| Команда | Описание | Файл |
|---------|----------|------|
| `get_models` | Получить список моделей | `commands/model.rs` |
| `download_model` | Скачать модель | `commands/model.rs` |
| `delete_model` | Удалить модель | `commands/model.rs` |

### Команды настроек
| Команда | Описание | Файл |
|---------|----------|------|
| `get_settings` | Получить настройки | `commands/common.rs` |
| `save_settings` | Сохранить настройки | `commands/common.rs` |

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

### Виджеты (`src/widget/`)
| Виджет | Назначение |
|--------|------------|
| `TranslatorOverlay.tsx` | Overlay для показа перевода |
| `Translate.tsx` | Форма ручного перевода |
| `Models.tsx` | Управление ML-моделями |

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

---

## 13. Модули бэкенда (Rust)

### Commands (`src-tauri/src/commands/`)
| Модуль | Назначение |
|--------|------------|
| `common.rs` | Общие команды (лог, мышь, настройки) |
| `database.rs` | CRUD операции с БД |
| `model.rs` | Управление ML-моделями |
| `translate.rs` | OCR + перевод области |
| `translation.rs` | Логика перевода |

### Handlers (`src-tauri/src/handlers/`)
| Модуль | Назначение |
|--------|------------|
| `show_translate.rs` | Обработчик перевода экрана |
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

### Setup (`src-tauri/src/setup/`)
| Модуль | Назначение |
|--------|------------|
| `windows.rs` | Настройка окон |
| `tray.rs` | Системный трей |
| `shortcuts.rs` | Горячие клавиши |
| `database.rs` | Инициализация БД |

---

## 📞 Контакты и поддержка

При возникновении вопросов обращайтесь к исходному коду:
- **Фронтенд:** `src/` директория
- **Бэкенд:** `src-tauri/src/` директория
- **Ресурсы:** `src-tauri/resources/`

---

*Документация сгенерирована автоматически на основе анализа кодовой базы.*

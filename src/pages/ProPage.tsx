import { Button, Card, CardContent } from '../component/ui';
import { IconCrown, IconFlash, IconArrowRight } from '../component/Icons';
import { JSX } from 'solid-js';

// Feature icons as components
const InfinityIcon = () => (
  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/>
  </svg>
);
const CameraIcon = () => (
  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
    <circle cx="12" cy="13" r="3"/>
  </svg>
);
const ChartIcon = () => (
  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 3v18h18"/>
    <path d="m19 9-5 5-4-4-3 3"/>
  </svg>
);
const TargetIcon = () => (
  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);
const GlobeIcon = () => (
  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    <path d="M2 12h20"/>
  </svg>
);
const CloudIcon = () => (
  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
  </svg>
);

export function ProPage() {
  const features: { icon: () => JSX.Element; title: string; desc: string }[] = [
    { icon: InfinityIcon, title: 'Безлимит', desc: 'Без ограничений' },
    { icon: CameraIcon, title: 'Скриншоты', desc: 'Контекст слов' },
    { icon: ChartIcon, title: 'Статистика', desc: 'Детальный прогресс' },
    { icon: TargetIcon, title: 'Интервалы', desc: 'Умные повторения' },
    { icon: GlobeIcon, title: 'Языки', desc: '10+ языков' },
    { icon: CloudIcon, title: 'Синхро', desc: 'Все устройства' },
  ];

  return (
    <div class="h-full flex flex-col gap-6 overflow-y-auto">
      <div class="text-center">
        <div class="inline-flex items-center justify-center p-3 rounded-full bg-amber-500/10 mb-4">
          <IconCrown size={28} class="text-amber-400" />
        </div>
        <h1 class="text-2xl font-bold text-neutral-100 mb-2">Wnow Pro</h1>
        <p class="text-neutral-400 text-sm">Все возможности для изучения языков</p>
      </div>

      <div class="grid grid-cols-3 gap-2">
        {features.map(f => (
          <Card class="text-center p-3">
            <div class="flex justify-center mb-1.5 text-neutral-400">
              <f.icon />
            </div>
            <div class="text-xs font-medium text-neutral-200">{f.title}</div>
            <div class="text-xs text-neutral-500">{f.desc}</div>
          </Card>
        ))}
      </div>

      <Card class="relative overflow-hidden">
        <div class="absolute top-0 right-0 px-2 py-1 bg-neutral-100 text-neutral-900 text-xs font-medium rounded-bl-lg">
          -50%
        </div>
        <CardContent class="p-6 text-center">
          <div class="text-xs text-neutral-500 mb-1">Годовая подписка</div>
          <div class="text-3xl font-bold text-neutral-100 mb-1">$29</div>
          <div class="text-xs text-neutral-500 mb-4">/год</div>
          <Button class="w-full gap-1.5">
            <IconFlash size={16} />
            Оформить
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-6 text-center">
          <div class="text-xs text-neutral-500 mb-1">Месячная подписка</div>
          <div class="text-xl font-bold text-neutral-100 mb-1">$4.99</div>
          <div class="text-xs text-neutral-500 mb-4">/месяц</div>
          <Button variant="outline" class="w-full gap-1.5">
            <IconArrowRight size={16} />
            Попробовать
          </Button>
        </CardContent>
      </Card>

      <p class="text-center text-xs text-neutral-600">
        7 дней бесплатно · Отмена в любой момент
      </p>
    </div>
  );
}

import { Scissors, Palette, Hand, Sparkles, Waves, Flower2, type LucideIcon } from 'lucide-react';

// Иконки по известным slug/id. Для любых новых услуг (добавленных через админку)
// используем fallback, чтобы страница не падала на <Icon/> === undefined.
const byKey: Record<string, LucideIcon> = {
  haircut: Scissors,
  coloring: Palette,
  manicure: Hand,
  facial: Sparkles,
  massage: Waves,
  '1': Scissors,   // Стрижка и укладка
  '2': Palette,    // Окрашивание
  '3': Hand,       // Маникюр
  '4': Sparkles,   // Уход за лицом
  '5': Waves,      // Расслабляющий массаж
};

export function getServiceIcon(id: string | number): LucideIcon {
  return byKey[String(id)] || Flower2;
}

export const serviceIcons: Record<string, LucideIcon> = byKey;

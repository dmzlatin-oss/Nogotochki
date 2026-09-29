// src/data/catalog.ts — презентационные подсказки (не данные БД).
export function masterServiceHint(masterName: string): string[] {
  switch (masterName) {
    case 'Анна Ковалева':
      return ['manicure', 'manicure-pedicure', 'nail-extension', 'nail-design'];
    case 'Марина Орлова':
      return ['brow-correction', 'brow-lamination'];
    case 'Елена Смирнова':
      return ['gel-manicure', 'nail-extension', 'brow-correction', 'brow-lamination'];
    default:
      return [];
  }
}

const SERVICE_ID_TO_SLUG: Record<string, string> = {
  '15': 'gel-manicure',
  '16': 'manicure-pedicure',
  '17': 'nail-extension',
  '18': 'nail-design',
  '19': 'brow-correction',
  '20': 'brow-lamination',
};
export function serviceSlugById(id: string | null): string | undefined {
  return id ? SERVICE_ID_TO_SLUG[id] : undefined;
}


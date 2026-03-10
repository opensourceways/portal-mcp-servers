const INDUSTRY_MAP = new Map([
  [
    'electricity',
    {
      label: {
        zh: '电力',
        en: 'electricity',
      },
      value: 'electricity',
    },
  ],
  [
    'biology',
    {
      label: {
        zh: '生物',
        en: 'biology',
      },
      value: 'biology',
    },
  ],
]);

export const INDUSTRY = [
  ...Array.from(INDUSTRY_MAP.values()).map(item => item.value),
];

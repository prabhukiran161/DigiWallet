export const categoryIcons = ['food','transport','shopping','bills','other','home','health','education','travel','work','gift','fuel','fitness','coffee','pets','phone'] as const;
export type CategoryIconName = typeof categoryIcons[number];
export const defaultCategoryIds = ['food','transport','shopping','bills','other'];

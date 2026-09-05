import themeJson from './theme.json';

export const theme = themeJson;

export type SemanticColor = keyof typeof themeJson.colors;

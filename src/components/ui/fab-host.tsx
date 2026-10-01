import { createContext } from 'react';

// AppLayout supplies a node beside the bottom dock so the FAB can portal out
// of the transformed, scrollable <main> (iOS standalone hides it otherwise).
export const FabHostContext = createContext<HTMLElement | null>(null);

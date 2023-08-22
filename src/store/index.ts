import { atomWithStorage } from 'jotai/utils';
import { themeAtom } from './theme';

export const sidebarCollapsedAtom = atomWithStorage('sidebar-collapsed', false);

export * from './renown';
export * from './tabs';
export * from './theme';
export default { themeAtom, sidebarCollapsedAtom };

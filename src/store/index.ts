import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { themeAtom } from './theme';

export const sidebarCollapsedAtom = atomWithStorage('sidebar-collapsed', false);

export const userAtom = atom<string | undefined>(undefined);

export const attestationAtom = atom<string | null | undefined>(undefined);

export * from './tabs';
export * from './theme';
export default { themeAtom, sidebarCollapsedAtom, userAtom };

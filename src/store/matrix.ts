import { atom, useAtomValue, useSetAtom } from 'jotai';
import {
    initMatrix as _initMatrix,
    projectMatrixClient,
} from 'src/services/matrix';

const matrixAtom = atom(projectMatrixClient(undefined));

export function useInitMatrix() {
    const setMatrix = useSetAtom(matrixAtom);

    async function initMatrix(jwt: string) {
        const client = await _initMatrix({ jwt });
        setMatrix(projectMatrixClient(client));
    }

    return initMatrix;
}

export const useMatrix = () => useAtomValue(matrixAtom);

import { useAtom, useAtomValue } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { getJWT as _getJWT, getAuth } from 'src/services/renown';
import { getQueryParam } from 'src/utils/helpers';

// checks if address as been set by Renown
const address = getQueryParam('address');
export const addressAtom = atomWithStorage<string | null>('address', address);

export const useAddress = () => useAtomValue(addressAtom);

const storage = createJSONStorage<string | null>(() => sessionStorage);
export const jwtAtom = atomWithStorage<string | null>(
    'renownJWT',
    null,
    storage
);
export const useGetJWT = () => {
    const [jwt, setJWT] = useAtom(jwtAtom);

    async function getJWT(
        address: string,
        publicKey: string,
        signChallenge: (challenge: string) => Promise<string>
    ) {
        if (!jwt) {
            const newJWT = await _getJWT(address, publicKey, signChallenge);
            setJWT(newJWT);
            return newJWT;
        } else {
            // checks if the stored jwt corresponds to the current publicKey and address
            const auth = await getAuth(jwt);
            if (auth.address !== address || auth.publicKey !== publicKey) {
                // if not, deletes it so a new one is retrieved
                setJWT(null);
                return getJWT(address, publicKey, signChallenge);
            }
            return jwt;
        }
    }

    return getJWT;
};

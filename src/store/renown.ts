import { useAtom, useAtomValue } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { useEffect } from 'react';
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
    const [, setAddress] = useAtom(addressAtom);

    useEffect(() => {
        const address = getQueryParam('address');
        if (address) {
            setAddress(address);
        }
    }, [window.location.search]);

    async function getJWT(
        address: string,
        publicKey: string,
        signChallenge: (challenge: string) => Promise<string>,
        overrideJWT = jwt
    ) {
        if (!overrideJWT) {
            const newJWT = await _getJWT(address, publicKey, signChallenge);
            setJWT(newJWT);
            setAddress(address);
            return newJWT;
        } else {
            // checks if the stored jwt corresponds to the current publicKey and address
            const auth = await getAuth(overrideJWT);
            if (auth.address !== address || auth.publicKey !== publicKey) {
                // if not, deletes it so a new one is retrieved
                setJWT(null);
                return getJWT(address, publicKey, signChallenge, null);
            }
            return overrideJWT;
        }
    }

    return getJWT;
};

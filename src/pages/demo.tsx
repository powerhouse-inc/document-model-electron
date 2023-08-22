import { ReactComponent as IconPowerhouse } from '@/assets/icons/powerhouse-logo.svg';
import { ReactComponent as IconRenown } from '@/assets/icons/renown.svg';
import Header from '@/assets/images/header.jpg';
import { useEffect, useState } from 'react';
import Button from 'src/components/button';
import Chat from 'src/components/chat';
import { getMatrixPublicKey, signChallenge } from 'src/services/matrix';
import { useAddress, useGetJWT } from 'src/store';
import { useInitMatrix } from 'src/store/matrix';

const ROOM_ID = '!nFdUQBnOpwYRrFWmLF:powerhouse.matrix';

function Demo() {
    const address = useAddress();
    const [matrixPublicKey, setMatrixPublicKey] = useState<
        string | undefined
    >();
    const initMatrix = useInitMatrix();
    const [authorized, setAuthorized] = useState(false);
    const getJWT = useGetJWT();

    async function checkAuthorization() {
        if (!address) {
            console.error('No address');
            return;
        }

        if (!matrixPublicKey) {
            console.error('No matrix public key');
            return;
        }

        try {
            const jwt = await getJWT(address, matrixPublicKey, signChallenge);
            if (!jwt) {
                throw new Error('JWT was not retrieved');
            }
            await initMatrix(jwt);
            setAuthorized(true);
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        getMatrixPublicKey()
            .then(key => key && setMatrixPublicKey(key))
            .catch(error =>
                console.error("Couldn't retrieve Matrix public key", error)
            );
    }, []);

    useEffect(() => {
        if (matrixPublicKey) {
            checkAuthorization();
        }
    }, [address, matrixPublicKey]);

    const roomId = authorized ? ROOM_ID : null;

    return (
        <div className="flex h-full flex-1 flex-col items-center justify-center p-10">
            <div className="max-w-[482px] overflow-auto rounded-3xl shadow-modal">
                <div className="relative">
                    <img src={Header} className="h-[106px]" />
                    <IconPowerhouse className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform" />
                </div>
                <div className="flex flex-col items-center bg-light px-8 pb-8 pt-10">
                    <h2 className="mb-3 text-3xl font-semibold">Log in with</h2>
                    <IconRenown className="mb-3" />
                    <p className="mb-10 text-center text-lg leading-6 text-neutral-4">
                        Click on the button below to start signing messages in
                        Connect on behalf of your Ethereum identity
                    </p>
                    <Button
                        disabled={!matrixPublicKey}
                        className="mb-3 w-full bg-action p-0 text-white shadow-none transition-colors hover:bg-action/75"
                    >
                        <a
                            className="block h-10 px-7 leading-10"
                            href={`${
                                import.meta.env.VITE_RENOWN_URL
                            }?connect=${encodeURIComponent(
                                matrixPublicKey || ''
                            )}`}
                        >
                            Authorize Connect
                        </a>
                    </Button>
                    <Button className="h-10 w-full bg-neutral-2/10 p-0 text-accent-5 shadow-none transition-colors hover:bg-neutral-1">
                        Cancel
                    </Button>
                </div>
            </div>
            <div className="mb-5"></div>
            {roomId && (
                <div className="max-w-5xl">
                    <Chat roomId={roomId} />
                </div>
            )}
        </div>
    );
}

export const element = <Demo />;
export default Demo;

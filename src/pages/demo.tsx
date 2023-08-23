import { ReactComponent as IconRenown } from '@/assets/icons/renown.svg';
import { useEffect, useState } from 'react';
import Button from 'src/components/button';
import Chat from 'src/components/chat';
import DotsLoader from 'src/components/dots-loader';
import Modal from 'src/components/modal';
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
    const [checking, setChecking] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const getJWT = useGetJWT();

    async function checkAuthorization() {
        if (!address) {
            console.error('No address');
            return null;
        }

        if (!matrixPublicKey) {
            console.error('No matrix public key');
            return null;
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
            .catch(error => {
                console.error("Couldn't retrieve Matrix public key", error);
                setChecking(false);
            });
    }, []);

    useEffect(() => {
        if (matrixPublicKey) {
            setChecking(true);
            checkAuthorization().finally(() => setChecking(false));
        }
    }, [address, matrixPublicKey]);

    const roomId = authorized ? ROOM_ID : null;

    return (
        <div className="flex h-full flex-1 flex-col items-center justify-center p-10">
            <Modal className="overflow-auto">
                {checking ? (
                    <h2 className="px-8 py-10 text-center text-xl font-medium">
                        <span>Checking Authorization</span>
                        <span className="inline-block w-[18px] text-left">
                            <DotsLoader />
                        </span>
                    </h2>
                ) : !authorized ? (
                    <div className="flex flex-col items-center bg-light px-8 pb-8 pt-10">
                        <h2 className="mb-3 text-2xl font-semibold">
                            Log in with
                        </h2>
                        <IconRenown className="mb-3" />
                        <p className="mb-10 text-center text-lg leading-6 text-neutral-4">
                            Click on the button below to start signing messages
                            in Connect on behalf of your Ethereum identity
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
                ) : roomId ? (
                    <Chat roomId={roomId} />
                ) : (
                    <></>
                )}
            </Modal>
        </div>
    );
}

export const element = <Demo />;
export default Demo;

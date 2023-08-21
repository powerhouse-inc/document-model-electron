import { useAtomValue } from 'jotai';
import { ReactElement, useEffect, useState } from 'react';
import Button from 'src/components/button';
import Chat from 'src/components/chat';
import DotsLoader from 'src/components/dots-loader';
import { attestationAtom, useAttestation } from 'src/store';
import { getMatrixPublicKey, useMatrix } from 'src/store/matrix';
import {
    ConnectAttestation,
    checkConnectAttestation,
    getConnectAttestation,
} from 'src/utils/attestation';
import { useAccount } from 'wagmi';

type Step =
    | 'CONNECT_WALLET'
    | 'CHECKING_ATTESTATION'
    | 'NO_ATTESTATION'
    | 'ATTESTED'
    | 'CONNECTING_TO_MATRIX'
    | 'CONNECTED_TO_MATRIX'
    | 'FAILED_CONNECT_MATRIX';

const stepComponent = (text: string) => () => <p>{text}</p>;

const stepText: Record<Step, (arg?: string) => ReactElement> = {
    CONNECT_WALLET: stepComponent('Connect wallet to proceed'),
    CHECKING_ATTESTATION: () => (
        <>
            <span>Checking app permissions</span>
            <DotsLoader />
        </>
    ),
    NO_ATTESTATION: () => {
        const { attest, attesting } = useAttestation();
        return (
            <>
                <span>Attest this device belongs to you:</span>
                <Button
                    onClick={attest}
                    className={`ml-2 text-white ${
                        attesting ? 'pointer-events-none animate-pulse' : ''
                    }`}
                >
                    Submit
                </Button>
            </>
        );
    },
    ATTESTED: stepComponent('Permission has been granted'),
    CONNECTING_TO_MATRIX: () => (
        <>
            <span>Connecting to chat</span>
            <DotsLoader />
        </>
    ),
    CONNECTED_TO_MATRIX: () => {
        const [matrix] = useMatrix();
        return <p>Connected as {matrix.client?.getUserId() ?? ''}</p>;
    },
    FAILED_CONNECT_MATRIX: stepComponent('Connection failed'),
} as const;

const STEP_WAIT_TIME = 1000;

const ROOM_ID = '!nFdUQBnOpwYRrFWmLF:powerhouse.matrix';

function Demo() {
    const account = useAccount();
    const [attestation, setAttestation] = useState<
        ConnectAttestation | undefined
    >(undefined);
    const attestationId = useAtomValue(attestationAtom);
    const [matrixPublicKey, setMatrixPublicKey] = useState<
        string | undefined
    >();
    const [matrix, initMatrix] = useMatrix();
    const [step, setStep] = useState<Step>('CONNECT_WALLET');

    async function checkAttestation() {
        if (!account.address) {
            setStep('CONNECT_WALLET');
            return;
        }
        setStep('CHECKING_ATTESTATION');
        const matrixPublicKey = await getMatrixPublicKey();

        if (!matrixPublicKey) {
            setStep('NO_ATTESTATION');
            console.log("Couldn't retrieve Matrix public key");
            return;
        }

        setMatrixPublicKey(matrixPublicKey);

        await new Promise(resolve => setTimeout(resolve, STEP_WAIT_TIME));
        try {
            const attestation = await getConnectAttestation(
                account.address,
                matrixPublicKey
            );
            if (attestation) {
                setAttestation(attestation);
            } else {
                setStep('NO_ATTESTATION');
            }
        } catch (error) {
            console.error(error);
            setStep('NO_ATTESTATION');
        }
    }

    useEffect(() => {
        checkAttestation();
    }, [account?.address, attestationId]);

    async function connectMatrix(
        accountAddress: string,
        matrixPublicKey: string
    ) {
        await new Promise(resolve => setTimeout(resolve, STEP_WAIT_TIME));
        if (!matrix.publicKey()) {
            setStep('CONNECTING_TO_MATRIX');
            initMatrix(accountAddress, matrixPublicKey)
                .then(async () => {
                    await new Promise(resolve =>
                        setTimeout(resolve, STEP_WAIT_TIME)
                    );
                    setStep('CONNECTED_TO_MATRIX');
                })
                .catch(error => {
                    console.log(error);
                    setStep('FAILED_CONNECT_MATRIX');
                });
        }
    }

    useEffect(() => {
        if (
            account.address &&
            matrixPublicKey &&
            attestation &&
            checkConnectAttestation(attestation, matrixPublicKey)
        ) {
            setStep('ATTESTED');
            connectMatrix(account.address, matrixPublicKey);
        }
    }, [attestation, account.address, matrixPublicKey]);

    const StepComponent: React.FC = () => stepText[step]();

    const roomId = step === 'CONNECTED_TO_MATRIX' ? ROOM_ID : null;

    return (
        <div className="flex h-full max-w-5xl flex-1 flex-col items-stretch p-10">
            <div className="mb-5">
                <StepComponent />
            </div>
            {roomId && <Chat roomId={roomId} />}
        </div>
    );
}

export const element = <Demo />;
export default Demo;

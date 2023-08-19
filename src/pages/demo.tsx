import { useAtomValue } from 'jotai';
import * as sdk from 'matrix-js-sdk';
import { useEffect, useState } from 'react';
import { Input } from 'react-aria-components';
import { attestationAtom } from 'src/store';
import { MatrixMessage, getMatrixPublicKey, useMatrix } from 'src/store/matrix';
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

const STEP_WAIT_TIME = 0;

const ROOM_ID = '!UERWTrvtwSimPWPsLo:powerhouse.matrix';

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
    const [messages, setMessages] = useState<MatrixMessage[]>([]);
    const [room, setRoom] = useState<sdk.Room>();

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
            await new Promise(resolve => setTimeout(resolve, STEP_WAIT_TIME));
            initMatrix(accountAddress, matrixPublicKey)
                .then(() => {
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

    useEffect(() => {
        if (step === 'CONNECTED_TO_MATRIX' && matrix.ready) {
            setTimeout(joinChat, 1000);
        }
    }, [step, matrix]);

    async function joinChat() {
        const room = await matrix.joinRoom(ROOM_ID);
        if (!room) {
            throw new Error('Room does not exist.');
        }
        setRoom(room);
        const messages = await matrix.getMessages(room);
        setMessages(messages);
        matrix.onMessage(room, newMessage =>
            setMessages(messages => [...messages, newMessage])
        );
    }

    async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);
        const message = formData.get('message');

        if (!room) {
            throw new Error('Room does not exist.');
        }
        matrix.sendMessage(room.roomId, message);
    }

    return (
        <div className="flex h-full flex-1 flex-col items-stretch p-10">
            <div>
                {step.split('_').join(' ')}
                {step === 'CONNECTED_TO_MATRIX' ? (
                    <span>: {matrix.client?.getUserId()}</span>
                ) : null}
            </div>
            <div className="flex-1">
                {messages.map((message, index) => (
                    <p key={index}>
                        <b>{message.sender ?? '-'}:</b>
                        <span className="ml-2">{message.content?.body}</span>
                    </p>
                ))}
            </div>
            <form className="" onSubmit={sendMessage}>
                <Input
                    className="w-full py-2"
                    name="message"
                    placeholder="Send message..."
                />
            </form>
        </div>
    );
}

export const element = <Demo />;
export default Demo;

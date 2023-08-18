import { useEffect, useState } from 'react';
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
    | 'ATTESTED'
    | 'CONNECTING TO MATRIX'
    | 'CONNECTED TO MATRIX';

function Demo() {
    const account = useAccount();
    const [attestation, setAttestation] = useState<
        ConnectAttestation | undefined
    >(undefined);
    const [matrixPublicKey, setMatrixPublicKey] = useState<
        string | undefined
    >();
    const [matrix, initMatrix] = useMatrix();

    const [step, setStep] = useState<Step>('CONNECT_WALLET');

    useEffect(() => {
        if (
            account.address &&
            matrixPublicKey &&
            attestation &&
            checkConnectAttestation(attestation, matrixPublicKey)
        ) {
            setStep('ATTESTED');
            // setTimeout(() => {
            if (!matrix.publicKey()) {
                setStep('CONNECTING TO MATRIX');
                initMatrix(account.address, matrixPublicKey).then(() => {
                    setStep('CONNECTED TO MATRIX');
                });
            }
        }
    }, [attestation, account.address, matrixPublicKey]);

    async function checkAttestation() {
        if (!account.address) {
            return;
        }
        setStep('CHECKING_ATTESTATION');
        const matrixPublicKey = await getMatrixPublicKey();

        if (!matrixPublicKey) {
            console.log("Couldn't retrieve Matrix public key");
            return;
        }

        setMatrixPublicKey(matrixPublicKey);

        const attestation = await getConnectAttestation(
            account.address,
            matrixPublicKey
        );
        setAttestation(attestation);
    }

    useEffect(() => {
        checkAttestation();
    }, [account?.address]);

    return <div className="ml-10 mt-10"></div>;
}

export const element = <Demo />;
export default Demo;

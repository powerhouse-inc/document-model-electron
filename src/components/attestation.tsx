import Button from './button';

import { useEffect, useState } from 'react';
import { getMatrixPublicKey, useMatrix } from 'src/store/matrix';
import { useAccount } from 'wagmi';
import {
    ConnectAttestation,
    attestConnect,
    checkConnectAttestation,
    getConnectAttestation,
    revokeConnectAttestation,
    useEthersSigner,
} from '../utils/attestation';

export default () => {
    const account = useAccount();
    const signer = useEthersSigner();
    const [matrix] = useMatrix();
    const [attestation, setAttestation] = useState<
        ConnectAttestation | undefined
    >(undefined);
    const [attestationId, setAttestationId] = useState<
        string | null | undefined
    >(undefined);
    const [loading, setLoading] = useState(false);
    const [matrixPublicKey, setMatrixPublicKey] = useState<
        string | undefined
    >();
    async function checkAttestation() {
        if (!account.address) {
            return;
        }

        const matrixPublicKey =
            matrix.publicKey() || (await getMatrixPublicKey());

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
    }, [matrix, account?.address]);

    useEffect(() => {
        if (
            account.address &&
            matrixPublicKey &&
            attestation &&
            checkConnectAttestation(attestation, matrixPublicKey)
        ) {
            setAttestationId(attestation.id);
        }
    }, [attestation, account.address, matrixPublicKey]);

    async function attest() {
        if (!signer || !matrixPublicKey) {
            return;
        }
        try {
            setLoading(true);
            const uId = await attestConnect(signer, matrixPublicKey);
            console.log('Attestation id:', uId);
            if (uId) {
                setAttestationId(uId);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function revokeAttestation() {
        if (!signer || !account.address || !matrixPublicKey) {
            return;
        }
        try {
            setLoading(true);
            const attestation = await getConnectAttestation(
                account.address,
                matrixPublicKey
            );
            if (attestation?.id) {
                console.log(attestation.id);
                await revokeConnectAttestation(signer, attestation.id);
                setAttestationId(undefined);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            {attestationId ? (
                <>
                    <a
                        href={`https://base-goerli.easscan.org/attestation/view/${attestationId}`}
                        target="_blank"
                        className="hover:underline"
                    >
                        Attested!
                    </a>
                    <span
                        className={`ml-1 cursor-pointer underline ${
                            loading && 'pointer-events-none animate-pulse'
                        }`}
                        onClick={revokeAttestation}
                    >
                        Revoke
                    </span>
                </>
            ) : (
                <Button
                    disabled={!signer}
                    onClick={attest}
                    className={
                        loading ? 'pointer-events-none animate-pulse' : ''
                    }
                >
                    Attest
                </Button>
            )}
        </div>
    );
};

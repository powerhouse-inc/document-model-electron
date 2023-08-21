import { atom, useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import {
    ConnectAttestation,
    attestConnect,
    checkConnectAttestation,
    getConnectAttestation,
    revokeConnectAttestation,
    useEthersSigner,
} from 'src/utils/attestation';
import { useAccount } from 'wagmi';
import { getMatrixPublicKey, useMatrix } from './matrix';

export const attestationAtom = atom<string | null | undefined>(undefined);

export const useAttestation = () => {
    const account = useAccount();
    const signer = useEthersSigner();
    const [matrix] = useMatrix();
    const [attestation, setAttestation] = useState<
        ConnectAttestation | undefined
    >(undefined);
    const [attestationId, setAttestationId] = useAtom(attestationAtom);
    const [checking, setChecking] = useState(false);
    const [attesting, setAttesting] = useState(false);
    const [revoking, setRevoking] = useState(false);
    const [matrixPublicKey, setMatrixPublicKey] = useState<
        string | undefined
    >();

    async function checkAttestation() {
        if (!account.address) {
            return;
        }
        try {
            setChecking(true);
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
        } catch (error) {
            console.error(error);
        } finally {
            setChecking(false);
        }
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
            setAttesting(true);
            const uId = await attestConnect(signer, matrixPublicKey);
            console.log('Attestation id:', uId);
            if (uId) {
                setAttestationId(uId);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setAttesting(false);
        }
    }

    async function revoke() {
        if (!signer || !account.address || !matrixPublicKey) {
            return;
        }
        try {
            setRevoking(true);
            const attestation = await getConnectAttestation(
                account.address,
                matrixPublicKey
            );
            if (attestation?.id) {
                await revokeConnectAttestation(signer, attestation.id);
                setAttestationId(undefined);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setRevoking(false);
        }
    }

    return {
        attestation,
        attestationId,
        checking,
        attesting,
        revoking,
        attest,
        revoke,
    };
};

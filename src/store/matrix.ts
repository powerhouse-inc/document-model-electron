import * as Olm from '@matrix-org/olm';
import * as sdk from 'matrix-js-sdk';
import { useState } from 'react';
import { requestChallenge, verifyChallenge } from 'src/services/renown';
import { executeOnce } from 'src/utils/helpers';
global.Olm = Olm;

// async function getSecretStorageKey({
//     keys,
// }: {
//     keys: Record<
//         string,
//         sdk.SecretStorage.SecretStorageKeyDescriptionAesV1
//     >;
// }): Promise<[string, Uint8Array] | null> {
//     let keyId: string | null =
//         await this.client!.secretStorage.getDefaultKeyId();

//     let keyInfo;
//     if (keyId) {
//         keyInfo = keys[keyId];
//         if (!keyInfo) {
//             keyId = null;
//         }
//     }

//     if (!keyId) {
//         const keyInfoEntries = Object.entries(keys);
//         if (keyInfoEntries.length > 1) {
//             throw new Error(
//                 'Multiple storage key requests not implemented'
//             );
//         }
//         [keyId, keyInfo] = keyInfoEntries[0];
//     }

//     if (!keyInfo) return null;

//     const result = await this.client!.secretStorage.getKey(keyId);
//     const decodedKey = this.client!.keyBackupKeyFromRecoveryKey(
//         '' /* TODO get passphrase from user */
//     );
//     return [result![0], decodedKey];
// }

const cryptoStore = new sdk.IndexedDBCryptoStore(
    window.indexedDB,
    'matrix-crypto'
);

const store = new sdk.IndexedDBStore({
    indexedDB: window.indexedDB,
    dbName: 'matrix',
});

async function _getMatrixCrypto() {
    const client = sdk.createClient({
        baseUrl: 'http://localhost:8008/',
        userId: 'dummy',
        deviceId: 'dummy',
        cryptoStore,
    });
    await client.initCrypto();
    client.stopClient();
    return client;
}

const getMatrixCrypto = executeOnce(_getMatrixCrypto);

export async function getMatrixPublicKey() {
    const client = await getMatrixCrypto();
    console.log(client.getDeviceEd25519Key());
    return client.getDeviceEd25519Key();
}

async function _init(accountAddress: string, publicKey: string) {
    console.log('Initializing Matrix client');

    await store.startup();

    const { challenge } = await requestChallenge(accountAddress, publicKey);
    const crypto = await getMatrixCrypto();
    const signedChallenge = await crypto.crypto!.olmDevice.sign(challenge);

    const token = await verifyChallenge(
        accountAddress,
        publicKey,
        challenge,
        signedChallenge
    );
    console.log(token);

    const machineId = await window.electronAPI?.getMachineId(); // TODO
    console.log('CREATE CLIENT: ACTUAL');
    const client = sdk.createClient({
        baseUrl: 'http://localhost:8008/',
        deviceId: 'device123', // TODO
        store,
        cryptoStore,
        cryptoCallbacks: {
            // getSecretStorageKey: this.getSecretStorageKey, TODO
        },
    });

    const auth = await client.login('org.matrix.login.jwt', { token });
    await client.initCrypto();

    if (client.getDeviceEd25519Key() !== (await getMatrixPublicKey())) {
        throw new Error('Matrix public key has changed');
    }
    // const acessToken = await client.requestLoginToken();
    // console.log(acessToken);

    // const test = await client.loginWithToken(
    //     'syt_ZXRodG9yb250by1tYXRyaXg_VBWtWgGehmZYILHyAdPr_2e1GnU'
    // );

    // client.on(sdk.ClientEvent.Sync, async (state: string) => {
    //     if (state === 'PREPARED') {
    //         this.ready = true;
    //         client.setGlobalErrorOnUnknownDevices(false);

    //         // const room = await client.getRoom(
    //         //     '!wmaUeVhnIgWlsJeCKz:matrix.org'
    //         // );
    //         // for (const event of room!.getLiveTimeline().getEvents()) {
    //         //     // Check if the event is a message event
    //         //     if (event.getType() === 'm.room.message') {
    //         //         if (event.isEncrypted()) {
    //         //             await client.decryptEventIfNeeded(event);

    //         //             if (event.isDecryptionFailure()) {
    //         //                 console.error(
    //         //                     'ERROR decrypting event',
    //         //                     event.event
    //         //                 );
    //         //             } else {
    //         //                 const deviceInfo =
    //         //                     await client.getEventSenderDeviceInfo(
    //         //                         event
    //         //                     );
    //         //                 console.info('DEVICE INFO', deviceInfo);
    //         //                 // TODO verify device with Renown
    //         //             }
    //         //         }
    //         //     }
    //         // }
    //     }
    // });

    await client.startClient();

    const signature = {
        userId: client.getUserId(),
        ed25519: client.getDeviceEd25519Key(),
        curve25519: client.getDeviceCurve25519Key(),
    };
    await client.crypto!.signObject(signature);
    console.log('SIGNATURE:', signature);
    // TODO upload keys to Renown
    return client;
}

const init = executeOnce(_init);

let matrixClient: sdk.MatrixClient | undefined;

function projectMatrixClient(matrixClient: sdk.MatrixClient | undefined) {
    return {
        ready: false,
        client: matrixClient as sdk.MatrixClient | undefined,
        publicKey() {
            return matrixClient?.getDeviceEd25519Key();
        },
        async joinRoom(room: string) {
            return matrixClient?.joinRoom(room);
        },
        async sendMessage(roomId: string, message: any) {
            return matrixClient?.sendMessage(roomId, {
                body: JSON.stringify(message, null, 2),
                msgtype: 'm.text',
            });
        },
        async restorePassphrase() {
            if (!matrixClient) {
                return;
            }

            const backupInfo = await matrixClient.getKeyBackupVersion();

            // calls getSecretStorageKey defined in the client
            await matrixClient.bootstrapSecretStorage({});

            await matrixClient.enableKeyBackup(backupInfo!);

            const response = await matrixClient.checkKeyBackup();
            const recoverInfo = await matrixClient.restoreKeyBackupWithCache(
                undefined,
                undefined,
                response!.backupInfo!
            );

            if (recoverInfo && recoverInfo.total > recoverInfo.imported) {
                console.warn(
                    `${
                        recoverInfo.total - recoverInfo.imported
                    } sessions could not be recovered`
                );
            }
        },
    };
}

export function useMatrix() {
    const [matrix, setMatrix] = useState(projectMatrixClient(matrixClient));

    async function initMatrix(accountAddress: string, publicKey: string) {
        const client = await init(accountAddress, publicKey);
        setMatrix(projectMatrixClient(client));
    }
    return [matrix, initMatrix] as const;
}

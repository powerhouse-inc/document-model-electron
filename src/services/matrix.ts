import * as Olm from '@matrix-org/olm';
import * as sdk from 'matrix-js-sdk';
import { executeOnce } from 'src/utils/helpers';

// @ts-ignore handle prod and dev
global.Olm = Olm.default ? Olm.default : Olm;

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

export type MatrixMessage = {
    sender?: string;
    publicKey?: string;
    content?: sdk.IContent;
};

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
    return client.getDeviceEd25519Key();
}

export async function signChallenge(challenge: string) {
    const crypto = await getMatrixCrypto();
    return crypto.crypto!.olmDevice.sign(challenge);
}

interface InitOptions {
    jwt: string;
}
async function _init({ jwt }: InitOptions) {
    console.log('Initializing Matrix client');

    await store.startup();

    const machineId = await window.electronAPI?.getMachineId(); // TODO
    const client = sdk.createClient({
        baseUrl: 'http://localhost:8008/',
        deviceId: 'device123', // TODO
        store,
        cryptoStore,
        cryptoCallbacks: {
            // getSecretStorageKey: this.getSecretStorageKey, TODO
        },
    });

    const auth = await client.login('org.matrix.login.jwt', { token: jwt });
    await client.initCrypto();

    if (client.getDeviceEd25519Key() !== (await getMatrixPublicKey())) {
        throw new Error('Matrix public key has changed');
    }
    // const acessToken = await client.requestLoginToken();
    // console.log(acessToken);

    // const test = await client.loginWithToken(
    //     'syt_ZXRodG9yb250by1tYXRyaXg_VBWtWgGehmZYILHyAdPr_2e1GnU'
    // );

    const initialSync = new Promise<void>(resolve => {
        client.on(sdk.ClientEvent.Sync, async (state: string) => {
            if (state === 'PREPARED') {
                client.setGlobalErrorOnUnknownDevices(false);
                resolve();
            }
        });
    });

    //         this.ready = true;

    //         // const room = await client.getRoom(
    //         //     '!wmaUeVhnIgWlsJeCKz:matrix.org'
    //         // );
    // for (const event of room!.getLiveTimeline().getEvents()) {
    //     // Check if the event is a message event
    //     if (event.getType() === 'm.room.message') {
    //         if (event.isEncrypted()) {
    //             await client.decryptEventIfNeeded(event);

    //             if (event.isDecryptionFailure()) {
    //                 console.error(
    //                     'ERROR decrypting event',
    //                     event.event
    //                 );
    //             } else {
    //                 const deviceInfo =
    //                     await client.getEventSenderDeviceInfo(
    //                         event
    //                     );
    //                 console.info('DEVICE INFO', deviceInfo);
    //                 // TODO verify device with Renown
    //             }
    //         }
    //     }
    // }
    //     }
    // });

    await client.startClient();

    // wait for initial sync to be done
    await initialSync;
    return client;
}

export const initMatrix = executeOnce(_init);

async function eventToMessage(
    client: sdk.MatrixClient,
    event: sdk.MatrixEvent
): Promise<MatrixMessage | undefined> {
    if (event.getType() === 'm.room.message') {
        const device = await client.getEventSenderDeviceInfo(event);
        return {
            content: event.event.content,
            sender: event.sender?.userId,
            publicKey: device?.getFingerprint(),
        };
    } else {
        return undefined;
    }
}

async function timelineToMessages(
    client: sdk.MatrixClient,
    timeline: sdk.EventTimeline
): Promise<MatrixMessage[]> {
    const messages: MatrixMessage[] = [];
    for (const event of timeline.getEvents()) {
        const message = await eventToMessage(client, event);
        if (message) {
            messages.push(message);
        }
    }
    return messages;
}

export function projectMatrixClient(
    matrixClient: sdk.MatrixClient | undefined
) {
    return {
        ready: !!matrixClient,
        client: matrixClient as sdk.MatrixClient | undefined,
        publicKey() {
            return matrixClient?.getDeviceEd25519Key();
        },
        async joinRoom(room: string) {
            return matrixClient?.joinRoom(room);
        },
        async sendMessage(roomId: string, message: any) {
            return matrixClient?.sendMessage(roomId, {
                body: message,
                msgtype: 'm.text',
            });
        },
        async getMessages(room: sdk.Room) {
            if (!matrixClient) {
                return [];
            }
            const e2eMembers = await room.getEncryptionTargetMembers();
            for (const member of e2eMembers) {
                const devices = matrixClient!.getStoredDevicesForUser(
                    member.userId
                );
                for (const device of devices) {
                    if (device.isUnverified()) {
                        await matrixClient.setDeviceKnown(
                            member.userId,
                            device.deviceId,
                            true
                        );
                        await matrixClient.setDeviceVerified(
                            member.userId,
                            device.deviceId,
                            true
                        );
                    } else {
                        console.log('device is verified', member.userId);
                    }
                }
            }
            const timeline = room.getLiveTimeline();
            return timelineToMessages(matrixClient, timeline);
        },
        async onMessage(
            room: sdk.Room,
            callback: (messages: MatrixMessage) => void
        ) {
            if (!matrixClient) {
                return;
            }

            async function handleMessage(
                event: sdk.MatrixEvent,
                room: sdk.Room | undefined,
                toStartOfTimeline: boolean | undefined,
                removed: boolean,
                data: sdk.IRoomTimelineData
            ) {
                if (!matrixClient || toStartOfTimeline || !data.liveEvent) {
                    return;
                }
                const events = data.timeline.getEvents();
                const msgEvent = events[events.length - 1];
                if (!msgEvent) {
                    return;
                }
                const message = await eventToMessage(matrixClient, msgEvent);
                if (message) {
                    callback(message);
                }
            }

            room.on(sdk.RoomEvent.Timeline, handleMessage);
            return () => {
                room.off(sdk.RoomEvent.Timeline, handleMessage);
            };
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

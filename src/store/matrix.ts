import * as Olm from '@matrix-org/olm';
import { atomWithStorage } from 'jotai/utils';
import * as sdk from 'matrix-js-sdk';
global.Olm = Olm;

class Matrix {
    public ready = false;
    private client: sdk.MatrixClient | undefined = undefined;

    constructor() {
        this.init();
    }

    async init() {
        const machineId = await window.electronAPI?.getMachineId();

        const store = new sdk.IndexedDBStore({
            indexedDB: window.indexedDB,
            dbName: 'matrix',
        });
        await store.startup();

        const client = await sdk.createClient({
            baseUrl: 'https://matrix.org',
            deviceId: machineId,
            store: store,
            cryptoCallbacks: {
                getSecretStorageKey: this.getSecretStorageKey,
            },
        });
        await client.loginWithPassword('test-connect', 'TODO');

        client.on(sdk.ClientEvent.Sync, async (state: string) => {
            if (state === 'PREPARED') {
                this.ready = true;
                client.setGlobalErrorOnUnknownDevices(false);

                const room = await client.getRoom(
                    '!wmaUeVhnIgWlsJeCKz:matrix.org'
                );
                for (const event of room!.getLiveTimeline().getEvents()) {
                    // Check if the event is a message event
                    if (event.getType() === 'm.room.message') {
                        if (event.isEncrypted()) {
                            await client.decryptEventIfNeeded(event);

                            if (event.isDecryptionFailure()) {
                                console.error(
                                    'ERROR decrypting event',
                                    event.event
                                );
                            } else {
                                const deviceInfo =
                                    await client.getEventSenderDeviceInfo(
                                        event
                                    );
                                console.info('DEVICE INFO', deviceInfo);
                                // TODO verify device with Renown
                            }
                        }
                    }
                }
            }
        });

        await client.initCrypto();
        await client.startClient();

        this.client = client;

        const signature = {
            userId: client.getUserId(),
            deviceId: machineId,
            ed25519: client.getDeviceEd25519Key(),
            curve25519: client.getDeviceCurve25519Key(),
        };
        await this.client.crypto!.signObject(signature);
        console.log('SIGNATURE:', signature);
        // TODO upload keys to Renown
    }

    async joinRoom(room: string) {
        return this.client!.joinRoom(room);
    }

    async sendMessage(roomId: string, message: any) {
        return this.client!.sendMessage(roomId, {
            body: JSON.stringify(message, null, 2),
            msgtype: 'm.text',
        });
    }

    async restorePassphrase() {
        if (!this.client) {
            return;
        }

        const backupInfo = await this.client.getKeyBackupVersion();

        // calls getSecretStorageKey defined in the client
        await this.client.bootstrapSecretStorage({});

        await this.client.enableKeyBackup(backupInfo!);

        const response = await this.client.checkKeyBackup();
        const recoverInfo = await this.client.restoreKeyBackupWithCache(
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
    }

    async getSecretStorageKey({
        keys,
    }: {
        keys: Record<
            string,
            sdk.SecretStorage.SecretStorageKeyDescriptionAesV1
        >;
    }): Promise<[string, Uint8Array] | null> {
        let keyId: string | null =
            await this.client!.secretStorage.getDefaultKeyId();

        let keyInfo;
        if (keyId) {
            keyInfo = keys[keyId];
            if (!keyInfo) {
                keyId = null;
            }
        }

        if (!keyId) {
            const keyInfoEntries = Object.entries(keys);
            if (keyInfoEntries.length > 1) {
                throw new Error(
                    'Multiple storage key requests not implemented'
                );
            }
            [keyId, keyInfo] = keyInfoEntries[0];
        }

        if (!keyInfo) return null;

        const result = await this.client!.secretStorage.getKey(keyId);
        const decodedKey = this.client!.keyBackupKeyFromRecoveryKey(
            '' /* TODO get passphrase from user */
        );
        return [result![0], decodedKey];
    }
}

const matrix = new Matrix();

export const matrixAtom = atomWithStorage('matrix', matrix);

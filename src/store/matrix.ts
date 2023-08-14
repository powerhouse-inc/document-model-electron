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
            cryptoStore: new sdk.MemoryCryptoStore(),
            store,
        });
        await client.loginWithPassword('test-connect', 'TODO');

        client.on(sdk.ClientEvent.Sync, async (state: string) => {
            if (state === 'PREPARED') {
                this.ready = true;
                client.setGlobalErrorOnUnknownDevices(false);
            }
        });

        await client.initCrypto();
        await client.startClient();

        this.client = client;
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
}

const matrix = new Matrix();

export const matrixAtom = atomWithStorage('matrix', matrix);

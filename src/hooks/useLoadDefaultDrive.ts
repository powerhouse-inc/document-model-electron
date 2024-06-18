import { useEffect, useRef } from 'react';
import { useDocumentDriveServer } from './useDocumentDriveServer';
import { useFeatureFlag } from './useFeatureFlags';
import defaultConfig from './useFeatureFlags/default-config';

export const useLoadDefaultDrive = () => {
    const loading = useRef(false);
    const {
        addRemoteDrive,
        documentDrives,
        documentDrivesStatus,
        clearStorage,
    } = useDocumentDriveServer();
    const {
        setConfig,
        config: { defaultDrive },
    } = useFeatureFlag();

    // TODO - remove this when we have a way to reset the default drive
    async function resetDefaultDrive() {
        console.log('Clearing default drive');
        await clearStorage();
        setConfig(defaultConfig);
        loading.current = false;
    }

    useEffect(() => {
        if (
            !loading.current &&
            defaultDrive &&
            defaultConfig.defaultDrive &&
            defaultDrive.url !== defaultConfig.defaultDrive.url
        ) {
            loading.current = true;
            void resetDefaultDrive();
        }
        if (
            defaultDrive &&
            documentDrivesStatus === 'LOADED' &&
            !defaultDrive.loaded &&
            !loading.current
        ) {
            const isDriveAlreadyAdded = documentDrives.some(drive => {
                return drive.state.local.triggers.some(
                    trigger => trigger.data?.url === defaultDrive.url,
                );
            });

            if (isDriveAlreadyAdded) return;

            loading.current = true;

            addRemoteDrive(defaultDrive.url, {
                sharingType: 'PUBLIC',
                availableOffline: true,
                listeners: [
                    {
                        block: true,
                        callInfo: {
                            data: defaultDrive.url,
                            name: 'switchboard-push',
                            transmitterType: 'SwitchboardPush',
                        },
                        filter: {
                            branch: ['main'],
                            documentId: ['*'],
                            documentType: ['*'],
                            scope: ['global'],
                        },
                        label: 'Switchboard Sync',
                        listenerId: '1',
                        system: true,
                    },
                ],
                triggers: [],
                pullInterval: 3000,
            })
                .then(() =>
                    setConfig(conf => ({
                        ...conf,
                        defaultDrive: { ...defaultDrive, loaded: true },
                    })),
                )
                .catch(console.error)
                .finally(() => (loading.current = false));
        }
    }, [documentDrives, defaultDrive, documentDrivesStatus]);

    return loading.current;
};

import { useRef } from 'react';
import { useDropFile, useOpenFile } from 'src/hooks';
import { Tab, createScopeFrameworkTab, useTabs, useTheme } from 'src/store';
import Button from '../button';

export default () => {
    const ref = useRef(null);
    const theme = useTheme();
    const { selectedTab, updateTab } = useTabs();
    const { dropProps, isDropTarget } = useDropFile(ref);

    const handleOpenFile = useOpenFile(document => {
        updateTab(Tab.fromDocument(document, selectedTab));
    });

    return (
        <div>
            <div className="mb-10">
                <Button
                    className="bg-accent-1 text-text"
                    onClick={() =>
                        updateTab(
                            createScopeFrameworkTab(undefined, selectedTab)
                        )
                    }
                >
                    New Scope Framework
                </Button>
            </div>
            <h2 className="h2">Open existing file</h2>
            <div
                {...dropProps}
                ref={ref}
                className={`h-[240px] rounded-xl border-2 border-dashed
                ${
                    theme === 'dark'
                        ? 'border-neutral-1/20'
                        : 'border-accent-5/20'
                }
                ${
                    isDropTarget ? 'bg-light' : 'bg-bg'
                } my-6 flex max-w-4xl flex-col items-center justify-evenly py-5`}
            >
                <div className="h-9 select-none opacity-0"></div>
                <p className="text-accent-5">Drag file here</p>
                <Button className="button" onClick={handleOpenFile}>
                    Browse
                </Button>
            </div>
        </div>
    );
};

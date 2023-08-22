export function executeOnce<
    T extends (...args: Parameters<T>) => ReturnType<T>
>(fn: T): T {
    let resultPromise: ReturnType<T>;
    let hasExecuted = false;

    return function (...args: Parameters<typeof fn>) {
        if (!hasExecuted) {
            hasExecuted = true;
            const result = fn(...args);
            resultPromise = result;
        }
        return resultPromise;
    } as T;
}

export function getQueryParam(name: string) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

export function isDesktopApp() {
    return navigator.userAgent.includes('Electron');
}

export function isMac() {
    return window.navigator.appVersion.includes('Mac');
}

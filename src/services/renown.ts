const BASE_URL = `${import.meta.env.VITE_RENOWN_URL}/api`;

async function postRequest(url: string, body?: object) {
    const result = await fetch(`${BASE_URL}/${url}`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    const data = await result.json();
    if (result.ok) {
        return data;
    } else {
        throw data;
    }
}

export async function getAuth(
    token: string
): Promise<{ address: string; publicKey: string; challenge: string }> {
    return postRequest('auth/me', { token });
}

export async function requestChallenge(
    address: string,
    publicKey: string
): Promise<{ address: string; publicKey: string; challenge: string }> {
    return postRequest('auth/challenge/request', { address, publicKey });
}

export async function verifyChallenge(
    address: string,
    publicKey: string,
    challenge: string,
    signedChallenge: string
): Promise<string> {
    return postRequest('auth/challenge/verify', {
        address,
        publicKey,
        challenge,
        signedChallenge,
    }).then(data => data.token);
}

export async function getJWT(
    address: string,
    publicKey: string,
    signChallenge: (challenge: string) => Promise<string>
) {
    const { challenge } = await requestChallenge(address, publicKey);
    const signedChallenge = await signChallenge(challenge);
    const token = await verifyChallenge(
        address,
        publicKey,
        challenge,
        signedChallenge
    );
    return token;
}

const BASE_URL = 'http://localhost:3000/api';

export async function requestChallenge(
    address: string,
    publicKey: string
): Promise<{ address: string; publicKey: string; challenge: string }> {
    return (
        await fetch(`${BASE_URL}/auth/challenge/request`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                address,
                publicKey,
            }),
        })
    ).json();
}

export async function verifyChallenge(
    address: string,
    publicKey: string,
    challenge: string,
    signedChallenge: string
): Promise<string> {
    return (
        await fetch(`${BASE_URL}/auth/challenge/verify`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                address,
                publicKey,
                challenge,
                signedChallenge,
            }),
        })
    )
        .json()
        .then(data => data.token);
}

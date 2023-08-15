import * as jose from 'jose';

const secret = new TextEncoder().encode('my-secret-token');

export async function generateJWT() {
    const alg = 'HS256';

    const jwt = await new jose.SignJWT({ 'urn:example:claim': true })
        .setProtectedHeader({ alg })
        .setSubject('test-user')
        // .setIssuedAt()
        // .setIssuer('urn:example:issuer')
        // .setAudience('urn:example:audience')
        // .setExpirationTime('2h')
        .sign(secret);

    return jwt;
}

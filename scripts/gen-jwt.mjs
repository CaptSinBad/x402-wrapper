import fs from 'fs';
import path from 'path';
import { SignJWT, importJWK } from 'jose';

// Read .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
});

const apiKeyName = env.CDP_API_KEY_ID;
const apiKeySecret = env.CDP_API_KEY_SECRET;

if (!apiKeyName || !apiKeySecret) {
    console.error('Missing CDP_API_KEY_ID or CDP_API_KEY_SECRET in .env.local');
    process.exit(1);
}

async function generateCDPJWTWithUri(uri) {
    const now = Math.floor(Date.now() / 1000);

    const decoded = Buffer.from(apiKeySecret, 'base64');
    const seed = decoded.subarray(0, 32);
    const publicKey = decoded.subarray(32, 64);

    const privateKey = await importJWK(
        {
            kty: 'OKP',
            crv: 'Ed25519',
            d: seed.toString('base64url'),
            x: publicKey.toString('base64url'),
        },
        'EdDSA'
    );

    return new SignJWT({
        iss: 'cdp',
        nbf: now,
        exp: now + 120,
        uri: uri,
    })
        .setProtectedHeader({
            alg: 'EdDSA',
            typ: 'JWT',
            kid: apiKeyName,
        })
        .sign(privateKey);
}

const endpoint = 'https://api.cdp.coinbase.com/platform/v2/x402/settle';
const urlObj = new URL(endpoint);
const host = urlObj.host;
const urlPath = urlObj.pathname;

// Generate variations
const uri1 = `POST ${host}${urlPath}`;
const uri2 = `POST ${endpoint}`;
const uri3 = `POST ${urlPath}`;
const uri4 = `${host}${urlPath}`;
const uri5 = `${endpoint}`;

console.log('Generating JWTs...');

const uris = [uri1, uri2, uri3, uri4, uri5];
const labels = [
    'Method + Host + Path',
    'Method + Full URL',
    'Method + Path',
    'Host + Path',
    'Full URL'
];

(async () => {
    for (let i = 0; i < uris.length; i++) {
        const jwt = await generateCDPJWTWithUri(uris[i]);
        console.log(`\n--- JWT ${i + 1} (${labels[i]}) ---`);
        console.log(`URI: ${uris[i]}`);
        console.log(jwt);
    }
})();

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

import https from 'https';

const endpoint = 'https://api.cdp.coinbase.com/platform/v2/x402/settle';

function httpsRequest(url, options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: options.method,
            headers: options.headers,
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    text: () => Promise.resolve(data),
                });
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(body);
        }
        req.end();
    });
}

async function testEndpoint() {
    const urlObj = new URL(endpoint);
    const host = urlObj.host;
    const path = urlObj.pathname;

    console.log(`Testing ${endpoint}...`);

    // Variations of URI claim to test
    const uriVariations = [
        `POST ${host}${path}`,              // Method + Host + Path (Standard CDP)
        `POST ${endpoint}`,                 // Method + Full URL
        `POST ${path}`,                     // Method + Path
        `${host}${path}`,                   // Host + Path
        `${endpoint}`,                      // Full URL
        `${path}`,                          // Path
        `POST https://${host}${path}`,      // Method + Scheme + Host + Path
    ];

    for (const uriClaim of uriVariations) {
        console.log(`  Testing URI claim: "${uriClaim}"`);
        try {
            const jwt = await generateCDPJWTWithUri(uriClaim);

            // Try fetch first
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwt}`,
                    },
                    body: JSON.stringify({
                        x402Version: 1,
                        paymentPayload: {},
                        paymentRequirements: {}
                    }),
                });

                console.log(`    [fetch] Status: ${res.status}`);
                if (res.status !== 401) {
                    const text = await res.text();
                    console.log(`    [fetch] SUCCESS/DIFFERENT! Response: ${text.substring(0, 200)}`);
                    return;
                }
            } catch (fetchErr) {
                console.error(`    [fetch] Failed: ${fetchErr.message} Cause: ${fetchErr.cause}`);

                // Fallback to https
                console.log('    [https] Trying fallback...');
                const res = await httpsRequest(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwt}`,
                    },
                }, JSON.stringify({
                    x402Version: 1,
                    paymentPayload: {},
                    paymentRequirements: {}
                }));

                console.log(`    [https] Status: ${res.status}`);
                if (res.status !== 401) {
                    const text = await res.text();
                    console.log(`    [https] SUCCESS/DIFFERENT! Response: ${text.substring(0, 200)}`);
                    return;
                }
            }
        } catch (err) {
            console.error(`    Error: ${err.message}`);
        }
    }
    console.log('---');
}

testEndpoint();

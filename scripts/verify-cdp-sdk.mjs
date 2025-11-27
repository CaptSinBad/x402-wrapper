import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import fs from 'fs';
import path from 'path';

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
    console.error('Missing CDP_API_KEY_ID or CDP_API_KEY_SECRET');
    process.exit(1);
}

console.log('Configuring Coinbase SDK...');
Coinbase.configure({
    apiKeyName: apiKeyName,
    privateKey: apiKeySecret,
});

async function run() {
    try {
        console.log('Inspecting Wallet class...');
        console.log('Wallet keys:', Object.keys(Wallet));
        console.log('Wallet prototype keys:', Object.getOwnPropertyNames(Wallet.prototype));

        // Try to list wallets if a method looks promising
        if (Wallet.list) {
            console.log('Calling Wallet.list()...');
            const wallets = await Wallet.list();
            console.log('Wallets:', wallets);
        } else if (Wallet.listWallets) {
            console.log('Calling Wallet.listWallets()...');
            const wallets = await Wallet.listWallets();
            console.log('Wallets:', wallets);
        }

        // Inspect apiClients
        console.log('Coinbase.apiClients:', Coinbase.apiClients);

        // Try to find a request method on the client
        // If apiClients is an array or object, we check its members

    } catch (error) {
        console.error('Operation failed:', error);
    }
}

run();

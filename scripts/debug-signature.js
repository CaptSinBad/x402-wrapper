
const { ethers } = require('ethers');

async function main() {
    // Data from the server logs (Step Id: 446)
    const signature = "0x7355466e892d4da0ff3b933b21c457ddad4df0b6183e006ccf3342ea8c78ddeb7d57cdeed8e12fac953fce67b39fb70b2f70cb55c11c0558c5cf09bc9448fc9d1c";

    const authorization = {
        from: "0xe3E11A208a3B658Cd539662441007813cACBb962",
        to: "0x784590bfCad59C0394f91F1CD1BCBA1e51d09408",
        value: "33980000",
        validAfter: "0",
        validBefore: "1763585659",
        nonce: "0x130b7d1d042207c127806c90152f37867c9383786eaff648a6afcfba95f3c766"
    };

    // Domain parameters from logs
    const domain = {
        name: "USDC",
        version: "2",
        chainId: 84532,
        verifyingContract: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    };

    // Types from logs
    const types = {
        TransferWithAuthorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
        ],
    };

    console.log("Verifying signature...");
    console.log("Domain:", domain);
    console.log("Types:", types);
    console.log("Value:", authorization);

    // Attempt 1: Exact match
    try {
        const recovered = ethers.verifyTypedData(domain, types, authorization, signature);
        console.log(`\nAttempt 1 (Expected): ${recovered}`);
        if (recovered.toLowerCase() === authorization.from.toLowerCase()) console.log("✅ MATCH!");
        else console.log("❌ Mismatch");
    } catch (e) { console.log("Attempt 1 Error:", e.message); }

    // Attempt 2: Chain ID 8453 (Base Mainnet)
    try {
        const domainMainnet = { ...domain, chainId: 8453 };
        const recovered = ethers.verifyTypedData(domainMainnet, types, authorization, signature);
        console.log(`\nAttempt 2 (ChainID 8453): ${recovered}`);
        if (recovered.toLowerCase() === authorization.from.toLowerCase()) console.log("✅ MATCH!");
        else console.log("❌ Mismatch");
    } catch (e) { console.log("Attempt 2 Error:", e.message); }

    // Attempt 3: Lowercase Verifying Contract
    try {
        const domainLower = { ...domain, verifyingContract: domain.verifyingContract.toLowerCase() };
        const recovered = ethers.verifyTypedData(domainLower, types, authorization, signature);
        console.log(`\nAttempt 3 (Lowercase Contract): ${recovered}`);
        if (recovered.toLowerCase() === authorization.from.toLowerCase()) console.log("✅ MATCH!");
        else console.log("❌ Mismatch");
    } catch (e) { console.log("Attempt 3 Error:", e.message); }

    // Attempt 4: Name "USD Coin"
    try {
        const domainName = { ...domain, name: "USD Coin" };
        const recovered = ethers.verifyTypedData(domainName, types, authorization, signature);
        console.log(`\nAttempt 4 (Name "USD Coin"): ${recovered}`);
        if (recovered.toLowerCase() === authorization.from.toLowerCase()) console.log("✅ MATCH!");
        else console.log("❌ Mismatch");
    } catch (e) { console.log("Attempt 4 Error:", e.message); }

    // Attempt 5: Version "1"
    try {
        const domainVersion = { ...domain, version: "1" };
        const recovered = ethers.verifyTypedData(domainVersion, types, authorization, signature);
        console.log(`\nAttempt 5 (Version "1"): ${recovered}`);
        if (recovered.toLowerCase() === authorization.from.toLowerCase()) console.log("✅ MATCH!");
        else console.log("❌ Mismatch");
    } catch (e) { console.log("Attempt 5 Error:", e.message); }
    // Attempt 15: Nonce as uint256
    try {
        const typesUintNonce = {
            TransferWithAuthorization: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'validAfter', type: 'uint256' },
                { name: 'validBefore', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
            ],
        };
        const recovered = ethers.verifyTypedData(domain, typesUintNonce, authorization, signature);
        console.log(`\nAttempt 15 (Nonce uint256): ${recovered}`);
        if (recovered.toLowerCase() === authorization.from.toLowerCase()) console.log("✅ MATCH!");
        else console.log("❌ Mismatch");
    } catch (e) { console.log("Attempt 15 Error:", e.message); }

    // Attempt 16: Nonce as uint256 AND Name "USD Coin"
    try {
        const typesUintNonce = {
            TransferWithAuthorization: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'validAfter', type: 'uint256' },
                { name: 'validBefore', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
            ],
        };
        const domainName = { ...domain, name: "USD Coin" };
        const recovered = ethers.verifyTypedData(domainName, typesUintNonce, authorization, signature);
        console.log(`\nAttempt 16 (Nonce uint256 + Name "USD Coin"): ${recovered}`);
        if (recovered.toLowerCase() === authorization.from.toLowerCase()) console.log("✅ MATCH!");
        else console.log("❌ Mismatch");
    } catch (e) { console.log("Attempt 16 Error:", e.message); }
}

main();

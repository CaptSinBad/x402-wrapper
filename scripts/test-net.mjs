console.log('Testing connectivity to google.com...');
fetch('https://www.google.com')
    .then(res => console.log(`Google status: ${res.status}`))
    .catch(err => console.error(`Google failed: ${err.message} Cause: ${err.cause}`));

console.log('Testing connectivity to api.cdp.coinbase.com...');
fetch('https://api.cdp.coinbase.com/platform/v2/x402/settle', { method: 'POST' })
    .then(res => console.log(`CDP status: ${res.status}`))
    .catch(err => console.error(`CDP failed: ${err.message} Cause: ${err.cause}`));

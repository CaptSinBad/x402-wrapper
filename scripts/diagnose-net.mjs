import dns from 'dns';
import net from 'net';

const hostname = 'api.cdp.coinbase.com';

console.log(`Resolving DNS for ${hostname}...`);
dns.resolve4(hostname, (err, addresses) => {
    if (err) {
        console.error('DNS Resolution Failed:', err);
    } else {
        console.log('DNS Resolved IPs:', addresses);

        if (addresses.length > 0) {
            const ip = addresses[0];
            console.log(`Testing TCP connection to ${ip}:443...`);

            const socket = new net.Socket();
            socket.setTimeout(5000);

            socket.on('connect', () => {
                console.log('TCP Connection Successful!');
                socket.destroy();
            });

            socket.on('timeout', () => {
                console.error('TCP Connection Timed Out');
                socket.destroy();
            });

            socket.on('error', (err) => {
                console.error('TCP Connection Error:', err);
            });

            socket.connect(443, ip);
        }
    }
});

'use client';

import { useState, useEffect } from 'react';
import { Copy, Eye, EyeOff, AlertTriangle, Terminal, Key } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAuthToken } from '@/app/hooks/useAuthToken';

export default function APIKeysPage() {
    const { authFetch } = useAuthToken();
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [showWebhookSecret, setShowWebhookSecret] = useState(false);
    const [apiKeys, setApiKeys] = useState({
        publicKey: '',
        secretKey: '(hidden - stored securely)',
        webhookSecret: '',
    });
    const [loading, setLoading] = useState(true);

    // Fetch real API keys
    useEffect(() => {
        authFetch('/api/dashboard/developers/projects')
            .then(res => res.json())
            .then(data => {
                if (data.projects && data.projects.length > 0) {
                    const project = data.projects[0]; // Use first project
                    setApiKeys({
                        publicKey: project.public_key || 'pk_test_...',
                        secretKey: '(hidden - stored securely)',
                        webhookSecret: project.webhook_secret || 'whsec_...',
                    });
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch projects:', err);
                setLoading(false);
            });
    }, []);

    const copyToClipboard = (text: string, keyName: string) => {
        navigator.clipboard.writeText(text);
        // Could use a toast here
        alert(`${keyName} copied to clipboard!`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <div className="w-10 h-10 border-4 border-zinc-800 border-t-primary rounded-full animate-spin" />
                <p className="mt-4 text-zinc-500">Loading API keys...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-white mb-2">API Keys</h1>
                <p className="text-zinc-400">
                    Use these keys to authenticate API requests. Never share your secret key publicly.
                </p>
            </div>

            {/* Publishable Key */}
            <div className="p-6 bg-[#111111] border border-zinc-800 rounded-xl">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            <Key className="w-4 h-4 text-zinc-400" />
                            Publishable Key
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1">
                            Use in your client-side code. Safe to expose publicly.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                    <code className="font-mono text-sm text-zinc-300">{apiKeys.publicKey}</code>
                    <button
                        onClick={() => copyToClipboard(apiKeys.publicKey, 'Publishable key')}
                        className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Secret Key */}
            <div className="p-6 bg-[#111111] border border-zinc-800 rounded-xl">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            <Key className="w-4 h-4 text-zinc-400" />
                            Secret Key
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1">
                            Use in your server-side code. Keep this private and secure.
                        </p>
                    </div>
                </div>

                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-sm text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    Warning: Never expose your secret key in client-side code or version control
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                    <code className="font-mono text-sm text-zinc-300">
                        {showSecretKey
                            ? apiKeys.secretKey
                            : `sk_test_${'•'.repeat(36)}`}
                    </code>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSecretKey(!showSecretKey)}
                            className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors"
                        >
                            {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => copyToClipboard(apiKeys.secretKey, 'Secret key')}
                            className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Webhook Signing Secret */}
            <div className="p-6 bg-[#111111] border border-zinc-800 rounded-xl">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            <Key className="w-4 h-4 text-zinc-400" />
                            Webhook Signing Secret
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1">
                            Use to verify webhook events are sent by BinahPay.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                    <code className="font-mono text-sm text-zinc-300">
                        {showWebhookSecret
                            ? apiKeys.webhookSecret
                            : `whsec_${'•'.repeat(20)}`}
                    </code>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                            className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors"
                        >
                            {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => copyToClipboard(apiKeys.webhookSecret, 'Webhook secret')}
                            className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Code Examples */}
            <div className="p-6 bg-[#111111] border border-zinc-800 rounded-xl">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-zinc-400" />
                    Quick Start
                </h3>

                <div className="mb-6">
                    <div className="text-sm font-medium text-zinc-400 mb-2">Initialize BinahPay</div>
                    <pre className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg overflow-x-auto">
                        <code className="text-sm font-mono text-zinc-300">
                            {`import BinahPay from 'binahpay';

const binahpay = new BinahPay('${apiKeys.publicKey}');`}
                        </code>
                    </pre>
                </div>

                <div>
                    <div className="text-sm font-medium text-zinc-400 mb-2">Server-side (Node.js)</div>
                    <pre className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg overflow-x-auto">
                        <code className="text-sm font-mono text-zinc-300">
                            {`const BinahPay = require('binahpay');
const binahpay = new BinahPay('${apiKeys.secretKey}');

// Create a payment link
const link = await binahpay.paymentLinks.create({
  amount: 1000, // $10.00
  currency: 'USDC',
});`}
                        </code>
                    </pre>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="p-6 bg-[#111111] border border-red-500/20 rounded-xl">
                <h3 className="text-lg font-medium text-red-500 mb-4">Danger Zone</h3>

                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium text-white mb-1">Regenerate Secret Key</div>
                        <div className="text-sm text-zinc-400">
                            Get a new secret key. Your current key will stop working immediately.
                        </div>
                    </div>
                    <button
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-medium transition-colors"
                        onClick={() => {
                            if (confirm('This will invalidate your current secret key. Any integrations using the old key will break. Are you sure?')) {
                                alert('Key regeneration coming soon. For now, create a new project to get fresh keys.');
                            }
                        }}
                    >
                        Regenerate
                    </button>
                </div>
            </div>
        </div>
    );
}

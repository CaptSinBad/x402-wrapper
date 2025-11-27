'use client';

import { useState, useEffect } from 'react';
import styles from '../../../components/dashboard.module.css';

export default function APIKeysPage() {
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
        fetch('/api/dashboard/developers/projects')
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
        alert(`${keyName} copied to clipboard!`);
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '48px' }}>
                <div style={{
                    display: 'inline-block',
                    width: '40px',
                    height: '40px',
                    border: '4px solid #E2E8F0',
                    borderTopColor: '#2B5FA5',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }}></div>
                <p style={{ marginTop: '16px', color: '#718096' }}>Loading API keys...</p>
            </div>
        );
    }

    return (
        <>
            <div style={{ marginBottom: '32px' }}>
                <p style={{ color: '#718096', fontSize: '15px' }}>
                    Use these keys to authenticate API requests. Never share your secret key publicly.
                </p>
            </div>

            {/* Publishable Key */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div>
                        <h3 className={styles.cardTitle}>Publishable Key</h3>
                        <p style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
                            Use in your client-side code. Safe to expose publicly.
                        </p>
                    </div>
                </div>

                <div style={{
                    background: '#F7FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '16px',
                    fontFamily: 'Monaco, Courier New, monospace',
                    fontSize: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <code>{apiKeys.publicKey}</code>
                    <button
                        onClick={() => copyToClipboard(apiKeys.publicKey, 'Publishable key')}
                        style={{
                            padding: '8px 16px',
                            background: '#2B5FA5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        Copy
                    </button>
                </div>
            </div>

            {/* Secret Key */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div>
                        <h3 className={styles.cardTitle}>Secret Key</h3>
                        <p style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
                            Use in your server-side code. Keep this private and secure.
                        </p>
                    </div>
                </div>

                <div style={{
                    background: '#FFF5F5',
                    border: '1px solid #FC8181',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    fontSize: '13px',
                    color: '#742A2A',
                    marginBottom: '16px'
                }}>
                    ⚠️ <strong>Warning:</strong> Never expose your secret key in client-side code or version control
                </div>

                <div style={{
                    background: '#F7FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '16px',
                    fontFamily: 'Monaco, Courier New, monospace',
                    fontSize: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <code>
                        {showSecretKey
                            ? apiKeys.secretKey
                            : `sk_test_${'•'.repeat(36)}`}
                    </code>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setShowSecretKey(!showSecretKey)}
                            style={{
                                padding: '8px 16px',
                                background: 'white',
                                color: '#2B5FA5',
                                border: '1px solid #E2E8F0',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            {showSecretKey ? 'Hide' : 'Reveal'}
                        </button>
                        <button
                            onClick={() => copyToClipboard(apiKeys.secretKey, 'Secret key')}
                            style={{
                                padding: '8px 16px',
                                background: '#2B5FA5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            Copy
                        </button>
                    </div>
                </div>
            </div>

            {/* Webhook Signing Secret */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div>
                        <h3 className={styles.cardTitle}>Webhook Signing Secret</h3>
                        <p style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
                            Use to verify webhook events are sent by BinahPay.
                        </p>
                    </div>
                </div>

                <div style={{
                    background: '#F7FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '16px',
                    fontFamily: 'Monaco, Courier New, monospace',
                    fontSize: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <code>
                        {showWebhookSecret
                            ? apiKeys.webhookSecret
                            : `whsec_${'•'.repeat(20)}`}
                    </code>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                            style={{
                                padding: '8px 16px',
                                background: 'white',
                                color: '#2B5FA5',
                                border: '1px solid #E2E8F0',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            {showWebhookSecret ? 'Hide' : 'Reveal'}
                        </button>
                        <button
                            onClick={() => copyToClipboard(apiKeys.webhookSecret, 'Webhook secret')}
                            style={{
                                padding: '8px 16px',
                                background: '#2B5FA5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            Copy
                        </button>
                    </div>
                </div>
            </div>

            {/* Code Examples */}
            <div className={styles.card}>
                <h3 className={styles.cardTitle} style={{ marginBottom: '16px' }}>Quick Start</h3>

                <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Initialize BinahPay</div>
                    <pre style={{
                        background: '#1A202C',
                        color: '#E2E8F0',
                        padding: '16px',
                        borderRadius: '8px',
                        overflow: 'auto',
                        fontSize: '13px',
                        fontFamily: 'Monaco, Courier New, monospace'
                    }}>
                        {`import BinahPay from 'binahpay';

const binahpay = new BinahPay('${apiKeys.publicKey}');`}
                    </pre>
                </div>

                <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Server-side (Node.js)</div>
                    <pre style={{
                        background: '#1A202C',
                        color: '#E2E8F0',
                        padding: '16px',
                        borderRadius: '8px',
                        overflow: 'auto',
                        fontSize: '13px',
                        fontFamily: 'Monaco, Courier New, monospace'
                    }}>
                        {`const BinahPay = require('binahpay');
const binahpay = new BinahPay('${apiKeys.secretKey}');

// Create a payment link
const link = await binahpay.paymentLinks.create({
  amount: 1000, // $10.00
  currency: 'USDC',
});`}
                    </pre>
                </div>
            </div>

            {/* Danger Zone */}
            <div className={styles.card} style={{ borderColor: '#FC8181' }}>
                <h3 className={styles.cardTitle} style={{ color: '#E53E3E', marginBottom: '16px' }}>Danger Zone</h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>Roll API Keys</div>
                        <div style={{ fontSize: '14px', color: '#718096' }}>
                            Generate new keys and invalidate the old ones
                        </div>
                    </div>
                    <button
                        style={{
                            padding: '10px 20px',
                            background: '#E53E3E',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                        onClick={() => {
                            if (confirm('Are you sure? This will invalidate your current API keys and may break existing integrations.')) {
                                alert('Key rolling is not implemented in this demo');
                            }
                        }}
                    >
                        Roll Keys
                    </button>
                </div>
            </div>
        </>
    );
}

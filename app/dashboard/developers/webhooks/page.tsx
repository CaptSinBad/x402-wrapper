'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface WebhookSubscription {
    id: string;
    url: string;
    events: string[];
    enabled: boolean;
    created_at: string;
}

import { useAuthToken } from '@/app/hooks/useAuthToken';

export default function WebhooksPage() {
    const router = useRouter();
    const { authFetch } = useAuthToken();
    const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        url: '',
        events: ['checkout.session.completed', 'payment.succeeded'],
    });

    const availableEvents = [
        { value: 'checkout.session.completed', label: 'Checkout Session Completed' },
        { value: 'payment.succeeded', label: 'Payment Succeeded' },
        { value: 'payment.failed', label: 'Payment Failed' },
    ];

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            const response = await authFetch('/api/webhooks/subscriptions');
            const data = await response.json();
            setSubscriptions(data.subscriptions || []);
        } catch (error) {
            console.error('Failed to fetch webhooks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            const response = await authFetch('/api/webhooks/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setFormData({ url: '', events: ['checkout.session.completed', 'payment.succeeded'] });
                fetchSubscriptions();
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to create webhook');
            }
        } catch (error) {
            alert('Failed to create webhook');
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggle = async (id: string, enabled: boolean) => {
        try {
            await authFetch(`/api/webhooks/subscriptions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !enabled }),
            });
            fetchSubscriptions();
        } catch (error) {
            alert('Failed to update webhook');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this webhook?')) return;

        try {
            await authFetch(`/api/webhooks/subscriptions/${id}`, {
                method: 'DELETE',
            });
            fetchSubscriptions();
        } catch (error) {
            alert('Failed to delete webhook');
        }
    };

    if (loading) {
        return <div style={{ padding: '24px' }}>Loading...</div>;
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Webhooks</h1>
                <p style={{ color: '#718096', fontSize: '16px' }}>
                    Configure webhook endpoints to receive real-time payment notifications
                </p>
            </div>

            {/* Create Webhook Form */}
            <div style={{
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px'
            }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
                    Add Webhook Endpoint
                </h2>

                <form onSubmit={handleCreate}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', color: '#2D3748' }}>
                            Endpoint URL
                        </label>
                        <input
                            type="url"
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            placeholder="https://yourdomain.com/webhooks/binahpay"
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '12px', color: '#2D3748' }}>
                            Events to Listen
                        </label>
                        {availableEvents.map(event => (
                            <label key={event.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.events.includes(event.value)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setFormData({ ...formData, events: [...formData.events, event.value] });
                                        } else {
                                            setFormData({ ...formData, events: formData.events.filter(ev => ev !== event.value) });
                                        }
                                    }}
                                />
                                <span style={{ fontSize: '14px' }}>{event.label}</span>
                            </label>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={isCreating || !formData.url}
                        style={{
                            padding: '12px 24px',
                            background: isCreating ? '#CBD5E0' : '#2B5FA5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: isCreating ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isCreating ? 'Creating...' : 'Add Endpoint'}
                    </button>
                </form>
            </div>

            {/* Webhooks List */}
            <div style={{
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #E2E8F0',
                    background: '#F7FAFC'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Active Endpoints</h3>
                </div>

                {subscriptions.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
                        No webhook endpoints configured
                    </div>
                ) : (
                    subscriptions.map((sub) => (
                        <div
                            key={sub.id}
                            style={{
                                padding: '20px 24px',
                                borderBottom: '1px solid #E2E8F0'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: 'monospace', fontSize: '14px', color: '#2D3748', marginBottom: '8px' }}>
                                        {sub.url}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {sub.events.map(event => (
                                            <span
                                                key={event}
                                                style={{
                                                    fontSize: '12px',
                                                    padding: '4px 8px',
                                                    background: '#EDF2F7',
                                                    borderRadius: '4px',
                                                    color: '#4A5568'
                                                }}
                                            >
                                                {event}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: '16px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={sub.enabled}
                                            onChange={() => handleToggle(sub.id, sub.enabled)}
                                        />
                                        <span style={{ fontSize: '14px', color: '#4A5568' }}>Enabled</span>
                                    </label>

                                    <button
                                        onClick={() => handleDelete(sub.id)}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'white',
                                            color: '#E53E3E',
                                            border: '1px solid #E53E3E',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>

                            <div style={{ fontSize: '12px', color: '#A0AEC0' }}>
                                Created {new Date(sub.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Webhook Testing Section */}
            <div style={{
                background: '#F7FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '24px',
                marginTop: '24px'
            }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
                    Testing Webhooks
                </h3>
                <p style={{ color: '#718096', marginBottom: '16px', lineHeight: '1.6' }}>
                    Webhook signatures are generated using HMAC-SHA256. Verify the signature in your endpoint:
                </p>
                <pre style={{
                    background: '#2D3748',
                    color: '#E2E8F0',
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    overflow: 'auto'
                }}>
                    {`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const [t, v1] = signature.split(',');
  const timestamp = t.split('=')[1];
  const expectedSignature = v1.split('=')[1];
  
  const signedPayload = \`\${timestamp}.\${payload}\`;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(signedPayload).digest('hex');
  
  return digest === expectedSignature;
}`}
                </pre>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Webhook, Plus, Trash2, Check, ExternalLink, AlertTriangle } from 'lucide-react';
import { useAuthToken } from '@/app/hooks/useAuthToken';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';

import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';

interface WebhookSubscription {
    id: string;
    url: string;
    events: string[];
    enabled: boolean;
    created_at: string;
}

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
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48 bg-zinc-800" />
                <Skeleton className="h-64 rounded-xl bg-zinc-800" />
                <Skeleton className="h-64 rounded-xl bg-zinc-800" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
                    <Webhook className="h-8 w-8 text-blue-500" /> Webhooks
                </h1>
                <p className="text-zinc-400 mt-1">
                    Configure webhook endpoints to receive real-time payment notifications
                </p>
            </div>

            {/* Create Webhook Form */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-zinc-100">Add Webhook Endpoint</CardTitle>
                    <CardDescription className="text-zinc-400">Add a new URL to receive event notifications</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="url" className="text-zinc-200">Endpoint URL</Label>
                            <Input
                                id="url"
                                type="url"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                placeholder="https://yourdomain.com/webhooks/binahpay"
                                required
                                className="bg-zinc-950 border-zinc-700 text-zinc-100 focus-visible:ring-blue-600"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-zinc-200">Events to Listen</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {availableEvents.map(event => (
                                    <div key={event.value} className="flex items-center space-x-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                                        <input
                                            type="checkbox"
                                            id={event.value}
                                            checked={formData.events.includes(event.value)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFormData({ ...formData, events: [...formData.events, event.value] });
                                                } else {
                                                    setFormData({ ...formData, events: formData.events.filter(ev => ev !== event.value) });
                                                }
                                            }}
                                            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-zinc-900"
                                        />
                                        <Label htmlFor={event.value} className="text-zinc-300 font-normal cursor-pointer text-sm">
                                            {event.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isCreating || !formData.url}
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            {isCreating ? 'Creating...' : 'Add Endpoint'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Webhooks List */}
            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                    <h3 className="text-lg font-semibold text-zinc-100">Active Endpoints</h3>
                </div>

                {subscriptions.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500">
                        No webhook endpoints configured
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800">
                        {subscriptions.map((sub) => (
                            <div key={sub.id} className="p-6 flex flex-col md:flex-row justify-between items-start gap-4 hover:bg-zinc-800/10 transition-colors">
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-3">
                                        <div className="font-mono text-sm text-zinc-200 bg-zinc-950 px-3 py-1 rounded border border-zinc-800 break-all">
                                            {sub.url}
                                        </div>
                                        <Badge variant={sub.enabled ? 'outline' : 'destructive'} className={sub.enabled ? 'text-green-400 border-green-400/30' : ''}>
                                            {sub.enabled ? 'Active' : 'Disabled'}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {sub.events.map(event => (
                                            <span
                                                key={event}
                                                className="text-xs px-2 py-1 bg-zinc-800 rounded text-zinc-400"
                                            >
                                                {event}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="text-xs text-zinc-600">
                                        Created {new Date(sub.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggle(sub.id, sub.enabled)}
                                        className="bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                                    >
                                        {sub.enabled ? 'Disable' : 'Enable'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(sub.id)}
                                        className="text-zinc-500 hover:text-red-400 hover:bg-red-900/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Webhook Testing Section */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-zinc-200 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" /> Signature Verification
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-zinc-400">
                        Webhook signatures are generated using HMAC-SHA256. Verify the signature in your endpoint:
                    </p>
                    <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 overflow-x-auto">
                        <pre className="text-xs font-mono text-zinc-300">
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
                </CardContent>
            </Card>
        </div>
    );
}

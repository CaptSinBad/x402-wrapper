'use client';

import { useState, useEffect } from 'react';
import { useAuthToken } from '@/app/hooks/useAuthToken';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Webhook, Plus, Trash2, Check, Copy, Code } from 'lucide-react';

interface WebhookSubscription {
    id: string;
    url: string;
    events: string[];
    enabled: boolean;
    created_at: string;
}

export default function WebhooksPage() {
    const { authFetch } = useAuthToken();
    const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
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

    const toggleEvent = (eventValue: string) => {
        if (formData.events.includes(eventValue)) {
            setFormData({ ...formData, events: formData.events.filter(ev => ev !== eventValue) });
        } else {
            setFormData({ ...formData, events: [...formData.events, eventValue] });
        }
    };

    const codeSnippet = `const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const [t, v1] = signature.split(',');
  const timestamp = t.split('=')[1];
  const expectedSignature = v1.split('=')[1];
  
  const signedPayload = \`\${timestamp}.\${payload}\`;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(signedPayload).digest('hex');
  
  return digest === expectedSignature;
}`;

    const copyCode = () => {
        navigator.clipboard.writeText(codeSnippet);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    if (loading) {
        return (
            <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Webhooks</h1>
                <p className="text-zinc-400">
                    Configure webhook endpoints to receive real-time payment notifications
                </p>
            </div>

            {/* Create Webhook Form */}
            <Card className="bg-zinc-900 border-zinc-800 mb-6">
                <CardHeader>
                    <CardTitle className="text-xl text-white flex items-center gap-2">
                        <Plus className="w-5 h-5 text-blue-400" />
                        Add Webhook Endpoint
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="webhook-url" className="text-zinc-300">
                                Endpoint URL
                            </Label>
                            <Input
                                id="webhook-url"
                                type="url"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                placeholder="https://yourdomain.com/webhooks/binahpay"
                                required
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-zinc-300">Events to Listen</Label>
                            <div className="space-y-2">
                                {availableEvents.map(event => (
                                    <label
                                        key={event.value}
                                        className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-700/50 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.events.includes(event.value)}
                                            onChange={() => toggleEvent(event.value)}
                                            className="w-4 h-4 accent-blue-500"
                                        />
                                        <span className="text-zinc-200">{event.label}</span>
                                        <code className="ml-auto text-xs text-zinc-500 font-mono">
                                            {event.value}
                                        </code>
                                    </label>
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

            {/* Active Endpoints */}
            <Card className="bg-zinc-900 border-zinc-800 mb-6">
                <CardHeader className="border-b border-zinc-800">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Webhook className="w-5 h-5 text-green-400" />
                        Active Endpoints
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {subscriptions.length === 0 ? (
                        <div className="py-12 text-center">
                            <Webhook className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                            <p className="text-zinc-400">No webhook endpoints configured</p>
                            <p className="text-zinc-500 text-sm mt-1">Add your first endpoint above</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800">
                            {subscriptions.map((sub) => (
                                <div key={sub.id} className="p-4 hover:bg-zinc-800/30 transition-colors">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <code className="text-sm text-zinc-200 font-mono break-all">
                                                {sub.url}
                                            </code>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge
                                                variant={sub.enabled ? 'success' : 'secondary'}
                                                className={sub.enabled ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-zinc-700 text-zinc-400'}
                                            >
                                                {sub.enabled ? 'Active' : 'Disabled'}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggle(sub.id, sub.enabled)}
                                                className="text-zinc-400 hover:text-white"
                                            >
                                                {sub.enabled ? 'Disable' : 'Enable'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(sub.id)}
                                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {sub.events.map(event => (
                                            <Badge
                                                key={event}
                                                variant="outline"
                                                className="border-zinc-700 text-zinc-400 text-xs font-mono"
                                            >
                                                {event}
                                            </Badge>
                                        ))}
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-2">
                                        Created {new Date(sub.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Testing Webhooks */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Code className="w-5 h-5 text-purple-400" />
                        Testing Webhooks
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                        Webhook signatures are generated using HMAC-SHA256. Verify the signature in your endpoint:
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-x-auto text-sm text-zinc-300 font-mono">
                            {codeSnippet}
                        </pre>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={copyCode}
                            className="absolute top-2 right-2 text-zinc-400 hover:text-white"
                        >
                            {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

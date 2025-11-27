'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PaymentLink {
    id: string;
    token: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    network: string;
    imageUrl?: string;
    brandColor: string;
    paymentCount: number;
    totalRevenue: number;
    url: string;
    createdAt: string;
}

export default function PaymentLinksPage() {
    const router = useRouter();
    const [links, setLinks] = useState<PaymentLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    useEffect(() => {
        fetchLinks();
    }, []);

    const fetchLinks = async () => {
        try {
            const response = await fetch('/api/payment-links/list');
            const data = await response.json();
            setLinks(data.links || []);
        } catch (error) {
            console.error('Failed to fetch payment links:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyLink = (url: string, token: string) => {
        navigator.clipboard.writeText(url);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    if (loading) {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                <p style={{ color: '#718096' }}>Loading...</p>
            </div>
        );
    }

    if (links.length === 0) {
        return (
            <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Payment Links</h1>
                        <p style={{ color: '#718096' }}>
                            Create and manage payment links for your customers
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/payment-links/create')}
                        style={{
                            padding: '12px 24px',
                            background: '#2B5FA5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        + Create Payment Link
                    </button>
                </div>

                <div style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                        No payment links yet
                    </h2>
                    <p style={{ color: '#718096', marginBottom: '24px' }}>
                        Create shareable payment links that your customers can use to pay you
                    </p>
                    <button
                        onClick={() => router.push('/dashboard/payment-links/create')}
                        style={{
                            padding: '12px 24px',
                            background: '#2B5FA5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        Create Payment Link
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Payment Links</h1>
                    <p style={{ color: '#718096' }}>
                        {links.length} {links.length === 1 ? 'link' : 'links'} created
                    </p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/payment-links/create')}
                    style={{
                        padding: '12px 24px',
                        background: '#2B5FA5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                    }}
                >
                    + Create Payment Link
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                {links.map((link) => (
                    <div
                        key={link.id}
                        style={{
                            background: 'white',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            transition: 'box-shadow 0.2s',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {link.imageUrl && (
                            <img
                                src={link.imageUrl}
                                alt={link.name}
                                style={{
                                    width: '100%',
                                    height: '180px',
                                    objectFit: 'cover'
                                }}
                            />
                        )}
                        <div style={{ padding: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#2D3748' }}>
                                {link.name}
                            </h3>
                            {link.description && (
                                <p style={{ fontSize: '14px', color: '#718096', marginBottom: '16px', lineHeight: '1.5' }}>
                                    {link.description.length > 80
                                        ? link.description.substring(0, 80) + '...'
                                        : link.description
                                    }
                                </p>
                            )}

                            <div style={{ fontSize: '24px', fontWeight: '700', color: link.brandColor, marginBottom: '16px' }}>
                                {link.price.toFixed(2)} {link.currency}
                            </div>

                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '14px' }}>
                                <div>
                                    <div style={{ color: '#A0AEC0', fontSize: '12px', marginBottom: '4px' }}>Payments</div>
                                    <div style={{ fontWeight: '600', color: '#2D3748' }}>{link.paymentCount}</div>
                                </div>
                                <div>
                                    <div style={{ color: '#A0AEC0', fontSize: '12px', marginBottom: '4px' }}>Revenue</div>
                                    <div style={{ fontWeight: '600', color: '#2D3748' }}>
                                        {link.totalRevenue.toFixed(2)} {link.currency}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => copyLink(link.url, link.token)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: copiedToken === link.token ? '#48BB78' : '#EDF2F7',
                                    color: copiedToken === link.token ? 'white' : '#2D3748',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {copiedToken === link.token ? '✓ Copied!' : '🔗 Copy Link'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

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

import { useAuthToken } from '@/app/hooks/useAuthToken';

export default function PaymentLinksPage() {
    const router = useRouter();
    const { authFetch } = useAuthToken();
    const [links, setLinks] = useState<PaymentLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchLinks();
    }, []);

    const fetchLinks = async () => {
        try {
            const response = await authFetch('/api/payment-links/list');
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

    const handleDelete = async (id: string) => {
        setDeleting(id);
        try {
            const response = await authFetch(`/api/payment-links/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                // Remove from list
                setLinks(links.filter(link => link.id !== id));
                setDeleteConfirm(null);
            } else {
                alert('Failed to delete payment link');
            }
        } catch (error) {
            console.error('Failed to delete:', error);
            alert('Failed to delete payment link');
        } finally {
            setDeleting(null);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                <p style={{ color: '#4B5563' }}>Loading...</p>
            </div>
        );
    }

    if (links.length === 0) {
        return (
            <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Payment Links</h1>
                        <p style={{ color: '#4B5563' }}>
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
                    <p style={{ color: '#4B5563', marginBottom: '24px' }}>
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
                    <p style={{ color: '#4B5563' }}>
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
                                <p style={{ fontSize: '14px', color: '#4B5563', marginBottom: '16px', lineHeight: '1.5' }}>
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
                                    transition: 'all 0.2s',
                                    marginBottom: '8px'
                                }}
                            >
                                {copiedToken === link.token ? '✓ Copied!' : '🔗 Copy Link'}
                            </button>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => router.push(`/link/${link.token}`)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: 'white',
                                        color: '#2B5FA5',
                                        border: '1px solid #2B5FA5',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    View
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm(link.id)}
                                    disabled={deleting === link.id}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: deleting === link.id ? '#CBD5E0' : 'white',
                                        color: '#E53E3E',
                                        border: '1px solid #E53E3E',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        cursor: deleting === link.id ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {deleting === link.id ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '32px',
                        maxWidth: '400px',
                        width: '90%'
                    }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>
                            Delete Payment Link?
                        </h2>
                        <p style={{ color: '#4B5563', marginBottom: '24px', lineHeight: '1.6' }}>
                            This action cannot be undone. The payment link will be permanently deleted.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#EDF2F7',
                                    color: '#2D3748',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={deleting === deleteConfirm}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#E53E3E',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: deleting === deleteConfirm ? 'not-allowed' : 'pointer',
                                    opacity: deleting === deleteConfirm ? 0.6 : 1
                                }}
                            >
                                {deleting === deleteConfirm ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

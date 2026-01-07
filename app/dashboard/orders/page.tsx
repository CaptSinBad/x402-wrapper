'use client';

import { useState, useEffect } from 'react';

interface Order {
    id: string;
    session_id: string;
    customer_email: string;
    customer_wallet: string;
    line_items: any[];
    total_cents: number;
    currency: string;
    status: string;
    created_at: string;
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            // TODO: Create this API endpoint
            // const response = await fetch('/api/orders/list');
            // const data = await response.json();
            // setOrders(data.orders || []);

            // For now, show empty state
            setOrders([]);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                <p style={{ color: '#4B5563' }}>Loading orders...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Orders</h1>
                <p style={{ color: '#4B5563' }}>
                    {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                </p>
            </div>

            {orders.length === 0 ? (
                <div style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                        No orders yet
                    </h2>
                    <p style={{ color: '#4B5563' }}>
                        Orders from your store will appear here
                    </p>
                </div>
            ) : (
                <div style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    overflow: 'hidden'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#F7FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' }}>Order</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' }}>Customer</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' }}>Items</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' }}>Total</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: '500' }}>#{order.session_id.substring(0, 8)}</div>
                                        <div style={{ fontSize: '13px', color: '#4B5563' }}>
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontSize: '14px' }}>
                                            {order.customer_email || 'Guest'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#4B5563', fontFamily: 'monospace' }}>
                                            {order.customer_wallet ? `${order.customer_wallet.substring(0, 6)}...${order.customer_wallet.substring(38)}` : '—'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {order.line_items.length} {order.line_items.length === 1 ? 'item' : 'items'}
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: '600' }}>
                                        ${(order.total_cents / 100).toFixed(2)} {order.currency}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            background: order.status === 'shipped' ? '#C6F6D5' : order.status === 'delivered' ? '#B2F5EA' : '#FED7D7',
                                            color: order.status === 'shipped' ? '#22543D' : order.status === 'delivered' ? '#234E52' : '#742A2A'
                                        }}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <button
                                            style={{
                                                padding: '6px 12px',
                                                background: '#F7FAFC',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

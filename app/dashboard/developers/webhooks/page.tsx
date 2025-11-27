'use client';

export default function WebhooksPage() {
    return (
        <div style={{ padding: '24px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Webhooks</h1>
            <p style={{ color: '#718096', marginBottom: '32px' }}>
                Configure webhooks to receive real-time payment notifications
            </p>

            <div style={{
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '48px',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🪝</div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                    Webhooks Coming Soon
                </h2>
                <p style={{ color: '#718096', marginBottom: '24px' }}>
                    Webhook functionality is currently in development. You'll be able to configure endpoints to receive payment events soon.
                </p>
            </div>
        </div>
    );
}

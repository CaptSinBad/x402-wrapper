'use client';

export default function LogsPage() {
    return (
        <div style={{ padding: '24px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Logs</h1>
            <p style={{ color: '#4B5563', marginBottom: '32px' }}>
                View API request logs and debugging information
            </p>

            <div style={{
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '48px',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                    No logs yet
                </h2>
                <p style={{ color: '#4B5563', marginBottom: '24px' }}>
                    API request logs will appear here once you start making API calls
                </p>
            </div>
        </div>
    );
}

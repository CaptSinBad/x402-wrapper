interface HeaderProps {
    cartItemCount: number;
    onCartClick: () => void;
}

export default function Header({ cartItemCount, onCartClick }: HeaderProps) {
    return (
        <header style={{
            background: 'linear-gradient(135deg, #C41E3A 0%, #8B1538 100%)',
            padding: '20px 40px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        }}>
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '32px' }}>🎄</span>
                    <h1 style={{
                        fontSize: '24px',
                        fontWeight: '800',
                        color: 'white',
                        margin: 0,
                    }}>
                        ROLA ACCESSORIES
                    </h1>
                </div>

                <button
                    onClick={onCartClick}
                    style={{
                        background: 'white',
                        color: '#C41E3A',
                        padding: '12px 24px',
                        borderRadius: '30px',
                        border: 'none',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        position: 'relative',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <span style={{ fontSize: '20px' }}>🛒</span>
                    Cart
                    {cartItemCount > 0 && (
                        <span className="cart-badge">
                            {cartItemCount}
                        </span>
                    )}
                </button>
            </div>
        </header>
    );
}

import type { Product } from '../../lib/products';

interface ProductCardProps {
    product: Product;
    onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
    return (
        <div className="product-card" style={{
            background: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        }}>
            {/* Product Image */}
            <div style={{
                width: '100%',
                height: '220px',
                background: `linear-gradient(135deg, ${product.category === 'shoes' ? '#FFD700' : '#0F5132'
                    } 0%, ${product.category === 'shoes' ? '#FFA500' : '#2D5016'} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '80px',
            }}>
                {product.category === 'shoes' ? '👞' : '👔'}
            </div>

            {/* Product Info */}
            <div style={{ padding: '20px' }}>
                <h3 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    color: '#2C2C2C',
                }}>
                    {product.name}
                </h3>

                <p style={{
                    fontSize: '13px',
                    color: '#718096',
                    marginBottom: '16px',
                    minHeight: '40px',
                }}>
                    {product.description}
                </p>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span style={{
                        fontSize: '24px',
                        fontWeight: '800',
                        color: '#C41E3A',
                    }}>
                        ${product.price.toFixed(2)}
                    </span>

                    <button
                        onClick={() => onAddToCart(product)}
                        className="btn-primary"
                        style={{ padding: '10px 20px', fontSize: '14px' }}
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
}

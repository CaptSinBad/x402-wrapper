'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../../components/dashboard.module.css';

export default function CreatePaymentLinkPage() {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [successModal, setSuccessModal] = useState<{ url: string; token: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        currency: 'USDC',
        network: 'base-sepolia',
        imageFile: null as File | null,
        brandColor: '#2B5FA5',
        successUrl: '',
        cancelUrl: '',
        collectEmail: true,
        collectName: true,
        expiresAt: '',
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, imageFile: file });
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleCreate = async () => {
        if (!formData.name || !formData.price) {
            alert('Please fill in product name and price');
            return;
        }

        setIsCreating(true);
        try {
            // Create FormData for file upload
            const data = new FormData();
            data.append('name', formData.name);
            data.append('description', formData.description);
            data.append('price', formData.price);
            data.append('currency', formData.currency);
            data.append('network', formData.network);
            data.append('brandColor', formData.brandColor);
            data.append('successUrl', formData.successUrl);
            data.append('cancelUrl', formData.cancelUrl);
            data.append('collectEmail', formData.collectEmail.toString());
            data.append('collectName', formData.collectName.toString());
            if (formData.expiresAt) {
                data.append('expiresAt', formData.expiresAt);
            }
            if (formData.imageFile) {
                data.append('image', formData.imageFile);
            }

            const response = await fetch('/api/payment-links/create', {
                method: 'POST',
                body: data,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create payment link');
            }

            // Show success modal
            setSuccessModal({
                url: result.url,
                token: result.token
            });
        } catch (error: any) {
            console.error('Error creating payment link:', error);
            alert(error.message || 'Failed to create payment link');
        } finally {
            setIsCreating(false);
        }
    };

    const copyToClipboard = () => {
        if (successModal) {
            navigator.clipboard.writeText(successModal.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#2B5FA5',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginBottom: '16px'
                    }}
                >
                    ← Back to Payment Links
                </button>
                <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                    Create Payment Link
                </h1>
                <p style={{ color: '#718096', fontSize: '16px' }}>
                    Create a beautiful payment page for your product
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                {/* Form Column */}
                <div style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '32px'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>
                        Product Details
                    </h2>

                    {/* Image Upload */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', color: '#2D3748' }}>
                            Product Image
                        </label>
                        <div style={{
                            border: '2px dashed #CBD5E0',
                            borderRadius: '12px',
                            padding: '32px',
                            textAlign: 'center',
                            background: imagePreview ? 'transparent' : '#F7FAFC',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer'
                        }}
                            onClick={() => document.getElementById('imageInput')?.click()}
                        >
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" style={{
                                    maxWidth: '100%',
                                    maxHeight: '200px',
                                    borderRadius: '8px'
                                }} />
                            ) : (
                                <>
                                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>📸</div>
                                    <p style={{ color: '#718096', marginBottom: '4px' }}>Click to upload product image</p>
                                    <p style={{ color: '#A0AEC0', fontSize: '14px' }}>PNG, JPG up to 5MB</p>
                                </>
                            )}
                            <input
                                id="imageInput"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    {/* Product Name */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', color: '#2D3748' }}>
                            Product Name *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="My Product"
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    {/* Description */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', color: '#2D3748' }}>
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Describe your product..."
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    {/* Price & Currency */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', color: '#2D3748' }}>
                                Price *
                            </label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="0.00"
                                step="0.01"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', color: '#2D3748' }}>
                                Currency
                            </label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                            >
                                <option value="USDC">USDC</option>
                                <option value="USDT">USDT</option>
                            </select>
                        </div>
                    </div>

                    {/* Network */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', color: '#2D3748' }}>
                            Network
                        </label>
                        <select
                            name="network"
                            value={formData.network}
                            onChange={handleChange}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                fontSize: '14px'
                            }}
                        >
                            <option value="base-sepolia">Base Sepolia (Testnet)</option>
                            <option value="base">Base</option>
                            <option value="ethereum">Ethereum</option>
                        </select>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '32px 0' }} />

                    <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                        Customization
                    </h2>

                    {/* Brand Color */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', color: '#2D3748' }}>
                            Brand Color
                        </label>
                        <input
                            type="color"
                            name="brandColor"
                            value={formData.brandColor}
                            onChange={handleChange}
                            style={{
                                width: '100%',
                                height: '48px',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        />
                    </div>

                    {/* Customer Info Collection */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.collectEmail}
                                onChange={(e) => setFormData({ ...formData, collectEmail: e.target.checked })}
                            />
                            <span style={{ fontSize: '14px', color: '#2D3748' }}>Collect customer email</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.collectName}
                                onChange={(e) => setFormData({ ...formData, collectName: e.target.checked })}
                            />
                            <span style={{ fontSize: '14px', color: '#2D3748' }}>Collect customer name</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                        <button
                            onClick={() => router.back()}
                            style={{
                                flex: 1,
                                padding: '14px 24px',
                                background: 'white',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                color: '#2D3748'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={isCreating || !formData.name || !formData.price}
                            style={{
                                flex: 1,
                                padding: '14px 24px',
                                background: formData.brandColor,
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: isCreating ? 'not-allowed' : 'pointer',
                                opacity: (isCreating || !formData.name || !formData.price) ? 0.5 : 1
                            }}
                        >
                            {isCreating ? 'Creating...' : 'Create Payment Link'}
                        </button>
                    </div>
                </div>

                {/* Live Preview Column */}
                <div>
                    <div style={{
                        position: 'sticky',
                        top: '24px',
                        background: '#F7FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '16px',
                        padding: '32px'
                    }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#718096', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Live Preview
                        </h3>

                        {/* Preview Card */}
                        <div style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '32px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            {imagePreview && (
                                <img
                                    src={imagePreview}
                                    alt="Product"
                                    style={{
                                        width: '100%',
                                        height: '200px',
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        marginBottom: '24px'
                                    }}
                                />
                            )}

                            <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '12px', color: '#2D3748' }}>
                                {formData.name || 'Product Name'}
                            </h2>

                            {formData.description && (
                                <p style={{ fontSize: '16px', color: '#718096', marginBottom: '24px', lineHeight: '1.6' }}>
                                    {formData.description}
                                </p>
                            )}

                            <div style={{
                                fontSize: '48px',
                                fontWeight: '700',
                                color: formData.brandColor,
                                marginBottom: '32px'
                            }}>
                                {formData.price ? `${formData.price} ${formData.currency}` : '0.00 USDC'}
                            </div>

                            <button style={{
                                width: '100%',
                                padding: '16px',
                                background: formData.brandColor,
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                marginBottom: '16px'
                            }}>
                                Pay with Wallet
                            </button>

                            <div style={{ textAlign: 'center', fontSize: '12px', color: '#A0AEC0' }}>
                                Secured by x402 • Powered by BinahPay
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {successModal && (
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
                        borderRadius: '16px',
                        padding: '40px',
                        maxWidth: '500px',
                        width: '90%',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
                        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>
                            Payment Link Created!
                        </h2>
                        <p style={{ color: '#718096', marginBottom: '24px' }}>
                            Your payment link is ready to share with customers
                        </p>

                        <div style={{
                            background: '#F7FAFC',
                            padding: '16px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            border: '1px solid #E2E8F0'
                        }}>
                            <div style={{
                                fontSize: '12px',
                                color: '#718096',
                                marginBottom: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Payment Link
                            </div>
                            <div style={{
                                fontSize: '14px',
                                fontFamily: 'monospace',
                                color: '#2D3748',
                                wordBreak: 'break-all'
                            }}>
                                {successModal.url}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            <button
                                onClick={copyToClipboard}
                                style={{
                                    flex: 1,
                                    padding: '14px 24px',
                                    background: copied ? '#48BB78' : '#2B5FA5',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                {copied ? '✓ Copied!' : '📋 Copy Link'}
                            </button>
                            <button
                                onClick={() => window.open(`/link/${successModal.token}`, '_blank')}
                                style={{
                                    flex: 1,
                                    padding: '14px 24px',
                                    background: 'white',
                                    color: '#2B5FA5',
                                    border: '1px solid #2B5FA5',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                👁️ View Link
                            </button>
                        </div>

                        <button
                            onClick={() => router.push('/dashboard/payment-links')}
                            style={{
                                width: '100%',
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
                            Back to Payment Links
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

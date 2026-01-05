'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, Smartphone, Loader2, ArrowRight } from 'lucide-react';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils'; // Assuming this utility exists now

interface CreateLinkDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateLinkDrawer({ isOpen, onClose }: CreateLinkDrawerProps) {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        productName: '',
        price: '',
        collectAddress: false,
    });

    // Success State
    const [createdLink, setCreatedLink] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [copied, setCopied] = useState(false);

    // Reset state when drawer closes
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setStep('form');
                setFormData({ productName: '', price: '', collectAddress: false });
                setCreatedLink('');
                setQrCodeUrl('');
            }, 300); // Wait for animation
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Mock API call for visual flow demo
            // In real app: POST /api/payment-links/create
            await new Promise(resolve => setTimeout(resolve, 1500));

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
            const mockLink = `${baseUrl}/link/${Math.random().toString(36).substr(2, 9)}`;
            setCreatedLink(mockLink);

            // Generate QR
            const qrData = await QRCode.toDataURL(mockLink, {
                color: { dark: '#000000', light: '#ffffff' },
                width: 256,
                margin: 2
            });
            setQrCodeUrl(qrData);

            setStep('success');
        } catch (error) {
            console.error('Failed to create link', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(createdLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null; // Or handle visibility with CSS for exit animations

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    "fixed inset-y-0 right-0 w-full max-w-[450px] bg-[#0A0A0A] border-l border-zinc-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <h2 className="text-lg font-medium text-white">
                        {step === 'form' ? 'Create Payment Link' : 'Link Created!'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-500 hover:text-white rounded-md hover:bg-zinc-900 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'form' ? (
                        <div className="h-full flex flex-col gap-8">
                            {/* Form Section */}
                            <form id="create-link-form" onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            id="productName"
                                            required
                                            value={formData.productName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                                            className="peer w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 pt-6 pb-2 text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                            placeholder="Product Name"
                                        />
                                        <label
                                            htmlFor="productName"
                                            className="absolute left-4 top-2 text-xs text-zinc-500 font-medium transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:text-zinc-400 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary"
                                        >
                                            Product Name
                                        </label>
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="number"
                                            id="price"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                            className="peer w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 pt-6 pb-2 text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                            placeholder="Price (USDC)"
                                        />
                                        <label
                                            htmlFor="price"
                                            className="absolute left-4 top-2 text-xs text-zinc-500 font-medium transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:text-zinc-400 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary"
                                        >
                                            Price (USDC)
                                        </label>
                                        <div className="absolute right-4 top-4 text-zinc-500 text-sm font-mono">USDC</div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                                        <span className="text-sm font-medium text-zinc-300">Collect Customer Address</span>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, collectAddress: !prev.collectAddress }))}
                                            className={cn(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ring-offset-zinc-900",
                                                formData.collectAddress ? "bg-primary" : "bg-zinc-700"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                    formData.collectAddress ? "translate-x-6" : "translate-x-1"
                                                )}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </form>

                            {/* Live Preview (Phone) */}
                            <div className="mt-auto pt-8 border-t border-zinc-800">
                                <div className="flex items-center gap-2 mb-4">
                                    <Smartphone className="w-4 h-4 text-zinc-500" />
                                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Live Preview</span>
                                </div>

                                <div className="mx-auto w-[280px] h-[480px] bg-black border-[8px] border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                                    {/* Phone Notch */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-zinc-800 rounded-b-xl z-20" />

                                    {/* Phone Content Screen */}
                                    <div className="h-full w-full bg-white flex flex-col">
                                        {/* Header */}
                                        <div className="h-14 bg-gray-50 border-b flex items-center justify-center pt-4">
                                            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">BP</div>
                                        </div>

                                        {/* Product Info */}
                                        <div className="p-6 flex flex-col items-center text-center mt-4">
                                            <div className="w-16 h-16 bg-gray-100 rounded-xl mb-4 flex items-center justify-center text-2xl">📦</div>
                                            <h3 className="font-bold text-gray-900 text-lg mb-1">
                                                {formData.productName || 'Product Name'}
                                            </h3>
                                            <p className="text-gray-500 text-sm mb-6">BinahPay Merchant</p>

                                            <div className="text-3xl font-extrabold text-gray-900 mb-8">
                                                ${formData.price || '0.00'} <span className="text-lg text-gray-400 font-normal">USDC</span>
                                            </div>

                                            <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm shadow-lg mb-3">
                                                Pay with Crypto
                                            </button>

                                            <div className="w-full flex items-center justify-center gap-2 text-xs text-gray-400">
                                                <span>Secured by</span>
                                                <span className="font-bold text-gray-600">x402</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    ) : (
                        // Success State
                        <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-6">
                                <Check className="w-8 h-8 text-success" />
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-2">Link Ready!</h3>
                            <p className="text-zinc-400 mb-8 max-w-[280px]">
                                Your payment link for <span className="text-white font-medium">{formData.productName}</span> has been created.
                            </p>

                            <div className="p-4 bg-white rounded-xl mb-8">
                                {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />}
                            </div>

                            <div className="w-full relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-zinc-500 text-sm">URL</span>
                                </div>
                                <input
                                    readOnly
                                    value={createdLink}
                                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg pl-10 pr-12 py-3 focus:outline-none focus:border-primary"
                                />
                                <button
                                    onClick={handleCopy}
                                    className="absolute right-2 top-2 p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-400 hover:text-white transition-all active:scale-95"
                                >
                                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>

                            <div className="mt-auto w-full pt-8">
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-all active:scale-95 duration-200"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer (Form Actions) */}
                {step === 'form' && (
                    <div className="p-6 border-t border-zinc-800 bg-[#0A0A0A]">
                        <button
                            type="submit"
                            form="create-link-form" // Link to form ID
                            disabled={loading || !formData.productName || !formData.price}
                            className="w-full h-12 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all active:scale-95 duration-200"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Create Link <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

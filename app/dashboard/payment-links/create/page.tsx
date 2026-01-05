'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Upload, Loader2, Check, Copy, ExternalLink, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAuthToken } from '@/app/hooks/useAuthToken';

export default function CreatePaymentLinkPage() {
    const router = useRouter();
    const { authFetch } = useAuthToken();
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

            const response = await authFetch('/api/payment-links/create', {
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
        <div className="max-w-[1400px] mx-auto p-6">
            <div className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1 text-sm font-medium text-zinc-400 hover:text-white mb-4 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Payment Links
                </button>
                <h1 className="text-2xl font-bold text-white mb-2">
                    Create Payment Link
                </h1>
                <p className="text-zinc-400">
                    Create a beautiful payment page for your product
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form Column */}
                <div className="bg-[#111111] border border-zinc-800 rounded-xl p-8">
                    <h2 className="text-lg font-medium text-white mb-6">
                        Product Details
                    </h2>

                    {/* Image Upload */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Product Image
                        </label>
                        <div
                            className={cn(
                                "border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center transition-colors cursor-pointer",
                                imagePreview ? "bg-transparent border-zinc-600" : "bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-500"
                            )}
                            onClick={() => document.getElementById('imageInput')?.click()}
                        >
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="max-w-full max-h-[200px] mx-auto rounded-lg object-contain" />
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="w-8 h-8 text-zinc-500" />
                                    <p className="text-sm text-zinc-400">Click to upload product image</p>
                                    <p className="text-xs text-zinc-600">PNG, JPG up to 5MB</p>
                                </div>
                            )}
                            <input
                                id="imageInput"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Product Name */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Product Name *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="My Product"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>

                    {/* Description */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Describe your product..."
                            rows={3}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>

                    {/* Price & Currency */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Price *
                            </label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="0.00"
                                step="0.01"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Currency
                            </label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            >
                                <option value="USDC">USDC</option>
                                <option value="USDT">USDT</option>
                            </select>
                        </div>
                    </div>

                    {/* Network */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Network
                        </label>
                        <select
                            name="network"
                            value={formData.network}
                            onChange={handleChange}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        >
                            <option value="base-sepolia">Base Sepolia (Testnet)</option>
                            <option value="base">Base</option>
                            <option value="ethereum">Ethereum</option>
                        </select>
                    </div>

                    <div className="h-px bg-zinc-800 my-8" />

                    <h2 className="text-lg font-medium text-white mb-6">
                        Customization
                    </h2>

                    {/* Brand Color */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Brand Color
                        </label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="color"
                                name="brandColor"
                                value={formData.brandColor}
                                onChange={handleChange}
                                className="h-10 w-20 bg-transparent border border-zinc-800 rounded cursor-pointer"
                            />
                            <span className="text-zinc-500 text-sm font-mono">{formData.brandColor}</span>
                        </div>
                    </div>

                    {/* Customer Info Collection */}
                    <div className="space-y-3 mb-5">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.collectEmail}
                                onChange={(e) => setFormData({ ...formData, collectEmail: e.target.checked })}
                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary/50"
                            />
                            <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Collect customer email</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.collectName}
                                onChange={(e) => setFormData({ ...formData, collectName: e.target.checked })}
                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary/50"
                            />
                            <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Collect customer name</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={() => router.back()}
                            className="flex-1 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={isCreating || !formData.name || !formData.price}
                            className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isCreating ? 'Creating...' : 'Create Payment Link'}
                        </button>
                    </div>
                </div>

                {/* Live Preview Column */}
                <div>
                    <div className="sticky top-6 bg-zinc-900/30 border border-zinc-800 rounded-xl p-8 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <Smartphone className="w-4 h-4 text-zinc-400" />
                            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                Live Preview
                            </h3>
                        </div>

                        {/* Preview Card */}
                        <div className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-sm mx-auto">
                            {imagePreview && (
                                <div className="w-full h-48 overflow-hidden bg-gray-100">
                                    <img
                                        src={imagePreview}
                                        alt="Product"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            <div className="p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-2">
                                    {formData.name || 'Product Name'}
                                </h2>

                                {formData.description && (
                                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                        {formData.description}
                                    </p>
                                )}

                                <div className="text-3xl font-bold mb-6" style={{ color: formData.brandColor }}>
                                    {formData.price ? `${formData.price} ${formData.currency}` : '0.00 USDC'}
                                </div>

                                <button
                                    className="w-full py-3 text-white rounded-lg text-base font-semibold shadow-md mb-4 transition-transform active:scale-[0.98]"
                                    style={{ background: formData.brandColor }}
                                >
                                    Pay with Wallet
                                </button>

                                <div className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                                    Secured by <span className="font-bold text-gray-500">x402</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {successModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#111111] border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-8 h-8 text-green-500" />
                        </div>

                        <h2 className="text-xl font-bold text-white mb-2">
                            Payment Link Created!
                        </h2>
                        <p className="text-zinc-400 mb-8">
                            Your payment link is ready to share with customers
                        </p>

                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-6 text-left">
                            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                                Payment Link
                            </div>
                            <div className="font-mono text-sm text-zinc-300 break-all select-all">
                                {successModal.url}
                            </div>
                        </div>

                        <div className="flex gap-3 mb-4">
                            <button
                                onClick={copyToClipboard}
                                className={cn(
                                    "flex-1 px-4 py-3 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                                    copied ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"
                                )}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied!' : 'Copy Link'}
                            </button>
                            <button
                                onClick={() => window.open(`/link/${successModal.token}`, '_blank')}
                                className="flex-1 px-4 py-3 bg-white text-black hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <ExternalLink className="w-4 h-4" />
                                View Link
                            </button>
                        </div>

                        <button
                            onClick={() => router.push('/dashboard/payment-links')}
                            className="w-full py-3 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
                        >
                            Back to Payment Links
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

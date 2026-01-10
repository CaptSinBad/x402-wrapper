'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Smartphone, Loader2, ArrowRight } from 'lucide-react';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/app/components/ui/sheet';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

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
            }, 300);
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

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full sm:max-w-[450px] p-0 flex flex-col bg-zinc-950 border-l border-zinc-800">
                <SheetHeader className="px-6 py-4 border-b border-zinc-800 text-left">
                    <SheetTitle className="text-zinc-100">
                        {step === 'form' ? 'Create Payment Link' : 'Link Created!'}
                    </SheetTitle>
                    {step === 'form' && <SheetDescription className='text-zinc-500'>Create a shareable payment link for your product.</SheetDescription>}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {step === 'form' ? (
                        <div className="flex flex-col gap-8 h-full">
                            <form id="create-link-form" onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="productName" className="text-zinc-400">Product Name</Label>
                                        <Input
                                            id="productName"
                                            required
                                            value={formData.productName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                                            className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-600"
                                            placeholder="e.g. Premium Plan"
                                        />
                                    </div>

                                    <div className="space-y-2 relative">
                                        <Label htmlFor="price" className="text-zinc-400">Price</Label>
                                        <div className="relative">
                                            <Input
                                                id="price"
                                                type="number"
                                                required
                                                min="0"
                                                step="0.01"
                                                value={formData.price}
                                                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                                className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-600 pr-16"
                                                placeholder="0.00"
                                            />
                                            <div className="absolute right-3 top-2.5 text-zinc-500 text-sm font-mono">USDC</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                                        <Label htmlFor="collectAddress" className="cursor-pointer text-zinc-300">Collect Address</Label>
                                        <button
                                            type="button"
                                            id="collectAddress"
                                            onClick={() => setFormData(prev => ({ ...prev, collectAddress: !prev.collectAddress }))}
                                            className={cn(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ring-offset-zinc-950",
                                                formData.collectAddress ? "bg-blue-600" : "bg-zinc-700"
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

                                <div className="mx-auto w-[240px] h-[400px] bg-black border-[6px] border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden relative">
                                    {/* Phone Notch */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-24 bg-zinc-800 rounded-b-lg z-20" />

                                    {/* Phone Content Screen */}
                                    <div className="h-full w-full bg-white flex flex-col items-center pt-8 p-4">
                                        <div className="w-12 h-12 bg-zinc-100 rounded-xl mb-3 flex items-center justify-center text-xl">📦</div>
                                        <h3 className="font-bold text-zinc-900 text-sm mb-0.5 max-w-full truncate px-2">
                                            {formData.productName || 'Product Name'}
                                        </h3>
                                        <p className="text-zinc-500 text-[10px] mb-4">BinahPay Merchant</p>

                                        <div className="text-2xl font-extrabold text-zinc-900 mb-6">
                                            ${formData.price || '0.00'} <span className="text-sm text-zinc-400 font-normal">USDC</span>
                                        </div>

                                        <div className="w-full py-2 bg-blue-600 text-white rounded-md font-semibold text-xs text-center shadow-sm mb-2">
                                            Pay with Crypto
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Success State
                        <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                                <Check className="w-8 h-8 text-green-500" />
                            </div>

                            <h3 className="text-2xl font-bold text-zinc-100 mb-2">Link Ready!</h3>
                            <p className="text-zinc-400 mb-8 max-w-[280px] text-balance">
                                Your payment link for <span className="text-zinc-100 font-medium">{formData.productName}</span> has been created.
                            </p>

                            <div className="p-4 bg-white rounded-xl mb-8">
                                {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />}
                            </div>

                            <div className="w-full relative group space-y-2">
                                <Label className="sr-only">Copy Link</Label>
                                <div className="relative">
                                    <Input
                                        readOnly
                                        value={createdLink}
                                        className="bg-zinc-900 border-zinc-800 text-zinc-300 pr-12 focus-visible:ring-blue-600"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={handleCopy}
                                        className="absolute right-1 top-1 h-7 w-7 text-zinc-400 hover:text-white"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-auto w-full pt-8">
                                <Button
                                    variant="outline"
                                    className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                                    onClick={onClose}
                                >
                                    Done
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {step === 'form' && (
                    <SheetFooter className="p-6 border-t border-zinc-800 bg-zinc-950 sm:justify-center">
                        <Button
                            type="submit"
                            form="create-link-form"
                            disabled={loading || !formData.productName || !formData.price}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                            size="lg"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Create Link <ArrowRight className="ml-2 w-4 h-4" />
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
}

import Link from 'next/link';
import { FilePlus, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
    onAction?: () => void;
}

export function EmptyState({ onAction }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                <FilePlus className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No payments yet</h3>
            <p className="text-zinc-500 max-w-sm mb-8">
                Create your first payment link to start accepting crypto payments securely.
            </p>
            <button
                onClick={onAction}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-all active:scale-95 duration-200"
            >
                Create Payment Link
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
}

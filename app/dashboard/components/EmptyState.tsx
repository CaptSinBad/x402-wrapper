import Link from 'next/link';
import { FilePlus, ArrowRight, FlaskConical } from 'lucide-react';

interface EmptyStateProps {
    onAction?: () => void;
    onSimulate?: () => void;
}

export function EmptyState({ onAction, onSimulate }: EmptyStateProps) {
    return (
        <div className="relative flex flex-col items-center justify-center py-24 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 overflow-hidden group">
            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="relative w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/10 shadow-xl">
                <FilePlus className="w-8 h-8 text-zinc-400 group-hover:text-primary transition-colors duration-500" />
            </div>

            <h3 className="relative text-xl font-semibold text-white mb-2 tracking-tight">No payments yet</h3>
            <p className="relative text-zinc-500 max-w-sm mb-8 leading-relaxed">
                Your dashboard looks a bit empty. Create your first payment link to start accepting crypto, or run a test transaction.
            </p>

            <div className="relative flex items-center gap-3">
                <button
                    onClick={onAction}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-all active:scale-95 duration-200 shadow-[0_0_20px_-5px_rgba(0,82,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(0,82,255,0.5)]"
                >
                    Create Payment Link
                    <ArrowRight className="w-4 h-4" />
                </button>

                {/* Secondary Action */}
                <button
                    onClick={onSimulate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-600 rounded-lg font-medium transition-all active:scale-95 duration-200"
                >
                    <FlaskConical className="w-4 h-4" />
                    Simulate
                </button>
            </div>
        </div>
    );
}

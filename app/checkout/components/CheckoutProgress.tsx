'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface CheckoutProgressProps {
    currentStep: 1 | 2 | 3;
    className?: string;
}

const steps = [
    { id: 1, name: 'Review Order' },
    { id: 2, name: 'Payment' },
    { id: 3, name: 'Complete' },
];

export function CheckoutProgress({ currentStep, className }: CheckoutProgressProps) {
    return (
        <div className={cn("w-full", className)}>
            <nav aria-label="Progress">
                <ol className="flex items-center justify-center gap-2 sm:gap-4">
                    {steps.map((step, stepIdx) => (
                        <li key={step.name} className="flex items-center">
                            {step.id < currentStep ? (
                                // Completed step
                                <div className="flex items-center">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 transition-all duration-300">
                                        <Check className="h-4 w-4 text-white" />
                                    </span>
                                    <span className="ml-2 text-sm font-medium text-emerald-400 hidden sm:block">
                                        {step.name}
                                    </span>
                                </div>
                            ) : step.id === currentStep ? (
                                // Current step
                                <div className="flex items-center">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-violet-500 bg-violet-500/20 transition-all duration-300">
                                        <span className="text-sm font-bold text-violet-400">{step.id}</span>
                                    </span>
                                    <span className="ml-2 text-sm font-semibold text-white hidden sm:block">
                                        {step.name}
                                    </span>
                                </div>
                            ) : (
                                // Upcoming step
                                <div className="flex items-center">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-800/50 transition-all duration-300">
                                        <span className="text-sm font-medium text-zinc-500">{step.id}</span>
                                    </span>
                                    <span className="ml-2 text-sm font-medium text-zinc-500 hidden sm:block">
                                        {step.name}
                                    </span>
                                </div>
                            )}

                            {/* Connector line */}
                            {stepIdx < steps.length - 1 && (
                                <div
                                    className={cn(
                                        "ml-2 sm:ml-4 h-0.5 w-8 sm:w-16 transition-all duration-500",
                                        step.id < currentStep ? "bg-emerald-500" : "bg-zinc-700"
                                    )}
                                />
                            )}
                        </li>
                    ))}
                </ol>
            </nav>
        </div>
    );
}

'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-zinc-800 border border-zinc-700 rounded-xl p-8">
                        <div className="text-center mb-6">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h1 className="text-2xl font-bold text-white mb-2">
                                Something went wrong
                            </h1>
                            <p className="text-zinc-400">
                                An unexpected error occurred. Please try refreshing the page.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-6">
                                <p className="text-xs font-mono text-red-400 break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

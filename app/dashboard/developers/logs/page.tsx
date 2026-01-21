'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import { FileText } from 'lucide-react';

export default function LogsPage() {
    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Logs</h1>
                <p className="text-zinc-400">
                    View API request logs and debugging information
                </p>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-16">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-10 h-10 text-zinc-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            No logs yet
                        </h2>
                        <p className="text-zinc-400 max-w-md mx-auto">
                            API request logs will appear here once you start making API calls
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { getSession } from '../../lib/session';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <div className="flex-1 pl-[240px]"> {/* Offset for fixed sidebar */}
                <div className="flex flex-col min-h-screen">
                    <TopHeader />
                    <main className="flex-1 p-8 max-w-[1200px] w-full mx-auto animate-in fade-in duration-500 slide-in-from-bottom-2">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}

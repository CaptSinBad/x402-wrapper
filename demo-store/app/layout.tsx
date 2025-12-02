import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'ROLA ACCESSORIES - Christmas Collection',
    description: 'Premium shoes and clothing for the holiday season',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="bg-snow">{children}</body>
        </html>
    );
}

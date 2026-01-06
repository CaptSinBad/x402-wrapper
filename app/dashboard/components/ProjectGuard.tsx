'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthToken } from '@/app/hooks/useAuthToken';

export function ProjectGuard() {
    const router = useRouter();
    const pathname = usePathname();
    const { authFetch, getToken } = useAuthToken();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        checkProject();
    }, [pathname]);

    const checkProject = async () => {
        try {
            const token = await getToken();
            if (!token) return; // Let auth guard handle this

            const response = await authFetch('/api/projects/create'); // GET endpoint

            if (response.ok) {
                const data = await response.json();
                if (!data.projects || data.projects.length === 0) {
                    // No projects found, redirect to onboarding
                    console.log('No projects found, redirecting to onboarding...');
                    router.push('/onboarding/step-4');
                }
            }
        } catch (error) {
            console.error('Failed to check project status:', error);
        } finally {
            setChecked(true);
        }
    };

    return null; // This component renders nothing
}

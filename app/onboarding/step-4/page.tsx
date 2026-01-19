'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../components/onboarding.module.css';

import { useAuthToken } from '@/app/hooks/useAuthToken';

export default function OnboardingStep4() {
    const router = useRouter();
    const { authFetch } = useAuthToken();
    const [projectName, setProjectName] = useState('');
    const [environment, setEnvironment] = useState('test');
    const [isCreating, setIsCreating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [apiKeys, setApiKeys] = useState({
        publicKey: '',
        secretKey: '',
        webhookSecret: '',
    });

    useEffect(() => {
        // Load business name from step 2
        const detailsStr = localStorage.getItem('onboarding_business_details');
        if (detailsStr) {
            const details = JSON.parse(detailsStr);
            setProjectName(details.businessName || '');
        }
    }, []);

    const handleCreateProject = async () => {
        setIsCreating(true);

        try {
            const response = await authFetch('/api/projects/create', {
                method: 'POST',
                body: JSON.stringify({
                    name: projectName,
                    environment,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create project');
            }

            // Set API keys from backend
            setApiKeys(data.keys);
            setIsCreating(false);
            setShowSuccess(true);

            // Clear onboarding data from localStorage
            localStorage.removeItem('onboarding_account_type');
            localStorage.removeItem('onboarding_business_details');
            localStorage.removeItem('onboarding_settlement');

        } catch (error: any) {
            console.error('Project creation error:', error);
            alert(error.message || 'Failed to create project');
            setIsCreating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add a toast notification here
    };

    const goToDashboard = () => {
        router.push('/dashboard');
    };

    if (showSuccess) {
        return (
            <div className={styles.successModal}>
                <div className={styles.successContent}>
                    <div className={styles.successIcon}>✓</div>
                    <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 12px' }}>
                        Your project is ready!
                    </h2>
                    <p style={{ fontSize: '16px', color: '#4B5563', marginBottom: '24px' }}>
                        Save your API keys now. You won't be able to see the secret key again.
                    </p>

                    {/* API Keys Display */}
                    <div className={styles.apiKeyCard}>
                        <div className={styles.apiKeyLabel}>Publishable Key</div>
                        <div className={styles.apiKeyValue}>
                            <span style={{ flex: 1 }}>{apiKeys.publicKey}</span>
                            <button
                                className={styles.copyButton}
                                onClick={() => copyToClipboard(apiKeys.publicKey)}
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <div className={styles.apiKeyCard}>
                        <div className={styles.apiKeyLabel}>Secret Key</div>
                        <div className={styles.apiKeyValue}>
                            <span style={{ flex: 1 }}>{apiKeys.secretKey}</span>
                            <button
                                className={styles.copyButton}
                                onClick={() => copyToClipboard(apiKeys.secretKey)}
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <div className={styles.apiKeyCard}>
                        <div className={styles.apiKeyLabel}>Webhook Signing Secret</div>
                        <div className={styles.apiKeyValue}>
                            <span style={{ flex: 1 }}>{apiKeys.webhookSecret}</span>
                            <button
                                className={styles.copyButton}
                                onClick={() => copyToClipboard(apiKeys.webhookSecret)}
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <div style={{
                        background: '#FFF5F5',
                        border: '1px solid #FC8181',
                        borderRadius: '10px',
                        padding: '12px',
                        fontSize: '13px',
                        color: '#742A2A',
                        marginTop: '20px',
                        marginBottom: '24px'
                    }}>
                        ⚠️ <strong>Warning:</strong> Store your secret key securely. We can't recover it if lost.
                    </div>

                    <button
                        className={styles.nextButton}
                        onClick={goToDashboard}
                        style={{ width: '100%' }}
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.onboardingPage}>
            <div className={styles.onboardingContainer}>
                {/* Progress Bar */}
                <div className={styles.progressBar}>
                    <div className={styles.progressSteps}>
                        <div className={styles.progressLine}></div>
                        <div className={styles.progressLineFilled} style={{ width: '100%' }}></div>

                        <div className={styles.step}>
                            <div className={`${styles.stepCircle} ${styles.completed}`}>✓</div>
                            <span className={styles.stepLabel}>Account</span>
                        </div>
                        <div className={styles.step}>
                            <div className={`${styles.stepCircle} ${styles.completed}`}>✓</div>
                            <span className={styles.stepLabel}>Details</span>
                        </div>
                        <div className={styles.step}>
                            <div className={`${styles.stepCircle} ${styles.completed}`}>✓</div>
                            <span className={styles.stepLabel}>Settlement</span>
                        </div>
                        <div className={styles.step}>
                            <div className={`${styles.stepCircle} ${styles.active}`}>4</div>
                            <span className={`${styles.stepLabel} ${styles.active}`}>Project</span>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className={styles.onboardingCard}>
                    <h1 className={styles.cardTitle}>Create your first project</h1>
                    <p className={styles.cardSubtitle}>
                        We'll generate API keys for integrating BinahPay into your application
                    </p>

                    <form className={styles.onboardingForm} onSubmit={(e) => { e.preventDefault(); handleCreateProject(); }}>
                        <div className={styles.formGroup}>
                            <label htmlFor="projectName" className={styles.label}>
                                Project name <span className={styles.required}>*</span>
                            </label>
                            <input
                                id="projectName"
                                name="projectName"
                                type="text"
                                className={styles.input}
                                placeholder="My Project"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                required
                            />
                            <span className={styles.helpText}>You can change this later in settings</span>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="environment" className={styles.label}>
                                Environment
                            </label>
                            <select
                                id="environment"
                                name="environment"
                                className={styles.select}
                                value={environment}
                                onChange={(e) => setEnvironment(e.target.value)}
                            >
                                <option value="test">Test Mode (Recommended)</option>
                                <option value="live">Live Mode</option>
                            </select>
                            <span className={styles.helpText}>
                                {environment === 'test'
                                    ? 'Use test mode for development. No real money involved.'
                                    : 'Live mode processes real payments.'}
                            </span>
                        </div>

                        <div style={{
                            background: '#F0FFF4',
                            border: '1px solid #38A169',
                            borderRadius: '10px',
                            padding: '16px',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            color: '#22543D'
                        }}>
                            <strong>🔑 What you'll get:</strong>
                            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: '#276749' }}>
                                <li>Publishable key (use in frontend code)</li>
                                <li>Secret key (use in backend code, keep private)</li>
                                <li>Webhook signing secret (verify webhook events)</li>
                                <li>x402 tenant for payment processing</li>
                            </ul>
                        </div>

                        <div className={styles.buttonRow}>
                            <button
                                type="button"
                                className={styles.backButton}
                                onClick={() => router.push('/onboarding/step-3')}
                                disabled={isCreating}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                className={styles.nextButton}
                                disabled={!projectName.trim() || isCreating}
                            >
                                {isCreating ? (
                                    <>
                                        <span className={styles.loading}></span> Creating project...
                                    </>
                                ) : (
                                    'Create project & finish'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

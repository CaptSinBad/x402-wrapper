'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import styles from '../../components/onboarding.module.css';

import { useAuthToken } from '@/app/hooks/useAuthToken';

export default function OnboardingStep3() {
    const router = useRouter();
    const { authFetch } = useAuthToken();
    const { address, isConnected } = useAccount();
    const [stablecoinPreference, setStablecoinPreference] = useState('USDC');

    useEffect(() => {
        // Check if previous steps completed
        const type = localStorage.getItem('onboarding_account_type');
        const details = localStorage.getItem('onboarding_business_details');
        if (!type || !details) {
            router.push('/onboarding/step-1');
        }
    }, [router]);

    const handleContinue = async () => {
        if (!address) {
            alert('Please connect your wallet to continue');
            return;
        }

        try {
            // Save settlement preferences to database
            await authFetch('/api/onboarding/save', {
                method: 'POST',
                body: JSON.stringify({
                    settlementWallet: address,
                    stablecoinPreference: stablecoinPreference,
                    currentStep: 4,
                }),
            });

            // Navigate to step 4
            router.push('/onboarding/step-4');
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save progress. Please try again.');
        }
    };

    return (
        <div className={styles.onboardingPage}>
            <div className={styles.onboardingContainer}>
                {/* Progress Bar */}
                <div className={styles.progressBar}>
                    <div className={styles.progressSteps}>
                        <div className={styles.progressLine}></div>
                        <div className={styles.progressLineFilled} style={{ width: '66%' }}></div>

                        <div className={styles.step}>
                            <div className={`${styles.stepCircle} ${styles.completed}`}>✓</div>
                            <span className={styles.stepLabel}>Account</span>
                        </div>
                        <div className={styles.step}>
                            <div className={`${styles.stepCircle} ${styles.completed}`}>✓</div>
                            <span className={styles.stepLabel}>Details</span>
                        </div>
                        <div className={styles.step}>
                            <div className={`${styles.stepCircle} ${styles.active}`}>3</div>
                            <span className={`${styles.stepLabel} ${styles.active}`}>Settlement</span>
                        </div>
                        <div className={styles.step}>
                            <div className={styles.stepCircle}>4</div>
                            <span className={styles.stepLabel}>Project</span>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className={styles.onboardingCard}>
                    <h1 className={styles.cardTitle}>Settlement wallet</h1>
                    <p className={styles.cardSubtitle}>
                        Confirm the wallet where you'll receive payments
                    </p>

                    <form className={styles.onboardingForm} onSubmit={(e) => { e.preventDefault(); handleContinue(); }}>
                        {/* Wallet Display */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Connected wallet
                            </label>
                            <div style={{
                                background: isConnected ? '#F0FDF4' : '#FEF2F2',
                                border: `1px solid ${isConnected ? '#86EFAC' : '#FECACA'}`,
                                borderRadius: '10px',
                                padding: '16px',
                                fontFamily: 'monospace',
                                fontSize: '14px',
                                color: isConnected ? '#166534' : '#991B1B',
                                wordBreak: 'break-all'
                            }}>
                                {address || 'No wallet connected'}
                            </div>
                            {isConnected && (
                                <span className={styles.helpText} style={{ color: '#16A34A' }}>
                                    ✓ All payments will be sent directly to this address
                                </span>
                            )}
                            {!isConnected && (
                                <span className={styles.helpText} style={{ color: '#DC2626' }}>
                                    Please connect your wallet using the button in the top right
                                </span>
                            )}
                        </div>

                        {/* Stablecoin Preference */}
                        <div className={styles.formGroup}>
                            <label htmlFor="stablecoinPreference" className={styles.label}>
                                Preferred stablecoin
                            </label>
                            <select
                                id="stablecoinPreference"
                                name="stablecoinPreference"
                                className={styles.select}
                                value={stablecoinPreference}
                                onChange={(e) => setStablecoinPreference(e.target.value)}
                            >
                                <option value="USDC">USDC (USD Coin)</option>
                                <option value="USDT">USDT (Tether)</option>
                            </select>
                            <span className={styles.helpText}>Default currency for receiving payments</span>
                        </div>

                        {/* Info Box */}
                        <div style={{
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            borderRadius: '10px',
                            padding: '16px',
                            fontSize: '14px',
                            color: '#1E40AF'
                        }}>
                            <strong>💡 Good to know:</strong> You can change your settlement wallet anytime in Settings.
                        </div>

                        <div className={styles.buttonRow}>
                            <button
                                type="button"
                                className={styles.backButton}
                                onClick={() => router.push('/onboarding/step-2')}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                className={styles.nextButton}
                                disabled={!isConnected}
                            >
                                Continue
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

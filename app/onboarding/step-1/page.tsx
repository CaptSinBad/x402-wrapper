'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../components/onboarding.module.css';

type AccountType = 'individual' | 'business' | null;

export default function OnboardingStep1() {
    const router = useRouter();
    const [selectedType, setSelectedType] = useState<AccountType>(null);

    const handleContinue = async () => {
        if (!selectedType) return;

        try {
            // Save to localStorage for step 2 to access
            localStorage.setItem('onboarding_account_type', selectedType);

            // Save to database
            await fetch('/api/onboarding/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountType: selectedType,
                    currentStep: 2
                }),
            });

            // Navigate to step 2
            router.push('/onboarding/step-2');
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
                        <div className={styles.progressLineFilled} style={{ width: '0%' }}></div>

                        <div className={styles.step}>
                            <div className={`${styles.stepCircle} ${styles.active}`}>1</div>
                            <span className={`${styles.stepLabel} ${styles.active}`}>Account</span>
                        </div>
                        <div className={styles.step}>
                            <div className={styles.stepCircle}>2</div>
                            <span className={styles.stepLabel}>Details</span>
                        </div>
                        <div className={styles.step}>
                            <div className={styles.stepCircle}>3</div>
                            <span className={styles.stepLabel}>Settlement</span>
                        </div>
                        <div className={styles.step}>
                            <div className={styles.stepCircle}>4</div>
                            <span className={styles.stepLabel}>Project</span>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className={styles.onboardingCard}>
                    <h1 className={styles.cardTitle}>Tell us about yourself</h1>
                    <p className={styles.cardSubtitle}>
                        Choose the option that best describes how you'll use BinahPay
                    </p>

                    <div className={styles.accountTypeGrid}>
                        {/* Individual Card */}
                        <div
                            className={`${styles.accountTypeCard} ${selectedType === 'individual' ? styles.selected : ''}`}
                            onClick={() => setSelectedType('individual')}
                        >
                            <div className={styles.accountTypeIcon}>👤</div>
                            <h3 className={styles.accountTypeTitle}>Individual</h3>
                            <p className={styles.accountTypeDescription}>
                                I'm a developer or freelancer building a project
                            </p>
                        </div>

                        {/* Business Card */}
                        <div
                            className={`${styles.accountTypeCard} ${selectedType === 'business' ? styles.selected : ''}`}
                            onClick={() => setSelectedType('business')}
                        >
                            <div className={styles.accountTypeIcon}>🏢</div>
                            <h3 className={styles.accountTypeTitle}>Business</h3>
                            <p className={styles.accountTypeDescription}>
                                I represent a company or organization
                            </p>
                        </div>
                    </div>

                    <div className={styles.buttonRow}>
                        <button
                            className={styles.backButton}
                            onClick={() => router.push('/signup')}
                        >
                            Back
                        </button>
                        <button
                            className={styles.nextButton}
                            onClick={handleContinue}
                            disabled={!selectedType}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

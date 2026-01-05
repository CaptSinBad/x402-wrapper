'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import styles from '../../components/onboarding.module.css';

import { useAuthToken } from '@/app/hooks/useAuthToken';

export default function OnboardingStep3() {
    const router = useRouter();
    const { authFetch } = useAuthToken();
    const { address } = useAccount();
    const [formData, setFormData] = useState({
        stablecoinPreference: 'USDC',
        bankName: '',
        bankAccountNumber: '',
        bankRoutingNumber: '',
        bankCountry: '',
    });

    useEffect(() => {
        // Check if previous steps completed
        const type = localStorage.getItem('onboarding_account_type');
        const details = localStorage.getItem('onboarding_business_details');
        if (!type || !details) {
            router.push('/onboarding/step-1');
        }
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleContinue = async () => {
        try {
            // Save to database
            await authFetch('/api/onboarding/save', {
                method: 'POST',
                body: JSON.stringify({
                    settlementWallet: address,
                    stablecoinPreference: formData.stablecoinPreference,
                    bankName: formData.bankName,
                    bankAccountNumber: formData.bankAccountNumber,
                    bankRoutingNumber: formData.bankRoutingNumber,
                    bankCountry: formData.bankCountry,
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

    const isBankDetailsValid = true; // Bank details are now optional

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
                    <h1 className={styles.cardTitle}>Settlement preferences</h1>
                    <p className={styles.cardSubtitle}>
                        Configure how you'd like to receive payments from BinahPay
                    </p>

                    <form className={styles.onboardingForm} onSubmit={(e) => { e.preventDefault(); handleContinue(); }}>
                        {/* Crypto Settlement */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Settlement wallet
                            </label>
                            <input
                                type="text"
                                className={styles.input}
                                value={address || 'Not connected'}
                                disabled
                                style={{ background: '#F7FAFC' }}
                            />
                            <span className={styles.helpText}>
                                Payments will be settled to your connected wallet: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Please connect wallet'}
                            </span>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="stablecoinPreference" className={styles.label}>
                                Preferred stablecoin
                            </label>
                            <select
                                id="stablecoinPreference"
                                name="stablecoinPreference"
                                className={styles.select}
                                value={formData.stablecoinPreference}
                                onChange={handleChange}
                            >
                                <option value="USDC">USDC (USD Coin)</option>
                                <option value="USDT">USDT (Tether)</option>
                                <option value="DAI">DAI</option>
                            </select>
                            <span className={styles.helpText}>Default currency for receiving payments</span>
                        </div>

                        {/* Divider */}
                        <div style={{ borderTop: '1px solid #E2E8F0', margin: '24px 0' }}></div>

                        {/* Bank Account for Fiat Conversion */}
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                            Bank account details (for fiat conversion)
                        </h3>
                        <p style={{ fontSize: '14px', color: '#718096', marginBottom: '20px' }}>
                            Add your bank account to enable automatic conversion from crypto to fiat. This requires KYC verification.
                        </p>

                        <div className={styles.formGroup}>
                            <label htmlFor="bankName" className={styles.label}>
                                Bank name (Optional)
                            </label>
                            <input
                                id="bankName"
                                name="bankName"
                                type="text"
                                className={styles.input}
                                placeholder="Chase Bank"
                                value={formData.bankName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="bankAccountNumber" className={styles.label}>
                                    Account number (Optional)
                                </label>
                                <input
                                    id="bankAccountNumber"
                                    name="bankAccountNumber"
                                    type="text"
                                    className={styles.input}
                                    placeholder="123456789"
                                    value={formData.bankAccountNumber}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="bankRoutingNumber" className={styles.label}>
                                    Routing number
                                </label>
                                <input
                                    id="bankRoutingNumber"
                                    name="bankRoutingNumber"
                                    type="text"
                                    className={styles.input}
                                    placeholder="021000021"
                                    value={formData.bankRoutingNumber}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="bankCountry" className={styles.label}>
                                Bank country (Optional)
                            </label>
                            <select
                                id="bankCountry"
                                name="bankCountry"
                                className={styles.select}
                                value={formData.bankCountry}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select country</option>
                                <option value="US">United States</option>
                                <option value="GB">United Kingdom</option>
                                <option value="CA">Canada</option>
                                <option value="AU">Australia</option>
                                <option value="DE">Germany</option>
                                <option value="FR">France</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div style={{
                            background: '#FFF5F5',
                            border: '1px solid #FC8181',
                            borderRadius: '10px',
                            padding: '16px',
                            fontSize: '14px',
                            color: '#742A2A'
                        }}>
                            <strong>📋 KYC Required:</strong> Adding bank details requires identity verification.
                            You'll be able to submit KYC documents in your dashboard after completing onboarding.
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
                                disabled={!isBankDetailsValid}
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

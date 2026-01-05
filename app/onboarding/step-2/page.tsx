'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../components/onboarding.module.css';

import { useAuthToken } from '@/app/hooks/useAuthToken';

export default function OnboardingStep2() {
    const router = useRouter();
    const { authFetch } = useAuthToken();
    const [accountType, setAccountType] = useState('');
    const [formData, setFormData] = useState({
        businessName: '',
        website: '',
        industry: '',
        country: '',
    });

    useEffect(() => {
        // Load account type from localStorage
        const type = localStorage.getItem('onboarding_account_type') || '';
        if (!type) {
            router.push('/onboarding/step-1');
            return;
        }
        setAccountType(type);
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleContinue = async () => {
        try {
            // Save to localStorage for step 3 to access
            localStorage.setItem('onboarding_business_details', JSON.stringify(formData));

            // Save to database
            await authFetch('/api/onboarding/save', {
                method: 'POST',
                body: JSON.stringify({
                    businessName: formData.businessName,
                    website: formData.website,
                    industry: formData.industry,
                    country: formData.country,
                    currentStep: 3,
                }),
            });

            // Navigate to step 3
            router.push('/onboarding/step-3');
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save progress. Please try again.');
        }
    };

    const isBusinessNameValid = formData.businessName.trim().length > 0 && formData.country.length > 0;

    return (
        <div className={styles.onboardingPage}>
            <div className={styles.onboardingContainer}>
                {/* Progress Bar */}
                <div className={styles.progressBar}>
                    <div className={styles.progressSteps}>
                        <div className={styles.progressLine}></div>
                        <div className={styles.progressLineFilled} style={{ width: '33%' }}></div>

                        <div className={styles.step}>
                            <div className={`${styles.stepCircle} ${styles.completed}`}>✓</div>
                            <span className={styles.stepLabel}>Account</span>
                        </div>
                        <div className={styles.step}>
                            <div className={`${styles.stepCircle} ${styles.active}`}>2</div>
                            <span className={`${styles.stepLabel} ${styles.active}`}>Details</span>
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
                    <h1 className={styles.cardTitle}>
                        {accountType === 'business' ? 'Business details' : 'Project details'}
                    </h1>
                    <p className={styles.cardSubtitle}>
                        Tell us a bit more about your {accountType === 'business' ? 'business' : 'project'}
                    </p>

                    <form className={styles.onboardingForm} onSubmit={(e) => { e.preventDefault(); handleContinue(); }}>
                        <div className={styles.formGroup}>
                            <label htmlFor="businessName" className={styles.label}>
                                {accountType === 'business' ? 'Business name' : 'Project name'} <span className={styles.required}>*</span>
                            </label>
                            <input
                                id="businessName"
                                name="businessName"
                                type="text"
                                className={styles.input}
                                placeholder={accountType === 'business' ? 'Acme Inc.' : 'My Awesome App'}
                                value={formData.businessName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="website" className={styles.label}>
                                Website
                            </label>
                            <input
                                id="website"
                                name="website"
                                type="url"
                                className={styles.input}
                                placeholder="https://example.com"
                                value={formData.website}
                                onChange={handleChange}
                            />
                            <span className={styles.helpText}>Optional - your company or project website</span>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="industry" className={styles.label}>
                                    Industry
                                </label>
                                <select
                                    id="industry"
                                    name="industry"
                                    className={styles.select}
                                    value={formData.industry}
                                    onChange={handleChange}
                                >
                                    <option value="">Select industry</option>
                                    <option value="ecommerce">E-commerce</option>
                                    <option value="saas">SaaS</option>
                                    <option value="marketplace">Marketplace</option>
                                    <option value="gaming">Gaming</option>
                                    <option value="nft">NFT/Digital Collectibles</option>
                                    <option value="defi">DeFi</option>
                                    <option value="content">Content/Media</option>
                                    <option value="education">Education</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="country" className={styles.label}>
                                    Country <span className={styles.required}>*</span>
                                </label>
                                <select
                                    id="country"
                                    name="country"
                                    className={styles.select}
                                    value={formData.country}
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
                                    <option value="IN">India</option>
                                    <option value="NG">Nigeria</option>
                                    <option value="BR">Brazil</option>
                                    <option value="JP">Japan</option>
                                    <option value="SG">Singapore</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.buttonRow}>
                            <button
                                type="button"
                                className={styles.backButton}
                                onClick={() => router.push('/onboarding/step-1')}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                className={styles.nextButton}
                                disabled={!isBusinessNameValid}
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

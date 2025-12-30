import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/session';

/**
 * POST /api/onboarding/save
 * Save onboarding progress for authenticated user
 */
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();
        const data = await req.json();

        const {
            accountType,
            businessName,
            website,
            industry,
            country,
            settlementWallet,
            stablecoinPreference,
            bankName,
            bankAccountNumber,
            bankRoutingNumber,
            bankCountry,
            currentStep,
            completed,
        } = data;

        // Check if onboarding record exists
        const existing = await query(
            `SELECT user_id FROM onboarding_progress WHERE user_id = $1`,
            [user.id]
        );

        if (existing.rows.length === 0) {
            // Insert new record
            await query(
                `INSERT INTO onboarding_progress (
          user_id, account_type, business_name, website, industry, country,
          settlement_wallet, stablecoin_preference,
          bank_name, bank_account_number, bank_routing_number, bank_country,
          current_step, completed, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
                [
                    user.id, accountType, businessName, website, industry, country,
                    settlementWallet, stablecoinPreference,
                    bankName, bankAccountNumber, bankRoutingNumber, bankCountry,
                    currentStep || 1, completed || false
                ]
            );
        } else {
            // Update existing record
            await query(
                `UPDATE onboarding_progress SET
          account_type = COALESCE($2, account_type),
          business_name = COALESCE($3, business_name),
          website = COALESCE($4, website),
          industry = COALESCE($5, industry),
          country = COALESCE($6, country),
          settlement_wallet = COALESCE($7, settlement_wallet),
          stablecoin_preference = COALESCE($8, stablecoin_preference),
          bank_name = COALESCE($9, bank_name),
          bank_account_number = COALESCE($10, bank_account_number),
          bank_routing_number = COALESCE($11, bank_routing_number),
          bank_country = COALESCE($12, bank_country),
          current_step = COALESCE($13, current_step),
          completed = COALESCE($14, completed),
          completed_at = CASE WHEN $14 = true THEN NOW() ELSE completed_at END,
          updated_at = NOW()
        WHERE user_id = $1`,
                [
                    user.id, accountType, businessName, website, industry, country,
                    settlementWallet, stablecoinPreference,
                    bankName, bankAccountNumber, bankRoutingNumber, bankCountry,
                    currentStep, completed
                ]
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Onboarding progress saved',
        });
    } catch (error: any) {
        console.error('[onboarding/save] Error:', error);

        if (error.message === 'Unauthorized') {
            return NextResponse.json(
                { error: 'unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'internal_error', message: error.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/onboarding/save
 * Get onboarding progress for authenticated user
 */
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth();

        const result = await query(
            `SELECT * FROM onboarding_progress WHERE user_id = $1`,
            [user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({
                exists: false,
                data: null,
            });
        }

        return NextResponse.json({
            exists: true,
            data: result.rows[0],
        });
    } catch (error: any) {
        console.error('[onboarding/save GET] Error:', error);

        if (error.message === 'Unauthorized') {
            return NextResponse.json(
                { error: 'unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'internal_error', message: error.message },
            { status: 500 }
        );
    }
}

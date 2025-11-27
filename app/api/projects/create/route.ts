import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '../../../../lib/session';
import crypto from 'crypto';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/projects/create
 * Create a new project with API keys for authenticated user
 */
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();
        const { name, environment } = await req.json();

        if (!name || !environment) {
            return NextResponse.json(
                { error: 'name_and_environment_required' },
                { status: 400 }
            );
        }

        const env = environment === 'live' ? 'live' : 'test';

        // Generate API keys
        const publicKey = `pk_${env}_${crypto.randomBytes(24).toString('base64url')}`;
        const secretKey = `sk_${env}_${crypto.randomBytes(32).toString('base64url')}`;
        const webhookSecret = `whsec_${crypto.randomBytes(24).toString('base64url')}`;

        // Hash the secret key (we'll only store the hash)
        const secretKeyHash = crypto.createHash('sha256').update(secretKey).digest('hex');

        // Generate x402 tenant ID (you can customize this based on your x402 setup)
        const x402TenantId = `tenant_${crypto.randomBytes(16).toString('hex')}`;

        // Insert project
        const result = await pgPool.query(
            `INSERT INTO projects (
        user_id, name, environment, public_key, secret_key_hash, webhook_secret,
        x402_tenant_id, x402_network, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, name, environment, public_key, x402_tenant_id, x402_network, created_at`,
            [user.id, name, env, publicKey, secretKeyHash, webhookSecret, x402TenantId, 'base-sepolia']
        );

        const project = result.rows[0];

        // Mark onboarding as complete
        await pgPool.query(
            `UPDATE onboarding_progress 
       SET completed = true, completed_at = NOW(), updated_at = NOW()
       WHERE user_id = $1`,
            [user.id]
        );

        return NextResponse.json({
            success: true,
            project: {
                id: project.id,
                name: project.name,
                environment: project.environment,
                x402TenantId: project.x402_tenant_id,
                x402Network: project.x402_network,
                createdAt: project.created_at,
            },
            keys: {
                publicKey,
                secretKey, // Only returned once!
                webhookSecret,
            },
        });
    } catch (error: any) {
        console.error('[projects/create] Error:', error);

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
 * GET /api/projects/create
 * Get all projects for authenticated user
 */
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth();

        const result = await pgPool.query(
            `SELECT id, name, environment, public_key, x402_tenant_id, x402_network, created_at, updated_at
       FROM projects
       WHERE user_id = $1
       ORDER BY created_at DESC`,
            [user.id]
        );

        return NextResponse.json({
            projects: result.rows,
        });
    } catch (error: any) {
        console.error('[projects/create GET] Error:', error);

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

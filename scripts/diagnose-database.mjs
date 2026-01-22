#!/usr/bin/env node
/**
 * Database Diagnostic Script
 * Run this to check what data exists in your Neon database
 * 
 * Usage: node scripts/diagnose-database.mjs
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.server' });

const { Pool } = pg;

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function diagnose() {
    console.log('🔍 Database Diagnostic Report\n');
    console.log('='.repeat(60));

    try {
        // 1. Check database connection
        console.log('\n📡 Testing connection...');
        const connTest = await pgPool.query('SELECT NOW() as time');
        console.log(`   ✅ Connected at: ${connTest.rows[0].time}`);

        // 2. Count records in key tables
        console.log('\n📊 Table Record Counts:');
        const tables = ['users', 'projects', 'sales', 'payment_links', 'checkout_sessions', 'orders', 'products'];

        for (const table of tables) {
            try {
                const result = await pgPool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   ${table}: ${result.rows[0].count} records`);
            } catch (e) {
                console.log(`   ${table}: ❌ Table doesn't exist or error`);
            }
        }

        // 3. List all users
        console.log('\n👤 Users in database:');
        try {
            const users = await pgPool.query(`
                SELECT id, email, wallet_address, privy_id, created_at 
                FROM users 
                ORDER BY created_at DESC 
                LIMIT 10
            `);
            if (users.rows.length === 0) {
                console.log('   No users found');
            } else {
                users.rows.forEach((u, i) => {
                    console.log(`   ${i + 1}. ${u.email || 'no email'} | wallet: ${u.wallet_address?.slice(0, 10)}... | id: ${u.id}`);
                });
            }
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
        }

        // 4. List all projects with their seller IDs
        console.log('\n📁 Projects in database:');
        try {
            const projects = await pgPool.query(`
                SELECT p.id, p.name, p.user_id, u.email as user_email
                FROM projects p
                LEFT JOIN users u ON p.user_id = u.id
                ORDER BY p.created_at DESC 
                LIMIT 10
            `);
            if (projects.rows.length === 0) {
                console.log('   No projects found');
            } else {
                projects.rows.forEach((p, i) => {
                    console.log(`   ${i + 1}. "${p.name}" | id: ${p.id} | user: ${p.user_email || p.user_id}`);
                });
            }
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
        }

        // 5. List all sales with their seller_ids
        console.log('\n💰 Sales in database:');
        try {
            const sales = await pgPool.query(`
                SELECT id, seller_id, amount_cents, currency, purchaser_address, created_at, metadata
                FROM sales
                ORDER BY created_at DESC 
                LIMIT 10
            `);
            if (sales.rows.length === 0) {
                console.log('   No sales found');
            } else {
                sales.rows.forEach((s, i) => {
                    console.log(`   ${i + 1}. $${(s.amount_cents / 100).toFixed(2)} ${s.currency} | seller_id: ${s.seller_id} | ${new Date(s.created_at).toISOString()}`);
                });
            }
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
        }

        // 6. List all payment links
        console.log('\n🔗 Payment Links in database:');
        try {
            const links = await pgPool.query(`
                SELECT id, token, seller_id::text, price_cents, currency, created_at, metadata
                FROM payment_links
                ORDER BY created_at DESC 
                LIMIT 10
            `);
            if (links.rows.length === 0) {
                console.log('   No payment links found');
            } else {
                links.rows.forEach((l, i) => {
                    console.log(`   ${i + 1}. $${(l.price_cents / 100).toFixed(2)} | token: ${l.token?.slice(0, 8)}... | seller_id: ${l.seller_id} | name: ${l.metadata?.name || 'unnamed'}`);
                });
            }
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
        }

        // 7. Check for seller_id mismatches
        console.log('\n🔍 Seller ID Analysis:');

        // Get unique seller_ids from sales
        try {
            const salesSellerIds = await pgPool.query(`SELECT DISTINCT seller_id FROM sales`);
            console.log(`   Unique seller_ids in sales: ${salesSellerIds.rows.map(r => r.seller_id).join(', ') || 'none'}`);
        } catch (e) {
            console.log(`   ❌ Error getting sales seller_ids: ${e.message}`);
        }

        // Get unique seller_ids from payment_links
        try {
            const linksSellerIds = await pgPool.query(`SELECT DISTINCT seller_id::text FROM payment_links`);
            console.log(`   Unique seller_ids in payment_links: ${linksSellerIds.rows.map(r => r.seller_id).join(', ') || 'none'}`);
        } catch (e) {
            console.log(`   ❌ Error getting payment_links seller_ids: ${e.message}`);
        }

        // Get project IDs
        try {
            const projectIds = await pgPool.query(`SELECT id::text FROM projects`);
            console.log(`   Project IDs: ${projectIds.rows.map(r => r.id).join(', ') || 'none'}`);
        } catch (e) {
            console.log(`   ❌ Error getting project IDs: ${e.message}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Diagnostic complete\n');

    } catch (error) {
        console.error('❌ Fatal error:', error.message);
    } finally {
        await pgPool.end();
    }
}

diagnose();

import { Pool } from 'pg';

/**
 * Database connection pool.
 * Note: For production/local setup, you would use process.env.DATABASE_URL
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/motion_erp',
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

/**
 * Mock Data Service (Fall-back for UI development without DB)
 */
export const getMockSummaries = () => {
    return {
        generatedMonthly: 3500000,
        spentMonthly: 850000,
        totalClientDebt: 1200000,
        pendingJobsCount: 8,
        pendingJobsValue: 900000,
    };
};

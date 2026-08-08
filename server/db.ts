import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool | null {
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL found. Running without persistent database connection.');
    return null;
  }

  if (!pool) {
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 10000,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      pool.on('error', (err) => {
        console.warn('PostgreSQL pool notice:', err.message);
      });
      console.log('PostgreSQL database pool initialized.');
    } catch (err) {
      console.error('Failed to initialize PostgreSQL pool:', err);
    }
  }

  return pool;
}

export async function saveComplaintToDb(complaint: Record<string, any>) {
  const db = getDbPool();
  if (!db) return null;

  const query = `
    INSERT INTO qms_complaints (
      qms_log_id, complaint_source, customer_name, product_name, product_strength,
      batch_lot_number, affected_quantity, manufacturing_date, expiry_date,
      originating_site_block, impacted_npm, complaint_category, complaint_description,
      status, severity_suggested, suggested_next_action, initial_risk_assessment
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
    )
    ON CONFLICT (qms_log_id) DO UPDATE SET
      customer_name = EXCLUDED.customer_name,
      product_name = EXCLUDED.product_name,
      batch_lot_number = EXCLUDED.batch_lot_number,
      affected_quantity = EXCLUDED.affected_quantity,
      status = EXCLUDED.status,
      complaint_description = EXCLUDED.complaint_description;
  `;

  const values = [
    complaint.qmsLogId || `QMS-${Date.now()}`,
    complaint.complaintSource || 'System',
    complaint.customerName || '',
    complaint.productName || '',
    complaint.productStrength || '',
    complaint.batchLotNumber || '',
    complaint.affectedQuantity || '',
    complaint.manufacturingDate || null,
    complaint.expiryDate || null,
    complaint.originatingSiteBlock || '',
    complaint.impactedNpm || '',
    complaint.complaintCategory || '',
    complaint.complaintDescription || '',
    complaint.status || 'Pending Triage',
    complaint.severitySuggested || '',
    complaint.suggestedNextAction || '',
    complaint.initialRiskAssessment || ''
  ];

  try {
    const res = await db.query(query, values);
    return res;
  } catch (err: any) {
    console.warn('Could not persist to PostgreSQL (e.g. host unreachable from cloud sandbox):', err?.message || err);
    return null;
  }
}

export async function getAllComplaintsFromDb() {
  const db = getDbPool();
  if (!db) return null;

  try {
    const res = await db.query('SELECT * FROM qms_complaints ORDER BY committed_at DESC');
    return res.rows;
  } catch (err) {
    console.error('Error fetching complaints from database:', err);
    return null;
  }
}

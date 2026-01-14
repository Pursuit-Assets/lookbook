import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/db/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: any;
  
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad JSON' }, { status: 400 });
  }

  const { name, email, interests = [], message = '' } = body || {};

  // Validate required fields
  if (!name || !email) {
    return NextResponse.json(
      { ok: false, error: 'Name and email are required' },
      { status: 400 }
    );
  }

  // Log to database
  try {
    await pool.query(
      `INSERT INTO contact_submissions (name, email, interests, message, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [name, email, interests, message]
    );
  } catch (dbError) {
    // Table might not exist, try to create it and retry
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS contact_submissions (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          interests TEXT[],
          message TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await pool.query(
        `INSERT INTO contact_submissions (name, email, interests, message, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [name, email, interests, message]
      );
    } catch (retryError) {
      console.error('Database error:', retryError);
      // Continue even if DB fails - we still want to forward to webhook
    }
  }

  // Forward to Google Sheets webhook (if configured)
  const webhookUrl = process.env.CONTACT_WEBHOOK_URL;
  
  if (webhookUrl) {
    try {
      const webhookRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          interests: interests.join(', '),
          message,
          source: 'lookbook',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!webhookRes.ok) {
        console.error('Webhook failed:', await webhookRes.text());
      }
    } catch (webhookError) {
      console.error('Webhook error:', webhookError);
      // Don't fail the request if webhook fails
    }
  }

  return NextResponse.json({ ok: true });
}

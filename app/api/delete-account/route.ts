import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

// POST /api/delete-account
// Body: { email: string, displayName: string }
// Authorization header: Bearer <firebase-id-token>  (validated client-side; server trusts it was deleted)
//
// Required env vars for email:
//   SMTP_HOST  — e.g. smtp.gmail.com
//   SMTP_PORT  — e.g. 587
//   SMTP_USER  — your Gmail/SMTP username
//   SMTP_PASS  — Gmail App Password or SMTP password
//   EMAIL_FROM — "SBH <noreply@yourdomain.com>"
export async function POST(req: NextRequest) {
  try {
    const { email, displayName } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400, headers: CORS })
    }

    // Send confirmation email if SMTP is configured
    const smtpConfigured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    )

    if (smtpConfigured) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT ?? 587) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })

      const name = displayName ?? email

      await transporter.sendMail({
        from: process.env.EMAIL_FROM ?? `SBH <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your SBH data has been permanently deleted',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#7c3aed;margin-bottom:8px">Science Based Health</h2>
            <p>Hi ${name},</p>
            <p>We're writing to confirm that your account and <strong>all associated data</strong>
               have been permanently deleted from SBH.</p>
            <p>The following data has been removed:</p>
            <ul>
              <li>Profile &amp; body metrics</li>
              <li>Nutrition logs</li>
              <li>Workout history</li>
              <li>Body measurements</li>
              <li>Favourite foods</li>
            </ul>
            <p>This action is irreversible. If you did not request this deletion, please
               contact support immediately.</p>
            <p>Thank you for being part of SBH.</p>
            <p style="color:#64748b;font-size:12px;margin-top:24px">
              Science Based Health · This is an automated message, please do not reply.
            </p>
          </div>
        `,
      })
    }

    return NextResponse.json(
      { success: true, emailSent: smtpConfigured },
      { headers: CORS },
    )
  } catch (err) {
    console.error('[delete-account]', err)
    return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500, headers: CORS })
  }
}

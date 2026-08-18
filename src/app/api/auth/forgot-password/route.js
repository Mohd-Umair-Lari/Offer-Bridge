import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import crypto from 'node:crypto';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Offer Bridge <noreply@offer-bridge.com>';

export async function POST(request) {
  try {
    await connectDB();
    const { email } = await request.json();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond 200 to prevent user enumeration
    if (!user) {
      return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    // Block OAuth-only accounts
    if (!user.password && user.oauth_provider) {
      return NextResponse.json({ error: `This account uses ${user.oauth_provider} sign-in. Please log in with that provider.` }, { status: 400 });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await User.findByIdAndUpdate(user._id, {
      reset_token: token,
      reset_token_expires: expiresAt,
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email.toLowerCase(),
      subject: 'Reset Your Offer Bridge Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Reset Password</title>
        </head>
        <body style="margin:0;padding:0;background:#09090b;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding-bottom:28px;">
                      <div style="display:inline-flex;align-items:center;gap:10px;">
                        <div style="width:40px;height:40px;background:#ffffff;border-radius:10px;display:flex;align-items:center;justify-content:center;">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                          </svg>
                        </div>
                        <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Offer Bridge</span>
                      </div>
                    </td>
                  </tr>
                  <!-- Card -->
                  <tr>
                    <td style="background:#141417;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px 32px;">
                      <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.4px;">Reset your password</h1>
                      <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 28px;">
                        Hi ${user.fullName || 'there'},<br/>
                        We received a request to reset your Offer Bridge password. Click the button below to choose a new password. This link expires in <strong style="color:#f4f4f5;">1 hour</strong>.
                      </p>
                      <!-- CTA Button -->
                      <table cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td align="center" style="padding:4px 0 28px;">
                            <a href="${resetUrl}"
                               style="display:inline-block;background:#ffffff;color:#09090b;font-size:14px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:-0.2px;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      <!-- Fallback URL -->
                      <p style="color:#71717a;font-size:12px;line-height:1.6;margin:0 0 16px;">
                        If the button doesn't work, copy and paste this link into your browser:
                      </p>
                      <p style="color:#a1a1aa;font-size:12px;word-break:break-all;margin:0 0 24px;background:#09090b;padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
                        ${resetUrl}
                      </p>
                      <!-- Security notice -->
                      <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
                        <p style="color:#71717a;font-size:11px;line-height:1.6;margin:0;">
                          If you didn't request a password reset, you can safely ignore this email. Your account is secure and no changes have been made.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding-top:24px;">
                      <p style="color:#52525b;font-size:11px;margin:0;">
                        © ${new Date().getFullYear()} Offer Bridge · India
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}

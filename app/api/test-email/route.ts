import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const from = process.env.GMAIL_FROM ?? user;

  if (!user || !pass) {
    return NextResponse.json({
      ok: false,
      error: 'GMAIL_USER or GMAIL_APP_PASSWORD not set in environment',
      GMAIL_USER: user ?? 'MISSING',
      GMAIL_APP_PASSWORD: pass ? '*** set ***' : 'MISSING',
    });
  }

  try {
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    await transport.sendMail({
      from,
      to: user,
      subject: 'Test Email — Doctor Site',
      html: '<p>If you see this, Gmail SMTP is working correctly.</p>',
    });

    return NextResponse.json({
      ok: true,
      message: `Test email sent to ${user}`,
      GMAIL_USER: user,
      GMAIL_FROM: from,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ok: false,
      error: message,
      GMAIL_USER: user,
      GMAIL_APP_PASSWORD: '*** set ***',
    });
  }
}

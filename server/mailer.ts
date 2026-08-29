import nodemailer from 'nodemailer';

export interface SendOtpMailParams {
  email: string;
  code: string;
  type: 'verify_email' | 'password_reset';
  name?: string;
}

export interface MailResult {
  success: boolean;
  message: string;
  provider: string;
  previewUrl?: string | false;
}

// Cached transporter
let cachedTransporter: nodemailer.Transporter | null = null;
let cachedTransporterType = '';

async function getTransporter(): Promise<{ transporter: nodemailer.Transporter; provider: string; isTest: boolean }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  // 1. If explicit SMTP / Gmail is configured in environment
  if (user && pass) {
    const configKey = `${host || 'smtp.gmail.com'}:${user}`;
    if (cachedTransporter && cachedTransporterType === configKey) {
      return { transporter: cachedTransporter, provider: 'smtp', isTest: false };
    }

    const transportOptions: nodemailer.TransportOptions = host ? {
      host,
      port,
      secure,
      auth: { user, pass }
    } as any : {
      service: 'gmail',
      auth: { user, pass }
    } as any;

    cachedTransporter = nodemailer.createTransport(transportOptions);
    cachedTransporterType = configKey;
    return { transporter: cachedTransporter, provider: host || 'gmail', isTest: false };
  }

  // 2. Automatic Ethereal SMTP test account for instant out-of-the-box email delivery & testing
  if (cachedTransporter && cachedTransporterType === 'ethereal') {
    return { transporter: cachedTransporter, provider: 'ethereal', isTest: true };
  }

  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    cachedTransporterType = 'ethereal';
    console.log('[Mailer] Initialized Ethereal test mailer for user:', testAccount.user);
    return { transporter: cachedTransporter, provider: 'ethereal', isTest: true };
  } catch (err) {
    console.warn('[Mailer] Could not create Ethereal test account, creating fallback transporter:', err);
    // Fallback simple SMTP
    cachedTransporter = nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      ignoreTLS: true
    });
    cachedTransporterType = 'fallback';
    return { transporter: cachedTransporter, provider: 'fallback', isTest: true };
  }
}

export async function sendOtpEmail({ email, code, type, name }: SendOtpMailParams): Promise<MailResult> {
  const isVerification = type === 'verify_email';
  const subject = isVerification 
    ? `🔐 Código de Verificación para Vulnerable: ${code}`
    : `🔑 Restablece tu contraseña de Vulnerable: ${code}`;
  
  const title = isVerification 
    ? '¡Bienvenido a Vulnerable!' 
    : 'Recuperación de Contraseña';

  const subtitle = isVerification
    ? 'Gracias por unirte a nuestra comunidad. Para activar tu cuenta y proteger tu perfil, ingresa este código en la aplicación:'
    : 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Ingresa este código en la aplicación para crear tu nueva clave:';

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || '"Vulnerable App" <noreply@vulnerable.app>';

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; }
    .container { max-width: 540px; margin: 30px auto; background-color: #0f172a; border-radius: 20px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #e11d48, #db2777); padding: 32px 24px; text-align: center; }
    .logo { font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin: 0; }
    .tagline { font-size: 13px; color: rgba(255, 255, 255, 0.85); margin-top: 4px; }
    .body { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }
    .otp-box { background-color: #020617; border: 1px solid #e11d48; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0; }
    .otp-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #fda4af; font-weight: 700; margin-bottom: 8px; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff; margin: 0; text-shadow: 0 0 12px rgba(225, 29, 72, 0.4); }
    .validity { font-size: 12px; color: #64748b; margin-top: 10px; margin-bottom: 0; }
    .security-note { background-color: rgba(30, 41, 59, 0.5); border-left: 3px solid #e11d48; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #94a3b8; line-height: 1.5; margin-top: 24px; }
    .footer { background-color: #090d16; padding: 20px 24px; text-align: center; font-size: 11px; color: #475569; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">🔥 Vulnerable</h1>
      <div class="tagline">Conexiones Auténticas & Seguras</div>
    </div>
    <div class="body">
      <h2 class="greeting">${title}</h2>
      ${name ? `<p class="text" style="color: #cbd5e1;">Hola <strong>${name}</strong>,</p>` : ''}
      <p class="text">${subtitle}</p>
      
      <div class="otp-box">
        <div class="otp-label">Tu Código de Seguridad</div>
        <div class="otp-code">${code}</div>
        <p class="validity">⏱ Válido durante los próximos 15 minutos</p>
      </div>

      <div class="security-note">
        🔒 <strong>Aviso de seguridad:</strong> Si no realizaste esta solicitud en Vulnerable, podés ignorar este correo con total tranquilidad. Tu cuenta permanece protegida. Nunca compartas este código con nadie.
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Vulnerable App. Todos los derechos reservados.
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Vulnerable - Conexiones Auténticas

${title}
${name ? `Hola ${name},\n` : ''}
${subtitle}

Tu código de verificación de 6 dígitos es:
>>> ${code} <<<

Este código es válido durante 15 minutos.
Si no solicitaste este código, puedes ignorar este mensaje.
  `.trim();

  // Try Resend API first if key exists
  const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY;
  if (resendApiKey) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: email,
          subject,
          html: htmlContent,
          text: textContent
        })
      });

      if (resendRes.ok) {
        console.log(`[Resend] Email successfully sent to ${email}`);
        return {
          success: true,
          message: `Código enviado con éxito a ${email}.`,
          provider: 'resend'
        };
      } else {
        const errText = await resendRes.text();
        console.warn('[Resend] API error, falling back to SMTP transport:', errText);
      }
    } catch (resendErr) {
      console.warn('[Resend] Request failed:', resendErr);
    }
  }

  // Use Nodemailer SMTP / Gmail / Ethereal transport
  try {
    const { transporter, provider, isTest } = await getTransporter();
    
    const info = await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject,
      text: textContent,
      html: htmlContent
    });

    let previewUrl: string | false = false;
    if (isTest && provider === 'ethereal') {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[Mailer] Ethereal Preview URL for ${email}: ${previewUrl}`);
    }

    console.log(`[Mailer] Message delivered via ${provider} to ${email} (MessageId: ${info.messageId})`);

    return {
      success: true,
      message: `Código enviado a ${email}. Revisa tu bandeja de entrada y la carpeta de correo no deseado (Spam).`,
      provider,
      previewUrl
    };
  } catch (mailErr: any) {
    console.error(`[Mailer] Failed to send email to ${email}:`, mailErr);
    return {
      success: false,
      message: `No se pudo enviar el correo: ${mailErr.message || 'Error de conexión con el servidor de correo'}.`,
      provider: 'error'
    };
  }
}

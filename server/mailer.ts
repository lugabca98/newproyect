import nodemailer from 'nodemailer';

export interface SendOtpMailParams {
  email: string;
  code: string;
  type: 'verify_email' | 'password_reset';
  name?: string;
  actionUrl?: string;
}

export interface MailResult {
  success: boolean;
  message: string;
  provider: string;
  isRealDelivery: boolean;
  code?: string;
  previewUrl?: string | false;
}

export interface MailConfigStatus {
  isConfigured: boolean;
  activeProvider: string;
  providers: {
    resend: boolean;
    brevo: boolean;
    sendgrid: boolean;
    gmail: boolean;
    smtp: boolean;
  };
}

export function getMailConfigStatus(): MailConfigStatus {
  const hasResend = Boolean(process.env.RESEND_API_KEY || process.env.RESEND_KEY);
  const hasBrevo = Boolean(process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY);
  const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);
  const hasGmail = Boolean((process.env.GMAIL_USER || process.env.EMAIL_USER) && (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS));
  const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  let activeProvider = 'sandbox';
  if (hasResend) activeProvider = 'resend';
  else if (hasBrevo) activeProvider = 'brevo';
  else if (hasSendGrid) activeProvider = 'sendgrid';
  else if (hasGmail) activeProvider = 'gmail';
  else if (hasSmtp) activeProvider = 'smtp';

  const isConfigured = hasResend || hasBrevo || hasSendGrid || hasGmail || hasSmtp;

  return {
    isConfigured,
    activeProvider,
    providers: {
      resend: hasResend,
      brevo: hasBrevo,
      sendgrid: hasSendGrid,
      gmail: hasGmail,
      smtp: hasSmtp
    }
  };
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
      return { transporter: cachedTransporter, provider: host ? 'smtp' : 'gmail', isTest: false };
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
    return { transporter: cachedTransporter, provider: host ? 'smtp' : 'gmail', isTest: false };
  }

  // 2. Automatic Ethereal SMTP test account for instant sandbox email delivery & testing
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
    console.warn('[Mailer] Fallback simple transporter created:', err);
    cachedTransporter = nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      ignoreTLS: true
    });
    cachedTransporterType = 'fallback';
    return { transporter: cachedTransporter, provider: 'fallback', isTest: true };
  }
}

export async function sendOtpEmail({ email, code, type, name, actionUrl }: SendOtpMailParams): Promise<MailResult> {
  const isVerification = type === 'verify_email';
  const subject = isVerification 
    ? `🔐 Confirma tu correo para activar tu cuenta en Vulnerable (${code})`
    : `🔑 Restablece tu contraseña de Vulnerable`;
  
  const title = isVerification 
    ? '¡Bienvenido a Vulnerable!' 
    : 'Recuperación de Contraseña';

  const subtitle = isVerification
    ? 'Gracias por unirte a nuestra comunidad. Para activar tu cuenta y acceder a tu perfil, haz clic en el siguiente botón o ingresa tu código de verificación:'
    : 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Hacé clic en el siguiente botón para ingresar tu nueva clave de inmediato:';

  const buttonText = isVerification
    ? 'Confirmar mi Correo y Activar Cuenta'
    : 'Restablecer mi Contraseña';

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || '"Vulnerable App" <onboarding@resend.dev>';
  const fromName = 'Vulnerable App';

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
    .text { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 20px; }
    .btn-box { text-align: center; margin: 26px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #e11d48, #db2777); color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 14px; font-weight: 800; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(225, 29, 72, 0.4); }
    .otp-box { background-color: #020617; border: 1px solid #e11d48; border-radius: 16px; padding: 20px 24px; text-align: center; margin: 24px 0; }
    .otp-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #fda4af; font-weight: 700; margin-bottom: 8px; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #ffffff; margin: 0; text-shadow: 0 0 12px rgba(225, 29, 72, 0.4); }
    .validity { font-size: 12px; color: #64748b; margin-top: 10px; margin-bottom: 0; }
    .link-fallback { font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 16px; word-break: break-all; }
    .link-fallback a { color: #fda4af; text-decoration: underline; }
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

      ${actionUrl ? `
      <div class="btn-box">
        <a href="${actionUrl}" class="btn" target="_blank">${buttonText}</a>
      </div>
      ` : ''}
      
      <div class="otp-box">
        <div class="otp-label">${isVerification ? 'Código de Verificación' : 'O Código de Seguridad Directo'}</div>
        <div class="otp-code">${code}</div>
        <p class="validity">⏱ Válido durante los próximos 15 minutos</p>
      </div>

      ${actionUrl ? `
      <div class="link-fallback">
        Si el botón superior no funciona, podés copiar y pegar este enlace en tu navegador:<br>
        <a href="${actionUrl}" target="_blank">${actionUrl}</a>
      </div>
      ` : ''}

      <div class="security-note">
        🔒 <strong>Aviso de seguridad:</strong> Si no realizaste esta solicitud en Vulnerable, podés ignorar este correo con total tranquilidad. Tu cuenta permanece protegida y nadie puede acceder sin tu confirmación.
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

${actionUrl ? `Enlace directo:\n${actionUrl}\n\n` : ''}
Tu código de seguridad de 6 dígitos es:
>>> ${code} <<<

Este código es válido durante 15 minutos.
Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.
  `.trim();

  // 1. Try Resend API first if key exists (https://resend.com)
  const resendApiKey = (process.env.RESEND_API_KEY || process.env.RESEND_KEY || '').trim();
  if (resendApiKey) {
    try {
      // If user has a verified custom domain, use EMAIL_FROM, otherwise Resend default sandbox sender 'onboarding@resend.dev'
      let resendFrom = process.env.EMAIL_FROM;
      if (!resendFrom || resendFrom.includes('tudominio') || resendFrom.includes('example')) {
        resendFrom = 'Vulnerable <onboarding@resend.dev>';
      } else if (!resendFrom.includes('<')) {
        resendFrom = `Vulnerable <${resendFrom}>`;
      }

      console.log(`[Resend] Attempting to deliver email to ${email} from ${resendFrom}...`);

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [email],
          subject,
          html: htmlContent,
          text: textContent
        })
      });

      const resendData = await resendRes.json().catch(() => null);

      if (resendRes.ok && resendData?.id) {
        console.log(`[Resend] Email successfully dispatched to ${email} (ID: ${resendData.id})`);
        return {
          success: true,
          message: `Código enviado con éxito a tu correo (${email}). Revisá tu bandeja de entrada o la carpeta de Spam.`,
          provider: 'resend',
          isRealDelivery: true
        };
      } else {
        const errorMsg = resendData?.message || resendData?.name || 'Resend error';
        console.warn(`[Resend] Delivery response status ${resendRes.status}:`, errorMsg);
        
        // If Resend rejected because of sandbox restriction (onboarding@resend.dev only sends to account owner email in free tier)
        if (errorMsg.includes('can only send testing emails to your own email address') || errorMsg.includes('validation_error')) {
          console.warn('[Resend] Sandbox notice: Free Resend onboarding sender can only deliver to the account owner email.');
        }
      }
    } catch (resendErr) {
      console.warn('[Resend] Request exception:', resendErr);
    }
  }

  // 2. Try Brevo / Sendinblue REST API (https://brevo.com)
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  if (brevoApiKey) {
    try {
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: fromName, email: process.env.EMAIL_FROM || 'noreply@vulnerable.app' },
          to: [{ email, name: name || 'Usuario de Vulnerable' }],
          subject,
          htmlContent,
          textContent
        })
      });

      if (brevoRes.ok) {
        console.log(`[Brevo] Email successfully delivered to ${email}`);
        return {
          success: true,
          message: `Código enviado con éxito a tu correo (${email}) vía Brevo. Revisa tu bandeja y Spam.`,
          provider: 'brevo',
          isRealDelivery: true
        };
      } else {
        const errData = await brevoRes.text();
        console.warn('[Brevo] API response:', errData);
      }
    } catch (brevoErr) {
      console.warn('[Brevo] Request failed:', brevoErr);
    }
  }

  // 3. Try SendGrid REST API (https://sendgrid.com)
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (sendgridApiKey) {
    try {
      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: process.env.EMAIL_FROM || 'noreply@vulnerable.app', name: fromName },
          subject,
          content: [
            { type: 'text/plain', value: textContent },
            { type: 'text/html', value: htmlContent }
          ]
        })
      });

      if (sgRes.ok) {
        console.log(`[SendGrid] Email sent to ${email}`);
        return {
          success: true,
          message: `Código enviado con éxito a ${email} vía SendGrid.`,
          provider: 'sendgrid',
          isRealDelivery: true
        };
      }
    } catch (sgErr) {
      console.warn('[SendGrid] Request failed:', sgErr);
    }
  }

  // 4. Use Nodemailer SMTP / Gmail / Ethereal transport
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

    console.log(`[Mailer] Message dispatched via ${provider} to ${email} (MessageId: ${info.messageId})`);

    const isReal = !isTest && (provider === 'gmail' || provider === 'smtp');

    return {
      success: true,
      message: isReal
        ? `Código enviado a ${email}. Revisa tu bandeja de entrada y la carpeta de correo no deseado (Spam).`
        : `Código de seguridad generado para ${email}.`,
      provider,
      isRealDelivery: isReal,
      code: !isReal ? code : undefined,
      previewUrl
    };
  } catch (mailErr: any) {
    console.error(`[Mailer] Failed to send email to ${email}:`, mailErr);
    return {
      success: false,
      message: `No se pudo enviar el correo: ${mailErr.message || 'Error de conexión'}.`,
      provider: 'error',
      isRealDelivery: false,
      code
    };
  }
}

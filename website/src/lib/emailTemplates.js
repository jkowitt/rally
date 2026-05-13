// Email template generators for transactional emails

export function welcomeEmail(userName, propertyName) {
  return {
    subject: `Welcome to Loud CRM, ${userName}!`,
    body: `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">
        <div style="background:#080A0F;padding:24px;text-align:center;">
          <h1 style="color:#E8B84B;font-family:monospace;font-size:20px;margin:0;">LOUD LEGACY</h1>
        </div>
        <div style="padding:32px 24px;background:#0F1218;color:#F0F2F8;">
          <h2 style="margin:0 0 16px;">Welcome, ${userName}!</h2>
          <p style="color:#8B92A8;line-height:1.6;">Your property <strong style="color:#E8B84B;">${propertyName}</strong> is set up and ready to go.</p>
          <h3 style="color:#E8B84B;font-size:14px;margin:24px 0 12px;">Get started in 4 steps:</h3>
          <ol style="color:#8B92A8;line-height:2;padding-left:20px;">
            <li>Add your sponsorship assets to the Asset Catalog</li>
            <li>Import or add your prospects to the Pipeline</li>
            <li>Upload existing contracts to track fulfillment</li>
            <li>Invite your team from the Team page</li>
          </ol>
          <div style="text-align:center;margin:32px 0;">
            <a href="https://loud-legacy.com/app" style="background:#E8B84B;color:#080A0F;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">Go to Dashboard</a>
          </div>
        </div>
        <div style="padding:16px 24px;background:#080A0F;text-align:center;">
          <p style="color:#555D75;font-size:11px;margin:0;">Loud CRM — Sports Business Operating Suite</p>
        </div>
      </div>
    `,
  }
}

export function inviteEmail(inviterName, propertyName, inviteUrl, role) {
  return {
    subject: `${inviterName} invited you to ${propertyName} on Loud CRM`,
    body: `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:#080A0F;padding:24px;text-align:center;">
          <h1 style="color:#E8B84B;font-family:monospace;font-size:20px;margin:0;">LOUD LEGACY</h1>
        </div>
        <div style="padding:32px 24px;background:#0F1218;color:#F0F2F8;">
          <h2 style="margin:0 0 16px;">You've been invited!</h2>
          <p style="color:#8B92A8;line-height:1.6;"><strong style="color:#F0F2F8;">${inviterName}</strong> has invited you to join <strong style="color:#E8B84B;">${propertyName}</strong> as a <strong>${role}</strong>.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${inviteUrl}" style="background:#E8B84B;color:#080A0F;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">Accept Invitation</a>
          </div>
          <p style="color:#555D75;font-size:12px;">This invitation expires in 7 days.</p>
        </div>
      </div>
    `,
  }
}

export function contractExpiringEmail(brandName, expirationDate, daysLeft) {
  return {
    subject: `Contract Expiring: ${brandName} — ${daysLeft} days remaining`,
    body: `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:#080A0F;padding:24px;text-align:center;">
          <h1 style="color:#E8B84B;font-family:monospace;font-size:20px;margin:0;">LOUD LEGACY</h1>
        </div>
        <div style="padding:32px 24px;background:#0F1218;color:#F0F2F8;">
          <h2 style="margin:0 0 16px;">Contract Expiring Soon</h2>
          <p style="color:#8B92A8;line-height:1.6;">The contract with <strong style="color:#E8B84B;">${brandName}</strong> expires on <strong>${expirationDate}</strong> — that's <strong style="color:#E05252;">${daysLeft} days</strong> from now.</p>
          <p style="color:#8B92A8;">Start the renewal conversation to secure continued partnership.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="https://loud-legacy.com/app/crm/contracts" style="background:#E8B84B;color:#080A0F;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">View Contract</a>
          </div>
        </div>
      </div>
    `,
  }
}

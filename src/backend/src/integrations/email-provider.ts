export interface VerificationEmailInput {
  recipientEmail: string;
  recipientName: string;
  verificationUrl: string;
  locale: string;
}

export interface PasswordResetEmailInput {
  recipientEmail: string;
  recipientName: string;
  resetUrl: string;
  locale: string;
}

export interface EmailDeliveryResult {
  accepted: boolean;
  providerMessageId?: string;
}

export interface EmailProvider {
  readonly key: string;
  sendVerificationEmail(input: VerificationEmailInput): Promise<EmailDeliveryResult>;
  sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<EmailDeliveryResult>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

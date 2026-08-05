export interface CheckoutRequest {
  userId: string;
  planKey: string;
  successUrl: string;
  cancelUrl: string;
  locale: string;
}

export interface CheckoutSession {
  sessionId: string;
  redirectUrl: string;
}

export interface BillingVerificationResult {
  verified: boolean;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  status?: string;
}

export interface BillingProvider {
  readonly key: string;
  createCheckoutSession(input: CheckoutRequest): Promise<CheckoutSession>;
  verifyCheckoutResult(reference: string): Promise<BillingVerificationResult>;
  cancelSubscription(externalSubscriptionId: string): Promise<void>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

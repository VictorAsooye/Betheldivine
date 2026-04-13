import { SupabaseClient } from "@supabase/supabase-js";

const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QB_SANDBOX_BASE = "https://sandbox-quickbooks.api.intuit.com/v3/company";
const QB_PROD_BASE = "https://quickbooks.api.intuit.com/v3/company";

const QB_SCOPES = "com.intuit.quickbooks.accounting";

function getApiBase(): string {
  return process.env.QUICKBOOKS_ENVIRONMENT === "production"
    ? QB_PROD_BASE
    : QB_SANDBOX_BASE;
}

function getBasicAuthHeader(): string {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID!;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!;
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

// ── OAuth URL ──────────────────────────────────────────────────────────────

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.QUICKBOOKS_CLIENT_ID!,
    response_type: "code",
    scope: QB_SCOPES,
    redirect_uri: process.env.QUICKBOOKS_REDIRECT_URI!,
    state,
  });
  return `${QB_AUTH_URL}?${params.toString()}`;
}

// ── Token Exchange ─────────────────────────────────────────────────────────

export interface QBTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  realm_id: string;
}

export async function exchangeCodeForTokens(
  code: string,
  realmId: string
): Promise<QBTokens> {
  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getBasicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.QUICKBOOKS_REDIRECT_URI!,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QB token exchange failed: ${text}`);
  }

  const data = await res.json();
  return { ...data, realm_id: realmId };
}

// ── Token Refresh ──────────────────────────────────────────────────────────

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getBasicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QB token refresh failed: ${text}`);
  }

  return res.json();
}

// ── Get valid token (auto-refresh if expired) ──────────────────────────────

export async function getValidToken(
  supabase: SupabaseClient
): Promise<{ accessToken: string; realmId: string } | null> {
  const { data: tokenRow } = await supabase
    .from("quickbooks_tokens")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tokenRow) return null;

  const expiry = new Date(tokenRow.token_expiry);
  const isExpired = expiry.getTime() - Date.now() < 60_000; // refresh 1 min before expiry

  if (!isExpired) {
    return { accessToken: tokenRow.access_token, realmId: tokenRow.realm_id };
  }

  try {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token);
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    await supabase
      .from("quickbooks_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        token_expiry: newExpiry,
      })
      .eq("realm_id", tokenRow.realm_id);

    return { accessToken: refreshed.access_token, realmId: tokenRow.realm_id };
  } catch {
    return null;
  }
}

// ── Find or Create QB Customer ─────────────────────────────────────────────

async function findOrCreateCustomer(
  accessToken: string,
  realmId: string,
  displayName: string
): Promise<string> {
  const base = getApiBase();

  // Search for existing customer
  const query = encodeURIComponent(
    `SELECT * FROM Customer WHERE DisplayName = '${displayName.replace(/'/g, "\\'")}'`
  );
  const searchRes = await fetch(`${base}/${realmId}/query?query=${query}&minorversion=65`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    const customers = searchData?.QueryResponse?.Customer;
    if (customers && customers.length > 0) {
      return customers[0].Id;
    }
  }

  // Create new customer
  const createRes = await fetch(`${base}/${realmId}/customer?minorversion=65`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ DisplayName: displayName }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create QB customer: ${await createRes.text()}`);
  }

  const createData = await createRes.json();
  return createData.Customer.Id;
}

// ── Create Sales Receipt ───────────────────────────────────────────────────

export interface SalesReceiptData {
  clientName: string;
  amount: number;
  paymentDate: string; // ISO string
  cardBrand?: string | null;
  cardLastFour?: string | null;
  billingMonth?: string | null; // "YYYY-MM"
  paymentId: string;
}

export async function createSalesReceipt(
  accessToken: string,
  realmId: string,
  data: SalesReceiptData
): Promise<string> {
  const base = getApiBase();

  const customerId = await findOrCreateCustomer(accessToken, realmId, data.clientName);

  const txnDate = new Date(data.paymentDate).toISOString().split("T")[0];
  const cardDesc = data.cardLastFour
    ? `${data.cardBrand ?? "Card"} ending ${data.cardLastFour}`
    : "Card on file";
  const memo = data.billingMonth
    ? `Care services for ${data.billingMonth} — ${cardDesc}`
    : `Care services — ${cardDesc}`;

  const body = {
    CustomerRef: { value: customerId },
    DocNumber: data.paymentId.slice(0, 20),
    TxnDate: txnDate,
    PrivateNote: memo,
    Line: [
      {
        Amount: data.amount,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: { value: "1", name: "Services" },
          UnitPrice: data.amount,
          Qty: 1,
        },
      },
    ],
  };

  const res = await fetch(`${base}/${realmId}/salesreceipt?minorversion=65`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`QB Sales Receipt creation failed: ${await res.text()}`);
  }

  const resData = await res.json();
  return resData.SalesReceipt.Id;
}

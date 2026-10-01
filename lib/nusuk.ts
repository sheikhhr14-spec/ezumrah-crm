// Nusuk (Saudi Ministry of Hajj & Umrah) API client for Umrah visa services.
// Agency-level configuration lives in Settings → Integrations (nusuk_api_url / nusuk_api_key / nusuk_enabled).
// The API key and gateway URL are issued to licensed agents via the Nusuk partner portal.

export type NusukConfig = { baseUrl: string; apiKey: string; enabled: boolean };

export async function getNusukConfig(db: any, aid: string): Promise<NusukConfig | null> {
  const { data: a } = await db.from('agencies').select('nusuk_api_url, nusuk_api_key, nusuk_enabled').eq('id', aid).single();
  if (!a || !a.nusuk_enabled || !a.nusuk_api_url || !a.nusuk_api_key) return null;
  return { baseUrl: a.nusuk_api_url.replace(/\/+$/, ''), apiKey: a.nusuk_api_key, enabled: true };
}

export type NusukVisaApplication = {
  applicantName: string;
  passportNo: string;
  nationality: string;
  dob?: string | null;
  gender?: string | null;
  visaType: string;
  arrivalDate?: string | null;
  durationDays?: number | null;
  sponsorName?: string | null;
  insurance?: boolean;
  reference?: string | null; // agency's internal sale ref
};

async function nusukFetch(cfg: NusukConfig, path: string, init?: RequestInit) {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!res.ok) {
    throw new Error(body?.message || body?.error || `Nusuk API error (HTTP ${res.status})`);
  }
  return body;
}

// Submit an Umrah visa application. Returns the Nusuk application reference.
export async function submitUmrahVisa(db: any, aid: string, app: NusukVisaApplication): Promise<{ ref: string; status: string }> {
  const cfg = await getNusukConfig(db, aid);
  if (!cfg) throw new Error('Nusuk API is not configured. Add your API URL and key under Settings → Integrations.');
  const body = await nusukFetch(cfg, '/api/v1/visa/umrah/apply', {
    method: 'POST',
    body: JSON.stringify({
      applicantName: app.applicantName,
      passportNumber: app.passportNo,
      nationality: app.nationality,
      dateOfBirth: app.dob || undefined,
      gender: app.gender || undefined,
      visaType: app.visaType,
      arrivalDate: app.arrivalDate || undefined,
      durationDays: app.durationDays || undefined,
      sponsorName: app.sponsorName || undefined,
      insuranceRequired: !!app.insurance,
      agentReference: app.reference || undefined,
    }),
  });
  const ref = body?.reference || body?.applicationId || body?.id || body?.data?.reference;
  if (!ref) throw new Error('Nusuk API did not return an application reference.');
  return { ref: String(ref), status: body?.status || 'submitted' };
}

// Poll the current status of a previously submitted application.
export async function getNusukVisaStatus(db: any, aid: string, ref: string): Promise<{ status: string; visaNo?: string; message?: string }> {
  const cfg = await getNusukConfig(db, aid);
  if (!cfg) throw new Error('Nusuk API is not configured. Add your API URL and key under Settings → Integrations.');
  const body = await nusukFetch(cfg, `/api/v1/visa/status/${encodeURIComponent(ref)}`);
  const d = body?.data || body;
  return { status: String(d?.status || 'unknown'), visaNo: d?.visaNumber || d?.visaNo, message: d?.message };
}

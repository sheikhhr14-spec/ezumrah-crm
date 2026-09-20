import { requireModule } from '@/lib/data';
import { PageHeader } from '@/components/ui';
import Vault from '@/components/vault';

export default async function VaultPage() {
  const ctx = await requireModule('vault');
  return (
    <div>
      <PageHeader title="Credential Vault" subtitle="Safely store logins for supplier portals, GDS, OTAs, email and banking — AES-256 encrypted, manager and owner access only" />
      <Vault role={ctx.role} />
    </div>
  );
}

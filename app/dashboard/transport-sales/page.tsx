import ServiceSaleList from '@/components/service-sale-list';

export default async function Page({ searchParams }: { searchParams?: { q?: string } }) {
  return <ServiceSaleList table="transport_sales" searchParams={searchParams} />;
}

import ServiceSaleList from '@/components/service-sale-list';

export default async function Page({ searchParams }: { searchParams?: { q?: string } }) {
  return <ServiceSaleList table="visa_sales" searchParams={searchParams} />;
}

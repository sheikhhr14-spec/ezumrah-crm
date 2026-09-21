import ServiceSaleView from '@/components/service-sale-view';

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams?: { emailed?: string } }) {
  return <ServiceSaleView table="hotel_sales" id={params.id} emailFlag={searchParams?.emailed} />;
}

import ServiceSaleView from '@/components/service-sale-view';

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams?: { emailed?: string; edit?: string } }) {
  return <ServiceSaleView table="transport_sales" id={params.id} emailFlag={searchParams?.emailed} editFlag={searchParams?.edit} />;
}

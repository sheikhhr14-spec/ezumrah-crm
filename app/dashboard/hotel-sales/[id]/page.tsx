import ServiceSaleView from '@/components/service-sale-view';

export default async function Page({ params }: { params: { id: string } }) {
  return <ServiceSaleView table="hotel_sales" id={params.id} />;
}

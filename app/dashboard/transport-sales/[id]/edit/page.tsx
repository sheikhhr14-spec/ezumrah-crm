import ServiceSaleEditPage from '@/components/service-sale-edit';

export default async function Page({ params }: { params: { id: string } }) {
  return <ServiceSaleEditPage table="transport_sales" id={params.id} />;
}

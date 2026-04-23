import FormsPage from "@/components/FormsPage";

interface Props {
  searchParams: Promise<{ open?: string; prefill_name?: string }>;
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <FormsPage
      role="admin"
      autoOpenForm={params.open}
      prefillClientName={params.prefill_name}
    />
  );
}

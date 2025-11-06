import { SferaChat } from "@/components/sfera/SferaChat";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SferaPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="h-screen">
      <SferaChat sferaId={id} />
    </div>
  );
}

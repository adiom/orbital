import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrbitDirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/orbit/${id}`);
}

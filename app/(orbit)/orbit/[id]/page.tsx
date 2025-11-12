import { auth } from "@/app/(auth)/auth";
import { OrbitChat } from "@/components/orbit/orbit-chat";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * OrbitPage is a Next.js page component that renders an OrbitChat component
 * for the given orbit ID. It also fetches the user session from the auth API.
 *
 * @param {PageProps} props - The props object containing the ID of the orbit.
 * @returns {JSX.Element} The JSX element representing the page.
 */

export default async function OrbitPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  return (
    <div className="h-screen">
      <OrbitChat currentUserId={session?.user?.id} orbitId={id} />
    </div>
  );
}

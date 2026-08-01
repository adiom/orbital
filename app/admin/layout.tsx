import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/access";

export const metadata = {
  title: "Станция · Orbital",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  // 404 rather than 403: the station does not announce itself.
  if (!admin) {
    notFound();
  }

  return children;
}

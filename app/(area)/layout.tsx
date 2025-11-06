import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataStreamProvider>
      <SidebarProvider>
        {children}
      </SidebarProvider>
    </DataStreamProvider>
  );
}

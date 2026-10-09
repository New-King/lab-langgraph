import { LabMobileNav } from "@/components/lab-mobile-nav";
import { LabSidebar } from "@/components/lab-sidebar";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:h-screen lg:min-h-0 lg:flex-row">
      <LabMobileNav />
      <LabSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  );
}

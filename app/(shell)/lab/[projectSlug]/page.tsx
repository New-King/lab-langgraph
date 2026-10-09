import { notFound } from "next/navigation";
import { GuideProjectView } from "@/components/guide-project-view";
import { ProjectView } from "@/components/project-view";
import { getNavItem, NAV_ITEMS } from "@/lib/projects";

type PageProps = {
  params: Promise<{ projectSlug: string }>;
};

export function generateStaticParams() {
  return NAV_ITEMS.map((item) => ({ projectSlug: item.slug }));
}

export default async function ProjectPage({ params }: PageProps) {
  const { projectSlug } = await params;
  const item = getNavItem(projectSlug);
  if (!item) notFound();

  if (item.kind === "guide") {
    return <GuideProjectView project={item} />;
  }

  return <ProjectView key={item.slug} project={item} />;
}

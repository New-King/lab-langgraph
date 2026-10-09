import Link from "next/link";
import { DocLinksSidebar } from "@/components/doc-links-sidebar";
import { HOME } from "@/lib/home";
import { labContent, labMain, labScroll } from "@/lib/layout-classes";

/** 首页：介绍 + 技术栈 + 立即开始；右侧链官方文档 */
export function HomeView() {
  return (
    <main className={labMain}>
      <div className={labContent}>
        <section className={labScroll}>
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">{HOME.title}</h1>
          </header>

          <div className="space-y-8">
            {HOME.sections.map((section) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-sm font-semibold">{section.title}</h2>
                <div className="space-y-3 rounded-lg border border-border bg-white px-4 py-3">
                  {section.paragraphs?.map((text) => (
                    <p key={text} className="text-sm leading-6 text-muted">
                      {text}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="space-y-2">
                      {section.bullets.map((item) => (
                        <li key={item} className="text-sm leading-6 text-muted">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h2 className="text-sm font-semibold">{HOME.stack.title}</h2>
                <Link
                  href={HOME.cta.href}
                  className="inline-flex shrink-0 rounded-md bg-accent px-3.5 py-1.5 text-sm text-accent-fg transition-opacity hover:opacity-90"
                >
                  {HOME.cta.label}
                </Link>
              </div>
              <dl className="rounded-lg border border-border bg-white px-4 py-3">
                {HOME.stack.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-1 border-b border-border py-2 last:border-0 sm:flex-row sm:gap-4"
                  >
                    <dt className="shrink-0 text-sm text-muted sm:w-24">{item.label}</dt>
                    <dd className="text-sm leading-6">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </section>
      </div>

      <DocLinksSidebar
        links={HOME.docLinks}
        description="深入概念与完整 API 请查阅 LangGraph 官方文档。"
      />
    </main>
  );
}

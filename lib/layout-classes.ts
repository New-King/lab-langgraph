/** 全站布局 class，保持各页响应式一致 */
export const labMain = "flex min-h-0 flex-1 flex-col lg:flex-row";
export const labContent =
  "flex min-w-0 flex-1 flex-col border-b border-border lg:border-b-0 lg:border-r";
export const labScroll = "min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6";
export const labPreview =
  "flex w-full min-w-0 shrink-0 flex-col overflow-x-hidden overflow-y-auto bg-sidebar p-4 sm:p-6 lg:w-[min(420px,34%)]";
export const labPreviewCollapsed =
  "hidden w-full min-w-0 shrink-0 flex-col overflow-hidden border-t border-border bg-sidebar lg:flex lg:w-12 lg:border-t-0 lg:border-l";
export const labFileGrid =
  "grid min-h-[200px] min-w-0 grid-cols-1 gap-4 md:grid-cols-[minmax(180px,28%)_minmax(0,1fr)] lg:min-h-[280px] [&>*]:min-w-0";

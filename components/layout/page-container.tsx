import { cn } from "@/lib/utils";

export function PageContainer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div id="main-content" className={cn("mx-auto w-full max-w-7xl overflow-x-clip px-4 py-6 sm:px-6 lg:px-8", className)} {...props} />;
}

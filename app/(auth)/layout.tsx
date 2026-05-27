import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1fr_480px]">
      <section className="hidden border-r border-border bg-surface p-10 lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-primary-text">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-sm text-white">K</span>
          VendorHub
        </Link>
        <div>
          <p className="text-sm font-medium uppercase text-secondary-text">Marketplace infrastructure</p>
          <h1 className="mt-3 max-w-xl text-3xl font-semibold leading-tight text-primary-text">
            One operating surface for buyers, vendors, and marketplace teams.
          </h1>
        </div>
      </section>
      <main className="flex items-center justify-center p-6">{children}</main>
    </div>
  );
}

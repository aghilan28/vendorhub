import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FormShell({ title, description, fields }: { title: string; description: string; fields: string[] }) {
  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-primary-text">{title}</h1>
      <p className="mt-2 text-sm text-secondary-text">{description}</p>
      <form className="mt-6 space-y-4">
        {fields.map((field) => (
          <label className="block space-y-1.5" key={field}>
            <span className="text-xs font-medium uppercase text-secondary-text">{field}</span>
            <Input placeholder={field} />
          </label>
        ))}
        <Button className="w-full" type="button">
          Continue
        </Button>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-secondary-text">
        <a className="inline-flex min-h-11 items-center font-medium text-brand hover:text-brand-hover" href="/auth/login">Sign in</a>
        <span aria-hidden>or</span>
        <a className="inline-flex min-h-11 items-center font-medium text-brand hover:text-brand-hover" href="/auth/register">create an account</a>
      </div>
    </div>
  );
}

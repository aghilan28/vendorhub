import { FormShell } from "@/components/shared/form-shell";

export default function SignUpPage() {
  return <FormShell title="Create account" description="Buyer identity registration shell using centralized validation patterns." fields={["Name", "Email", "Password"]} />;
}

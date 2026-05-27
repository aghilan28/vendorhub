import { FormShell } from "@/components/shared/form-shell";

export default function SignInPage() {
  return <FormShell title="Sign in" description="Access VendorHub operations with the auth shell prepared for future identity wiring." fields={["Email", "Password"]} />;
}

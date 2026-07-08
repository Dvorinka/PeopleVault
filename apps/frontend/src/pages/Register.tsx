import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function Register(): React.ReactElement {
  return (
    <AuthShell
      title="Create your vault"
      description="A private place for the people who matter most."
    >
      <RegisterForm />
    </AuthShell>
  );
}

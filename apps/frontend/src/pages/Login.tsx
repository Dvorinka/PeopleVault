import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { Link } from "react-router-dom";

export default function Login(): React.ReactElement {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to your private vault of connections."
      footer={
        <>
          New to PeopleVault?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}

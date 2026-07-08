import * as React from "react";
import { Mail, CheckCircle2 } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { apiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export default function ForgotPassword(): React.ReactElement {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const { toast } = useToast();

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.POST("/auth/forgot-password", { body: { email: email.trim() } });
      // Always show success to prevent email enumeration.
    } catch (err) {
      // Even on network error we show success per spec; log only.
      void apiError(err);
    } finally {
      setSent(true);
      setLoading(false);
      toast({
        title: "Check your inbox",
        description: "If an account exists, a reset link is on its way.",
      });
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      description="We'll send a reset link to your email."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <p className="text-sm text-muted-foreground text-pretty">
            If an account exists for <strong className="text-foreground">{email || "that email"}</strong>,
            you'll receive a password reset link shortly. Check your spam folder if
            you don't see it.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
            Send to a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-9"
                disabled={loading}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

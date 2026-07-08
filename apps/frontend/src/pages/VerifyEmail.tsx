import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, MailCheck } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, apiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail(): React.ReactElement {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [token, setToken] = React.useState(params.get("token") ?? "");
  const [loading, setLoading] = React.useState(false);
  const [verified, setVerified] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = params.get("token");
    if (t) {
      void verify(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async (tok: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { error: apiErr } = await api.POST("/auth/verify-email", {
        body: { token: tok },
      });
      if (apiErr) throw new Error(apiError(apiErr));
      setVerified(true);
      toast({ title: "Email verified", description: "Thanks for confirming." });
    } catch (err) {
      const msg = apiError(err);
      setError(msg);
      toast({ variant: "destructive", title: "Verification failed", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    void verify(token.trim());
  };

  return (
    <AuthShell
      title="Verify your email"
      description="Confirm your email to unlock your vault."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {verified ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your email is verified. You're all set.
          </p>
          <Button className="w-full" onClick={() => navigate("/login")}>
            Continue to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="flex flex-col items-center gap-2 pb-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-highlight">
              <MailCheck className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Paste the verification token from your email.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="token">Verification token</Label>
            <Input
              id="token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token here"
              disabled={loading}
            />
          </div>
          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Verifying…" : "Verify email"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

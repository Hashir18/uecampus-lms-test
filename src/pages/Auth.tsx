import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import ueLogo from "@/assets/ue-campus-logo.png";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const rawBase =
  (import.meta.env.VITE_BASENAME as string | undefined) ||
  (import.meta.env.BASE_URL as string | undefined) ||
  "/";
const BASENAME = rawBase === "/" ? "" : `/${rawBase.replace(/^\/+|\/+$/g, "")}`;

export default function Auth() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast.dismiss();
    setLoading(true);

    try {
      const validated = loginSchema.parse({ email, password });

      const res = await apiFetch<{ token: string; user?: any; roles?: string[] }>(
        "/auth/login",
        {
          method: "POST",
          body: {
            email: validated.email,
            password: validated.password,
          },
        }
      );

      if (!res || !res.token) {
        throw new Error("Authentication failed: No token received");
      }

      const fallbackUser = res.user ?? {
        id: "self",
        email: validated.email,
        full_name: "",
        avatar_url: "",
        is_blocked: false,
      };

      if (fallbackUser.is_blocked) {
        toast.error("This account is blocked. Contact an administrator.");
        setFormKey((prev) => prev + 1);
        setEmail("");
        setPassword("");
        navigate(BASENAME ? `${BASENAME}/blocked` : "/blocked", { replace: true });
        return;
      }

      const success = await login(res.token, {
        user: fallbackUser,
        roles: res.roles,
      });

      if (success) {
        toast.success("Login successful!");
        setEmail("");
        setPassword("");
        setFormKey((prev) => prev + 1);

        const target = BASENAME
          ? `${BASENAME}/dashboard`
          : "/dashboard";
        navigate(target, { replace: true });
      } else {
        throw new Error("Login failed after token set");
      }
    } catch (error: any) {
      setFormKey((prev) => prev + 1);

      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error instanceof ApiError && error.status === 403) {
        toast.error("Your account is blocked. Contact an administrator.");
        navigate(BASENAME ? `${BASENAME}/blocked` : "/blocked", {
          replace: true,
        });
      } else if (
        error.message?.includes("401") ||
        error.message?.includes("Invalid credentials")
      ) {
        toast.error("Invalid email or password");
      } else if (error.message?.includes("Network")) {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error(error.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-[#191c3b]">
      <div
        className="absolute inset-0 bg-white"
        style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%, 0 100%)" }}
      />
      {/* LEFT SIDE */}
      <div className="hidden lg:flex w-1/2 relative">
        <div className="flex flex-col justify-center px-20 xl:px-28 w-full">
          <div className="flex justify-start">
            <img
              src={ueLogo}
              alt="UE Campus"
              className="h-20 w-auto mb-16"
            />
          </div>

          <div className="space-y-6 text-[#1f1f1f]">
            <div className="h-1 w-14 bg-[#5b4bdf]" />
            <h2 className="text-5xl font-bold leading-tight">
              Study anywhere
              <br />
              Achieve everywhere
            </h2>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 lg:px-12 py-16 relative z-10">
        <Card className="w-full max-w-lg bg-[#191c3b] border border-white/10 text-white shadow-2xl">
          <CardContent className="pt-8 pb-10 px-8 space-y-6">
            <p className="text-2xl font-semibold">Log in to your account</p>

            <form
              key={formKey}
              onSubmit={handleLogin}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-white/80">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-white text-black"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-white/80">
                    <Lock className="h-4 w-4" />
                    Password
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-8 px-2 text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-white text-black"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="text-xs text-white/60 px-0"
                  onClick={() =>
                    toast.info("Use your administrator to reset your password.")
                  }
                >
                  Forgot your password?
                </Button>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#6a1b9a] hover:bg-[#591782] text-white"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Login"}
              </Button>

              <Button
                type="button"
                className="w-full bg-[#6a1b9a] hover:bg-[#591782] text-white"
                onClick={() =>
                  window.open("https://www.uecampus.com/enquire-now", "_blank")
                }
              >
                Signup
              </Button>

              <p className="text-xs text-white/60 text-center pt-2">
                Need access? Contact your administrator.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

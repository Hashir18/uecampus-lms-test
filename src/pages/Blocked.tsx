import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, LogOut } from "lucide-react";
import { toast } from "sonner";
import { clearAuthToken } from "@/lib/api";

export default function Blocked() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    clearAuthToken();
    toast.success("Logged out successfully");
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl border-destructive/50">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Account Temporarily Blocked</CardTitle>
          <CardDescription className="text-base">
            Your account has been temporarily blocked from accessing the LMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Possible Reasons:</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-destructive">•</span>
                <span>Violation of platform terms and conditions</span>
              </li>
              <li className="flex gap-2">
                <span className="text-destructive">•</span>
                <span>Suspicious account activity detected</span>
              </li>
              <li className="flex gap-2">
                <span className="text-destructive">•</span>
                <span>Multiple failed login attempts</span>
              </li>
              <li className="flex gap-2">
                <span className="text-destructive">•</span>
                <span>Administrative action pending review</span>
              </li>
              <li className="flex gap-2">
                <span className="text-destructive">•</span>
                <span>Outstanding payment or enrollment issues</span>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-semibold">What can you do?</h4>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error or would like to appeal this decision, 
              please contact your administrator or support team for assistance.
            </p>
          </div>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full gap-2"
          >
            <LogOut className="h-4 w-4" />
            Return to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

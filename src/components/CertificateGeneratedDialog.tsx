import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Award, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CertificateGeneratedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CertificateGeneratedDialog({ 
  open, 
  onOpenChange 
}: CertificateGeneratedDialogProps) {
  const navigate = useNavigate();

  const handleViewCertificate = () => {
    onOpenChange(false);
    navigate("/certificates");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Award className="h-16 w-16 text-primary animate-pulse" />
              <CheckCircle className="h-6 w-6 text-green-500 absolute -top-1 -right-1" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Congratulations! 🎉
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-4 py-4">
          <p className="text-lg font-medium text-foreground">
            Your certificate has been generated!
          </p>
          <p className="text-muted-foreground">
            You've successfully completed all course materials. Your certificate is ready to view and download.
          </p>
          
          <div className="pt-4">
            <Button 
              onClick={handleViewCertificate}
              className="w-full"
              size="lg"
            >
              <Award className="mr-2 h-5 w-5" />
              View Certificate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
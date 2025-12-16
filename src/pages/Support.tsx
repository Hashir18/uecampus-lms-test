import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Support() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-purple-700 to-primary text-white p-10 shadow-2xl">
        <div className="absolute inset-0 bg-primary/30" />
        <div className="relative z-10 space-y-3 text-center">
          <Badge className="bg-white/20 text-white border-white/30">We&apos;re here to help</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">Contact Us</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
            We&apos;re here to help! Whether you have questions about courses, admissions, scholarships, or need support during your studies, the UeCampus team is ready to assist you.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg border-border/50">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
              <Phone className="h-6 w-6" />
            </div>
            <CardTitle>Phone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <p>Call us Monday to Friday, 9:00 AM - 6:00 PM (GMT+1)</p>
            <p className="text-lg font-semibold text-primary dark:text-primary-foreground">+44 7586 797014 (UK)</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle>Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <div className="space-y-1">
              <p><span className="font-semibold text-foreground">General:</span> info@uecampus.com</p>
              <p><span className="font-semibold text-foreground">Admissions:</span> admissions@uecampus.com</p>
              <p><span className="font-semibold text-foreground">Support:</span> support@uecampus.com</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
              <Clock className="h-6 w-6" />
            </div>
            <CardTitle>Office Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <p>Monday - Friday: 9:00 AM - 6:00 PM (GMT+1)</p>
            <p>Saturday: 9:00 AM - 9:00 PM (GMT) via live chat</p>
            <p>Sunday: Closed</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
              <MapPin className="h-6 w-6" />
            </div>
            <CardTitle>Mailing Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <p>UeCampus Headquarters</p>
            <p>Office 249, 2nd Floor, Titan Court,</p>
            <p>3 Bishop Square, Hatfield, Hertfordshire, England, AL10 9NA</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-border/50">
        <CardHeader>
          <CardTitle>Book a Meeting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">
            Schedule a time with our support team for personalized assistance.
          </p>
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-border/60">
            <iframe
              src="https://calendly.com/uecampus-support"
              className="w-full h-full"
              frameBorder="0"
              title="Book a meeting with UeCampus Support"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

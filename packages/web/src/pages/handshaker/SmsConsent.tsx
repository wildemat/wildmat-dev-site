import { useState } from "react";
import { Link } from "react-router-dom";
import PageSection from "@/components/layout/PageSection";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { CheckCircle, XCircle } from "lucide-react";

const SmsConsentPage = () => {
  useDocumentTitle("SMS Consent — Handshaker by Wildmat Dev");

  const [termsAcknowledged, setTermsAcknowledged] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [declined, setDeclined] = useState(false);

  if (declined) {
    return (
      <PageSection centered className="flex-1 py-16">
        <Card className="max-w-md w-full text-left">
          <CardHeader className="items-center text-center">
            <XCircle className="h-12 w-12 text-muted-foreground mb-2" />
            <CardTitle>No Problem</CardTitle>
            <CardDescription>
              You have not been enrolled in SMS notifications. You can return to
              this page at any time if you change your mind.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              If you have questions, contact us at{" "}
              <a href="mailto:hello@wildmat.dev" className="underline">
                hello@wildmat.dev
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </PageSection>
    );
  }

  if (submitted) {
    return (
      <PageSection centered className="flex-1 py-16">
        <Card className="max-w-md w-full text-left">
          <CardHeader className="items-center text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
            <CardTitle>You're Enrolled</CardTitle>
            <CardDescription>
              You have successfully opted in to receive transactional SMS
              notifications from Handshaker by Wildmat Dev.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              You will receive SMS messages from Handshaker (Wildmat Dev)
              only when a workflow action requires your response. Reply{" "}
              <strong>STOP</strong> at any time to opt out.
            </p>
            <p>
              Reply <strong>HELP</strong> for assistance or contact us at{" "}
              <a href="mailto:hello@wildmat.dev" className="underline">
                hello@wildmat.dev
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </PageSection>
    );
  }

  return (
    <PageSection centered className="flex-1 py-16">
      <Card className="max-w-md w-full text-left">
        <CardHeader>
          <CardTitle>Handshaker by Wildmat Dev</CardTitle>
          <CardDescription>
            Handshaker, a Wildmat Dev service, would like to send you
            transactional SMS messages when a workflow action requires your
            response. This consent is entirely optional.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              If you opt in, you will receive automated SMS messages from{" "}
              <strong>Handshaker</strong>, a service operated by{" "}
              <strong>Wildmat Dev</strong>, containing approval requests and
              confirmations. Messages are transactional and sent only when an
              action requires your response.
            </p>
            <p>
              Message frequency varies. Standard message and data rates may
              apply. Reply <strong>STOP</strong> to cancel at any time. Reply{" "}
              <strong>HELP</strong> for help.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAcknowledged}
                onChange={(e) => setTermsAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm leading-snug">
                I have read and acknowledge the{" "}
                <Link
                  to="/handshaker/sms-terms"
                  className="underline font-medium"
                  target="_blank"
                >
                  SMS Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/handshaker/privacy"
                  className="underline font-medium"
                  target="_blank"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm leading-snug">
                I consent to receive transactional SMS messages from{" "}
                <strong>Handshaker by Wildmat Dev</strong>.
              </span>
            </label>
          </div>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setDeclined(true)}
          >
            No Thanks
          </Button>
          <Button
            className="flex-1"
            disabled={!termsAcknowledged || !smsConsent}
            onClick={() => setSubmitted(true)}
          >
            Opt In
          </Button>
        </CardFooter>
      </Card>
    </PageSection>
  );
};

export default SmsConsentPage;

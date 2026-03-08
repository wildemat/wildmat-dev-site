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
import { CheckCircle } from "lucide-react";

const SmsConsentPage = () => {
  useDocumentTitle("SMS Consent");

  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <PageSection centered className="flex-1 py-16">
        <Card className="max-w-md w-full text-left">
          <CardHeader className="items-center text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
            <CardTitle>You're Enrolled</CardTitle>
            <CardDescription>
              You have successfully opted in to Handshaker SMS notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              You will receive SMS messages when a workflow requires your
              approval. Reply <strong>STOP</strong> at any time to opt out.
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
          <CardTitle>Handshaker SMS Notifications</CardTitle>
          <CardDescription>
            Opt in to receive transactional SMS messages for workflow
            approvals and notifications.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              By opting in, you agree to receive automated SMS messages from
              Handshaker when a workflow action requires your response. Messages
              may include approval requests, status updates, and confirmations.
            </p>
            <p>
              Message frequency varies based on your subscribed workflows.
              Standard message and data rates may apply.
            </p>
            <p>
              Reply <strong>STOP</strong> to cancel at any time. Reply{" "}
              <strong>HELP</strong> for help.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm leading-snug">
              I agree to the{" "}
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
              , and consent to receive SMS messages from Handshaker.
            </span>
          </label>
        </CardContent>

        <CardFooter>
          <Button
            className="w-full"
            disabled={!agreed}
            onClick={() => setSubmitted(true)}
          >
            Opt In to SMS Notifications
          </Button>
        </CardFooter>
      </Card>
    </PageSection>
  );
};

export default SmsConsentPage;

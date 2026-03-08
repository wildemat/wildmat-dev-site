import { Link } from "react-router-dom";
import PageSection from "@/components/layout/PageSection";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const SmsTermsPage = () => {
  useDocumentTitle("SMS Terms of Service");

  return (
    <PageSection className="max-w-2xl mx-auto py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>SMS Terms of Service</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: March 7, 2026
        </p>

        <h2>Program Name</h2>
        <p>
          Handshaker Notifications — operated by Matt Wilde
          (wildmat.dev).
        </p>

        <h2>Program Description</h2>
        <p>
          Handshaker is a transactional notification service that sends SMS
          messages to request approvals or confirmations for workflows you have
          subscribed to. When an action requires your approval, you will receive
          an SMS describing the request and can reply to approve or deny it.
        </p>

        <h2>Message Frequency</h2>
        <p>
          Message frequency varies based on the workflows you are subscribed to.
          You will only receive messages when an action requires your response.
        </p>

        <h2>Message and Data Rates</h2>
        <p>
          Message and data rates may apply. Please contact your wireless carrier
          for details about your messaging plan.
        </p>

        <h2>Opt-Out</h2>
        <p>
          You can opt out of receiving SMS messages at any time by replying{" "}
          <strong>STOP</strong> to any message you receive from Handshaker. After
          opting out, you will receive a one-time confirmation message and no
          further SMS messages will be sent to your number.
        </p>

        <h2>Help</h2>
        <p>
          For help, reply <strong>HELP</strong> to any message you receive from
          Handshaker, or contact us at{" "}
          <a href="mailto:hello@wildmat.dev">hello@wildmat.dev</a>.
        </p>

        <h2>Supported Carriers</h2>
        <p>
          Messages are sent via standard SMS and are supported by all major US
          carriers including AT&T, Verizon, T-Mobile, Sprint, and others.
        </p>

        <h2>Carrier Liability</h2>
        <p>
          Carriers are not liable for delayed or undelivered messages. Message
          delivery is subject to effective transmission from your wireless
          carrier and network availability.
        </p>

        <h2>Privacy</h2>
        <p>
          Your phone number and consent information are handled in accordance
          with our{" "}
          <Link to="/handshaker/privacy" className="underline">
            Privacy Policy
          </Link>
          . We do not sell or share your phone number with third parties for
          marketing purposes.
        </p>

        <h2>Contact</h2>
        <p>
          Matt Wilde
          <br />
          Email:{" "}
          <a href="mailto:hello@wildmat.dev">hello@wildmat.dev</a>
          <br />
          Web:{" "}
          <a
            href="https://wildmat.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            wildmat.dev
          </a>
        </p>
      </article>
    </PageSection>
  );
};

export default SmsTermsPage;

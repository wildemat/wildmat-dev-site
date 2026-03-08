import { Link } from "react-router-dom";
import PageSection from "@/components/layout/PageSection";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const PrivacyPolicyPage = () => {
  useDocumentTitle("Privacy Policy");

  return (
    <PageSection className="max-w-2xl mx-auto py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: March 7, 2026
        </p>

        <p>
          This Privacy Policy describes how Matt Wilde ("we", "us", "our")
          collects, uses, and protects information in connection with the
          Handshaker SMS notification service. By using Handshaker or providing
          your phone number for SMS notifications, you agree to the practices
          described in this policy.
        </p>

        <h2>Information We Collect</h2>
        <p>We collect the following information when you opt in to Handshaker SMS notifications:</p>
        <ul>
          <li>
            <strong>Phone number</strong> — the mobile number you provide to
            receive SMS notifications.
          </li>
          <li>
            <strong>Consent record</strong> — a timestamped record of when and
            how you opted in, including the source of consent (e.g. web form,
            API integration).
          </li>
          <li>
            <strong>Message history</strong> — records of SMS messages sent to
            and received from your number, including your responses to
            handshake requests.
          </li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>Your information is used exclusively to:</p>
        <ul>
          <li>Send you transactional SMS messages related to workflows you have subscribed to.</li>
          <li>Process your replies to approve or deny handshake requests.</li>
          <li>Honor opt-out requests and manage your consent status.</li>
          <li>Maintain records as required by telecommunications regulations.</li>
        </ul>

        <h2>Information Shared with Third Parties</h2>
        <p>
          We use <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer">Twilio</a> as
          our SMS delivery provider. When we send or receive messages, the
          following information is transmitted to Twilio:
        </p>
        <ul>
          <li>Your phone number</li>
          <li>Message content</li>
          <li>Message delivery status</li>
        </ul>
        <p>
          Twilio processes this data in accordance with their{" "}
          <a
            href="https://www.twilio.com/en-us/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
          . Mobile carriers also process your phone number and message metadata
          as part of standard SMS delivery.
        </p>
        <p>
          We do not sell, rent, or share your phone number or personal
          information with any other third parties for marketing or advertising
          purposes.
        </p>

        <h2>Data Retention</h2>
        <ul>
          <li>
            <strong>Consent records</strong> are retained for the duration of
            your participation and for a minimum of 5 years after you opt out,
            as required for TCPA compliance.
          </li>
          <li>
            <strong>Message logs</strong> are retained for up to 12 months
            after delivery, then permanently deleted.
          </li>
          <li>
            <strong>Phone numbers</strong> of opted-out users are retained only
            in the opt-out list to prevent re-enrollment without fresh consent.
          </li>
        </ul>

        <h2>Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>
            <strong>Opt out</strong> at any time by replying STOP to any SMS
            message. See our{" "}
            <Link to="/handshaker/sms-terms" className="underline">
              SMS Terms of Service
            </Link>{" "}
            for details.
          </li>
          <li>
            <strong>Request access</strong> to the personal data we hold about
            you by contacting us at the address below.
          </li>
          <li>
            <strong>Request deletion</strong> of your personal data. Upon
            request, we will delete your phone number, message history, and
            associated records, except where retention is required by law or
            for opt-out enforcement.
          </li>
        </ul>

        <h2>Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to
          protect your information, including encrypted storage and
          access controls. However, no method of electronic transmission or
          storage is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Changes will be
          reflected by the "Last updated" date at the top of this page. Your
          continued use of the service after changes constitutes acceptance of
          the revised policy.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about this Privacy Policy or to exercise your rights,
          contact us:
        </p>
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

export default PrivacyPolicyPage;

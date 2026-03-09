import { Link } from "react-router-dom";
import PageSection from "@/components/layout/PageSection";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const BusinessPage = () => {
  useDocumentTitle("Business Information");

  return (
    <PageSection className="max-w-2xl mx-auto py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>Business Information</h1>

        <h2>About</h2>
        <p>
          Matt Wilde is a software engineer operating as a{" "}
          <strong>sole proprietor</strong> based in Charlotte, North Carolina.
          This website and its associated services — including{" "}
          <strong>Handshaker</strong> — are owned and operated by Matt Wilde.
        </p>

        <h2>Services</h2>
        <p>
          <strong>Handshaker</strong> is a transactional notification and
          approval workflow service. It enables automated two-way SMS
          communication for approval requests, confirmations, and status
          updates. Users opt in to receive messages and can respond directly via
          SMS to approve or deny workflow actions.
        </p>
        <p>
          For details on how the SMS program works, see the{" "}
          <Link to="/handshaker/sms-terms" className="underline">
            SMS Terms of Service
          </Link>
          . For information on how your data is handled, see the{" "}
          <Link to="/handshaker/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>

        <h2>Business Contact</h2>
        <table>
          <tbody>
            <tr>
              <td>
                <strong>Name</strong>
              </td>
              <td>Matt Wilde</td>
            </tr>
            <tr>
              <td>
                <strong>Email</strong>
              </td>
              <td>
                <a href="mailto:business@wildmat.dev">business@wildmat.dev</a>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Phone</strong>
              </td>
              <td>
                <a href="tel:+18083532794">(808) 353-2794</a>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Website</strong>
              </td>
              <td>
                <a
                  href="https://wildmat.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  wildmat.dev
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <h2>Business Address</h2>
        <address className="not-italic">
          Matt Wilde
          <br />
          1422 S Tryon St
          <br />
          Charlotte, NC 28203
          <br />
          United States
        </address>

        <h2>Business Type</h2>
        <p>
          Sole proprietorship. As a sole proprietor, no EIN or business
          registration number is required for Toll-Free Verification per current
          TCPA and carrier guidelines (sole proprietorships are exempt from the
          Business Registration Number requirement effective February 17, 2026).
        </p>
      </article>
    </PageSection>
  );
};

export default BusinessPage;

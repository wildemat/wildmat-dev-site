import { Link } from "react-router-dom";
import PageSection from "@/components/layout/PageSection";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const BusinessPage = () => {
  useDocumentTitle("Business Information");

  return (
    <PageSection className="max-w-2xl mx-auto py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>WILDMAT DEV</h1>

        <h2>About</h2>
        <p>
          Wildmat Dev is a <strong>sole proprietorship</strong> owned and
          operated by Matt Wilde, based in Charlotte, North Carolina. This
          website and its associated services are owned and operated by Wildmat
          Dev.
        </p>

        <h2>Services</h2>
        <p>
          <strong>Handshaker</strong> is a transactional SMS notification
          service operated by Wildmat Dev. It sends messages to request
          approvals or confirmations for workflow actions. Recipients opt in to
          receive messages from Handshaker and can respond directly via SMS to
          approve or deny requests. No marketing or promotional messages are
          sent.
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
          Sole proprietorship (EIN: 41-4732990).
        </p>
      </article>
    </PageSection>
  );
};

export default BusinessPage;

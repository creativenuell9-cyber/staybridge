import Link from "next/link";
import { PageShell } from "@/app/components/page-shell";

const benefits = [
  "Increase visibility to qualified guests in the Enugu market and beyond",
  "Access promotional support and partner-first hospitality campaigns",
  "Receive curated reservation and booking assistance opportunities",
  "Grow your business through trusted brand positioning and guest confidence",
];

export default function PartnerPage() {
  return (
    <PageShell title="Partner With StayBridge">
      <div className="container py-5">
        <div className="row align-items-center g-5">
          <div className="col-lg-6">
            <p className="eyebrow">Partner with us</p>
            <h1 className="display-5 fw-bold mb-3">Grow your hospitality business with confidence.</h1>
            <p className="lead text-body-secondary">
              Join a premium network built for hotels, guest houses, resorts, serviced apartments, and boutique hospitality providers that value visibility, quality service, and growth.
            </p>
            <div className="d-flex flex-wrap gap-3 mt-4">
              <Link href="/register" className="btn btn-primary rounded-pill px-4">List your property</Link>
              <Link href="/discover" className="btn btn-outline-primary rounded-pill px-4">Explore listings</Link>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="feature-panel p-4 p-lg-5">
              <h3 className="h4 fw-semibold mb-3">Launch restriction notice</h3>
              <p className="text-body-secondary">
                Public registration remains gated until all security, verification, and approval requirements are completed and both founding partners authorize launch.
              </p>
              <div className="alert alert-warning mb-0">
                Registration workflow is reserved for secure, compliant listing submissions only.
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4 mt-2">
          {benefits.map((benefit, index) => (
            <div key={benefit} className="col-lg-6">
              <div className="info-card h-100 p-4">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <span className="feature-bullet">0{index + 1}</span>
                  <h3 className="h5 mb-0">Partner advantage</h3>
                </div>
                <p className="text-body-secondary mb-0">{benefit}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

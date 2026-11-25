import { PageShell } from "@/app/components/page-shell";

const values = [
  "Trusted property verification and publication standards",
  "Luxury-focused market positioning to elevate guest confidence",
  "Local hospitality expertise backed by national growth strategy",
  "Reservation assistance with transparent communication",
];

export default function AboutPage() {
  return (
    <PageShell title="About StayBridge">
      <div className="container py-5">
        <div className="row align-items-center g-5">
          <div className="col-lg-6">
            <p className="eyebrow">About us</p>
            <h1 className="display-5 fw-bold mb-3">StayBridge connects travelers with better stays.</h1>
            <p className="lead text-body-secondary">
              Headquartered in Enugu, Nigeria, StayBridge Hospitality is a premium hospitality marketing and partnership company helping travelers discover dependable accommodations and helping property owners grow through curated visibility and reservation support.
            </p>
            <p className="text-body-secondary">
              We work with carefully selected hospitality businesses to present trustworthy, elegant accommodation options while maintaining strong standards for quality, service, and compliance.
            </p>
          </div>

          <div className="col-lg-6">
            <div className="feature-panel p-4 p-lg-5">
              <div className="row g-3">
                <div className="col-6">
                  <div className="stat-card">
                    <strong>Enugu</strong>
                    <span>Launch city</span>
                  </div>
                </div>
                <div className="col-6">
                  <div className="stat-card">
                    <strong>Reviewed</strong>
                    <span>Before publication</span>
                  </div>
                </div>
                <div className="col-6">
                  <div className="stat-card">
                    <strong>Nigeria</strong>
                    <span>Local market</span>
                  </div>
                </div>
                <div className="col-6">
                  <div className="stat-card">
                    <strong>By enquiry</strong>
                    <span>Reservation support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row mt-5 g-4">
          <div className="col-lg-6">
            <div className="info-card h-100 p-4">
              <p className="eyebrow">Our mission</p>
              <h3 className="h4 fw-semibold">To transform the hospitality discovery experience.</h3>
              <p className="text-body-secondary mb-0">
                We believe every traveler deserves transparent access to quality accommodation and every hospitality business deserves strategic growth support without compromising integrity.
              </p>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="info-card h-100 p-4">
              <p className="eyebrow">What we value</p>
              <ul className="check-list mb-0 ps-3">
                {values.map((value) => (
                  <li key={value}>{value}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

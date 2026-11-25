import { PageShell } from "@/app/components/page-shell";

export default function ContactPage() {
  return (
    <PageShell title="Contact StayBridge">
      <div className="container py-5">
        <div className="row g-5">
          <div className="col-lg-5">
            <p className="eyebrow">Contact</p>
            <h1 className="display-5 fw-bold mb-3">Let&apos;s help you plan the right stay.</h1>
            <p className="lead text-body-secondary">
              Reach out for travel enquiries, hospitality partnerships, and partnership conversations. Please use the placeholders below during development.
            </p>

            <div className="info-card p-4 mt-4">
              <ul className="list-unstyled contact-list mb-0">
                <li><strong>Email:</strong> hello@staybridge.example</li>
                <li><strong>Telephone:</strong> +234 800 000 0000</li>
                <li><strong>WhatsApp:</strong> +234 800 000 0000</li>
                <li><strong>Instagram:</strong> @staybridgehospitality</li>
              </ul>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="feature-panel p-4 p-lg-5">
              <form className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Full name</label>
                  <input className="form-control" placeholder="Your name" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" placeholder="you@example.com" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phone</label>
                  <input className="form-control" placeholder="+234..." />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Subject</label>
                  <select className="form-select">
                    <option>General enquiry</option>
                    <option>Property listing</option>
                    <option>Reservation assistance</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">Message</label>
                  <textarea className="form-control" rows={5} placeholder="Tell us how we can help..." />
                </div>
                <div className="col-12 text-end">
                  <button className="btn btn-primary px-4 rounded-pill" type="button">Send message</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

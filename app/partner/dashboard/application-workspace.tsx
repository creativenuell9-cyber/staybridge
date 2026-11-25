"use client";

import { useState } from "react";

const categories = [
  ["hotel", "Hotel"],
  ["luxury_hotel", "Luxury hotel"],
  ["boutique_hotel", "Boutique hotel"],
  ["resort", "Resort"],
  ["guest_house", "Guest house"],
  ["serviced_apartment", "Serviced apartment"],
  ["short_let_apartment", "Short-let apartment"],
  ["lodge", "Lodge"],
  ["hostel", "Hostel"],
  ["other", "Other"],
];

interface PartnerApplication {
  id: string;
  status: string;
  submitted_at: string | null;
  property: {
    id: string;
    name: string;
    city: string;
    state: string;
    photoCount: number;
    documentCount: number;
  };
}

function UploadFiles({ propertyId }: { propertyId: string }) {
  const [kind, setKind] = useState<"photo" | "document">("photo");
  const [category, setCategory] = useState("exterior");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const availableCategories =
    kind === "photo"
      ? [
          ["exterior", "Exterior"],
          ["reception", "Reception"],
          ["bedroom", "Bedroom"],
          ["bathroom", "Bathroom"],
          ["restaurant", "Restaurant"],
          ["pool", "Pool"],
          ["facility", "Facility"],
          ["other", "Other"],
        ]
      : [
          ["business_registration", "Business registration"],
          ["business_identity", "Business identity"],
          ["hospitality_permit", "Hospitality permit"],
          ["representative_authority", "Representative authority"],
          ["other", "Other"],
        ];

  async function submitFile(formData: FormData) {
    setBusy(true);
    setError("");
    setMessage("");

    const file = formData.get("file");
    if (!(file instanceof File)) {
      setError("Choose a supported file before uploading.");
      setBusy(false);
      return;
    }

    try {
      const requestData = new FormData();
      requestData.set("file", file);
      requestData.set("kind", kind);
      requestData.set("category", category);
      requestData.set("altText", String(formData.get("altText") ?? ""));

      const response = await fetch(`/api/partner/properties/${propertyId}/files`, {
        method: "POST",
        body: requestData,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not upload this file.");
        return;
      }

      setMessage("File uploaded securely. Refresh the page to update application counts.");
    } catch {
      setError("Could not reach the upload service. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      action={(formData) => {
        void submitFile(formData);
      }}
      className="upload-workspace row g-3 mt-2"
    >
      <div className="col-md-4">
        <label className="form-label" htmlFor={`upload-kind-${propertyId}`}>File type</label>
        <select
          className="form-select"
          id={`upload-kind-${propertyId}`}
          onChange={(event) => {
            const nextKind = event.target.value === "document" ? "document" : "photo";
            setKind(nextKind);
            setCategory(nextKind === "photo" ? "exterior" : "business_registration");
          }}
          value={kind}
        >
          <option value="photo">Property photo</option>
          <option value="document">Verification document</option>
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label" htmlFor={`upload-category-${propertyId}`}>Category</label>
        <select
          className="form-select"
          id={`upload-category-${propertyId}`}
          onChange={(event) => setCategory(event.target.value)}
          value={category}
        >
          {availableCategories.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label" htmlFor={`upload-file-${propertyId}`}>File</label>
        <input
          accept={kind === "photo" ? "image/jpeg,image/png,image/webp" : ".pdf,image/jpeg,image/png"}
          className="form-control"
          id={`upload-file-${propertyId}`}
          name="file"
          required
          type="file"
        />
      </div>
      {kind === "photo" && (
        <div className="col-12">
          <label className="form-label" htmlFor={`upload-alt-${propertyId}`}>Photo description</label>
          <input
            className="form-control"
            id={`upload-alt-${propertyId}`}
            maxLength={240}
            name="altText"
            placeholder="Describe this property photo"
          />
        </div>
      )}
      <div className="col-12">
        <button className="btn btn-outline-primary rounded-pill" disabled={busy} type="submit">
          {busy ? "Uploading…" : "Upload securely"}
        </button>
      </div>
      {error && <p className="col-12 text-danger mb-0" role="alert">{error}</p>}
      {message && <p className="col-12 text-success mb-0" role="status">{message}</p>}
      <p className="col-12 small text-body-secondary mb-0">
        Accepted formats are JPEG, PNG, WebP for photos and PDF, JPEG, PNG for documents. Maximum
        file size is 10 MB.
      </p>
    </form>
  );
}

export function ApplicationWorkspace({
  existingApplications,
  registrationOpen,
}: {
  existingApplications: PartnerApplication[];
  registrationOpen: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdApplication, setCreatedApplication] = useState<PartnerApplication | null>(null);

  async function submitApplication(formData: FormData) {
    setBusy(true);
    setError("");
    setSuccess("");

    const payload = Object.fromEntries(
      [
        "business_name",
        "trading_name",
        "business_email",
        "business_phone",
        "property_name",
        "category",
        "description",
        "address",
        "city",
        "state",
        "country",
      ].map((key) => [key, String(formData.get(key) ?? "").trim()]),
    );

    try {
      const response = await fetch("/api/partner/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not submit the property application.");
        return;
      }

      setCreatedApplication({
        id: result.applicationId,
        status: result.status,
        submitted_at: new Date().toISOString(),
        property: {
          id: result.propertyId,
          name: String(payload.property_name),
          city: String(payload.city),
          state: String(payload.state),
          photoCount: 0,
          documentCount: 0,
        },
      });
      setSuccess("Application submitted. Upload property photos and verification documents below.");
    } catch {
      setError("Could not reach the application service. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const applications = createdApplication
    ? [createdApplication, ...existingApplications]
    : existingApplications;

  return (
    <div className="d-grid gap-4">
      {registrationOpen ? (
        <section className="feature-panel p-4 p-lg-5">
          <p className="eyebrow">Property submission</p>
          <h2 className="h3 mb-4">Submit a property for review</h2>
          <form
            action={(formData) => {
              void submitApplication(formData);
            }}
            className="row g-3"
          >
            <div className="col-md-6">
              <label className="form-label" htmlFor="business-name">Legal business name</label>
              <input className="form-control" id="business-name" maxLength={160} name="business_name" required />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="trading-name">Trading name (optional)</label>
              <input className="form-control" id="trading-name" maxLength={160} name="trading_name" />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="business-email">Business email</label>
              <input className="form-control" id="business-email" maxLength={254} name="business_email" required type="email" />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="business-phone">Business phone</label>
              <input className="form-control" id="business-phone" maxLength={30} name="business_phone" required type="tel" />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="property-name">Property name</label>
              <input className="form-control" id="property-name" maxLength={160} name="property_name" required />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="property-category">Property category</label>
              <select className="form-select" id="property-category" name="category" required>
                {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="property-description">Property description</label>
              <textarea className="form-control" id="property-description" maxLength={4000} minLength={20} name="description" required rows={4} />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="property-address">Street address</label>
              <input className="form-control" id="property-address" maxLength={300} name="address" required />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="property-city">City</label>
              <input className="form-control" id="property-city" maxLength={100} name="city" required />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="property-state">State</label>
              <input className="form-control" id="property-state" maxLength={100} name="state" required />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="property-country">Country</label>
              <input className="form-control" defaultValue="Nigeria" id="property-country" maxLength={100} name="country" required />
            </div>
            {error && <p className="col-12 text-danger mb-0" role="alert">{error}</p>}
            {success && <p className="col-12 text-success mb-0" role="status">{success}</p>}
            <div className="col-12">
              <button className="btn btn-primary rounded-pill px-4" disabled={busy} type="submit">
                {busy ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <div className="alert alert-warning" role="status">
          New property registrations are currently closed pending database and launch authorization.
        </div>
      )}

      <section>
        <p className="eyebrow">Your submissions</p>
        <h2 className="h3 mb-4">Property application status</h2>
        {applications.length === 0 ? (
          <div className="info-card p-4">
            <p className="text-body-secondary mb-0">You have not submitted a property application.</p>
          </div>
        ) : (
          <div className="d-grid gap-4">
            {applications.map((application) => (
              <article className="info-card p-4" key={application.id}>
                <div className="d-flex justify-content-between flex-wrap gap-3">
                  <div>
                    <span className="status-pill">{application.status.replaceAll("_", " ")}</span>
                    <h3 className="h4 mt-3">{application.property.name}</h3>
                    <p className="text-body-secondary">
                      {application.property.city}, {application.property.state}
                    </p>
                    <p className="small text-body-secondary mb-0">
                      Uploaded: {application.property.photoCount} photos and{" "}
                      {application.property.documentCount} documents. Approval requires at least
                      one photo and one verification document.
                    </p>
                  </div>
                  <span className="small text-body-secondary">Reference: {application.id}</span>
                </div>
                <UploadFiles propertyId={application.property.id} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

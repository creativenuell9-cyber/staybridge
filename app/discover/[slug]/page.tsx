import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/app/components/page-shell";
import { getPublishedPropertyBySlug } from "@/lib/properties";
import { hasSupabaseConfiguration } from "@/lib/supabase/server";

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!hasSupabaseConfiguration()) {
    notFound();
  }

  const property = await getPublishedPropertyBySlug(slug);
  if (!property) {
    notFound();
  }

  return (
    <PageShell title={property.name}>
      <div className="container py-5">
        <div className="row g-4 align-items-start">
          <div className="col-lg-7">
            {property.imageUrl ? (
              <img src={property.imageUrl} alt={property.name} className="detail-hero-image" />
            ) : (
              <div className="property-image-placeholder detail-hero-image">{property.name}</div>
            )}
            {property.photos.length > 1 && (
              <div className="row g-3 mt-1">
                {property.photos.slice(1).map((photo) => (
                  <div className="col-6" key={photo.id}>
                    {photo.imageUrl ? (
                      <img
                        src={photo.imageUrl}
                        alt={photo.alt_text || property.name}
                        className="property-image rounded-4"
                      />
                    ) : (
                      <div className="property-image-placeholder rounded-4">{property.name}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="col-lg-5">
            <div className="feature-panel p-4 h-100">
              <p className="eyebrow">{property.category}</p>
              <h1 className="h2 fw-bold mb-2">{property.name}</h1>
              <p className="text-body-secondary">
                {property.address}, {property.city}, {property.state}
              </p>
              <p className="lead text-body-secondary">{property.description}</p>
              {property.rooms.length > 0 && (
                <div className="d-flex justify-content-between align-items-center mt-4 border-top pt-3">
                  <span className="small text-body-secondary">Starting from</span>
                  <strong className="text-primary-dark h4 mb-0">
                    {formatNaira(
                      Math.min(...property.rooms.map((room) => room.price_per_night)),
                    )}
                    <span className="small"> / night</span>
                  </strong>
                </div>
              )}
              <p className="small text-body-secondary mt-4 mb-0">
                Rates and availability are confirmed directly with the property. Reservation
                requests are not available through the website yet.
              </p>
            </div>
          </div>
        </div>

        <div className="row mt-5 g-4">
          <div className="col-lg-6">
            <div className="info-card p-4 h-100">
              <h2 className="h4 fw-semibold mb-3">Facilities</h2>
              {property.facilities.length ? (
                <div className="d-flex flex-wrap gap-2">
                  {property.facilities.map((facility) => (
                    <span key={facility} className="facility-tag">{facility}</span>
                  ))}
                </div>
              ) : (
                <p className="text-body-secondary mb-0">No facilities have been listed.</p>
              )}
            </div>
          </div>

          <div className="col-lg-6">
            <div className="info-card p-4 h-100">
              <h2 className="h4 fw-semibold mb-3">Room categories</h2>
              {property.rooms.length ? (
                <ul className="list-group list-group-flush room-list">
                  {property.rooms.map((room) => (
                    <li key={room.id} className="list-group-item px-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <strong>{room.name}</strong>
                        <span>{formatNaira(room.price_per_night)} / night</span>
                      </div>
                      <p className="small text-body-secondary mb-0">
                        Up to {room.maximum_occupants} guests · {room.bed_configuration}
                      </p>
                      {room.description && (
                        <p className="small text-body-secondary mb-0">{room.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-secondary mb-0">Room details are available on request.</p>
              )}
            </div>
          </div>
        </div>
        <Link href="/discover" className="btn btn-outline-primary rounded-pill mt-4">
          Back to verified stays
        </Link>
      </div>
    </PageShell>
  );
}

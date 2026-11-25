import Link from "next/link";
import { PageShell } from "@/app/components/page-shell";
import { getPublishedProperties } from "@/lib/properties";
import { hasSupabaseConfiguration } from "@/lib/supabase/server";

export default async function DiscoverPage() {
  const listingsConnected = hasSupabaseConfiguration();
  const hotels = listingsConnected ? await getPublishedProperties() : [];

  return (
    <PageShell title="Hotel Discovery">
      <div className="container py-5">
        <div className="row g-4 align-items-center mb-5">
          <div className="col-lg-8">
            <p className="eyebrow">StayBridge discovery</p>
            <h1 className="display-5 fw-bold mb-3">Discover exceptional stays in Enugu.</h1>
            <p className="lead text-body-secondary">
              Explore properties that have been reviewed and approved for publication by StayBridge.
            </p>
          </div>
          <div className="col-lg-4 text-lg-end">
            <Link href="/partner" className="btn btn-gold rounded-pill px-4">
              Register Your Property
            </Link>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="h4 mb-0">Verified stays</h2>
          {listingsConnected && (
            <span className="text-body-secondary">
              {hotels.length} {hotels.length === 1 ? "property" : "properties"}
            </span>
          )}
        </div>

        {hotels.length ? (
          <div className="row g-4">
            {hotels.map((hotel) => {
              const lowestRate = hotel.rooms.reduce<number | null>(
                (lowest, room) =>
                  lowest === null || room.price_per_night < lowest
                    ? room.price_per_night
                    : lowest,
                null,
              );

              return (
                <div key={hotel.id} className="col-lg-4">
                  <article className="property-card h-100">
                    <div className="property-image-wrap">
                      {hotel.imageUrl ? (
                        <img src={hotel.imageUrl} alt={hotel.name} className="property-image" />
                      ) : (
                        <div className="property-image-placeholder">{hotel.name}</div>
                      )}
                      <span className="property-badge">{hotel.category}</span>
                    </div>
                    <div className="p-4">
                      <h3 className="h5 mb-2">{hotel.name}</h3>
                      <p className="text-body-secondary mb-3">{hotel.city}, {hotel.state}</p>
                      <strong className="text-primary-dark d-block mb-3">
                        {lowestRate === null
                          ? "Rates on request"
                          : `From ${new Intl.NumberFormat("en-NG", {
                              style: "currency",
                              currency: "NGN",
                              maximumFractionDigits: 0,
                            }).format(lowestRate)} / night`}
                      </strong>
                      <Link
                        href={`/discover/${hotel.slug}`}
                        className="btn btn-outline-primary w-100 rounded-pill"
                      >
                        View details
                      </Link>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="info-card p-4 p-lg-5">
            <h2 className="h4">No verified stays are published yet.</h2>
            <p className="text-body-secondary mb-0">
              {listingsConnected
                ? "Approved properties will appear here after administrator review."
                : "The live property directory will appear here after the Supabase database is connected."}
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}

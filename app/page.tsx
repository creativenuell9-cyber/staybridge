import Link from "next/link";
import { PageShell } from "@/app/components/page-shell";
import { getPublishedProperties } from "@/lib/properties";
import { hasSupabaseConfiguration } from "@/lib/supabase/server";

const destinations = ["Enugu City", "Abakaliki", "Owerri", "Calabar", "Lagos", "Asaba"];

const reasons = [
  "Verified hospitality listings and professional partner standards",
  "Curated premium experiences built around traveler trust and convenience",
  "Responsive reservation support and reliable property communication",
];

export default async function Home() {
  const listingsConnected = hasSupabaseConfiguration();
  const featuredHotels = listingsConnected ? await getPublishedProperties(3) : [];

  return (
    <PageShell title="StayBridge Hospitality">
      <section className="hero-section">
        <div className="container py-5 py-lg-6">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <p className="eyebrow">Connecting You to Better Stays</p>
              <h1 className="hero-title display-3 fw-bold mb-4">
                Your Next Exceptional Stay <span>Begins Here.</span>
              </h1>
              <p className="hero-copy lead text-body-secondary mb-4">
                Discover exceptional accommodation, enjoy seamless reservations, and connect with trusted hospitality providers through StayBridge.
              </p>

              <div className="d-flex flex-wrap gap-3 mb-4">
                <Link href="/discover" className="btn btn-primary btn-lg rounded-pill px-4">
                  Explore hotels
                </Link>
                <Link href="/partner" className="btn btn-outline-primary btn-lg rounded-pill px-4">
                  List your property
                </Link>
              </div>

              <div className="d-flex flex-wrap gap-4 hero-metrics">
                <div>
                  <strong>Enugu</strong>
                  <span>Launch market</span>
                </div>
                <div>
                  <strong>Verified</strong>
                  <span>Publication standard</span>
                </div>
                <div>
                  <strong>Assisted</strong>
                  <span>Reservation enquiries</span>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="hero-visual glass-panel">
                <div className="hero-image-stack">
                  <img
                    src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
                    alt="Luxury suite"
                  />
                </div>
                <div className="floating-card card-1">
                  <span>StayBridge standard</span>
                  <strong>Reviewed before publishing</strong>
                </div>
                <div className="floating-card card-2">
                  <span>Availability</span>
                  <strong>Confirmed by each property</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container pb-5">
        <div className="search-panel p-4 p-lg-5">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Destination</label>
              <input className="form-control" placeholder="Enugu, Lagos, Abuja" />
            </div>
            <div className="col-md-2">
              <label className="form-label">Check-in</label>
              <input className="form-control" type="date" />
            </div>
            <div className="col-md-2">
              <label className="form-label">Check-out</label>
              <input className="form-control" type="date" />
            </div>
            <div className="col-md-2">
              <label className="form-label">Guests</label>
              <select className="form-select">
                <option>2 Guests</option>
                <option>3 Guests</option>
                <option>4 Guests</option>
              </select>
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary w-100 btn-lg rounded-pill">Search stays</button>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-5">
        <div className="section-heading mb-4">
          <p className="eyebrow">Featured stays</p>
          <h2 className="fw-bold">Curated for modern travelers</h2>
        </div>

        <div className="row g-4">
          {featuredHotels.length ? (
            featuredHotels.map((hotel) => {
              const lowestRate = hotel.rooms.reduce<number | null>(
                (lowest, room) =>
                  lowest === null || room.price_per_night < lowest
                    ? room.price_per_night
                    : lowest,
                null,
              );

              return (
                <div className="col-lg-4" key={hotel.id}>
                  <div className="property-card h-100">
                    <div className="property-image-wrap">
                      {hotel.imageUrl ? (
                        <img src={hotel.imageUrl} alt={hotel.name} className="property-image" />
                      ) : (
                        <div className="property-image-placeholder">{hotel.name}</div>
                      )}
                      <span className="property-badge">Verified listing</span>
                    </div>
                    <div className="p-4">
                      <h3 className="h5 mb-2">{hotel.name}</h3>
                      <p className="text-body-secondary mb-3">{hotel.city}, {hotel.state}</p>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <strong className="text-primary-dark">
                          {lowestRate === null
                            ? "Rates on request"
                            : `From ${new Intl.NumberFormat("en-NG", {
                                style: "currency",
                                currency: "NGN",
                                maximumFractionDigits: 0,
                              }).format(lowestRate)} / night`}
                        </strong>
                      </div>
                      <Link
                        href={`/discover/${hotel.slug}`}
                        className="btn btn-outline-primary w-100 rounded-pill"
                      >
                        View property
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-12">
              <div className="info-card p-4 p-lg-5">
                <h3 className="h4">No verified stays are published yet.</h3>
                <p className="text-body-secondary mb-0">
                  {listingsConnected
                    ? "Properties will appear here only after administrator review and approval."
                    : "The live property directory will appear here after the Supabase database is connected."}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="container py-5">
        <div className="section-heading mb-4">
          <p className="eyebrow">Popular destinations</p>
          <h2 className="fw-bold">Where travelers are heading next</h2>
        </div>

        <div className="d-flex flex-wrap gap-3">
          {destinations.map((destination) => (
            <span key={destination} className="destination-pill">
              {destination}
            </span>
          ))}
        </div>
      </section>

      <section className="container py-5">
        <div className="section-heading mb-4">
          <p className="eyebrow">Why choose StayBridge</p>
          <h2 className="fw-bold">A premium hospitality experience built on trust</h2>
        </div>

        <div className="row g-4">
          {reasons.map((reason, index) => (
            <div className="col-lg-4" key={reason}>
              <div className="info-card h-100 p-4">
                <div className="feature-bullet mb-3">0{index + 1}</div>
                <p className="mb-0 text-body-secondary">{reason}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-5">
        <div className="section-heading mb-4">
          <p className="eyebrow">Hospitality partner benefits</p>
          <h2 className="fw-bold">Designed for listing growth and guest confidence</h2>
        </div>

        <div className="row g-4 align-items-stretch">
          <div className="col-lg-6">
            <div className="info-card h-100 p-4">
              <h3 className="h4 fw-semibold mb-3">For property owners</h3>
              <ul className="check-list ps-3 mb-0">
                <li>High-visibility premium placement in a luxury-focused marketplace</li>
                <li>Professional guest inquiry handling and reservation support</li>
                <li>Business growth opportunities with a trusted hospitality network</li>
              </ul>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="info-card h-100 p-4">
              <h3 className="h4 fw-semibold mb-3">For travelers</h3>
              <ul className="check-list ps-3 mb-0">
                <li>Search, compare, and shortlist premium accommodation options</li>
                <li>Reliable enquiry support before booking or reservation confirmation</li>
                <li>Clear property information with transparent pricing and availability guidance</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-5">
        <div className="cta-card p-4 p-lg-5">
          <div className="row align-items-center g-4">
            <div className="col-lg-8">
              <p className="eyebrow">Ready to begin?</p>
              <h2 className="fw-bold mb-0">Secure your next exceptional stay or list your property with confidence.</h2>
            </div>
            <div className="col-lg-4 text-lg-end">
              <Link href="/register" className="btn btn-light btn-lg rounded-pill px-4">Get started</Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

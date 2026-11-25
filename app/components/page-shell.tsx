"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Explore Hotels" },
  { href: "/about", label: "About Us" },
  { href: "/partner", label: "Partner With Us" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Login" },
  { href: "/register", label: "Register" },
];

export function PageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const revealTargets = document.querySelectorAll<HTMLElement>(
      "main > section:not(.page-banner), main > .container",
    );

    if (!("IntersectionObserver" in window)) {
      revealTargets.forEach((target) => target.classList.add("motion-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("motion-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 },
    );

    revealTargets.forEach((target) => {
      target.classList.remove("motion-revealed");
      target.classList.add("motion-reveal");
      const bounds = target.getBoundingClientRect();

      if (bounds.top < window.innerHeight && bounds.bottom > 0) {
        target.classList.add("motion-revealed");
      } else {
        observer.observe(target);
      }
    });

    return () => observer.disconnect();
  }, [pathname]);

  return (
    <div className="page-shell">
      <header className="site-header">
        <nav className="navbar navbar-expand-lg navbar-dark py-3">
          <div className="container">
            <Link className="navbar-brand d-flex align-items-center gap-2" href="/">
              <span className="brand-mark">S</span>
              <span className="brand-word">STAYBRIDGE</span>
            </Link>

            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#mainNav"
              aria-controls="mainNav"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon" />
            </button>

            <div className="collapse navbar-collapse" id="mainNav">
              <ul className="navbar-nav mx-auto align-items-lg-center gap-lg-2">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href} className="nav-item">
                      <Link
                        className={`nav-link ${active ? "active" : ""}`}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="navbar-actions d-flex align-items-center gap-2">
                <Link href="/partner" className="btn btn-outline-light btn-sm rounded-pill px-3">
                  List Your Property
                </Link>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section className="page-banner py-4">
          <div className="container">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 text-small text-uppercase tracking-wide text-white-50">
              <span>Premium hospitality marketplace</span>
              <span className="status-pill">Launch approval required</span>
            </div>
          </div>
        </section>

        {children}
      </main>

      <footer className="site-footer py-5 mt-5">
        <div className="container">
          <div className="row g-4 align-items-start">
            <div className="col-lg-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="brand-mark">S</span>
                <span className="brand-word text-white">STAYBRIDGE</span>
              </div>
              <p className="text-white-50 mb-0">
                Connecting You to Better Stays with refined hospitality experiences,
                trusted property partnerships, and seamless reservation support across
                Enugu and beyond.
              </p>
            </div>

            <div className="col-md-4 col-lg-2">
              <h6 className="footer-heading">Explore</h6>
              <ul className="list-unstyled footer-links">
                <li><Link href="/discover">Hotels</Link></li>
                <li><Link href="/about">About</Link></li>
                <li><Link href="/partner">Partner</Link></li>
              </ul>
            </div>

            <div className="col-md-4 col-lg-3">
              <h6 className="footer-heading">Support</h6>
              <ul className="list-unstyled footer-links">
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/login">Login</Link></li>
                <li><Link href="/register">Register</Link></li>
                <li><Link href="/partner/dashboard">Partner dashboard</Link></li>
                <li><Link href="/admin">Admin portal</Link></li>
              </ul>
            </div>

            <div className="col-md-4 col-lg-3">
              <h6 className="footer-heading">Contact</h6>
              <ul className="list-unstyled footer-links">
                <li><a href="mailto:hello@staybridge.example">hello@staybridge.example</a></li>
                <li><a href="tel:+2348000000000">+234 800 000 0000</a></li>
                <li><a href="https://wa.me/2348000000000">WhatsApp</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom mt-4 pt-4 border-top border-white-10 d-flex justify-content-between flex-wrap gap-2">
            <span className="text-white-50">© StayBridge Hospitality</span>
            <span className="text-white-50">{title}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

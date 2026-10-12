import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero">
      <div className="hero__text">
        <div className="kicker">404</div>
        <h1 className="hero__title">
          Page <em>not found</em>
        </h1>
        <div className="rule" />
        <p className="hero__bio">The page you are looking for does not exist.</p>
        <div className="actions">
          <Link href="/" className="btn btn--primary">
            Back home
          </Link>
        </div>
      </div>
    </section>
  );
}

import BrandLogo from "./BrandLogo";

export default function PageLoading() {
  return (
    <main className="page-loading-shell" aria-live="polite" aria-busy="true">
      <section className="page-loading-card">
        <BrandLogo variant="symbol" className="page-loading-symbol" alt="" />
        <div className="skeleton-line skeleton-line-title" />
        <div className="skeleton-line skeleton-line-copy" />
        <span className="sr-only">Loading page...</span>
      </section>
    </main>
  );
}

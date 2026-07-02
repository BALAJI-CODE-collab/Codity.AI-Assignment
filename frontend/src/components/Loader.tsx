export function Loader() {
  return (
    <div className="loader-shell" aria-live="polite">
      <div className="loader-card">
        <div className="loader-pill" />
        <div className="loader-pill short" />
        <div className="loader-pill" />
      </div>
    </div>
  );
}

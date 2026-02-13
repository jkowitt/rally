export default function Loading() {
  return (
    <div className="loading-page" role="status" aria-label="Loading">
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
      <p className="loading-text">Loading...</p>
    </div>
  );
}

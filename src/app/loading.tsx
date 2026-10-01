export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-bounce">❄️</div>
        <div className="text-accent-teal text-xl animate-pulse">Loading...</div>
      </div>
    </div>
  );
}

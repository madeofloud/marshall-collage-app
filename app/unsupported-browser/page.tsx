export default function UnsupportedBrowser() {
  return (
    <main className="flex h-screen items-center justify-center bg-neutral-900 px-8">
      <div className="text-center space-y-3">
        <p className="text-white text-lg font-semibold">Chrome required</p>
        <p className="text-white/50 text-sm">
          This app is not supported in Safari.<br />
          Please open it in Google Chrome.
        </p>
      </div>
    </main>
  );
}

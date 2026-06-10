'use client';

interface LoaderProps {
  visible: boolean;
  message?: string;
}

export default function Loader({ visible, message }: LoaderProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/75">
      <div className="w-10 h-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      {message && <p className="mt-3 text-sm text-white">{message}</p>}
    </div>
  );
}
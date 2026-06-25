import { cn } from '@/lib/utils';

// Logo RBN — direferensikan langsung dari URL (tidak di-embed lokal).
export const LOGO_URL =
  'https://res.cloudinary.com/dckzmg6c3/image/upload/v1780334644/rbngeunahicon_ptetbj.webp';

export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_URL}
      alt="Roti Bakar Ngeunah"
      className={cn('object-contain', className)}
    />
  );
}

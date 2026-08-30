import { useEffect, useState } from "react";
import { fetchAuthedImage } from "../api/client";

interface AuthedImageProps {
  itemId: number;
  alt: string;
  className?: string;
}

export function AuthedImage({ itemId, alt, className }: AuthedImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    setSrc(null);
    setFailed(false);

    fetchAuthedImage(itemId)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [itemId]);

  if (failed || !src) {
    return null;
  }

  return <img src={src} alt={alt} className={className} />;
}

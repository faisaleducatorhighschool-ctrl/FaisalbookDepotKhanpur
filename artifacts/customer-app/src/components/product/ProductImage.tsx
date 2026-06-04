import { useState } from "react";
import { ImageOff } from "lucide-react";

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  iconSize?: number;
}

export function ProductImage({ src, alt, className = "w-full h-full object-cover", iconSize = 32 }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-300">
      <ImageOff size={iconSize} strokeWidth={1.5} />
    </div>
  );
}

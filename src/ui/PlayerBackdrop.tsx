import { useEffect, useState } from 'react';

interface Props {
  src: string;
}

/** Keep the current artwork visible until the next local asset is decoded. */
export function PlayerBackdrop({ src }: Props) {
  const [visibleSrc, setVisibleSrc] = useState(src);

  useEffect(() => {
    if (src === visibleSrc) return;

    let active = true;
    const image = new Image();
    const reveal = () => {
      if (active) setVisibleSrc(src);
    };

    image.addEventListener('load', reveal, { once: true });
    image.src = src;
    if (image.complete) reveal();

    return () => {
      active = false;
      image.removeEventListener('load', reveal);
    };
  }, [src, visibleSrc]);

  return (
    <div className="np__backdrop" aria-hidden="true">
      <img key={visibleSrc} className="np__backdrop-image" src={visibleSrc} alt="" decoding="async" />
    </div>
  );
}

import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

export const useMeasuredElementWidth = <T extends HTMLElement>(ref: RefObject<T>) => {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const update = () => {
      setWidth(ref.current?.clientWidth ?? 0);
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return width;
};

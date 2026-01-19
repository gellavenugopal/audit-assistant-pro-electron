import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

export const useMeasuredElementHeight = <T extends HTMLElement>(ref: RefObject<T>) => {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const update = () => {
      setHeight(ref.current?.clientHeight ?? 0);
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return height;
};

export const stripDataUrlPrefix = (value: string): string => {
  const commaIndex = value.indexOf(',');
  return commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
};

export const arrayBufferToBase64 = (buffer: ArrayBuffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(stripDataUrlPrefix(dataUrl));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new Blob([buffer]));
  });
};

export const uint8ArrayToBase64 = (data: Uint8Array): Promise<string> => {
  return arrayBufferToBase64(data.buffer);
};

export const base64ToUint8Array = (base64: string): Uint8Array => {
  const cleaned = stripDataUrlPrefix(base64);
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

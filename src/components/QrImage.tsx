import { useEffect, useState } from 'react';

interface QrImageProps {
  text: string;
  size?: number;
  className?: string;
}

/** QR Code gerado no próprio navegador: sem serviço externo (nada de dado saindo do app, funciona offline). */
export function QrImage({ text, size = 256, className }: QrImageProps) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let alive = true;
    // A biblioteca de QR só é baixada por quem precisa gerar placas (equipe), não pelo entregador.
    import('qrcode')
      .then((m) => m.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: 'M' }))
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(''));
    return () => {
      alive = false;
    };
  }, [text, size]);

  if (!src) return <div className={className} style={{ width: size, height: size }} aria-busy="true" />;
  return <img src={src} alt={`QR Code para ${text}`} width={size} height={size} className={className} />;
}

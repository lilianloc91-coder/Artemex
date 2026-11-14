import qrcode from 'qrcode-generator';

export function PassportQrCode({ value, size = 152, title = 'Código QR del pasaporte' }: { value: string; size?: number; title?: string }) {
  const code = qrcode(0, 'M');
  code.addData(value);
  code.make();
  const count = code.getModuleCount();
  const paths: string[] = [];
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (code.isDark(row, col)) paths.push(`M${col} ${row}h1v1h-1z`);
    }
  }
  // Standard monochrome modules and four-module quiet zone are required for scanner contrast.
  return <svg width={size} height={size} viewBox={`-4 -4 ${count + 8} ${count + 8}`} role="img" aria-label={title} shapeRendering="crispEdges">
    <title>{title}</title>
    <rect x="-4" y="-4" width={count + 8} height={count + 8} fill="white" />
    <path d={paths.join('')} fill="black" />
  </svg>;
}
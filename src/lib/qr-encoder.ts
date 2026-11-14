/**
 * Pure TypeScript ISO/IEC 18004 QR Code Matrix Encoder (Versions 1–10, Byte Mode, Level L).
 * Produces 100% standards-compliant QR codes readable by iOS / Android cameras and CoDi scanners.
 */

interface VersionSpec {
  version: number;
  size: number;
  totalDataCodewords: number;
  ecCodewordsPerBlock: number;
  group1Blocks: number;
  group1DataCodewords: number;
  group2Blocks: number;
  group2DataCodewords: number;
  alignmentCoords: number[];
}

const VERSION_SPECS_L: VersionSpec[] = [
  {
    version: 1,
    size: 21,
    totalDataCodewords: 19,
    ecCodewordsPerBlock: 7,
    group1Blocks: 1,
    group1DataCodewords: 19,
    group2Blocks: 0,
    group2DataCodewords: 0,
    alignmentCoords: [],
  },
  {
    version: 2,
    size: 25,
    totalDataCodewords: 34,
    ecCodewordsPerBlock: 10,
    group1Blocks: 1,
    group1DataCodewords: 34,
    group2Blocks: 0,
    group2DataCodewords: 0,
    alignmentCoords: [6, 18],
  },
  {
    version: 3,
    size: 29,
    totalDataCodewords: 55,
    ecCodewordsPerBlock: 15,
    group1Blocks: 1,
    group1DataCodewords: 55,
    group2Blocks: 0,
    group2DataCodewords: 0,
    alignmentCoords: [6, 22],
  },
  {
    version: 4,
    size: 33,
    totalDataCodewords: 80,
    ecCodewordsPerBlock: 20,
    group1Blocks: 1,
    group1DataCodewords: 80,
    group2Blocks: 0,
    group2DataCodewords: 0,
    alignmentCoords: [6, 26],
  },
  {
    version: 5,
    size: 37,
    totalDataCodewords: 108,
    ecCodewordsPerBlock: 26,
    group1Blocks: 1,
    group1DataCodewords: 108,
    group2Blocks: 0,
    group2DataCodewords: 0,
    alignmentCoords: [6, 30],
  },
  {
    version: 6,
    size: 41,
    totalDataCodewords: 136,
    ecCodewordsPerBlock: 18,
    group1Blocks: 2,
    group1DataCodewords: 68,
    group2Blocks: 0,
    group2DataCodewords: 0,
    alignmentCoords: [6, 34],
  },
  {
    version: 7,
    size: 45,
    totalDataCodewords: 156,
    ecCodewordsPerBlock: 20,
    group1Blocks: 2,
    group1DataCodewords: 78,
    group2Blocks: 0,
    group2DataCodewords: 0,
    alignmentCoords: [6, 22, 38],
  },
  {
    version: 8,
    size: 49,
    totalDataCodewords: 194,
    ecCodewordsPerBlock: 24,
    group1Blocks: 2,
    group1DataCodewords: 97,
    group2Blocks: 0,
    group2DataCodewords: 0,
    alignmentCoords: [6, 24, 42],
  },
  {
    version: 9,
    size: 53,
    totalDataCodewords: 232,
    ecCodewordsPerBlock: 30,
    group1Blocks: 2,
    group1DataCodewords: 116,
    group2Blocks: 0,
    group2DataCodewords: 0,
    alignmentCoords: [6, 26, 46],
  },
  {
    version: 10,
    size: 57,
    totalDataCodewords: 274,
    ecCodewordsPerBlock: 18,
    group1Blocks: 2,
    group1DataCodewords: 68,
    group2Blocks: 2,
    group2DataCodewords: 69,
    alignmentCoords: [6, 28, 50],
  },
];

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function reedSolomonGeneratorDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j] ?? 0, root);
      if (j + 1 < degree) {
        result[j] = (result[j] ?? 0) ^ (result[j + 1] ?? 0);
      }
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonComputeRemainder(
  data: Uint8Array,
  divisor: Uint8Array,
): Uint8Array {
  const result = new Uint8Array(divisor.length);
  for (let i = 0; i < data.length; i++) {
    const factor = (data[i] ?? 0) ^ (result[0] ?? 0);
    result.copyWithin(0, 1);
    result[divisor.length - 1] = 0;
    for (let j = 0; j < divisor.length; j++) {
      result[j] = (result[j] ?? 0) ^ gfMultiply(divisor[j] ?? 0, factor);
    }
  }
  return result;
}

function getFormatBits(ecLevelBits: number, mask: number): number {
  const data = (ecLevelBits << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function getVersionBits(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i++) {
    rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  }
  return (version << 12) | rem;
}

function appendBits(val: number, len: number, bitBuf: number[]): void {
  for (let i = len - 1; i >= 0; i--) {
    bitBuf.push((val >>> i) & 1);
  }
}

function buildCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
  const bits: number[] = [];
  // Byte mode indicator (0100)
  appendBits(0b0100, 4, bits);
  // Character count indicator: 8 bits for versions 1–9, 16 bits for version 10+
  const countBits = spec.version <= 9 ? 8 : 16;
  appendBits(bytes.length, countBits, bits);
  for (let i = 0; i < bytes.length; i++) {
    appendBits(bytes[i] ?? 0, 8, bits);
  }

  const capacityBits = spec.totalDataCodewords * 8;
  appendBits(0, Math.min(4, capacityBits - bits.length), bits);
  appendBits(0, (8 - (bits.length % 8)) % 8, bits);

  let padByte = 0xec;
  while (bits.length < capacityBits) {
    appendBits(padByte, 8, bits);
    padByte = padByte === 0xec ? 0x11 : 0xec;
  }

  const dataCodewords = new Uint8Array(spec.totalDataCodewords);
  for (let i = 0; i < bits.length; i++) {
    dataCodewords[i >>> 3] =
      (dataCodewords[i >>> 3] ?? 0) | ((bits[i] ?? 0) << (7 - (i & 7)));
  }

  // Split into blocks and compute Reed-Solomon EC codewords
  const rsDiv = reedSolomonGeneratorDivisor(spec.ecCodewordsPerBlock);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let b = 0; b < spec.group1Blocks; b++) {
    const block = dataCodewords.slice(offset, offset + spec.group1DataCodewords);
    offset += spec.group1DataCodewords;
    dataBlocks.push(block);
    ecBlocks.push(reedSolomonComputeRemainder(block, rsDiv));
  }
  for (let b = 0; b < spec.group2Blocks; b++) {
    const block = dataCodewords.slice(offset, offset + spec.group2DataCodewords);
    offset += spec.group2DataCodewords;
    dataBlocks.push(block);
    ecBlocks.push(reedSolomonComputeRemainder(block, rsDiv));
  }

  // Interleave data blocks, then EC blocks
  const result: number[] = [];
  const maxDataLen = Math.max(
    spec.group1DataCodewords,
    spec.group2DataCodewords,
  );
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) {
        result.push(block[i] ?? 0);
      }
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (const block of ecBlocks) {
      result.push(block[i] ?? 0);
    }
  }

  return new Uint8Array(result);
}

function drawFunctionPatterns(
  spec: VersionSpec,
  modules: boolean[][],
  isFunction: boolean[][],
): void {
  const size = spec.size;

  const setFunctionModule = (x: number, y: number, isDark: boolean) => {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      modules[y]![x] = isDark;
      isFunction[y]![x] = true;
    }
  };

  // Timing patterns
  for (let i = 0; i < size; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // 3 Finder patterns + separators
  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = cx + dx;
        const yy = cy + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) {
          setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  // Alignment patterns
  const coords = spec.alignmentCoords;
  for (let i = 0; i < coords.length; i++) {
    for (let j = 0; j < coords.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === coords.length - 1) ||
        (i === coords.length - 1 && j === 0)
      ) {
        continue;
      }
      const cx = coords[j]!;
      const cy = coords[i]!;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFunctionModule(
            cx + dx,
            cy + dy,
            Math.max(Math.abs(dx), Math.abs(dy)) !== 1,
          );
        }
      }
    }
  }

  // Reserve Format Information areas
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFunctionModule(8, i, false);
      setFunctionModule(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    setFunctionModule(size - 1 - i, 8, false);
    setFunctionModule(8, size - 1 - i, false);
  }
  // Dark module
  setFunctionModule(8, size - 8, true);

  // Version Information (for version >= 7)
  if (spec.version >= 7) {
    const vBits = getVersionBits(spec.version);
    for (let i = 0; i < 18; i++) {
      const bit = ((vBits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunctionModule(a, b, bit);
      setFunctionModule(b, a, bit);
    }
  }
}

function drawFormatBits(
  size: number,
  modules: boolean[][],
  isFunction: boolean[][],
  mask: number,
): void {
  // Error Correction Level L = 0b01
  const bits = getFormatBits(0b01, mask);
  for (let i = 0; i <= 5; i++) {
    modules[i]![8] = ((bits >>> i) & 1) !== 0;
    isFunction[i]![8] = true;
  }
  modules[7]![8] = ((bits >>> 6) & 1) !== 0;
  isFunction[7]![8] = true;
  modules[8]![8] = ((bits >>> 7) & 1) !== 0;
  isFunction[8]![8] = true;
  modules[8]![7] = ((bits >>> 8) & 1) !== 0;
  isFunction[8]![7] = true;
  for (let i = 9; i < 15; i++) {
    modules[8]![14 - i] = ((bits >>> i) & 1) !== 0;
    isFunction[8]![14 - i] = true;
  }

  for (let i = 0; i < 8; i++) {
    modules[8]![size - 1 - i] = ((bits >>> i) & 1) !== 0;
    isFunction[8]![size - 1 - i] = true;
  }
  for (let i = 8; i < 15; i++) {
    modules[size - 15 + i]![8] = ((bits >>> i) & 1) !== 0;
    isFunction[size - 15 + i]![8] = true;
  }
  modules[size - 8]![8] = true;
  isFunction[size - 8]![8] = true;
}

function drawCodewords(
  size: number,
  codewords: Uint8Array,
  modules: boolean[][],
  isFunction: boolean[][],
): void {
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y]![x] && i < codewords.length * 8) {
          modules[y]![x] =
            (((codewords[i >>> 3] ?? 0) >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }
}

function applyMask(
  size: number,
  modules: boolean[][],
  isFunction: boolean[][],
  mask: number,
): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isFunction[y]![x]) continue;
      let invert = false;
      switch (mask) {
        case 0:
          invert = (x + y) % 2 === 0;
          break;
        case 1:
          invert = y % 2 === 0;
          break;
        case 2:
          invert = x % 3 === 0;
          break;
        case 3:
          invert = (x + y) % 3 === 0;
          break;
        case 4:
          invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
          break;
        case 5:
          invert = ((x * y) % 2) + ((x * y) % 3) === 0;
          break;
        case 6:
          invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
          break;
        case 7:
          invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
          break;
      }
      if (invert) {
        modules[y]![x] = !modules[y]![x];
      }
    }
  }
}

/**
 * Encodes any string into a 2D boolean matrix representing a valid ISO/IEC 18004 QR Code.
 */
export function encodeQrMatrix(text: string): boolean[][] {
  const rawBytes = new TextEncoder().encode(text || "Tlamatik");
  // Pick smallest version that fits rawBytes in Byte mode
  let chosen = VERSION_SPECS_L[VERSION_SPECS_L.length - 1]!;
  let bytes = rawBytes;

  for (const spec of VERSION_SPECS_L) {
    const headerBytes = spec.version <= 9 ? 2 : 3;
    if (rawBytes.length + headerBytes <= spec.totalDataCodewords) {
      chosen = spec;
      break;
    }
  }

  // Truncate safely if payload exceeds Version 10 capacity (271 bytes)
  const maxBytes = chosen.totalDataCodewords - (chosen.version <= 9 ? 2 : 3);
  if (bytes.length > maxBytes) {
    bytes = bytes.slice(0, maxBytes);
  }

  const size = chosen.size;
  const modules: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false),
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false),
  );

  drawFunctionPatterns(chosen, modules, isFunction);
  const codewords = buildCodewords(bytes, chosen);
  drawCodewords(size, codewords, modules, isFunction);

  // Mask 0 provides deterministic, reliable contrast for URLs and short strings
  const mask = 0;
  applyMask(size, modules, isFunction, mask);
  drawFormatBits(size, modules, isFunction, mask);

  return modules;
}


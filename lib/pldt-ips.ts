export function getRandomPLDTIP(): string {
  const ranges: [number, number][] = [
    [112, 200],
    [112, 201],
    [112, 207],
    [112, 208],
    [112, 210],
  ];

  const base = ranges[Math.floor(Math.random() * ranges.length)];
  const rand = () => Math.floor(Math.random() * 256);

  return `${base[0]}.${base[1]}.${rand()}.${rand()}`;
}

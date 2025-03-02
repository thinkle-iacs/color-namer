export function labToRgb(l: number, a: number, b: number) {
  let y = (l + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;

  x = 95.047 * (x ** 3 > 0.008856 ? x ** 3 : (x - 16 / 116) / 7.787);
  y = 100.0 * (y ** 3 > 0.008856 ? y ** 3 : (y - 16 / 116) / 7.787);
  z = 108.883 * (z ** 3 > 0.008856 ? z ** 3 : (z - 16 / 116) / 7.787);

  x /= 100;
  y /= 100;
  z /= 100;
  let red = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let green = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let blue = x * 0.0557 + y * -0.204 + z * 1.057;

  red = red > 0.0031308 ? 1.055 * red ** (1 / 2.4) - 0.055 : 12.92 * red;
  green =
    green > 0.0031308 ? 1.055 * green ** (1 / 2.4) - 0.055 : 12.92 * green;
  blue = blue > 0.0031308 ? 1.055 * blue ** (1 / 2.4) - 0.055 : 12.92 * blue;

  return [
    Math.max(0, Math.min(255, Math.round(red * 255))),
    Math.max(0, Math.min(255, Math.round(green * 255))),
    Math.max(0, Math.min(255, Math.round(blue * 255))),
  ];
}

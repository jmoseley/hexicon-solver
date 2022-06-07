import sharp from "sharp";
import debugFactory from "debug";

import { question } from "./util";

const debug = debugFactory("colors");

export type Color = "red" | "very_red" | "blue" | "very_blue" | "none";

const COORDINATES = [
  [536, 591],
  [435, 648],
  [644, 648],
  [327, 717],
  [538, 706],
  [752, 709],
  [214, 782],
  [437, 770],
  [648, 771],
  [865, 773],
  [106, 842],
  [311, 839],
  [554, 839],
  [748, 828],
  [966, 835],
  [216, 899],
  [437, 899],
  [648, 892],
  [862, 895],
  [118, 961],
  [329, 959],
  [540, 961],
  [747, 961],
  [970, 961],
  [216, 1016],
  [433, 1023],
  [648, 1023],
  [869, 1025],
  [109, 1087],
  [339, 1087],
  [552, 1078],
  [756, 1080],
  [961, 1080],
  [223, 1141],
  [428, 1140],
  [637, 1138],
  [840, 1140],
  [100, 1203],
  [327, 1205],
  [543, 1202],
  [747, 1209],
  [954, 1202],
  [194, 1258],
  [437, 1267],
  [639, 1267],
  [860, 1267],
  [116, 1329],
  [327, 1329],
  [540, 1326],
  [754, 1327],
  [973, 1326],
  [216, 1388],
  [428, 1393],
  [633, 1389],
  [844, 1384],
  [320, 1451],
  [538, 1450],
  [761, 1450],
  [430, 1510],
  [649, 1513],
  [543, 1572],
];

const COLOR_VALUES: [number, Color, number][] = [
  [5994, "none", 10],
  [5499, "red", 10],
  [4329, "very_red", 30],
  [3438, "very_blue", 30],
  [5598, "blue", 30],
];

function isWithin(value: number, target: number, tolerance: number) {
  return value >= target - tolerance && value <= target + tolerance;
}

export async function extractHexColor(filename: string): Promise<Color[]> {
  const results = [] as Color[];

  for (const [idx, coords] of COORDINATES.entries()) {
    const imageData = await sharp(filename)
      .extract({
        width: 3,
        height: 3,
        left: coords[0],
        top: coords[1],
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const total = imageData.data.reduce((acc, cur) => acc + cur, 0);

    if (debug.enabled) debug(`Total at ${coords} (${idx}): ${total}`);

    const color = COLOR_VALUES.find(([value, _color, tolerance]) =>
      isWithin(total, value, tolerance)
    );

    if (color) {
      results.push(color[1]);
      continue;
    } else {
      const newColor = await question(
        `What color is character ${idx + 1} ${total}? `
      );

      if (newColor === "none" || newColor === "" || newColor === "grey") {
        results.push("none");
      } else if (
        newColor === "red" ||
        newColor === "blue" ||
        newColor === "very_red" ||
        newColor === "very_blue"
      ) {
        results.push(newColor);
      } else {
        console.error(`Unknown color ${newColor}`);
        process.exit(1);
      }
    }
  }

  return results;
}

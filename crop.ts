import sharp from "sharp";

export function cropImage(filename: string): sharp.Sharp {
  return sharp(filename)
    .extract({ width: 1080, height: 1440, left: 0, top: 360 })
    .greyscale()
    .threshold(80);
}

async function cropToFile(filename: string, outputFilename: string) {
  await cropImage(filename).toFile(outputFilename);
}

async function main() {
  await cropToFile("sample.png", "cropped-screenshot.png");
}

if (require.main === module) {
  main();
}

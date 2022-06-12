import sharp from "sharp";

export function cropImageToBoard(filename: string): sharp.Sharp {
  return sharp(filename)
    .extract({ width: 1080, height: 1440, left: 0, top: 360 })
    .greyscale()
    .threshold(80);
}
export function cropImageToScore(filename: string): sharp.Sharp {
  return sharp(filename)
    .extract({
      width: 600,
      height: 200,
      left: 250,
      top: 150,
    })
    .greyscale()
    .threshold(200);
}

async function cropToFile(filename: string, outputFilename: string) {
  await cropImageToBoard(filename).toFile(outputFilename);
}

async function main() {
  await cropToFile("sample.png", "cropped-screenshot.png");
}

if (require.main === module) {
  main();
}

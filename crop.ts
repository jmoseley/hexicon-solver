import sharp from "sharp";

export function cropImageToBoard(filename: string): sharp.Sharp {
  return sharp(filename)
    .extract({ width: 1080, height: 1440, left: 0, top: 360 })
    .greyscale()
    .threshold(80);
}
export function cropImageToScore(
  filename: string,
  side: "left" | "right"
): sharp.Sharp {
  return sharp(filename)
    .extract({
      width: 300,
      height: 200,
      left: side === "left" ? 250 : 550,
      top: 150,
    })
    .greyscale()
    .threshold(200);
}

async function cropToFile(
  transform: () => sharp.Sharp,
  outputFilename: string
) {
  await transform().toFile(outputFilename);
}

async function main() {
  await cropToFile(
    () => cropImageToScore("sample.png", "left"),
    "cropped-screenshot.png"
  );
}

if (require.main === module) {
  main();
}

import Tesseract from "tesseract.js";
import { cropImageToBoard, cropImageToScore } from "./crop";

// TODO: Support different sized screenshots of the board
// Returns the extracted letters of the board as space separated characters,
// in lines separated by newlines
// There is a high likelihood that the extracted letters will be missing "I"s
export async function extractTextFromScreenshot(
  filename: string
): Promise<string> {
  // Crop out just the board in the center, and crank the
  // contrast to make it easier to ocr
  const imageData = await cropImageToBoard(filename).toBuffer();
  const worker = Tesseract.createWorker({});
  await worker.load();
  await worker.loadLanguage("eng");
  await worker.initialize("eng");
  await worker.setParameters({
    // tessedit_pageseg_mode: Tesseract.PSM.AUTO_ONLY,
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  });
  const output = await worker.recognize(imageData);
  await worker.terminate();
  return output.data.text;
}

export async function extractCurrentScoreFromScreenshot(filename: string) {
  // Crop out just the board in the center, and crank the
  // contrast to make it easier to ocr
  const imageData = await cropImageToScore(filename).toBuffer();
  const worker = Tesseract.createWorker({});
  await worker.load();
  await worker.loadLanguage("eng");
  await worker.initialize("eng");
  await worker.setParameters({
    // tessedit_pageseg_mode: Tesseract.PSM.AUTO_ONLY,
    tessedit_char_whitelist: "0123456789 ",
  });
  const output = await worker.recognize(imageData);
  await worker.terminate();

  const parts = output.data.text.split(" ");

  return {
    blueScore: parts[0] && parts[0].length > 0 ? parseInt(parts[0]) : undefined,
    redScore: parts[1] && parts[1].length > 0 ? parseInt(parts[1]) : undefined,
  };
}

async function main() {
  const filename = "sample.png";
  const text = await extractCurrentScoreFromScreenshot(filename);
  console.log(text);
}

if (require.main === module) {
  main();
}

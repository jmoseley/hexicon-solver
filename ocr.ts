import Tesseract from "tesseract.js";
import debugFactory from "debug";

import { cropImageToBoard, cropImageToScore } from "./crop";
import { question } from "./util";

const debug = debugFactory("ocr");

// Expected lengths of the extracted lines. Lets the user correct
// if things are missed. (Likely "I" will be missed by the OCR)
const EXPECTED_LINE_LENGTHS = [
  1, 2, 3, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 3, 2, 1,
];

// TODO: Support different sized screenshots of the board
// Returns the extracted letters of the board as space separated characters,
// in lines separated by newlines
// There is a high likelihood that the extracted letters will be missing "I"s
export async function extractTextFromScreenshot(
  filename: string
): Promise<string[][]> {
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
  const text = output.data.text;

  // validate the text input first
  const linesRaw = text.split("\n").filter((line) => line.length > 0);
  if (debug.enabled) debug("linesRaw", linesRaw);
  if (linesRaw.length !== EXPECTED_LINE_LENGTHS.length) {
    throw new Error(
      `Expected ${EXPECTED_LINE_LENGTHS.length} lines, got ${linesRaw.length}`
    );
  }
  const lines = [] as string[][];

  // Validate each line is the right length, and ask the user
  // to correct any that aren't.
  for (const [idx, lineStr] of linesRaw.entries()) {
    const line = lineStr.split("").filter((word) => word.trim().length > 0);

    if (line.length !== EXPECTED_LINE_LENGTHS[idx]) {
      console.info(
        `Line ${idx} is ${line.length} characters long, expected ${EXPECTED_LINE_LENGTHS[idx]}.`
      );

      const newLine = await question(`Enter new line (got ${line}): `);
      lines[idx] = newLine.split("").map((char) => {
        return char.toUpperCase().trim();
      });
    } else {
      lines[idx] = line.map((char) => {
        return char.toUpperCase().trim();
      });
    }
  }

  return lines;
}

export async function extractCurrentScoreFromScreenshot(filename: string) {
  // Crop out just the board in the center, and crank the
  // contrast to make it easier to ocr
  const leftImageData = await cropImageToScore(filename, "left").toBuffer();
  const rightImageData = await cropImageToScore(filename, "right").toBuffer();
  const worker = Tesseract.createWorker({});
  await worker.load();
  await worker.loadLanguage("eng");
  await worker.initialize("eng");
  await worker.setParameters({
    // tessedit_pageseg_mode: Tesseract.PSM.AUTO_ONLY,
    tessedit_char_whitelist: "0123456789 ",
  });
  const leftOutput = await worker.recognize(leftImageData);
  const rightOutput = await worker.recognize(rightImageData);
  await worker.terminate();

  let blueScore = parseInt(leftOutput.data.text);
  let redScore = parseInt(rightOutput.data.text);

  if (blueScore === undefined) {
    blueScore = parseInt(await question("Enter blue score: "));
  }

  if (redScore === undefined) {
    redScore = parseInt(await question("Enter red score: "));
  }

  return {
    blueScore,
    redScore,
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

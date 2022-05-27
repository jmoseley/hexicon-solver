import Tesseract from "tesseract.js";
import sharp from "sharp";

// TODO: Support different sized screenshots of the board
// Returns the extracted letters of the board as space separated characters,
// in lines separated by newlines
// There is a high likelihood that the extracted letters will be missing "I"s
export async function extractTextFromScreenshot(
  filename: string
): Promise<string> {
  if (process.env.RETURN_SAMPLE_TEXT) {
    return (
      "P\n" +
      "T R\n" +
      "H E A\n" +
      "S A K E\n" +
      "T I R E F\n" +
      // "T R E F\n" +
      "B L F T\n" +
      "E L T S I\n" +
      // "E L T S\n" +
      "R S I U\n" +
      // "R S U\n" +
      "D T A G C\n" +
      "A I R E\n" +
      // "A R E\n" +
      "Y B L A I\n" +
      "Y A M L\n" +
      "R R G D R\n" +
      "I E E I\n" +
      // "E E\n" +
      "F N L\n" +
      "T R\n" +
      "G\n"
    );
  }

  // Crop out just the board in the center, and crank the
  // contrast to make it easier to ocr
  const imageData = await sharp(filename)
    .extract({ width: 1080, height: 1440, left: 0, top: 360 })
    .greyscale()
    .threshold()
    .toBuffer();
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

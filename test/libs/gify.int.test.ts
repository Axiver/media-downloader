import { expect } from "chai";
import fs from "fs/promises";
import path from "path";
import handleGifyModule from "@/libs/handleGify";

// No stubbing here — real function
const handleGify: typeof handleGifyModule = handleGifyModule as any;

describe("handleGify (integration)", () => {
  const url = "https://gfycat.com/candidnauticalgoosefish";
  const savePath = path.join("downloads"); // Save to test/downloads
  const fileName = "candidnauticalgoosefish";

  before(async () => {
    // Ensure downloads folder exists
    await fs.mkdir(savePath, { recursive: true });
  });

  afterEach(async () => {
    // Clean up downloaded files after each test
    try {
      await fs.rm(path.join(savePath, `${fileName}.mp4`));
    } catch (err) {
      // Ignore if file doesn't exist
    }
  });

  it("should download and save the file correctly", async () => {
    const savedFilePath = await handleGify(url, savePath, fileName);

    console.log({ savedFilePath });

    // Check that file exists
    const fileStat = await fs.stat(savedFilePath);

    expect(fileStat.isFile()).to.be.true;
    expect(fileStat.size).to.be.greaterThan(0); // File is not empty
  }).timeout(10000); // Increase timeout for this test
});

import download from "@/downloader";
import { expect } from "chai";
import fs from "fs/promises";
import path from "path";

describe("downloader (integration)", () => {
  let downloadedFilePath = "";
  const savePath = path.join("downloads"); // Save to /downloads

  before(async () => {
    // Ensure downloads folder exists
    await fs.mkdir(savePath, { recursive: true });
  });

  afterEach(async () => {
    // Clean up the downloaded files after each test
    try {
      if (downloadedFilePath) await fs.rm(downloadedFilePath);
    } catch (err) {
      // Ignore if file doesn't exist
    }
  });

  // Define the test cases for different domains
  const testCases = [
    { domain: "gfycat.com", url: "https://gfycat.com/candidnauticalgoosefish" },
    { domain: "i.imgur.com (mp4)", url: "https://i.imgur.com/LeTD6AH.mp4" },
    { domain: "i.imgur.com (jpeg)", url: "https://i.imgur.com/7iLQKWX.jpeg" },
    { domain: "v.redd.it (mp4)", url: "https://i.redd.it/5mhq1mywwpxe1.jpeg" },
    { domain: "i.redd.it (jpeg)", url: "https://v.redd.it/fddjb3p4wbw81" },
  ];

  // Iterate through each test case
  testCases.forEach(({ domain, url }) => {
    it(`should handle ${domain} links properly`, async () => {
      const savedFilePath = await download(url);
      expect(savedFilePath).to.not.be.undefined;

      // Check that file exists
      const fileStat = await fs.stat(savedFilePath as string);

      expect(fileStat.isFile()).to.be.true;
      expect(fileStat.size).to.be.greaterThan(0); // File is not empty

      // Store the downloaded file path for cleanup
      downloadedFilePath = savedFilePath as string;
    }).timeout(10000); // Increase timeout for this test
  });
});

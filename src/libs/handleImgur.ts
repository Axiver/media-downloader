// -- Constants --//
import { AxiosError } from "axios";
import { downloadFile } from "./fileHandler";
import log from "./logger";

// Converts the imgur url
const convertUrl = async (url: string) => {
  // Replace the .gifv with .mp4
  const convertedUrl = url.replace(".gifv", ".mp4");
  return convertedUrl;
};

/**
 * Handles the imgur API
 * @param url The imgur url
 * @param path Location to save the file
 * @param fileName Name the file should be saved as (without extension)
 * @returns The downloaded file path
 */
const handleImgur = async (url: string, path: string, _fileName?: string) => {
  return new Promise<string>(async (resolve, reject) => {
    // Replace the .gifv with .mp4
    const convertedUrl = await convertUrl(url);

    // Construct a filename (we use the last part of the path as the file name if not provided)
    // Imgur links always end with a file name, so we can use that
    // They also come with the file extension
    const fileName = _fileName ? `${_fileName}` : `${url.split("/").pop()}`;
    const fullPath = `${path}/${fileName}`;

    // Log the event
    log({
      processName: "Downloader",
      event: "INFO",
      message: `Downloading resource from ${convertedUrl}...`,
    });

    // Download the file
    try {
      await downloadFile(convertedUrl, fullPath);
      resolve(fullPath);
    } catch (error) {
      // Check if it is not an AxiosError or it failed for something other than ECONNREFUSED
      if (!(error instanceof AxiosError) || !error.message.includes("ECONNREFUSED")) {
        // Reject the promise
        reject(error);
      }

      // This is an ECONNREFUSED AxiosError
      // Wait for a while and retry as ECONNREFUSED means that we are being rate limited
      // Randomly select a timeout between 4 and 10 seconds
      const retryTimeout = Math.floor(Math.random() * 5) + 1;

      // Log the event
      log({
        processName: "Downloader",
        event: "ERROR",
        message: `ECONNREFUSED encountered while downloading resource from: ${convertedUrl}. Retrying in ${retryTimeout} seconds`,
      });

      // Wait for the timeout before retrying
      setTimeout(async () => {
        await handleImgur(url, path, _fileName);
        resolve(fullPath);
      }, retryTimeout * 1000);
    }
  });
};

export default handleImgur;

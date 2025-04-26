// -- Constants --//
import { AxiosError } from "axios";
import { downloadFile } from "./fileHandler";
import log from "./logger";
export const gfy_archive_base_url = "https://web.archive.org/web/20230822120601im_/https://thumbs.gfycat.com/{identifier}-mobile.mp4"; // We only access gfycat links through the internet archive as the original site is down

// Converts the url to a internet archived url
const convertUrl = async (url: string) => {
  // Get the url's path
  const path = url.split("/")[3];

  // Get the identifier
  const identifier = path.split("-")[0];

  // Construct the url
  const convertedUrl = gfy_archive_base_url.replace("{identifier}", identifier);

  // Return the converted url
  return convertedUrl;
};

/**
 * Handles the gify API
 * @param url The gify url
 * @param path Location to save the file
 * @param fileName Name the file should be saved as (without extension)
 * @returns The downloaded file path
 */
const handleGify = async (url: string, path: string, _fileName?: string) => {
  return new Promise<string>(async (resolve, reject) => {
    // Convert the gify url to a internet archived url
    const convertedUrl = await convertUrl(url);

    // Construct a filename (we use the last part of the path as the file name if not provided)
    // Gifycat links always end with a file name, so we can use that
    const fileName = _fileName ? `${_fileName}.mp4` : `${path.split("/").pop()}.mp4`;
    const fullPath = `${path}/${fileName}`;

    // Log the event
    log({
      processName: "Downloader",
      event: "INFO",
      message: `Downloading resource from ${convertedUrl}...`,
      print: true,
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
        print: true,
      });

      // Wait for the timeout before retrying
      setTimeout(async () => {
        await handleGify(url, path, fileName);
        resolve(fullPath);
      }, retryTimeout * 1000);
    }
  });
};

export default handleGify;

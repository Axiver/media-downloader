// Import modules
import { createWriteStream } from "fs";
// import proxies from "../proxies.json";

// Initialise axios client
import axios, { AxiosError } from "axios";
import log from "./logger";
import { purgeSpecialChars } from "./stringUtils";

// Obtains a proxy
// function getProxy() {
//   // Get a random proxy
//   const proxy = proxies[Math.floor(Math.random() * proxies.length)];

//   // Get the host and the port
//   const host = proxy.split(":")[0];
//   const port = parseInt(proxy.split(":")[1]);

//   // Return the proxy
//   return { host, port };
// }

/**
 * Fetches a resource file
 * @param fileUrl A link to the file to download
 * @param outputLocationPath The path to save the file to
 * @returns A promise
 */
export async function fetchFile(fileUrl: string, outputLocationPath: string) {
  // Create a write stream
  const writer = createWriteStream(purgeSpecialChars(outputLocationPath));

  // Obtain a proxy
  // const proxy = getProxy();

  return axios
    .get(fileUrl, {
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      },
      // proxy,
    })
    .catch((error) => {
      throw error; // Rethrow the error to ensure proper type handling
    })
    .then((response) => {
      // ensure that the user can call `then()` only when the file has
      // been downloaded entirely.
      return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        let error: Error | null = null;
        writer.on("error", (err) => {
          error = err;
          writer.close();
          reject(err);
        });
        writer.on("close", () => {
          if (!error) {
            resolve(true);
          }
        });
      });
    });
}

/**
 * Downloads a resource from a url and saves it to a file
 * @param fileUrl The url of the file to download
 * @param outputLocationPath The path to save the file to
 * @returns The path to the downloaded file
 * @throws {Error} If the file could not be downloaded
 */
export function downloadFile(fileUrl: string, outputLocationPath: string) {
  return new Promise<string>(async (resolve, reject) => {
    // Download the file
    try {
      await fetchFile(fileUrl, outputLocationPath);
      resolve(outputLocationPath);
    } catch (error) {
      // Check if it is not an AxiosError or it failed for something other than ECONNREFUSED
      if (!(error instanceof AxiosError) || !error.message.includes("ECONNREFUSED")) {
        // Reject the promise
        reject(error);
      }

      // This is an ECONNREFUSED AxiosError
      // Wait for a while and retry as ECONNREFUSED usually means that we are being rate limited
      // Randomly select a timeout between 4 and 10 seconds
      const retryTimeout = Math.floor(Math.random() * 5) + 1;

      // Log the event
      log({
        processName: "Downloader",
        event: "ERROR",
        message: `ECONNREFUSED encountered while downloading resource from: ${fileUrl}. Retrying in ${retryTimeout} seconds`,
      });

      // Wait for the timeout before retrying
      setTimeout(async () => {
        await downloadFile(fileUrl, outputLocationPath);
        resolve(outputLocationPath);
      }, retryTimeout * 1000);
    }
  });
}

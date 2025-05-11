import log from "./libs/logger";
import handleGify from "./libs/handleGify";
import handleImgur from "./libs/handleImgur";
import handleReddit from "./libs/handleReddit";
import { trimUrl } from "./libs/stringUtils";

const path = "./downloads/";

type DownloadOptions = {
  retries?: number;
  fileName?: string;
};

// Downloads media from various hosts
const download = async (url: string, options?: DownloadOptions): Promise<string | undefined> => {
  // Log the event
  log({
    processName: "Downloader",
    event: "INFO",
    message: `Downloading file at: ${url}`,
    print: true,
  });

  // Obtain the domain from the URL
  const domain = new URL(url).hostname;

  // Trim the url
  const trimmedUrl = trimUrl(url);

  // Handle the download depending on the host
  let file: undefined | string;
  try {
    switch (domain) {
      case "gfycat.com":
        // Download the video
        file = await handleGify(trimmedUrl, path, options?.fileName);
        break;
      case "i.imgur.com":
        file = await handleImgur(trimmedUrl, path, options?.fileName);
        break;
      case "i.redd.it":
      case "www.reddit.com":
      case "reddit.com":
      case "v.redd.it":
        file = await handleReddit(trimmedUrl, path, options?.fileName);
        break;
      default:
        // Throw an error for unsupported domain
        throw new Error(`Unsupported domain: ${domain}`);
    }
  } catch (error) {
    // Log the event
    log({
      processName: "Downloader",
      event: "ERROR",
      message: `Error encountered downloading media at: ${url}. Error: ${error}`,
      print: true,
    });

    // Download unsuccessful
    // Attempt to retry the download if there are retries left
    if (options?.retries && options.retries > 0) {
      // Log the event
      log({
        processName: "Downloader",
        event: "INFO",
        message: `Retrying download for ${url}... (${options.retries} retries left)`,
        print: true,
      });

      // Retry the download
      file = await download(url, {
        retries: options.retries - 1,
        fileName: options.fileName,
      });
    } else {
      // No retries left, re-throw the error
      throw error;
    }
  }

  // Fail-safe check to ensure the file was downloaded
  if (!file) {
    // File was not downloaded
    log({
      processName: "Downloader",
      event: "ERROR",
      message: `Failed to download file at: ${url}`,
      print: true,
    });
  }

  // File downloaded successfully
  log({
    processName: "Downloader",
    event: "INFO",
    message: `Downloaded media at: ${url} to ${file}`,
    print: true,
  });
  return file;
};

export default download;

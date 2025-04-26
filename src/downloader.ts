import log from "./libs/logger";
import handleGify from "./libs/handleGify";

const path = "./downloads/";

type DownloadOptions = {
  retries?: number;
  fileName?: string;
};

// Downloads media from various hosts
const download = async (url: string, options: DownloadOptions) => {
  // Log the event
  log({
    processName: "Downloader",
    event: "INFO",
    message: `Downloading file at: ${url}`,
    print: true,
  });

  // Obtain the domain from the URL
  const domain = new URL(url).hostname;

  // Handle the download depending on the host
  let file: string = "";
  try {
    switch (domain) {
      case "gfycat.com":
        // Download the video
        file = await handleGify(url, path, options.fileName);
        break;
      default:
        // Log the event
        log({
          processName: "Downloader",
          event: "WARN",
          message: `Unsupported domain: ${domain}. Skipping...`,
          print: true,
        });
        break;
    }
  } catch (error) {
    // Log the event
    log({
      processName: "Downloader",
      event: "ERROR",
      message: `Error encountered downloading media at: ${url}. Error: ${error}`,
      print: true,
    });
  }

  // Download unsuccessful
  if (!file) {
    // Log the event
    log({
      processName: "Downloader",
      event: "WARN",
      message: `Failed to download media at: ${url}`,
      print: true,
    });

    // Attempt to retry the download if there are retries left
    if (options.retries && options.retries > 0) {
      // Log the event
      log({
        processName: "Downloader",
        event: "INFO",
        message: `Retrying download for ${url}... (${options.retries} retries left)`,
        print: true,
      });

      // Retry the download
      await download(url, {
        retries: options.retries - 1,
        fileName: options.fileName,
      });
    }
  } else {
    // Log the event
    log({
      processName: "Downloader",
      event: "INFO",
      message: `Downloaded media at: ${url} to ${file}`,
      print: true,
    });
  }
};

export default download;

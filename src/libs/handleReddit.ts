// -- Constants --//
import axios from "axios";
import { downloadFile } from "./fileHandler";
import fs from "fs";
import XML from "xml-js";

// Configure JSDOM (has to be done this way cause of a bug where CSS stylesheets cannot be parsed properly)
import jsdom from "jsdom";
import log, { getTimestamp } from "./logger";
import { DashFileEntry, PackagedMedia } from "@/types/RequestTypes";
const { JSDOM } = jsdom;
const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", () => {
  // No-op to skip console errors.
});

// Gets the audio and video link from Reddit Api
const fetchUrls = async function (url: string) {
  // Fetching base url and dash file from reddit API
  const response = await axios(url + ".json");
  const redditAPIData = response.data[0].data.children[0].data;

  const redditVideo = {
    baseURL: redditAPIData.url,
    dashURL: redditAPIData.secure_media.reddit_video.dash_url,
  };

  // Fetching dash XML file
  const dashFile = await axios(redditVideo.dashURL);

  return {
    baseURL: redditVideo.baseURL,
    dashURL: redditVideo.dashURL,
    dashContent: parseDASH(dashFile.data, redditVideo.baseURL),
  };
};

// Parses the DASH file
function parseDASH(file: string, baseURL: string) {
  // Convert from XML to JSON
  const jsonDash = JSON.parse(XML.xml2json(file, { compact: true }));
  const videoFormat = [];

  // Getting max video
  videoFormat.push(videoDash(jsonDash.MPD.Period.AdaptationSet[0], baseURL));

  return {
    video: videoFormat,
    audio: audioDash(jsonDash.MPD.Period.AdaptationSet[1].Representation[1], baseURL),
  };
}

// Format the video dash data
function videoDash(json: DashFileEntry, baseURL: string) {
  return {
    type: "video",
    maxFormat: json.BaseURL != undefined ? false : true,
    format: json._attributes.height || json._attributes.maxHeight,
    url: json.BaseURL != undefined ? `${baseURL}/${json.BaseURL._text}` : `${baseURL}/DASH_${json._attributes.maxHeight}.mp4`,
  };
}

// Format the audio dash data
function audioDash(json: DashFileEntry, baseURL: string) {
  return {
    type: "audio",
    url: `${baseURL}/${json.BaseURL._text}`,
    // info: json._attributes,
    // audioInfo: json.Representation._attributes
  };
}

// Obtains the media link from the reddit page
const fetchMedia = async function (url: string) {
  return new Promise<string>(async (resolve, reject) => {
    // Make a request to v.redd.it first
    const response = await axios.get(url);

    // Draw the dom (Have to supply virtualConsole or error will be thrown as it is unable to parse the CSS)
    const dom = new JSDOM(response.data, { virtualConsole });
    const media = dom.window.document.querySelector("shreddit-player, shreddit-player-2");

    // Check that the element exists
    if (!media) {
      reject(`Could not find the media element in the page: ${url}`);
      return;
    }

    // Obtain the packaged-media-json
    const packagedMediaJson = media.getAttribute("packaged-media-json");

    // Check that the packagedMediaJson exists
    if (!packagedMediaJson) {
      // Create a html file for debugging
      fs.writeFileSync(`./data/debug/${getTimestamp()}.html`, response.data);
      reject(`Could not find the packaged-media-json in the page: ${url}`);
      return;
    }

    // Parse the json
    const videoLink: PackagedMedia = JSON.parse(packagedMediaJson);

    // Obtain the best video (always the last one)
    const bestVideo = videoLink.playbackMp4s.permutations.pop()!;

    // Resolve with the video url
    resolve(bestVideo.source.url);
  });
};

/**
 * Handles the reddit API
 * @param url The reddit url
 * @param path Location to save the file
 * @param fileName Name the file should be saved as (without extension)
 * @returns The downloaded file path
 */
const handleReddit = async (url: string, path: string, _fileName?: string, isVideo?: boolean) => {
  return new Promise<string>(async (resolve, reject) => {
    // Check if this is a video
    if (isVideo) {
      try {
        // This is a video, obtain the actual source url from the packaged media
        url = await fetchMedia(url);
      } catch (error) {
        reject(error);
        return;
      }
    }

    // Obtain the file extension
    const ext = isVideo ? "mp4" : url.split(".").pop();

    // Construct a filename (we use the last part of the path as the file name if not provided)
    const fileName = _fileName ? `${_fileName}` : `${url.split("/").pop()}`;
    const fullPath = `${path}/${fileName}.${ext}`;

    // Log the event
    log({
      processName: "Downloader",
      event: "INFO",
      message: `Downloading resource from ${url}...`,
    });

    // Download the file
    try {
      await downloadFile(url, fullPath);
    } catch (error) {
      // Unable to download the file
      reject(error);
      return;
    }

    resolve(fullPath);
    return;
  });
};

export default handleReddit;

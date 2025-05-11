// -- Imports --//
import axios from "axios";
import { downloadFile } from "./fileHandler";
import fs from "fs";
import XML from "xml-js";

// Configure JSDOM (has to be done this way cause of a bug where CSS stylesheets cannot be parsed properly)
import jsdom from "jsdom";
import log, { getTimestamp } from "./logger";
import { DashFileEntry, PackagedMedia } from "@/types/RequestTypes";
import { getFileExtension, validateFileExtension } from "./stringUtils";
const { JSDOM } = jsdom;
const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", () => {
  // No-op to skip console errors.
});

// -- Constants --//
const VALID_FILE_EXTENSIONS = ["mp4", "jpg", "jpeg", "png"];


// -- Functions --//
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

function getVideoSource(url: string, dom: jsdom.JSDOM) {
  // Attempt to obtain a reference to the video player
  const videoPlayer = dom.window.document.querySelector("shreddit-player, shreddit-player-2");

  // Check that the element exists
  if (!videoPlayer) {
    throw new Error(`Could not find the video player in the page: ${url}`);
  }

  // Obtain the packaged-media-json
  const packagedMediaJson = videoPlayer.getAttribute("packaged-media-json");

  // Check that the packagedMediaJson exists
  if (!packagedMediaJson) {
    throw new Error(`Could not find the packaged-media-json in the page: ${url}`);
  }

  // Parse the json
  const videoLink: PackagedMedia = JSON.parse(packagedMediaJson);

  // Obtain the best video (always the last one)
  const bestVideo = videoLink.playbackMp4s.permutations.pop()!;
  return bestVideo.source.url;
}

function getImageSource(url: string, dom: jsdom.JSDOM) {
  // Attempt to obtain a reference to the image element
  const imageElement = dom.window.document.querySelector(".zoomable-img-wrapper img");

  // Check that the element exists
  if (!imageElement) {
    throw new Error(`Could not find the image element in the page: ${url}`);
  }

  // Obtain the image source
  const imageSrc = imageElement.getAttribute("src");

  if (!imageSrc) {
    throw new Error(`Could not find the image source in the page: ${url}`);
  }

  return imageSrc;
}

/**
 * Obtains the media link from the reddit post (reddit.com / v.redd.it)
 * @param {string} url The link to the reddit post
 * @returns A direct link to the media
 */
const fetchMedia = async function (url: string) {
  return new Promise<string>(async (resolve, reject) => {
    // Make a request to the reddit post page first
    const response = await axios.get(url);

    // Draw the dom (Have to supply virtualConsole or error will be thrown as it is unable to parse the CSS)
    const dom = new JSDOM(response.data, { virtualConsole });

    try {
      // Attempt to obtain the video
      const videoSrc = getVideoSource(url, dom);
      resolve(videoSrc);
      return;
    } catch (error) {
      // Unable to obtain the video, could be an image
    }

    try {
      // Attempt to obtain the image
      const imageSrc = getImageSource(url, dom);
      resolve(imageSrc);
      return;
    } catch (error) {
      // Unable to obtain both video and image
      // Create a html file for debugging
      fs.writeFileSync(`./data/debug/${getTimestamp()}.html`, response.data);

      // Re-throw the error
      throw error;
    } 
  });
};

/**
 * Handles the reddit API
 * @param _url The reddit url
 * @param path Location to save the file
 * @param _fileName Name the file should be saved as (without extension)
 * @returns The downloaded file path
 */
const handleReddit = async (_url: string, path: string, _fileName?: string) => {
  return new Promise<string>(async (resolve, reject) => {
    // Check if this is a direct link to the resource
    let url = _url;
    if (!validateFileExtension(url, VALID_FILE_EXTENSIONS)) {
      // It is not, attempt to obtain a link to the resource
      url = await fetchMedia(url);
    }

    // Construct a filename (we use the last part of the url as the file name if not provided)
    let fileName = _fileName ? `${_fileName}` : `${_url.split("/").pop()}` || `${url.split("/").pop()}`;

    // Check if the filename already has an extension
    if (!validateFileExtension(fileName, VALID_FILE_EXTENSIONS)) {
      // It does not, attempt to obtain the file extension from the url (default to mp4 if it is a v.redd.it link or DASHPlaylist.mpd package)
      let ext = url.includes("v.redd.it") || url.includes("DASHPlaylist.mpd") ? "mp4" : getFileExtension(url);

      if (!ext || !validateFileExtension(ext, VALID_FILE_EXTENSIONS)) {
        // Unable to obtain the file extension, throw an error
        reject(new Error(`Unable to automatically determine a valid file extension for: ${url}`));
        return;
      }

      // Append the file extension to the filename
      fileName = `${fileName}.${ext}`;
    }

    // Construct the path to save the file to
    const fullPath = `${path}${fileName}`;

    // Log the event
    log({
      processName: "Downloader",
      event: "INFO",
      message: `Downloading resource from ${url}...`,
    });

    console.log({fileName, _url, url, fullPath})

    // Download the file
    await downloadFile(url, fullPath);
    resolve(fullPath);
  });
};

export default handleReddit;

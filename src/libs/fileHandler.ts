// Import modules
import { createWriteStream } from "fs";
// import proxies from "../proxies.json";

// Initialise axios client
import Axios from "axios";
const axios = Axios.create();

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
 * Removes special characters from a string
 * @param {string} string A string to remove the special characters of
 * @returns A string without special characters
 */
function purgeSpecialChars(string: string) {
  //Define the replacement for each special character
  const specialCharacters = [/\?/g, /\</g, /\>/g, /\"/g, /\*/g, /\:/g];

  //Remove special characters
  for (let i = 0; i < specialCharacters.length; i++) {
    string = string.replace(specialCharacters[i], "");
  }

  return string;
}

// Downloads a resource file
export async function downloadFile(fileUrl: string, outputLocationPath: string) {
  // Create a write stream
  const writer = createWriteStream(purgeSpecialChars(outputLocationPath));

  // Obtain a proxy
  // const proxy = getProxy();

  return axios({
    method: "get",
    url: fileUrl,
    responseType: "stream",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
    },
    // proxy,
  }).then((response) => {
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

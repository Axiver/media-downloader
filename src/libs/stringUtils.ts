/**
 * Removes special characters from a string
 * @param {string} string A string to remove the special characters of
 * @returns A string without special characters
 */
export function purgeSpecialChars(string: string) {
  //Define the replacement for each special character
  const specialCharacters = [/\?/g, /\</g, /\>/g, /\"/g, /\*/g, /\:/g];

  //Remove special characters
  for (let i = 0; i < specialCharacters.length; i++) {
    string = string.replace(specialCharacters[i], "");
  }

  return string;
}

/**
 * Obtains the file extension from a string
 * @param {string} string A string to obtain the file extension from
 * @returns The file extension of the URL
 */
export function getFileExtension(string: string) {
  // Get the file extension from the string
  const parts = string.split(".");
  const ext = parts.pop();

  // Check that this is a valid file extension (at the end of the string)
  if (!ext || ext !== string.slice(-ext.length)) {
    return undefined;
  }
  
  return ext;
}

/**
 * Validates the file extension of a string
 * @param string A string to check the file extension of
 * @param exts A list of valid file extensions
 * @returns True if the file extension is valid, false otherwise
 */
export function validateFileExtension(string: string, exts: string[]) {
  // Get the file extension from the string
  const ext = getFileExtension(string);

  // Check if the extension is in the list of valid extensions
  return exts.includes(ext || string);
}

/**
 * Trims the URL to remove trailing slashes
 * @param url The URL to trim
 * @returns The trimmed URL
 */
export function trimUrl(url: string) {
  // Remove trailing slashes
  return url.replace(/\/+$/, "");
}
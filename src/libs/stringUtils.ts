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
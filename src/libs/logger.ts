// Import modules
import fs from "fs";
import dayjs from "dayjs";

// Global variables
const logFile = fs.createWriteStream("./logs/log.txt", { flags: "a" });

//-- Functions --//
// Gets the current timestamp
function getTimestamp() {
  var format = "DD-MM-YYYY HH:mm:ss";
  let currTime = Date.now();
  let result = dayjs(currTime).format(format);
  return result;
}

// Logs events
function log({ event, message, print }: LogEvent) {
  return new Promise<void>((resolve, reject) => {
    // Gets the current timestamp
    let timestamp = getTimestamp();

    // Formats the text to append to main log file
    let result = `[${timestamp}] [LOG/${event}] ${message}`;

    // Creates a writeable stream for the main log file
    logFile.write("\r\n" + result);
    if (print) console.log(result);

    resolve();
  });
}

export default log;

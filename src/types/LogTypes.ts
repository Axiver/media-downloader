export type LogEvent = {
  processName: LogProcesses;
  event: LogEvents;
  message: string;
  print?: boolean;
};

export type LogProcesses = "Downloader" | "File Handler";

export type LogEvents = "INFO" | "WARN" | "ERROR" | "DEBUG";

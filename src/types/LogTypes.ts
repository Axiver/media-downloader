type LogEvent = {
  processName: LogProcesses;
  event: LogEvents;
  message: string;
  print?: boolean;
};

type LogProcesses = "Downloader" | "File Handler";

type LogEvents = "INFO" | "WARN" | "ERROR" | "DEBUG";

import type { Gender } from "../types";

export const GENDERS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "UNSPECIFIED", label: "Prefer not to say" },
];

export const LANGUAGES = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Japanese",
  "Chinese",
  "Portuguese",
  "Arabic",
  "Russian",
];

export const TIMEZONES: { value: string; label: string }[] = [
  { value: "Asia/Kolkata", label: "(GMT+5:30) India Standard Time (Asia/Kolkata)" },
  { value: "Asia/Dubai", label: "(GMT+4:00) Gulf Standard Time (Asia/Dubai)" },
  { value: "Asia/Karachi", label: "(GMT+5:00) Pakistan Standard Time (Asia/Karachi)" },
  { value: "Asia/Dhaka", label: "(GMT+6:00) Bangladesh Standard Time (Asia/Dhaka)" },
  { value: "Asia/Singapore", label: "(GMT+8:00) Singapore Time (Asia/Singapore)" },
  { value: "Asia/Shanghai", label: "(GMT+8:00) China Standard Time (Asia/Shanghai)" },
  { value: "Asia/Tokyo", label: "(GMT+9:00) Japan Standard Time (Asia/Tokyo)" },
  { value: "Australia/Sydney", label: "(GMT+10:00) Australian Eastern Time (Australia/Sydney)" },
  { value: "Europe/London", label: "(GMT+0:00) Greenwich Mean Time (Europe/London)" },
  { value: "Europe/Berlin", label: "(GMT+1:00) Central European Time (Europe/Berlin)" },
  { value: "Europe/Paris", label: "(GMT+1:00) Central European Time (Europe/Paris)" },
  { value: "America/New_York", label: "(GMT-5:00) Eastern Time (America/New_York)" },
  { value: "America/Chicago", label: "(GMT-6:00) Central Time (America/Chicago)" },
  { value: "America/Los_Angeles", label: "(GMT-8:00) Pacific Time (America/Los_Angeles)" },
  { value: "America/Sao_Paulo", label: "(GMT-3:00) Brasilia Time (America/Sao_Paulo)" },
  { value: "Africa/Johannesburg", label: "(GMT+2:00) South Africa Standard Time (Africa/Johannesburg)" },
  { value: "Pacific/Auckland", label: "(GMT+12:00) New Zealand Time (Pacific/Auckland)" },
];

import { format, parseISO } from "date-fns";

export const formatShort = (dueDate) => format(parseISO(dueDate), "MMM d");

export const formatDone = (timestamp) => `Done ${format(timestamp, "MMM d")}`;

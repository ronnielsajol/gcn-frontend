import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatTime(timeString: string | null | undefined): string {
	if (!timeString) return "-";
	const date = new Date(timeString);
	return date.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});
}

export const formatDate2 = (dateString: string) => {
	if (!dateString) return "-";
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US");
};

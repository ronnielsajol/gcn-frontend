import type React from "react";
import "@/app/globals.css";
import Providers from "@/components/providers"; // Import your new providers component
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
	title: "Taguig City Profiling Application",
	description: "A comprehensive user profiling system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang='en' suppressHydrationWarning>
			<body>
				<Providers>
					{children}
					<Toaster richColors />
				</Providers>
			</body>
		</html>
	);
}

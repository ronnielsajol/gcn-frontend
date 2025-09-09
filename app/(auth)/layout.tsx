import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Navbar from "@/components/navbar";
import type { ReactNode } from "react";

export default function ProtectedUsersLayout({ children }: { children: ReactNode }) {
	return (
		<ProtectedRoute>
			<Navbar />
			{children}
		</ProtectedRoute>
	);
}


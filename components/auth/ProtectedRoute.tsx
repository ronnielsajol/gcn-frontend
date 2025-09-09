"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
	const { user, isLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!isLoading && !user) {
			router.push("/login");
		}
	}, [user, isLoading, router]);

	if (isLoading || !user) {
		return (
			<div className='w-screen h-screen flex items-center justify-center'>
				<Loader2 className='w-16 h-16 animate-spin text-blue-600' />
			</div>
		);
	}

	return <>{children}</>;
}

"use client";

import { useAuth } from "@/context/AuthContext";
import UsersTable from "@/components/users-table";
import { Loader2 } from "lucide-react";
import AdminsTable from "@/components/admins-table";

export default function UsersPage() {
	const { user, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<Loader2 className='w-8 h-8 animate-spin text-gray-500' />
			</div>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<div className='min-h-screen bg-gray-50 py-8 px-4'>
			<div className='max-w-7xl mx-auto'>
				<AdminsTable currentUser={user} />
			</div>
		</div>
	);
}

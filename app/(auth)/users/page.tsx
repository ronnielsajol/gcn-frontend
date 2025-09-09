"use client";

import { useAuth } from "@/context/AuthContext";
import UsersTable from "@/components/users-table";

export default function UsersPage() {
	const { user } = useAuth();

	//console.log("Current user:", user);
	if (!user) {
		return null;
	}

	return (
		<div className='min-h-screen bg-gray-50 py-8 px-4'>
			<div className='max-w-7xl mx-auto'>
				<UsersTable currentUser={user} />
			</div>
		</div>
	);
}

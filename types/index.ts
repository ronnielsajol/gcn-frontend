export interface UserFile {
	id: number;
	user_id: number;
	file_name: string;
	file_path: string;
	file_url: string;
	file_type: string;
	file_size: number;
	uploaded_by: string;
	created_at: string;
	updated_at: string;
}

export interface User {
	id: string;
	first_name: string;
	last_name: string;
	address: string;
	gender: "male" | "female" | "other";
	religion: string;
	contact_number: string;
	email: string;
	profile_image?: string | null;
	role: "super_admin" | "admin" | "user";
	is_active: boolean;
	email_verified_at?: string | null;
	created_at: string;
	updated_at: string;
	user_files: UserFile[];
}

export interface Event {
	id: number;
	name: string;
	description: string;
	location: string;
	status: "upcoming" | "ongoing" | "completed" | "cancelled";
	start_time: string;
	end_time: string;
	created_by: {
		id: string;
		first_name: string;
		last_name: string;
	};
	created_at: string;
	updated_at: string;
	delete_at: string | null;
	users: User[];
}

export interface AdminActor {
	id: number;
	name: string;
	email: string;
}
export interface PaginationLink {
	url: string | null;
	label: string;
	active: boolean;
}
export interface PaginationLink {
	url: string | null;
	label: string;
	active: boolean;
}

export interface LoginData {
	last_login_at: string;
}

export interface FileUploadData {
	file_name: string;
}
export interface UserFileData {
	id: number;
	user_id: number;
	file_url: string;
	file_name: string;
	file_path: string;
	file_size: number;
	file_type: string;
	created_at: string;
	updated_at: string;
	uploaded_by: string;
}
export type ActivityLogValues = LoginData | FileUploadData | UserFileData;

export interface ActivityLog {
	id: number;
	admin_id: number;
	action: string;
	model_type: string;
	model_id: number;
	old_values: ActivityLogValues | null;
	new_values: ActivityLogValues | null;
	ip_address: string;
	user_agent: string;
	created_at: string;
	updated_at: string;
	admin: AdminActor | null;
}

export interface PaginatedResponse<T> {
	current_page: number;
	data: T[];
	first_page_url: string;
	from: number;
	last_page: number;
	last_page_url: string;
	links: PaginationLink[];
	next_page_url: string | null;
	path: string;
	per_page: number;
	prev_page_url: string | null;
	to: number;
	total: number;
}

export interface EventForUserResponse {
	message: string;
	user: {
		id: number;
		name: string;
		email: string;
	};
	events: EventApiResponse;
}

export type ActivityLogApiResponse = PaginatedResponse<ActivityLog>;
export type EventApiResponse = PaginatedResponse<Event>;

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

/** User roles available in the system. */
export const enum UserRole {
	SuperAdmin = "super_admin",
	Admin = "admin",
	User = "user",
}

/** Classification for working status. */
export const enum WorkingOrStudent {
	Working = "working",
	Student = "student",
}

/** Accepted payment methods. */
export const enum ModeOfPayment {
	Gcash = "gcash",
	Bank = "bank",
	Cash = "cash",
	Other = "other",
}

export type User = {
	id: string;
	first_name: string | null;
	last_name: string | null;
	middle_initial: string | null;
	contact_number: string | null;
	email: string | null;
	profile_image: string | null;
	user_files: UserFile[];
	/** Role assigned to the user. */
	role: UserRole;
	/** ISO datetime string when the email was verified, if any. */
	email_verified_at: string | null;
	/** Whether the account is active/enabled. */
	is_active: boolean;
	title: string | null;
	mobile_number: string | null;
	home_address: string | null;
	church_name: string | null;
	church_address: string | null;
	/** Working or student classification. */
	working_or_student: WorkingOrStudent | null;
	vocation_work_sphere: string | null;
	/** Payment method used by the user. */
	mode_of_payment: ModeOfPayment | null;
	proof_of_payment_url: string | null;
	notes: string | null;
	group_id: number | null;
	reference_number: string | null;
	/** Finance reconciliation flag. */
	reconciled: boolean;
	/** Finance check flag. */
	finance_checked: boolean;
	/** Email confirmation flag. */
	email_confirmed: boolean;
	/** Attendance flag. */
	attendance: boolean;
	/** ID card issued flag. */
	id_issued: boolean;
	/** Book given flag. */
	book_given: boolean;
	/** ISO datetime string when the record was created. */
	created_at: string;
	/** ISO datetime string when the record was last updated. */
	updated_at: string;
	/** ISO datetime string when the record was soft-deleted, or null. */
	deleted_at: string | null;

	/** Model-only attribute; optional and may be null. */
	proof_of_payment_path?: string | null;
	/** External system key; optional and may be null. */
	external_key?: string | null;
	/** Name-derived key; optional and may be null. */
	name_key?: string | null;
	/** Optional review-needed flag. */
	needs_review?: boolean;
};

/** Includes hidden/private DB-backed fields. */
export type UserPrivate = User & {
	/** Hashed password (hidden in public payloads). */
	password: string | null;
	/** Remember token (hidden in public payloads). */
	remember_token: string | null;
};

/** User with related models; relations are optional. */
export type UserWithRelations = User & {
	group?: { id: number; name?: string } | null;
	events?: Array<{ id: number; name?: string }>;
	spheres?: Array<{ id: number; name?: string }>;
	userFiles?: Array<{ id: number; path?: string }>;
	activityLogs?: Array<{ id: number }>;
};

export interface Event {
	attended_count: number;
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
	users_count: number;
	users: PaginatedResponse<User> | null;
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

// Sphere Statistics Types
export interface SphereStatistic {
	sphere_id: number | null;
	sphere_name: string;
	sphere_slug: string;
	user_count: number;
	percentage: number;
}

export interface SphereStatsSummary {
	total_spheres_represented: number;
	users_without_spheres: number;
	most_popular_sphere: {
		sphere_id: number;
		sphere_name: string;
		sphere_slug: string;
		user_count: number;
		percentage: number;
	};
}

export interface SphereStatsResponse {
	event_id: number;
	event_name: string;
	total_users: number;
	sphere_stats: SphereStatistic[];
	summary: SphereStatsSummary;
}

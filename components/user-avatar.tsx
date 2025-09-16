import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";
import { getRandomGradientStyle } from "@/lib/gradient";
import { User as UserIcon } from "lucide-react";

type Userish = {
	first_name?: string | null;
	last_name?: string | null;
	/** Full name for non-user actors (e.g., admins) */
	name?: string | null;
	profile_image?: string | null;
	role?: string | null;
} | null;

interface UserAvatarProps {
	user: Userish;
	/** Tailwind classes for sizing, e.g. 'w-10 h-10' */
	avatarSize: string;
	/** Tailwind classes for fallback text/icon */
	fallbackStyle?: string;
	/** Override image src (e.g., local preview data URL) */
	srcOverride?: string;
}

const getInitials = (fullName: string): string => {
	return fullName
		.split(/\s+/)
		.filter(Boolean)
		.map((n) => n[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
};

const UserAvatar = ({ user, avatarSize, fallbackStyle, srcOverride }: UserAvatarProps) => {
	const displayName = ((user?.first_name || "") + " " + (user?.last_name || "")).trim() || (user?.name || "").trim();
	const initials = displayName ? getInitials(displayName) : <UserIcon className='text-gray-400' />;
	const imageSrc = srcOverride ?? user?.profile_image ?? "/placeholder.svg";

	return (
		<Avatar className={cn(avatarSize)}>
			<AvatarImage className='object-cover' src={imageSrc} alt={displayName || undefined} />
			<AvatarFallback
				className={cn(fallbackStyle, "border-2 border-gray-300")}
				style={user?.role === "super_admin" ? getRandomGradientStyle() : undefined}>
				{initials}
			</AvatarFallback>
		</Avatar>
	);
};

export default UserAvatar;

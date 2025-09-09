import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { User } from "@/types";
import { cn } from "@/lib/utils";
import { getRandomGradientStyle } from "@/lib/gradient";

interface UserAvatar {
	user: User | null;
	avatarSize: string;
	fallbackStyle?: string;
}

const UserAvatar = ({ user, avatarSize, fallbackStyle }: UserAvatar) => {
	if (!user) {
		return (
			<Avatar className={cn(avatarSize)}>
				<AvatarFallback className={cn(fallbackStyle)}>?</AvatarFallback>
			</Avatar>
		);
	}

	return (
		<div>
			<Avatar className={cn(avatarSize)}>
				<AvatarImage className='object-cover' src={user.profile_image || "/placeholder.svg"} />
				<AvatarFallback
					className={cn(fallbackStyle)}
					style={user.role === "super_admin" ? getRandomGradientStyle() : undefined}>
					{user.first_name
						?.split(" ")
						.map((n) => n[0])
						.join("")}
					{user.last_name
						?.split(" ")
						.map((n) => n[0])
						.join("")}
				</AvatarFallback>
			</Avatar>
		</div>
	);
};

export default UserAvatar;

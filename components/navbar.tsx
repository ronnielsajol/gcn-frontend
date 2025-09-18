"use client";

import type React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
	Settings,
	Users,
	Menu,
	LogOut,
	User,
	Shield,
	HelpCircle,
	LogsIcon,
	UserRoundCogIcon,
	Calendar,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import UserAvatar from "./user-avatar";

interface NavigationItems {
	name: string;
	href: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	roles?: string[];
	disabled?: boolean;
}

export default function Navbar() {
	const { user, logout } = useAuth();
	const pathName = usePathname();

	const handleLogout = () => {
		logout();
	};

	const isActive = (href: string) => {
		return pathName.startsWith(href);
	};

	const navigationItems: NavigationItems[] = [
		{ name: "Events", href: "/events", icon: Calendar, roles: ["super_admin", "admin"] },
		{ name: "Users", href: "/users", icon: Users, roles: ["super_admin", "admin"] },
		{ name: "Admins", href: "/admins", icon: UserRoundCogIcon, roles: ["super_admin"] },
		{ name: "Logs", href: "/logs", icon: LogsIcon, roles: ["super_admin"] },
	];

	const navItems = navigationItems.filter((item) => {
		if (!item.roles) return true;
		return item.roles.includes(user?.role || "");
	});

	return (
		<nav className='sticky top-0 z-50 px-0 md:px-26 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60'>
			<div className='container mx-auto px-4'>
				<div className='flex h-16 items-center justify-between'>
					<div className='flex items-center space-x-4'>
						<Link href='/users' className='flex items-center space-x-2'>
							<span className='hidden font-bold text-xl text-gray-900 sm:inline-block'>TN</span>
						</Link>

						{/* Desktop Navigation */}
						<div className='hidden md:flex md:items-center md:space-x-6 ml-8'>
							{navItems.map((item) => {
								const Icon = item.icon;
								return (
									<Link
										key={item.name}
										href={item.href}
										className={cn(
											`flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors`,
											item.disabled ? "pointer-events-none opacity-50 py-2" : "",
											isActive(item.href) ? "text-gray-900 font-semibold" : ""
										)}
										aria-disabled={item.disabled}
										onClick={item.disabled ? (e) => e.preventDefault() : undefined}>
										<Icon className='h-4 w-4' />
										<span>{item.name}</span>
									</Link>
								);
							})}
						</div>
					</div>

					{/* Right Side Actions */}
					<div className='flex items-center space-x-4'>
						{/* User Menu */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant='ghost' className='relative h-8 w-8 rounded-full '>
									<UserAvatar user={user} avatarSize={"w-10 h-10 max-sm:hidden"} fallbackStyle={"font-semibold"} />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className='w-56' align='end' forceMount>
								<DropdownMenuLabel className='font-normal'>
									<div className='flex flex-col space-y-1'>
										<p className='text-sm font-medium leading-none'>
											{user?.first_name} {user?.last_name}
										</p>
										<p className='text-xs leading-none text-muted-foreground'>{user?.email}</p>
										<div className='flex items-center space-x-2 mt-2'>
											<Badge variant={user?.role === "super_admin" ? "default" : "secondary"} className='text-xs'>
												<Shield className='h-3 w-3 mr-1' />
												{user?.role === "super_admin" ? "Super Admin" : "Admin"}
											</Badge>
										</div>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem disabled>
									<User className='mr-2 h-4 w-4' />
									<span>Profile</span>
								</DropdownMenuItem>
								<DropdownMenuItem disabled>
									<Settings className='mr-2 h-4 w-4' />
									<span>Settings</span>
								</DropdownMenuItem>
								<DropdownMenuItem disabled>
									<HelpCircle className='mr-2 h-4 w-4' />
									<span>Help & Support</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleLogout} className='text-red-600'>
									<LogOut className='mr-2 h-4 w-4' />
									<span>Log out</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Mobile Menu */}
						<Sheet>
							<SheetTrigger asChild>
								<Button variant='ghost' size='sm' className='md:hidden'>
									<Menu className='h-5 w-5' />
								</Button>
							</SheetTrigger>
							<SheetContent side='right' className='w-[300px] sm:w-[400px]'>
								<div className='mt-6 space-y-4'>
									{/* Mobile Navigation */}
									<div className='space-y-2'>
										{navigationItems.map((item) => {
											const Icon = item.icon;
											return (
												<Link
													key={item.name}
													href={item.href}
													className='flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100'>
													<Icon className='h-5 w-5' />
													<span>{item.name}</span>
												</Link>
											);
										})}
									</div>

									<div className='border-t pt-4'>
										<div className='flex items-center space-x-3 px-3 py-2'>
											<UserAvatar user={user || null} avatarSize='h-10 w-10' fallbackStyle='font-semibold' />
											<div className='flex-1'>
												<p className='text-sm font-medium'>{`${user?.first_name} ${user?.last_name}`}</p>
												<p className='text-xs text-gray-500'>{user?.email}</p>
											</div>
										</div>
										<div className='mt-2 space-y-1'>
											<Button variant='ghost' className='w-full justify-start' size='sm'>
												<User className='mr-2 h-4 w-4' />
												Profile
											</Button>
											<Button variant='ghost' className='w-full justify-start' size='sm'>
												<Settings className='mr-2 h-4 w-4' />
												Settings
											</Button>
											<Button variant='ghost' className='w-full justify-start text-red-600' size='sm' onClick={handleLogout}>
												<LogOut className='mr-2 h-4 w-4' />
												Log out
											</Button>
										</div>
									</div>
								</div>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</div>
		</nav>
	);
}

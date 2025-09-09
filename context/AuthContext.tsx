"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setAuthToken, getAuthToken, clearAuthToken } from "@/lib/api";
import { User } from "@/types";

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	login: (credentials: Record<string, string>) => Promise<void>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const checkUserStatus = async () => {
			try {
				const token = getAuthToken();

				if (!token) {
					setUser(null);
					setIsLoading(false);
					return;
				}

				const userData = await apiFetch<User>("/me");
				setUser(userData);
			} catch (error) {
				clearAuthToken();
				setUser(null);
			} finally {
				setIsLoading(false);
			}
		};

		if (typeof window !== "undefined") {
			checkUserStatus();
		} else {
			setIsLoading(false);
		}
	}, []);

	const login = async (credentials: Record<string, string>) => {
		try {
			const response = await apiFetch<{ user: User; access_token: string; token_type: string }>(
				"/login",
				"POST",
				credentials
			);

			setAuthToken(response.access_token);
			setUser(response.user);

			window.location.href = "/users";
		} catch (error) {
			console.error("Login error:", error);
			throw error;
		}
	};

	const logout = async () => {
		try {
			await apiFetch("/logout", "POST");
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			clearAuthToken();
			setUser(null);
			router.push("/login");
		}
	};

	return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};

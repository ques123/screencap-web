"use client";

import { Button } from "@cap/ui/button";
import { Logo } from "@cap/ui/logo";
import { classNames } from "@cap/utils/helpers";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface MobileMenuProps {
	stars?: string;
}

interface NavLink {
	href: string;
	text: string;
	external?: boolean;
	icon?: ReactNode;
}

const primaryLinks: NavLink[] = [
	{ href: "/download", text: "Download" },
	{ href: "/self-hosting", text: "Self-hosting" },
];

const secondaryLinks: NavLink[] = [
	{
		href: "https://github.com/ques123/screencap-web",
		text: "Source code",
		external: true,
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="currentColor"
				className="size-5"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
			</svg>
		),
	},
];

const MobileMenu = ({ stars }: MobileMenuProps) => {
	const pathname = usePathname();
	const menuId = useId();
	const [open, setOpen] = useState(false);
	const [visible, setVisible] = useState(false);
	const [active, setActive] = useState(false);
	const [mounted, setMounted] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const closeRef = useRef<HTMLButtonElement>(null);
	const previousPathname = useRef(pathname);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (open) {
			setVisible(true);
			const frame = requestAnimationFrame(() => setActive(true));
			return () => cancelAnimationFrame(frame);
		}

		setActive(false);
		const timeout = setTimeout(() => setVisible(false), 300);
		return () => clearTimeout(timeout);
	}, [open]);

	useEffect(() => {
		if (previousPathname.current !== pathname) {
			previousPathname.current = pathname;
			setOpen(false);
		}
	}, [pathname]);

	useEffect(() => {
		const query = window.matchMedia("(min-width: 1024px)");
		const onChange = (event: MediaQueryListEvent) => {
			if (event.matches) {
				setOpen(false);
			}
		};

		query.addEventListener("change", onChange);
		return () => query.removeEventListener("change", onChange);
	}, []);

	useEffect(() => {
		if (!open) {
			return;
		}

		const html = document.documentElement;
		const { body } = document;
		const scrollbarWidth = window.innerWidth - html.clientWidth;
		const previousOverflow = html.style.overflow;
		const previousPaddingRight = body.style.paddingRight;

		html.style.overflow = "hidden";
		if (scrollbarWidth > 0) {
			body.style.paddingRight = `${scrollbarWidth}px`;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
			}
		};

		window.addEventListener("keydown", onKeyDown);

		return () => {
			html.style.overflow = previousOverflow;
			body.style.paddingRight = previousPaddingRight;
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	useEffect(() => {
		if (active) {
			closeRef.current?.focus();
		}
	}, [active]);

	const wasVisible = useRef(false);
	useEffect(() => {
		if (wasVisible.current && !visible) {
			triggerRef.current?.focus();
		}
		wasVisible.current = visible;
	}, [visible]);

	return (
		<>
			<button
				ref={triggerRef}
				type="button"
				aria-label="Open menu"
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-controls={menuId}
				onClick={() => setOpen(true)}
				className="inline-flex justify-center items-center -mr-1 rounded-full transition-colors size-10 text-gray-12 hover:bg-gray-3 active:scale-95"
			>
				<Menu className="size-6" strokeWidth={2} aria-hidden="true" />
			</button>

			{mounted && visible
				? createPortal(
						<div
							id={menuId}
							role="dialog"
							aria-modal="true"
							aria-label="Site navigation"
							className="fixed inset-0 z-[100] lg:hidden"
						>
							<button
								type="button"
								aria-label="Close menu"
								tabIndex={-1}
								onClick={() => setOpen(false)}
								className={classNames(
									"absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none",
									active ? "opacity-100" : "opacity-0",
								)}
							/>

							<div
								className={classNames(
									"flex overflow-hidden absolute inset-x-0 top-0 flex-col h-[100dvh] bg-gray-1 transition-opacity duration-300 ease-out motion-reduce:transition-none",
									active ? "opacity-100" : "opacity-0",
								)}
							>
								<div className="flex shrink-0 justify-between items-center px-5 h-[72px] pt-[env(safe-area-inset-top)]">
									<Link
										href="/"
										aria-label="Screencap home"
										onClick={() => setOpen(false)}
									>
										<Logo className="h-auto w-[116px]" />
									</Link>
									<button
										ref={closeRef}
										type="button"
										aria-label="Close menu"
										onClick={() => setOpen(false)}
										className="inline-flex justify-center items-center rounded-full border transition-colors size-10 border-gray-4 text-gray-12 hover:bg-gray-3 active:scale-95"
									>
										<X className="size-5" strokeWidth={2} aria-hidden="true" />
									</button>
								</div>

								<div className="overflow-y-auto flex-1 px-5 pt-2 pb-6 overscroll-contain">
									<nav aria-label="Primary">
										<ul className="space-y-1 list-none">
											{primaryLinks.map((link, index) => (
												<li
													key={link.href}
													className={classNames(
														"transition-opacity duration-300 ease-out motion-reduce:transition-none",
														active ? "opacity-100" : "opacity-0",
													)}
													style={{
														transitionDelay: active
															? `${250 + index * 45}ms`
															: "0ms",
													}}
												>
													<Link
														href={link.href}
														onClick={() => setOpen(false)}
														className="flex items-center px-4 -mx-4 h-12 text-xl font-medium rounded-xl transition-colors text-gray-12 hover:bg-gray-3"
													>
														{link.text}
													</Link>
												</li>
											))}
										</ul>
									</nav>

									<div className="my-5 h-px bg-gray-4" />

									<ul className="space-y-1 list-none">
										{secondaryLinks.map((link, index) => (
											<li
												key={link.href}
												className={classNames(
													"transition-opacity duration-300 ease-out motion-reduce:transition-none",
													active ? "opacity-100" : "opacity-0",
												)}
												style={{
													transitionDelay: active
														? `${250 + (primaryLinks.length + index) * 45}ms`
														: "0ms",
												}}
											>
												<Link
													href={link.href}
													target="_blank"
													rel="noopener noreferrer"
													className="flex gap-3 items-center px-4 -mx-4 h-11 rounded-xl transition-colors text-gray-11 hover:bg-gray-3 hover:text-gray-12"
												>
													{link.icon}
													<span className="text-base font-medium">
														{link.text === "Source code" && stars
															? `${stars} Stars on GitHub`
															: link.text}
													</span>
												</Link>
											</li>
										))}
									</ul>
								</div>

								<div className="shrink-0 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+24px)] space-y-3 border-t border-gray-4 bg-gray-1">
									<Button
										variant="dark"
										href="/signup"
										size="lg"
										className="w-full font-medium"
										onClick={() => setOpen(false)}
									>
										Sign up
									</Button>
									<Button
										variant="gray"
										href="/login"
										size="lg"
										className="w-full font-medium"
										onClick={() => setOpen(false)}
									>
										Login
									</Button>
								</div>
							</div>
						</div>,
						document.body,
					)
				: null}
		</>
	);
};

export default MobileMenu;

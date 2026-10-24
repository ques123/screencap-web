import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { classNames } from "./class-names";

// Screencap "sticker buttons": thick navy border, hard offset shadow that
// the button presses down into. Scaled down for the popup.
const buttonVariants = cva(
	"flex items-center justify-center transition-[transform,box-shadow,background-color] duration-100 rounded-[14px] border-[2.5px] border-navy font-display font-bold disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer px-5 relative gap-1 translate-y-0 hover:enabled:-translate-y-0.5 active:enabled:translate-y-[3px] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
	{
		defaultVariants: {
			variant: "primary",
			size: "md",
		},
		variants: {
			variant: {
				primary:
					"bg-navy text-white shadow-[0_4px_0_#05121F] hover:enabled:shadow-[0_6px_0_#05121F] active:enabled:shadow-[0_1px_0_#05121F]",
				// Record actions use the record red.
				blue: "bg-rec text-white shadow-[0_4px_0_#0B2440] hover:enabled:shadow-[0_6px_0_#0B2440] active:enabled:shadow-[0_1px_0_#0B2440]",
				destructive:
					"bg-rec text-white shadow-[0_4px_0_#0B2440] hover:enabled:shadow-[0_6px_0_#0B2440] active:enabled:shadow-[0_1px_0_#0B2440]",
				outline:
					"bg-white text-navy shadow-[0_4px_0_#0B2440] hover:enabled:shadow-[0_6px_0_#0B2440] active:enabled:shadow-[0_1px_0_#0B2440]",
				white:
					"bg-white text-navy shadow-[0_4px_0_#0B2440] hover:enabled:shadow-[0_6px_0_#0B2440] active:enabled:shadow-[0_1px_0_#0B2440]",
				gray: "bg-gray-3 text-navy shadow-[0_4px_0_#0B2440] hover:enabled:shadow-[0_6px_0_#0B2440] active:enabled:shadow-[0_1px_0_#0B2440]",
				dark: "bg-navy text-white shadow-[0_4px_0_#05121F] hover:enabled:shadow-[0_6px_0_#05121F] active:enabled:shadow-[0_1px_0_#05121F]",
			},
			size: {
				xs: "text-xs h-[32px]",
				sm: "text-sm h-[40px]",
				md: "text-[15px] h-[44px]",
				lg: "text-base h-[48px]",
				icon: "h-9 w-9",
			},
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	href?: string;
	target?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, href, target, ...props }, ref) => {
		if (href) {
			return (
				<a
					className={classNames(buttonVariants({ variant, size, className }))}
					href={href}
					target={target}
				>
					{props.children}
				</a>
			);
		}
		return (
			<button
				className={classNames(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };

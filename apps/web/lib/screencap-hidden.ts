/**
 * Screencap hides some upstream Cap features (referral program, docs Ask AI,
 * ...). Gating on a function instead of an early unconditional return keeps
 * the upstream code below type-checking and easy to rebase.
 */
export function isHiddenOnScreencap(): boolean {
	return true;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * Debugger value as people expect to read it: Java shows `Integer@24 "8"` or
 * `TreesDemo$TreeNode@22 "TreeNode(4)"`, which become `8` and `TreeNode(4)`
 */
export function cleanValue(value: any): any {
	if (typeof value !== 'string') {
		return value;
	}
	const match = /^[\w$.]+@[0-9a-f]+ "(.*)"$/s.exec(value);
	return match ? match[1] : value;
}

/**
 * Random nonce for the webview Content Security Policy
 */
export function getNonce(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let nonce = '';
	for (let i = 0; i < 32; i++) {
		nonce += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return nonce;
}

/**
 * Serializes a value for embedding inside an inline <script>
 */
export function toScriptJson(value: unknown): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}


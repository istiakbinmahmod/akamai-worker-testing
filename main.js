import { crypto } from 'crypto';
import { createResponse } from 'create-response';
import { logger } from 'log';
import { EdgeKV } from './edgekv.js';

/**
 * Verify webhook signature using HMAC-SHA1
 * @param {string} payload - The raw request body as string
 * @param {string} signature - The signature from X-Hub-Signature header
 * @param {string} secret - The webhook secret
 * @returns {boolean} - True if signature is valid
 */
function verifyWebhookSignature(payload, signature, secret) {
	if (!signature || !signature.startsWith('sha1=')) {
		return false;
	}

	const receivedDigest = signature.substring(5);
	
	// Create HMAC-SHA1 hash
	const hmac = crypto.createHmac('sha1', secret);
	hmac.update(payload);
	const computedDigest = hmac.digest('hex');

	// Constant-time comparison
	return receivedDigest === computedDigest;
}

export async function responseProvider(request) {
	try {
		// Only handle POST requests
		if (request.method !== 'POST') {
			return createResponse(
				405,
				{ 'Content-Type': ['text/plain'] },
				'Send a POST request with JSON body containing webhook payload.'
			);
		}

		let payload;
		let body;
		try {
			body = await request.text();
			payload = JSON.parse(body);
		} catch (parseError) {
			return createResponse(
				400,
				{ 'Content-Type': ['text/plain'] },
				'Invalid JSON body: ' + parseError.message
			);
		}

		// Only process if event is "project.web_sdk_artifact_upload"
		if (payload.event !== 'project.web_sdk_artifact_upload') {
			return createResponse(
				200,
				{ 'Content-Type': ['text/plain'] },
				'Event ignored'
			);
		}

		const key = payload.project_id ? String(payload.project_id) : null;
		const value = JSON.stringify(payload.data);

		if (!key || !value) {
			return createResponse(
				400,
				{ 'Content-Type': ['text/plain'] },
				'Missing key or value in request body'
			);
		}

		// Validate webhook signature
		const signature = request.getHeader('X-Hub-Signature')[0];
		const secret = 'RKQcsROhPZOg5IBPul5KfbWayllEnYd2n1rL3xiYnYU'; // Replace with your actual secret
		const isValidSignature = verifyWebhookSignature(body, signature, secret);

		if (!isValidSignature) {
			return createResponse(
				401,
				{ 'Content-Type': ['text/plain'] },
				'Invalid webhook signature'
			);
		}

		// Store in EdgeKV
		const edgeKv = new EdgeKV({ namespace: 'default', group: 'default' });
		try {
			await edgeKv.putText({ item: key, value: value });
			return createResponse(
				200,
				{ 'Content-Type': ['text/plain'] },
				'Successfully updated key: ' + key
			);
		} catch (kvError) {
			return createResponse(
				500,
				{ 'Content-Type': ['text/plain'] },
				'Failed to update EdgeKV: ' + kvError.message
			);
		}

	} catch (error) {
		return createResponse(
			500,
			{ 'Content-Type': ['text/plain'] },
			'Internal server error: ' + error.message
		);
	}
}

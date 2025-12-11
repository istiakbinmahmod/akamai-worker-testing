import { crypto } from 'crypto';
import { httpRequest } from 'http-request';
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

/**
 * Convert string to ArrayBuffer
 */
function str2ab(str) {
	const buf = new ArrayBuffer(str.length);
	const bufView = new Uint8Array(buf);
	for (let i = 0; i < str.length; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
}

export async function onClientRequest(request) {
	try {
		// Handle GET requests
		if (request.method === 'GET') {
			request.respondWith(
				200,
				{ 'Content-Type': ['text/plain'] },
				'Hello from Istiak'
			);
			return;
		}

		// Only handle POST requests
		if (request.method !== 'POST') {
			request.respondWith(
				405,
				{ 'Content-Type': ['text/plain'] },
				'Send a POST request with JSON body containing webhook payload.'
			);
			return;
		}

		// Read the request body
		const body = request.body;
		let rawBody = '';
		
		if (body) {
			// Read body as string
			rawBody = String.fromCharCode.apply(null, new Uint8Array(body));
		}

		// Get webhook secret from EdgeKV or environment variable
		const WEBHOOK_SECRET = request.getVariable('PMUSER_OPTIMIZELY_WEBHOOK_SECRET');
		
		if (!WEBHOOK_SECRET) {
			logger.error('OPTIMIZELY_WEBHOOK_SECRET not configured');
			request.respondWith(
				500,
				{ 'Content-Type': ['text/plain'] },
				'Server configuration error'
			);
			return;
		}

		// Verify webhook signature
		const signature = request.getHeader('X-Hub-Signature');
		if (!signature || signature.length === 0) {
			logger.log('Missing X-Hub-Signature header');
			request.respondWith(
				401,
				{ 'Content-Type': ['text/plain'] },
				'Missing signature'
			);
			return;
		}

		logger.log('Received signature: ' + signature[0]);

		const isValid = verifyWebhookSignature(rawBody, signature[0], WEBHOOK_SECRET);

		if (!isValid) {
			logger.log('Invalid webhook signature');
			request.respondWith(
				401,
				{ 'Content-Type': ['text/plain'] },
				'Invalid signature'
			);
			return;
		}

		logger.log('Webhook signature verified successfully');

		// Parse the JSON body
		let payload;
		try {
			payload = JSON.parse(rawBody);
		} catch (e) {
			logger.error('Invalid JSON body: ' + e.message);
			request.respondWith(
				400,
				{ 'Content-Type': ['text/plain'] },
				'Invalid JSON body'
			);
			return;
		}

		logger.log('Request body received');
		logger.log('Event type: ' + payload.event);

		// Only process if event is "project.web_sdk_artifact_upload"
		if (payload.event !== 'project.web_sdk_artifact_upload') {
			logger.log('Ignoring event: ' + payload.event);
			request.respondWith(
				200,
				{ 'Content-Type': ['text/plain'] },
				'Event ignored'
			);
			return;
		}

		const key = payload.project_id ? String(payload.project_id) : null;
		const value = JSON.stringify(payload.data);

		logger.log('Received key: ' + key);

		if (!key || !value) {
			request.respondWith(
				400,
				{ 'Content-Type': ['text/plain'] },
				'Missing key or value in request body'
			);
			return;
		}

		// Store in EdgeKV
		try {
			const edgeKv = new EdgeKV({ namespace: 'default', group: 'default' });
			await edgeKv.putText({ item: key, value: value });
			
			logger.log('Successfully updated key: ' + key);
			request.respondWith(
				200,
				{ 'Content-Type': ['text/plain'] },
				'Successfully updated key: ' + key
			);
		} catch (kvError) {
			logger.error('EdgeKV error: ' + kvError.message);
			request.respondWith(
				500,
				{ 'Content-Type': ['text/plain'] },
				'Failed to update EdgeKV'
			);
		}

	} catch (error) {
		logger.error('Error processing request: ' + error.message);
		request.respondWith(
			500,
			{ 'Content-Type': ['text/plain'] },
			'Internal server error'
		);
	}
}

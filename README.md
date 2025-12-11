# Akamai EdgeWorker - Optimizely Webhook Handler

This EdgeWorker processes Optimizely webhook POST requests, verifies HMAC-SHA1 signatures, and stores webhook data in EdgeKV.

## Overview

This EdgeWorker is equivalent to the Cloudflare Worker implementation in `cf-worker.js`. It:
- Handles POST requests from Optimizely webhooks
- Verifies webhook signatures using HMAC-SHA1
- Filters for `project.web_sdk_artifact_upload` events
- Stores project data in Akamai EdgeKV

## Files

- `main.js` - Main EdgeWorker script with request handling logic
- `bundle.json` - EdgeWorker configuration and metadata
- `edgekv.js` - EdgeKV helper library (downloaded separately)
- `edgekv_tokens.js` - EdgeKV tokens helper library (downloaded separately)

## Prerequisites

1. **Akamai Account** with EdgeWorkers enabled
2. **Akamai CLI** installed and configured
3. **EdgeKV** namespace created
4. **Property** configured to use EdgeWorkers

## Setup Instructions

### 1. Install Akamai CLI and EdgeWorkers Package

```bash
# Install Akamai CLI
brew install akamai

# Or install via npm
npm install -g @akamai/cli

# Install EdgeWorkers CLI package
akamai install edgeworkers

# Verify installation
akamai edgeworkers --version
```

### 2. Configure Akamai CLI Credentials

```bash
# Create credentials
akamai config

# Follow prompts to enter:
# - Client token
# - Client secret
# - Access token
# - Host
```

Get credentials from Akamai Control Center:
1. Go to Identity & Access Management
2. Create API client with EdgeWorkers permissions
3. Use the generated credentials

### 3. Download EdgeKV Libraries

```bash
# Download the EdgeKV helper libraries
curl -o edgekv.js https://raw.githubusercontent.com/akamai/edgeworkers-examples/master/edgekv/lib/edgekv.js
curl -o edgekv_tokens.js https://raw.githubusercontent.com/akamai/edgeworkers-examples/master/edgekv/lib/edgekv_tokens.js

# Verify both files are downloaded
ls -l edgekv*.js
```

### 4. Create EdgeKV Namespace

```bash
# List existing namespaces
akamai edgekv list ns

# Create namespace for this EdgeWorker
akamai edgekv create ns optimizely --retention 2592000

# Create group within namespace
akamai edgekv create group optimizely webhooks
```

### 5. Bundle the EdgeWorker

```bash
# Navigate to the project directory
cd /Users/istiak.mahmod/Optimizely/akamai-worker-testing

# Create tarball bundle with all required files
tar -czvf edgeworker-bundle.tgz main.js bundle.json edgekv.js edgekv_tokens.js

# Verify bundle contents
tar -tzf edgeworker-bundle.tgz
```

### 6. Create and Upload EdgeWorker

```bash
# Create a new EdgeWorker ID
akamai edgeworkers create-id --groupId YOUR_GROUP_ID --edgeworkerId YOUR_EDGEWORKER_ID --name "Optimizely Webhook Handler"

# Upload the bundle (note: edgeworkerId comes after --bundle)
akamai edgeworkers upload --bundle edgeworker-bundle.tgz YOUR_EDGEWORKER_ID

# Activate on staging
akamai edgeworkers activate YOUR_EDGEWORKER_ID --network STAGING --version 1

# Activate on production (after testing)
akamai edgeworkers activate YOUR_EDGEWORKER_ID --network PRODUCTION --version 1
```

### 7. Configure Property to Use EdgeWorker

1. Log in to **Akamai Control Center**
2. Navigate to **Properties**
3. Edit your property configuration
4. Add **EdgeWorker** behavior:
   - Select your EdgeWorker ID
   - Configure path match (e.g., `/webhook/*`)
5. Add **Set Variable** behavior to set the webhook secret:
   - Variable Name: `PMUSER_OPTIMIZELY_WEBHOOK_SECRET`
   - Value: Your Optimizely webhook secret
   - Transform: None
6. **Activate** the property version

### 8. Enable EdgeKV Access

In Property Manager, ensure EdgeKV is enabled:
1. Add **EdgeKV** behavior
2. Configure:
   - Namespace: `optimizely`
   - Access: Read/Write
3. Save and activate

## Environment Configuration

### Webhook Secret

Set the Optimizely webhook secret as a Property Manager variable:

**Variable Name:** `PMUSER_OPTIMIZELY_WEBHOOK_SECRET`  
**Value:** Your webhook secret from Optimizely

Alternatively, you can use EdgeKV to store the secret and retrieve it in the code.

## Testing

### Test Webhook Signature Verification

```bash
# Generate test signature
echo -n '{"event":"project.web_sdk_artifact_upload","project_id":"12345","data":{}}' | \
  openssl dgst -sha1 -hmac "your_webhook_secret" | \
  awk '{print "sha1="$2}'

# Send test request
curl -X POST https://your-akamai-domain.com/webhook/optimizely \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature: sha1=YOUR_GENERATED_SIGNATURE" \
  -d '{"event":"project.web_sdk_artifact_upload","project_id":"12345","data":{}}'
```

### View Logs

```bash
# Stream EdgeWorker logs
akamai edgeworkers tail-logs YOUR_EDGEWORKER_ID --follow
```

## Deployment Checklist

- [ ] Akamai CLI installed and configured
- [ ] EdgeWorkers CLI package installed
- [ ] EdgeKV namespace `optimizely` created
- [ ] EdgeKV group `webhooks` created
- [ ] `edgekv.js` library downloaded
- [ ] `edgekv_tokens.js` library downloaded
- [ ] Bundle created with all files
- [ ] EdgeWorker ID created
- [ ] Bundle uploaded and activated
- [ ] Property configured with EdgeWorker behavior
- [ ] Property configured with EdgeKV behavior
- [ ] Webhook secret configured as property variable
- [ ] Property activated on staging
- [ ] Tested on staging
- [ ] Property activated on production

## Monitoring and Debugging

### View EdgeWorker Status

```bash
# Check EdgeWorker status
akamai edgeworkers status YOUR_EDGEWORKER_ID

# List all versions
akamai edgeworkers list-versions YOUR_EDGEWORKER_ID

# Download a version
akamai edgeworkers download --edgeworkerId YOUR_EDGEWORKER_ID --version 1
```

### Check EdgeKV Data

```bash
# Read a specific key
akamai edgekv read item optimizely webhooks 12345 --network production

# List all items in group
akamai edgekv list items optimizely webhooks --network production
```

### Common Issues

**Issue:** "EdgeKV namespace not found"  
**Solution:** Ensure namespace is created and EdgeKV behavior is added to property

**Issue:** "Invalid signature"  
**Solution:** Verify webhook secret is correctly configured and signature calculation matches

**Issue:** "EdgeWorker not executing"  
**Solution:** Check property behavior path matches webhook URL and EdgeWorker is activated

## Differences from Cloudflare Worker

| Feature | Cloudflare Worker | Akamai EdgeWorker |
|---------|-------------------|-------------------|
| Runtime | V8 Isolates | SpiderMonkey |
| KV Storage | KV Namespace | EdgeKV |
| Crypto | Web Crypto API | `crypto` module |
| Request Body | `request.text()` | `request.body` (ArrayBuffer) |
| Response | `new Response()` | `request.respondWith()` |
| Environment Vars | `env.VAR_NAME` | Property Manager variables |
| Deployment | Wrangler CLI | Akamai CLI |

## Security Considerations

1. **Always verify webhook signatures** before processing requests
2. **Use HTTPS** for all webhook endpoints
3. **Rotate webhook secrets** periodically
4. **Limit EdgeKV retention** to necessary duration
5. **Monitor logs** for suspicious activity
6. **Use IP allowlists** if possible (Optimizely IP ranges)

## Resources

- [Akamai EdgeWorkers Documentation](https://techdocs.akamai.com/edgeworkers/docs)
- [EdgeKV Documentation](https://techdocs.akamai.com/edgekv/docs)
- [Akamai CLI EdgeWorkers Package](https://github.com/akamai/cli-edgeworkers)
- [EdgeWorkers Examples](https://github.com/akamai/edgeworkers-examples)
- [Optimizely Webhook Documentation](https://docs.developers.optimizely.com/web-experimentation/docs/webhooks)

## Support

For issues or questions:
- Akamai Support: https://control.akamai.com/support
- EdgeWorkers Forum: https://community.akamai.com/

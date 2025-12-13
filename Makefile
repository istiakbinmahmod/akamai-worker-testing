# Akamai EdgeWorker Makefile
# EdgeWorker ID
EDGEWORKER_ID = 103768

# Version (update this for each deployment)
VERSION = 1.16

# Bundle files
BUNDLE_NAME = edgeworker-bundle.tgz
BUNDLE_FILES = main.js bundle.json edgekv.js edgekv_tokens.js

.PHONY: help build upload activate-staging activate-production deploy-staging deploy-production status logs clean

# Default target
help:
	@echo "Akamai EdgeWorker Deployment Commands:"
	@echo ""
	@echo "  make build              - Create the EdgeWorker bundle"
	@echo "  make upload             - Upload bundle to EdgeWorker $(EDGEWORKER_ID)"
	@echo "  make activate-staging   - Activate version $(VERSION) on staging"
	@echo "  make activate-production - Activate version $(VERSION) on production"
	@echo ""
	@echo "  make deploy-staging     - Build, upload, and activate on staging"
	@echo "  make deploy-production  - Build, upload, and activate on production"
	@echo ""
	@echo "  make status             - Check EdgeWorker status"
	@echo "  make logs               - Tail EdgeWorker logs"
	@echo "  make list-versions      - List all EdgeWorker versions"
	@echo "  make list-revisions     - List all EdgeWorker revisions"
	@echo "  make clean              - Remove bundle file"
	@echo ""
	@echo "Current EdgeWorker ID: $(EDGEWORKER_ID)"
	@echo "Current Version: $(VERSION)"

# Build the bundle
build:
	@echo "📦 Building EdgeWorker bundle..."
	tar -czvf $(BUNDLE_NAME) $(BUNDLE_FILES)
	@echo "✅ Bundle created: $(BUNDLE_NAME)"
	@tar -tzf $(BUNDLE_NAME)

# Upload the bundle
upload:
	@echo "⬆️  Uploading bundle to EdgeWorker $(EDGEWORKER_ID)..."
	akamai edgeworkers upload --bundle $(BUNDLE_NAME) $(EDGEWORKER_ID)
	@echo "✅ Upload complete"

# Activate on staging
activate-staging:
	@echo "🚀 Activating version $(VERSION) on STAGING..."
	akamai edgeworkers activate $(EDGEWORKER_ID) staging $(VERSION)
	@echo "✅ Activated on staging"

# Activate on production
activate-production:
	@echo "🚀 Activating version $(VERSION) on PRODUCTION..."
	akamai edgeworkers activate $(EDGEWORKER_ID) production $(VERSION)
	@echo "✅ Activated on production"

# Full deployment to staging
deploy-staging: build upload activate-staging
	@echo "✅ Deployment to STAGING complete!"

# Full deployment to production
deploy-production: build upload activate-production
	@echo "✅ Deployment to PRODUCTION complete!"

# Check EdgeWorker status
status:
	@echo "📊 EdgeWorker Status:"
	akamai edgeworkers status $(EDGEWORKER_ID)

# List all versions
list-versions:
	@echo "📋 EdgeWorker Versions:"
	akamai edgeworkers list-revisions $(EDGEWORKER_ID)

# List all revisions
list-revisions:
	@echo "📋 EdgeWorker Revisions:"
	akamai edgeworkers list-revisions $(EDGEWORKER_ID)

# Tail logs
logs:
	@echo "📜 Tailing logs for EdgeWorker $(EDGEWORKER_ID)..."
	akamai edgeworkers tail-logs $(EDGEWORKER_ID) --follow

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -f $(BUNDLE_NAME)
	@echo "✅ Clean complete"

# Download EdgeKV libraries
download-libs:
	@echo "📥 Downloading EdgeKV libraries..."
	curl -o edgekv.js https://raw.githubusercontent.com/akamai/edgeworkers-examples/master/edgekv/lib/edgekv.js
	curl -o edgekv_tokens.js https://raw.githubusercontent.com/akamai/edgeworkers-examples/master/edgekv/lib/edgekv_tokens.js
	@echo "✅ Libraries downloaded"

# Verify bundle contents
verify:
	@echo "🔍 Verifying bundle contents..."
	@if [ -f $(BUNDLE_NAME) ]; then \
		echo "Bundle contents:"; \
		tar -tzf $(BUNDLE_NAME); \
		echo ""; \
		echo "Bundle size:"; \
		ls -lh $(BUNDLE_NAME) | awk '{print $$5}'; \
	else \
		echo "❌ Bundle file not found. Run 'make build' first."; \
	fi

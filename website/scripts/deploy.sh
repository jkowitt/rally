#!/usr/bin/env bash
# ============================================================
# deploy.sh — one-shot Supabase deploy for Rally
# ============================================================
# Handles everything that's a pain to paste into zsh:
#   1. Installs Homebrew if missing (macOS only)
#   2. Installs Supabase CLI if missing
#   3. Verifies you're in the right directory
#   4. Runs supabase login / link (idempotent — skips if linked)
#   5. Pushes migrations
#   6. Deploys all the edge functions changed on this branch
#
# Usage (from anywhere inside the rally repo):
#   bash website/scripts/deploy.sh
#
# Or:
#   chmod +x website/scripts/deploy.sh
#   ./website/scripts/deploy.sh
#
# Safe to re-run. All steps are idempotent.
# ============================================================

set -e  # exit on any error
set -u  # error on undefined variables

# ─── Colors ─────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()    { printf "${BLUE}▸${NC} %s\n" "$1"; }
success() { printf "${GREEN}✓${NC} %s\n" "$1"; }
warn()    { printf "${YELLOW}!${NC} %s\n" "$1"; }
error()   { printf "${RED}✗${NC} %s\n" "$1"; }
header()  { printf "\n${BOLD}${BLUE}==> %s${NC}\n" "$1"; }

# ─── Config ─────────────────────────────────────────────────
PROJECT_REF="juaqategmrghsfkbaiap"
FUNCTIONS=(
  digest-scheduled-publish
  digest-resend-unopened
  digest-research
  contract-ai
  process-contract-batch
  set-feature-flag
  automation-runner
  benchmark-updater
  daily-intelligence
  code-analysis
  claude-valuation
)

# ─── Find the website directory ─────────────────────────────
header "Locating rally/website"

# Walk up from the script's location to find the website dir
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEBSITE_DIR=""

if [[ "$(basename "$SCRIPT_DIR")" == "scripts" ]]; then
  WEBSITE_DIR="$(dirname "$SCRIPT_DIR")"
elif [[ -d "$SCRIPT_DIR/website" ]]; then
  WEBSITE_DIR="$SCRIPT_DIR/website"
elif [[ -d "$SCRIPT_DIR/../website" ]]; then
  WEBSITE_DIR="$(cd "$SCRIPT_DIR/../website" && pwd)"
else
  error "Can't find the website directory. Run this script from inside the rally repo."
  exit 1
fi

if [[ ! -d "$WEBSITE_DIR/supabase" ]]; then
  error "Expected $WEBSITE_DIR/supabase to exist. Is this really the rally repo?"
  exit 1
fi

cd "$WEBSITE_DIR"
success "Working in: $WEBSITE_DIR"

# ─── 1. Homebrew ─────────────────────────────────────────────
header "Step 1/5: Homebrew"

if command -v brew >/dev/null 2>&1; then
  success "Homebrew already installed: $(brew --version | head -1)"
else
  warn "Homebrew not found. Installing..."
  if [[ "$(uname)" != "Darwin" ]]; then
    error "This script only auto-installs Homebrew on macOS. On Linux, install supabase CLI manually: https://supabase.com/docs/guides/cli/getting-started"
    exit 1
  fi
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # Add brew to PATH for the rest of this script
  if [[ -x "/opt/homebrew/bin/brew" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -x "/usr/local/bin/brew" ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
  success "Homebrew installed"
fi

# ─── 2. Supabase CLI ────────────────────────────────────────
header "Step 2/5: Supabase CLI"

# Version to install if we need to fall back to the direct binary download.
# Keep this in sync with whatever Homebrew would install, or bump it to the
# latest from https://github.com/supabase/cli/releases
SUPABASE_CLI_VERSION="2.90.0"

install_supabase_via_binary() {
  warn "Falling back to direct binary download (skips Homebrew / Xcode tools)"
  local arch os tarball url tmp_tar
  arch="$(uname -m)"
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"

  # Map arch names to what supabase-cli releases use
  case "$arch" in
    arm64|aarch64) arch="arm64" ;;
    x86_64)        arch="amd64" ;;
    *) error "Unsupported architecture: $arch"; return 1 ;;
  esac

  case "$os" in
    darwin) tarball="supabase_darwin_${arch}.tar.gz" ;;
    linux)  tarball="supabase_linux_${arch}.tar.gz" ;;
    *) error "Unsupported OS: $os"; return 1 ;;
  esac

  url="https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/${tarball}"
  tmp_tar="$(mktemp -t supabase-cli.XXXXXX).tar.gz"

  info "Downloading $url"
  curl -fsSL "$url" -o "$tmp_tar" || { error "Download failed"; return 1; }

  local extract_dir
  extract_dir="$(mktemp -d -t supabase-cli.XXXXXX)"
  tar -xzf "$tmp_tar" -C "$extract_dir" || { error "Extract failed"; return 1; }

  # Prefer /opt/homebrew/bin (Apple Silicon brew, already in PATH) or /usr/local/bin (Intel brew / legacy)
  local target_dir=""
  if [[ -d "/opt/homebrew/bin" ]]; then
    target_dir="/opt/homebrew/bin"
  elif [[ -d "/usr/local/bin" ]]; then
    target_dir="/usr/local/bin"
  else
    error "Neither /opt/homebrew/bin nor /usr/local/bin exists. Install supabase manually."
    return 1
  fi

  info "Installing to $target_dir/supabase (may prompt for sudo password)"
  sudo mv "$extract_dir/supabase" "$target_dir/supabase" || return 1
  sudo chmod +x "$target_dir/supabase" || true
  rm -f "$tmp_tar"
  rm -rf "$extract_dir"
  return 0
}

if command -v supabase >/dev/null 2>&1; then
  success "Supabase CLI already installed: $(supabase --version)"
else
  warn "Supabase CLI not found. Trying Homebrew first..."
  if brew install supabase/tap/supabase 2>&1 | tee /tmp/supabase-brew-install.log; then
    success "Supabase CLI installed via Homebrew"
  else
    # Common failure: outdated Command Line Tools. Fall back to binary.
    if grep -q "Command Line Tools are too outdated" /tmp/supabase-brew-install.log 2>/dev/null; then
      warn "Brew failed due to outdated Xcode Command Line Tools."
    else
      warn "Brew install failed (see above). Trying direct binary install..."
    fi
    if install_supabase_via_binary; then
      success "Supabase CLI installed: $(supabase --version)"
    else
      error "Supabase CLI install failed both ways. Manual fix:"
      echo "  1. Update Xcode Command Line Tools via Software Update, OR"
      echo "  2. Download manually from https://github.com/supabase/cli/releases"
      exit 1
    fi
  fi
fi

# ─── 3. Login + link ────────────────────────────────────────
header "Step 3/5: Authenticate + link project"

# Check if already logged in by trying to list projects
if supabase projects list >/dev/null 2>&1; then
  success "Already logged in to Supabase"
else
  warn "Not logged in. Opening browser..."
  supabase login
  success "Logged in"
fi

# Link — idempotent, just re-runs if already linked
info "Linking to project $PROJECT_REF..."
if supabase link --project-ref "$PROJECT_REF" 2>&1 | grep -qE "(already linked|Finished supabase link)"; then
  success "Project linked"
else
  # supabase link exits 0 even on already-linked, but the grep above might miss
  # some wordings. If link failed for real, the next command will catch it.
  success "Link command completed"
fi

# ─── 4. Push migrations ──────────────────────────────────────
header "Step 4/5: Push migrations"

info "This will apply any pending migrations (063, 064 and anything else newer than prod)..."
if supabase db push; then
  success "Migrations pushed"
else
  error "Migration push failed. Review the output above and fix before retrying."
  exit 1
fi

# ─── 5. Deploy edge functions ────────────────────────────────
header "Step 5/5: Deploy edge functions"

FAILED=()
for fn in "${FUNCTIONS[@]}"; do
  if [[ ! -d "supabase/functions/$fn" ]]; then
    warn "Skipping $fn (directory not found)"
    continue
  fi
  info "Deploying $fn..."
  if supabase functions deploy "$fn" --project-ref "$PROJECT_REF"; then
    success "$fn deployed"
  else
    error "$fn FAILED"
    FAILED+=("$fn")
  fi
done

# ─── Summary ─────────────────────────────────────────────────
header "Summary"

if [[ ${#FAILED[@]} -eq 0 ]]; then
  success "All done. Everything deployed."
  echo ""
  echo "Next operational steps (manual, one time):"
  echo ""
  echo "  1. Set cron config in Supabase SQL editor:"
  echo "     alter database postgres set app.functions_base_url = 'https://$PROJECT_REF.functions.supabase.co';"
  echo "     alter database postgres set app.service_role_key = '<your-service-role-key>';"
  echo ""
  echo "  2. Flip email_marketing_public flag ON at /dev/feature-flags"
  echo ""
  echo "  3. Verify the cron ran by checking digest_issues with status='scheduled'"
  echo ""
  exit 0
else
  error "Some deploys failed:"
  for fn in "${FAILED[@]}"; do
    echo "    - $fn"
  done
  echo ""
  echo "Run 'supabase functions logs <fn-name>' on any failure to see what happened."
  exit 1
fi

#!/usr/bin/env bash
set -euo pipefail

# --- Check for --yes flag ---
auto_yes="false"
args=()
for arg in "$@"; do
    if [[ "$arg" == "--yes" ]]; then
        auto_yes="true"
    else
        args+=("$arg")
    fi
done
set -- "${args[@]}"

# --- Don't allow staged changes ---
if ! git diff --cached --quiet; then
    echo "There are already staged changes. Please commit or unstage them first."
    exit 1
fi

# --- Config ---
package_file="package.json"
changelog_file="CHANGELOG.md"

# --- Get old version from package.json ---
old_version=$(jq -r '.version' "$package_file") || {
    echo "Failed to detect old version in $package_file"
    exit 1
}

# --- Require new version ---
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <new-version> [--yes]"
    echo "Current version is: $old_version"
    exit 1
fi
new_version="$1"

# --- Today date ---
today=$(date +%Y-%m-%d)

# --- Pre-flight: check if tag exists ---
overwrite_tag="false"
if git rev-parse -q --verify "refs/tags/v${new_version}" >/dev/null; then
    if [[ "$auto_yes" == "true" ]]; then
        overwrite_tag="true"
        echo "Tag v${new_version} already exists. Auto-overwriting (--yes given)."
    else
        read -r -p "Tag v${new_version} already exists. Overwrite? [y/N] " ans
        case "$ans" in
            [yY]|[yY][eE][sS]) overwrite_tag="true" ;;
            *) echo "Aborting."; exit 1 ;;
        esac
    fi
fi

echo "Bumping version: $old_version → $new_version ($today)"

# --- Detect repo URL from changelog ---
unreleased_line=$(grep -E "^\[Unreleased\]:" "$changelog_file") || {
    echo "No [Unreleased] link found in $changelog_file"
    exit 1
}
repo_url=$(echo "$unreleased_line" | sed -E 's/^\[Unreleased\]: (.*)\/compare\/v.*$/\1/')
echo "Detected repo URL: $repo_url"

# --- Validate repo URL against git origin ---
origin_url=$(git remote get-url origin)
if [[ "$origin_url" == git@github.com:* ]]; then
    origin_normalized="https://github.com/${origin_url#git@github.com:}"
    origin_normalized="${origin_normalized%.git}"
elif [[ "$origin_url" == https://github.com/* ]]; then
    origin_normalized="${origin_url%.git}"
else
    echo "Unsupported git remote format: $origin_url"
    exit 1
fi

if [[ "$repo_url" != "$origin_normalized" ]]; then
    echo "Repo URL mismatch: changelog=$repo_url, origin=$origin_normalized"
    exit 1
fi

# --- Update package.json (and package-lock.json if present) ---
npm version "$new_version" --no-git-tag-version

# --- Insert new changelog header ---
if grep -q "^## \[Unreleased\]" "$changelog_file"; then
    sed -i "/^## \[Unreleased\]/a\\
\\
## [${new_version}] - ${today}" "$changelog_file"
else
    echo "Expected '## [Unreleased]' section not found in $changelog_file"
    exit 1
fi

# --- Update [Unreleased] link ---
unreleased_pattern="^\[Unreleased\]: $repo_url/compare/v${old_version}\.\.\.HEAD"
if grep -Eq "$unreleased_pattern" "$changelog_file"; then
    sed -i "s|v${old_version}...HEAD|v${new_version}...HEAD|" "$changelog_file"
    sed -i "/^\[Unreleased\]:/a[${new_version}]: ${repo_url}/compare/v${old_version}..v${new_version}" "$changelog_file"
else
    echo "Expected [Unreleased] link with v${old_version} not found in $changelog_file"
    exit 1
fi

# --- Commit only intended files ---
git add "$package_file" "$changelog_file"
[[ -f "package-lock.json" ]] && git add "package-lock.json"
git commit -m "chore: prepare for v${new_version} release"

# --- Signed tag ---
# --- delete existing tag if user approved overwrite, then re-tag signed ---
if [[ "$overwrite_tag" == "true" ]]; then
    git tag -d "v${new_version}" >/dev/null
fi
git tag -s "v${new_version}" -m "Release v${new_version}"

echo "Version bump complete, committed, and tagged."
echo "Review the commit and tag; push when ready:"
echo "  git push --follow-tags"

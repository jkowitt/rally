# App Directory Structure

This directory contains the Next.js App Router files for the loud-legacy-web application.

## Important Files

### `globals.css` - Global Styles
**Location:** `/app/globals.css`
**Import in:** `layout.tsx` as `import "./globals.css"`

⚠️ **CRITICAL:** Do NOT move this file to `/styles/globals.css`
The CSS must be in `/app/globals.css` for proper Next.js App Router imports.

**Why this location?**
- Next.js App Router expects global styles to be imported relative to layout.tsx
- Using `./globals.css` ensures the import path is always correct
- Moving to `/styles/` breaks the build on Netlify

### `layout.tsx` - Root Layout
**Import:** `import "./globals.css";`
✅ Correct: `"./globals.css"`
❌ Wrong: `"../styles/globals.css"`

## Build Verification

Before each build, the `verify-build.sh` script automatically checks:
- ✅ `app/globals.css` exists
- ✅ No duplicate `globals.css` files
- ✅ `layout.tsx` imports correctly
- ✅ Next.js export configuration

Run manually: `npm run verify`

## Common Issues

### CSS Not Loading?
1. Check `app/globals.css` exists
2. Verify `layout.tsx` imports: `import "./globals.css"`
3. Run `npm run verify` to check configuration

### Deployment Failing on Netlify?
1. Run `npm run verify` locally
2. Check for duplicate CSS files
3. Ensure `netlify.toml` doesn't conflict with static export

# KILT Liquidity Portal - Cache Busting Guide

## How to Force Cache Clearing for New Deployments

Your KILT liquidity portal at `kilt-liquidity-portal.replit.app` now includes comprehensive cache-busting techniques to ensure users see the latest deployed version.

### 1. **Automatic Cache-Busting URLs**

For immediate cache clearing, share these URLs with users:

- **Primary URL with cache-busting**: 
  ```
  https://kilt-liquidity-portal.replit.app/?v=2025.01.19.001&t=1752907200
  ```

- **Force refresh URL**:
  ```
  https://kilt-liquidity-portal.replit.app/?nocache=true&refresh=force&timestamp=1752907200
  ```

- **Hard reload URL**:
  ```
  https://kilt-liquidity-portal.replit.app/?bust=cache&version=2025.01.19.001
  ```

### 2. **User Instructions for Manual Cache Clearing**

Share these instructions with users experiencing cache issues:

#### **Chrome/Edge/Safari:**
- Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or: Right-click refresh button → "Empty Cache and Hard Reload"

#### **Firefox:**
- Press `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- Or: Developer Tools → Network tab → Disable cache

#### **Mobile browsers:**
- Clear browser cache in settings
- Or use private/incognito mode

### 3. **Automatic Features Implemented**

The portal now includes:

✅ **HTML Meta Tags**: Prevent HTML caching with `no-cache` directives
✅ **Server Headers**: Dynamic cache control headers per file type
✅ **Service Worker**: Automatic cache clearing and version detection
✅ **Version Timestamps**: Build timestamps in all responses
✅ **API Cache Prevention**: All API responses bypass cache
✅ **Update Notifications**: Users get prompted for new versions

### 4. **Deployment Workflow**

When deploying new versions:

1. **Update version number** in these files:
   - `client/index.html` (meta tag version)
   - `server/index.ts` (X-Deployment-Version header)
   - `client/public/sw.js` (CACHE_VERSION)

2. **Share updated URLs** with version parameters:
   ```
   https://kilt-liquidity-portal.replit.app/?v=NEW_VERSION&t=NEW_TIMESTAMP
   ```

3. **Service worker automatically**:
   - Detects version changes
   - Clears old caches
   - Prompts users to update

### 5. **Emergency Cache Clear**

For critical updates, use this nuclear option URL:
```
https://kilt-liquidity-portal.replit.app/?emergency=clear&force=reload&nocache=1&v=LATEST
```

### 6. **Technical Implementation**

- **HTML**: No-cache meta tags prevent page caching
- **Server**: Dynamic headers control cache behavior per asset type
- **Service Worker**: Manages client-side cache with version control
- **Query Parameters**: URL versioning forces fresh requests

This comprehensive cache-busting system ensures users always see the latest version of your KILT liquidity portal after deployments.
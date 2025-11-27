# Steam Workshop Troubleshooting Guide

## Problem: No workshop items showing even with credentials configured

### Step 1: Verify Steam ID Format
Your Steam ID must be the **64-bit Steam ID** (steamID64), not your profile name or other ID formats.

**How to get correct Steam ID:**
1. Go to https://steamid.io/
2. Enter your Steam profile URL or name
3. Find "steamID64" - it looks like: `76561198XXXXXXXXX` (17 digits starting with 7656)
4. Copy this exact number to `STEAM_ID` in `.env`

### Step 2: Check Workshop Item Visibility
Your workshop items must be **PUBLIC** for the API to see them.

**How to check/change visibility:**
1. Go to Steam Community
2. Click your profile
3. Go to "Workshop Items" or "Content"
4. For each item, click "Edit" 
5. Ensure "Visibility" is set to **Public** (not Friends-only or Private)

### Step 3: Verify Steam Web API Key
1. Go to https://steamcommunity.com/dev/apikey
2. Make sure you have a registered API key
3. Copy the full key to `STEAM_API_KEY` in `.env`

### Step 4: Check Which Games Have Workshop Items
The backend checks these games:
- Counter-Strike 2 (AppID: 730)
- Dota 2 (AppID: 570)
- Team Fortress 2 (AppID: 440)
- Garry's Mod (AppID: 4000)
- Left 4 Dead 2 (AppID: 550)
- Wallpaper Engine (AppID: 431960)

**Make sure your workshop items are for one of these games!**

### Step 5: View Debug Logs
With the updated code, check backend terminal output:
```
============ STEAM WORKSHOP DEBUG ============
Fetching workshop items from: https://...
Steam ID: 76561198XXXXXXXXX
App ID: 730
HTTP Status: 200 OK
Raw API Response: { ... }
Total files found: X
Files in response: X
============================================
```

**What to look for:**
- ✅ HTTP Status should be `200 OK`
- ✅ Steam ID should be 17 digits starting with 7656
- ⚠️ If "Total files found: 0" → Items not public or wrong game
- ⚠️ If HTTP error → API key invalid

### Step 6: Test Steam API Directly
Visit this URL in browser (replace with your data):
```
https://api.steampowered.com/IPublishedFileService/GetUserFiles/v1/?key=YOUR_KEY&steamid=YOUR_ID&appid=730
```

Should return JSON with your workshop items.

### Common Issues

**Issue**: "Total files found: 0"
**Solution**: 
- Items are not public
- Wrong Steam ID format
- No workshop items for the checked games

**Issue**: HTTP 401/403 error
**Solution**: Invalid API key or wrong key type

**Issue**: No response or timeout
**Solution**: Steam API might be down, try again later

## Need More Help?

Share the debug output from the terminal and I'll help diagnose the issue!

# Beauvette - App Store Submission Guide

## App Information

### Basic Details
- **App Name:** Beauvette
- **Bundle ID:** com.beauvette.app
- **Category:** Lifestyle > Beauty
- **Age Rating:** 4+

### App Store Metadata

**Title (30 chars max):**
```
Beauvette
```

**Subtitle (30 chars max):**
```
Beauty for Special Events
```

**Description:**
```
Beauvette connects you with talented beauty artists for life's most important days.

Whether you're planning a wedding, special event, or photo shoot, find the perfect makeup artist and hair stylist with ease.

FOR CLIENTS:
• Browse verified beauty artists in your area
• View portfolios and availability calendars
• Send inquiries and chat directly with artists
• Book services for weddings, events, and more

FOR BEAUTY ARTISTS:
• Create your professional profile
• Share your calendar link with clients
• Receive inquiries and manage bookings
• Build your reputation with reviews

Beauvette makes booking beauty services simple, elegant, and stress-free.
```

**Keywords (100 chars max):**
```
beauty,makeup,wedding,bridal,hair,stylist,artist,booking,event,glam
```

**Support URL:**
```
https://beauvette.com/support
```

**Privacy Policy URL:**
```
https://beauvette.com/privacy
```

---

## Screenshots Required

You'll need screenshots for these device sizes:

### iPhone (Required)
1. **6.7" Display** (iPhone 15 Pro Max) - 1290 x 2796 pixels
2. **6.5" Display** (iPhone 11 Pro Max) - 1242 x 2688 pixels  
3. **5.5" Display** (iPhone 8 Plus) - 1242 x 2208 pixels

### iPad (Optional but recommended)
1. **12.9" Display** - 2048 x 2732 pixels

### Suggested Screenshots:
1. Landing page showing "Beauvette" branding
2. Artist calendar/booking page
3. Browse artists page
4. Chat/messaging interface
5. Artist dashboard (for artist users)

---

## Build Instructions

### Prerequisites
- Mac computer with Xcode installed
- Apple Developer account ($99/year)
- Node.js installed

### Steps to Build

1. **Build the web app:**
   ```bash
   npm run build
   ```

2. **Add iOS platform:**
   ```bash
   npx cap add ios
   ```

3. **Sync the web app to iOS:**
   ```bash
   npx cap sync
   ```

4. **Open in Xcode:**
   ```bash
   npx cap open ios
   ```

5. **In Xcode:**
   - Select your Apple Developer Team
   - Set the Bundle Identifier to `com.beauvette.app`
   - Connect an iPhone or select a simulator
   - Click "Run" to test

6. **Archive and Submit:**
   - Product > Archive
   - Click "Distribute App"
   - Follow the App Store Connect prompts

---

## App Review Checklist

Before submitting, ensure:

- [ ] App doesn't crash on launch
- [ ] All links work (Privacy Policy, Support)
- [ ] No placeholder text or "lorem ipsum"
- [ ] Login/signup works correctly
- [ ] All features function as described
- [ ] Camera/microphone permissions have clear explanations (if used)
- [ ] Screenshots accurately represent the app

---

## Icon Requirements

You need a 1024x1024 pixel app icon (no transparency, no rounded corners - Apple applies those automatically).

Suggested design:
- Ivory background (#FAF9F7)
- "B" in Pinyon Script font
- Plum color (#6B4A55)

---

## Contact

For questions about the app submission process:
- Email: violet@beauvette.com
- Website: https://beauvette.com

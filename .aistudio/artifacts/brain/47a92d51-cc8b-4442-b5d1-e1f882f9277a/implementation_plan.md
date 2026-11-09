# How to Put Freq Snake on freqsnake.com (Simple Beginner Guide)

A straightforward, non-technical guide to taking **Freq Snake** from here and putting it live on your own domain `freqsnake.com` using your existing **GitHub** and **Netlify** accounts.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **What we handle for you vs. what you do:**
> 
> - **What we do for you right here in the app**: We will set up all the background code files (`_redirects`, SEO descriptions, social preview cards, web icon, and Netlify build settings) so your game runs seamlessly without any coding needed on your end.
> - **What you will do** (3 simple parts):
>   1. **Save your project code to GitHub** (where your project files live).
>   2. **Connect Netlify to your GitHub project** (Netlify turns those files into a live website for free).
>   3. **Type two lines into your domain settings** (tells `freqsnake.com` to show your Netlify game).

---

### 1. Overview & How It Works

Think of the whole process like moving into a new house:
1. **GitHub** is your storage unit — it safely holds all your game's files and code.
2. **Netlify** is your builder and electricity provider — it takes those files and powers your website 24/7 for free with a secure lock (HTTPS/SSL).
3. **freqsnake.com** is your address on the street — you tell the address book (your domain registrar) where Netlify lives so anyone who types `freqsnake.com` arrives at your game.

---

### 2. User Experience & Visual Details

- **What people see when you share the link**:
  - Sharing `freqsnake.com` on Discord, Twitter/X, text message, or Slack will automatically show a sleek visual card titled **"Freq Snake — Synth Chord Arcade Game"** with a description of the synth music gameplay.
  - In the browser tab, visitors will see the **Freq Snake** icon and title.
- **Game Feel**:
  - The game is ready for desktop keyboard controls (arrows or WASD) and has on-screen touch buttons for mobile phone players.
  - It loads almost instantly and runs smoothly across all browsers.

---

### 3. Step-by-Step Walkthrough (Click-by-Click)

#### Part 1: Put Your Project on GitHub

1. Go to [github.com](https://github.com) and log in.
2. In the top right corner, click the **`+`** icon and select **New repository**.
3. Name your repository: `freq-snake`.
4. Choose **Public** (recommended for easy free hosting).
5. Leave all checkboxes under "Initialize this repository with:" unchecked.
6. Click the green button: **Create repository**.
7. If your code is already synced with your GitHub account, push it. If you are downloading the project files as a ZIP or using GitHub Desktop, simply drag-and-drop the files into your new repository.

---

#### Part 2: Connect Netlify to GitHub (Takes ~1 minute)

1. Go to [netlify.com](https://app.netlify.com) and log into your account.
2. On your main team dashboard, click **Add new site** ➔ **Import an existing project**.
3. Click the **GitHub** button to authorize Netlify to see your GitHub repositories.
4. In the list that appears, click on **freq-snake**.
5. Netlify will show you the build settings. Because we configure everything in advance, you can keep the defaults:
   - **Branch to deploy**: `main`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Click the blue button: **Deploy freq-snake**.
7. Netlify will take about 30 seconds to build. Once finished, you will see a green badge saying **Published** and a random temporary web address (like `dreamy-snake-123456.netlify.app`). Clicking it will open your playable game!

---

#### Part 3: Connect Your Custom Domain (`freqsnake.com`)

Now you connect the name you bought to Netlify:

1. In your Netlify site dashboard, click **Site configuration** (or **Domain management** on the left menu).
2. Click **Domains** ➔ **Add a domain**.
3. Type in `freqsnake.com` and click **Verify**, then click **Add domain**.
4. Netlify will ask: *"Do you want to add www.freqsnake.com as well?"* Click **Yes / Add**.
5. Netlify will now show you a notice saying **"Awaiting External DNS"** with two specific values.

---

#### Part 4: Add the 2 Records Where You Bought Your Domain

Log into the place where you purchased `freqsnake.com` (such as GoDaddy, Namecheap, Google Domains / Squarespace, or Cloudflare):

1. Find your domain list, click on `freqsnake.com`, and look for **DNS Management** or **Manage DNS Records**.
2. Look for existing `A` or `CNAME` records with the name `@` or `www`. If any exist, delete them or edit them.
3. Add these **two records**:

##### Line 1 (The main address):
- **Type**: `A`
- **Name / Host**: `@` *(Note: if your domain provider doesn't accept `@`, leave it blank)*
- **Value / Points to**: `75.2.60.5`
- **TTL**: Automatic (or 3600)

##### Line 2 (The "www" address):
- **Type**: `CNAME`
- **Name / Host**: `www`
- **Value / Points to**: `<your-site-name>.netlify.app` *(Copy your exact Netlify link from your Netlify dashboard)*
- **TTL**: Automatic (or 3600)

4. Click **Save** on your domain registrar.

> [!NOTE]
> **Domain Propagation**: It usually takes 5 to 30 minutes for the internet address book to update. Once it does, Netlify will automatically create a free SSL padlock certificate (HTTPS) so `https://freqsnake.com` opens securely!

---

### 4. Technical Reference (Architecture)

Here is a simple visual diagram of how your visitors reach your game:

```
┌─────────────────────────┐
│     You push code       │
│       to GitHub         │
└────────────┬────────────┘
             │ Automatic update
             ▼
┌─────────────────────────┐
│         Netlify         │
│  Runs `npm run build`   │
│  and hosts game files   │
└────────────┬────────────┘
             │ Connected via DNS
             ▼
┌─────────────────────────┐
│      freqsnake.com      │ ◄─── Player types address in browser
│   (Protected by HTTPS)  │
└─────────────────────────┘
```

### What We Will Build in the App Codebase Once You Approve

1. **`index.html` update**:
   - Page title: `Freq Snake — Synth Chord Arcade Game`
   - Description tag for search engines
   - OpenGraph and Twitter card tags pointing to `https://freqsnake.com`
   - Custom SVG retro synth-snake favicon
2. **`public/_redirects` file**:
   - Single-line rule (`/* /index.html 200`) required by Netlify so game refreshes never show a 404 error.
3. **`netlify.toml` file**:
   - Preset configuration that tells Netlify the build commands and cache headers automatically.

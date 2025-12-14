# Attendance Monitor - Build Instructions v5

## CRITICAL: Follow these steps EXACTLY in order

---

## Step 1: Extract to a NEW Folder
Extract this zip to a completely new folder, e.g., `C:\Projects\attendance-app`

---

## Step 2: Open PowerShell in that Folder
Right-click in the folder → "Open in Terminal" or "Open PowerShell window here"

---

## Step 3: Clean Install (copy & paste this ENTIRE block)
```powershell
# Remove any old files
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue  
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# Install fresh
npm install
```

---

## Step 4: Setup Database (copy & paste)
```powershell
# Generate Prisma client
npx prisma generate

# Create SQLite database with tables
npx prisma db push
```

---

## Step 5: Create Admin User (copy & paste)
```powershell
node scripts/create-admin.js
```
This will create:
- Email: admin@example.com
- Password: admin123

---

## Step 6: Build (copy & paste)
```powershell
npm run build
```

If build succeeds, you'll see "✓ Compiled successfully" and route information.

---

## Step 7: Run the App
```powershell
# For production mode:
npm start

# OR for development mode:
npm run dev
```

Then open http://localhost:3000 in your browser.

---

## What Changed in This Version

1. **Middleware DISABLED** - The authentication middleware was causing build hangs
2. **Lazy Prisma Loading** - Database only connects at runtime, never during build
3. **No Google Fonts** - Uses system fonts to avoid network issues
4. **SQLite Database** - Simple file-based database, no server needed

---

## If Build Still Hangs

Try running in development mode instead:
```powershell
npm run dev
```

Development mode skips the static generation phase entirely.

---

## To Re-enable Middleware (after build works)

If you want authentication middleware back:
```powershell
Rename-Item src/middleware.js.bak src/middleware.js
```

---

## Switching to PostgreSQL Later

1. Edit `prisma/schema.prisma`:
   Change `provider = "sqlite"` to `provider = "postgresql"`

2. Edit `.env`:
   Change `DATABASE_URL` to your PostgreSQL connection string

3. Run:
```powershell
npx prisma generate
npx prisma db push
```

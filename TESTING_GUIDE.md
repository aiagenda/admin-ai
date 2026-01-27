# 🧪 Testing Guide: Simple & Legal Summaries with Examples

## ✅ Step-by-Step Testing Instructions

### **Step 1: Apply Database Migration** ⚠️ REQUIRED FIRST

You need to add the new columns to your database before testing.

#### Option A: Using Supabase Dashboard (EASIEST - Recommended)

1. **Open your Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/zxrqjgwcsabsmjxqrnei
   - Or navigate to your project manually

2. **Open SQL Editor:**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Paste this SQL:**
   ```sql
   -- Add new fields for simple and legal summaries with examples
   ALTER TABLE public.analyses 
   ADD COLUMN IF NOT EXISTS simple_summary TEXT,
   ADD COLUMN IF NOT EXISTS legal_summary TEXT,
   ADD COLUMN IF NOT EXISTS todo_simple TEXT,
   ADD COLUMN IF NOT EXISTS todo_legal TEXT;
   ```

4. **Run the query:**
   - Click "Run" (or press Cmd+Enter / Ctrl+Enter)
   - You should see: "Success. No rows returned"

5. **Verify it worked:**
   - Go to "Table Editor" → `analyses` table
   - Check that the new columns appear: `simple_summary`, `legal_summary`, `todo_simple`, `todo_legal`

#### Option B: Using Supabase CLI (If you have it installed)

```bash
# Link to your project (if not already linked)
supabase link --project-ref zxrqjgwcsabsmjxqrnei

# Push migrations
supabase db push
```

---

### **Step 2: Deploy the Updated Edge Function** ⚠️ REQUIRED

The Edge Function needs to be deployed with the new code.

#### Option A: Using Supabase Dashboard

1. **Go to Edge Functions:**
   - In Supabase Dashboard, click "Edge Functions" in the left sidebar
   - Find `analyze-document` function

2. **Deploy via Dashboard:**
   - Click on `analyze-document`
   - Click "Deploy" or "Update"
   - OR use the CLI method below (more reliable)

#### Option B: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if you don't have it
# macOS:
brew install supabase/tap/supabase

# Or download from: https://github.com/supabase/cli/releases

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref zxrqjgwcsabsmjxqrnei

# Deploy the function
supabase functions deploy analyze-document
```

#### Option C: Manual Deploy via Dashboard

1. Go to: **Edge Functions** → **analyze-document**
2. Click **"Edit Function"** or **"Deploy"**
3. Copy the entire content from `supabase/functions/analyze-document/index.ts`
4. Paste it into the editor
5. Click **"Deploy"**

---

### **Step 3: Start the Frontend Dev Server** ✅

The frontend code is already updated, just need to run it:

```bash
# Make sure you're in the project directory
cd /Users/skrillex/Documents/admin-hungarian-helper

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### **Step 4: Test in Browser** 🎯

1. **Open the app:**
   - Go to: http://localhost:5173/
   - Log in with your Google account

2. **Upload a test document:**
   - Click "Upload" or navigate to `/upload`
   - Select a PDF document (preferably a Hungarian administrative document)
   - Click "Upload"

3. **Wait for analysis:**
   - The document will be processed
   - You'll be redirected to the results page

4. **Check the new features:**
   - **Summary Section:** You should see tabs:
     - "Egyszerű magyarázat" (Simple explanation) - Should include a real-life example like "Ez olyan, mint amikor Józsi..."
     - "Jogi értelmezés" (Legal interpretation) - Professional, no examples
   
   - **Todo Section:** You should see tabs:
     - "Egyszerű lépések" (Simple steps)
     - "Jogi teendők" (Legal tasks)

5. **Verify the example:**
   - Click on "Egyszerű magyarázat" tab
   - The summary should contain a relatable example with everyday Hungarian names (Józsi, Mária, Péter, etc.)
   - Example format: "Ez olyan, mint amikor [name] [situation], ezért [consequence]..."

---

### **Step 5: Verify Everything Works** ✅

**Checklist:**
- [ ] Database migration applied (new columns exist)
- [ ] Edge Function deployed (check Supabase Dashboard)
- [ ] Frontend dev server running
- [ ] Can upload documents
- [ ] Analysis completes successfully
- [ ] See tabs for "Egyszerű" and "Jogi" views
- [ ] Simple summary includes real-life example
- [ ] Legal summary is professional (no examples)
- [ ] Both todo lists display correctly

---

## 🐛 Troubleshooting

### **Error: "column does not exist"**
- **Solution:** You didn't run the migration. Go back to Step 1.

### **Error: "Function not found" or "400 Bad Request"**
- **Solution:** Edge Function not deployed. Go back to Step 2.

### **Old format still showing (no tabs)**
- **Solution:** 
  1. Make sure you uploaded a NEW document (old analyses won't have new fields)
  2. Check browser console for errors
  3. Verify Edge Function is using the new code

### **Example not appearing in simple_summary**
- **Solution:** 
  1. Check Edge Function logs in Supabase Dashboard
  2. Verify OpenAI API key is set correctly
  3. The AI might need clearer instructions - check the prompt in `analyze-document/index.ts`

### **Frontend not loading**
- **Solution:**
  1. Check `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
  2. Restart dev server: `npm run dev`
  3. Clear browser cache

---

## 📝 Quick Commands Reference

```bash
# Start frontend
npm run dev

# Check Supabase CLI (if installed)
supabase --version

# Deploy Edge Function (if CLI installed)
supabase functions deploy analyze-document

# View Edge Function logs
supabase functions logs analyze-document
```

---

## 🎉 Success Indicators

When everything works, you should see:

1. **Upload page** → Upload a PDF → Processing...
2. **Results page** → Tabs appear:
   - "Egyszerű magyarázat" with example story
   - "Jogi értelmezés" with professional text
   - "Egyszerű lépések" with simple instructions
   - "Jogi teendők" with legal steps

3. **Example format in simple summary:**
   ```
   Ez olyan, mint amikor Józsi felvett egy hitelt, 
   de nem tudta fizetni, ezért a bank már hivatalos 
   levelet küld neki, hogy fizesse ki a tartozást...
   ```

---

**Need help?** Check the browser console (F12) and Supabase Dashboard logs for errors.


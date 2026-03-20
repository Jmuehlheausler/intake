# Coverage Recovery Intake — Deployment & GHL Setup Guide
## Muehl Group LLC

---

## STEP 1: Set Up GHL Webhook (5 minutes)

### A. Create Inbound Webhook
1. In GHL, go to **Automation → Workflows**
2. Click **+ Create Workflow** → Start from Scratch
3. Add trigger: **Inbound Webhook**
4. Copy the webhook URL it gives you (looks like: `https://services.leadconnectorhq.com/hooks/...`)
5. **Save this URL** — you'll need it in Step 2

### B. Create Custom Fields in GHL
Go to **Settings → Custom Fields → Contact** and create these fields:

**Required fields** (the form sends these):

| Field Name | Field Key | Type |
|---|---|---|
| Middle Name | middle_name | Text |
| SSN | ssn | Text |
| Sex | sex | Text |
| County | county | Text |
| Preferred Contact | preferred_contact | Text |
| Medicaid Loss Date | medicaid_loss_date | Date |
| Previous DCN | previous_dcn | Text |
| Loss Reason | loss_reason | Text |
| Marital Status | marital_status | Text |
| Employment Status | employment_status | Text |
| Employer Name | employer_name | Text |
| Wages | wages | Text |
| Annual Income | annual_household_income | Text |
| Household Size | household_size | Text |
| Bridge Coverage Type | bridge_coverage_type | Text |
| Has Medicare | has_medicare | Text |
| Medicare Number | medicare_number | Text |
| Receives SS Disability | receives_ss_disability | Text |
| Doctors | doctors | Text (Long) |
| Prescriptions | prescriptions | Text (Long) |
| Plan Carrier | plan_carrier | Text |
| Plan Name | plan_name | Text |
| Plan Premium | plan_premium | Text |
| Plan Effective Date | plan_effective_date | Date |
| ACA Attestation Signed | aca_attestation_signed | Text |
| Plan Selection Signed | plan_selection_signed | Text |
| SOA Signed | soa_signed | Text |
| Submission Timestamp | submission_timestamp | Text |
| Notes | notes | Text (Long) |
| Household Members | household_members | Text (Long) |

*You can add more — the webhook sends 80+ fields. Start with these and add as needed.*

### C. Map the Webhook to Your Workflow
1. Back in the workflow, after the Inbound Webhook trigger, add actions:
   - **Create/Update Contact** — map firstName, lastName, email, phone, etc.
   - **Add to Pipeline** — pick your Medicaid Recovery pipeline + stage
   - **Add Tag** — the form sends tags automatically
   - **Send Internal Notification** — alert your team
   - **Any other actions** you want

### D. Test the Webhook
After deploying (Step 2), fill out the form with test data. Check:
- Console log (F12 → Console) shows the full payload
- GHL receives the contact

---

## STEP 2: Deploy to Vercel (5 minutes)

### A. Prerequisites
- A free GitHub account (github.com)
- A free Vercel account (vercel.com) — sign up with GitHub

### B. Add Your Webhook URL
1. Open `src/App.jsx`
2. Find this line (around line 200):
   ```
   const GHL_WEBHOOK_URL = "YOUR_GHL_WEBHOOK_URL_HERE";
   ```
3. Replace with your actual webhook URL from Step 1A:
   ```
   const GHL_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/abc123...";
   ```
4. Save the file

### C. Push to GitHub
1. Create a new repository on GitHub (e.g., `muehl-intake`)
2. Upload all the files from this package (keeping the folder structure)
3. Or use the command line:
   ```bash
   cd muehl-intake
   git init
   git add .
   git commit -m "Initial intake form"
   git remote add origin https://github.com/YOUR_USERNAME/muehl-intake.git
   git push -u origin main
   ```

### D. Deploy on Vercel
1. Go to vercel.com → **Add New Project**
2. Import your GitHub repository
3. Vercel auto-detects it as a React app
4. Click **Deploy**
5. Done! You get a URL like `muehl-intake.vercel.app`

### E. Custom Domain (Optional)
1. In Vercel project settings → **Domains**
2. Add your domain (e.g., `intake.muehlgroup.com`)
3. Update your DNS with the records Vercel provides
4. SSL is automatic

---

## STEP 3: Share the Form

### Option A: Direct Link
Text/email clients: `https://intake.muehlgroup.com` (or your Vercel URL)

### Option B: Embed on Your Website
Add this to any webpage:
```html
<iframe
  src="https://intake.muehlgroup.com"
  width="100%"
  height="800"
  frameborder="0"
  style="border: none; max-width: 700px; margin: 0 auto; display: block;"
></iframe>
```

### Option C: Embed in GHL Funnel Page
1. In your GHL funnel, add a **Custom HTML/JS** element
2. Paste the iframe code from Option B
3. Publish

---

## STEP 4: GHL Workflow Suggestions

### Recommended Automation:
```
Trigger: Inbound Webhook
  ↓
Create/Update Contact (map all fields)
  ↓
Add Tags: "Medicaid Loss" + bridge type
  ↓
Add to Pipeline: "Coverage Recovery" → "New Intake"
  ↓
If bridge_coverage_type = "Medicare Review":
  → Add tag "Medicare Review Needed"
  → Assign to Medicare agent
  ↓
If bridge_coverage_type = "ACA Marketplace (SEP)":
  → Add tag "ACA SEP Enrollment"
  → Assign to ACA agent
  ↓
Send Internal Notification to team
  ↓
Send SMS/Email confirmation to client:
  "Hi {{firstName}}, we received your application! 
   A team member will contact you within 1 business day."
```

---

## Troubleshooting

**Form loads but data doesn't reach GHL:**
- Open browser console (F12) — the payload is logged there
- Check your webhook URL is correct
- Test the webhook URL directly with Postman or curl

**Custom fields not mapping:**
- Field keys in GHL must match exactly (use the keys in the table above)
- In GHL workflow, make sure you're mapping from the webhook data to the custom fields

**Need to update the form:**
- Edit `src/App.jsx` on GitHub
- Vercel auto-redeploys on every push

---

## Support
This form was custom-built for Muehl Group LLC.
For modifications, contact your developer.

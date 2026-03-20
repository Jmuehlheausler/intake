import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════════════
   COVERAGE RECOVERY INTAKE
   Flow: Full Medicaid (everyone) → auto-detect → Medicare OR ACA SEP
   No coverage type selector — intelligent branching only
   ═══════════════════════════════════════════════════════════════════ */

const T = {
  bg: "#F4F1EB", card: "#FFFFFF", pri: "#1A3E5C", priL: "#2B6390", priF: "#E4EEF5",
  acc: "#C8913A", txt: "#1F2937", mut: "#6B7280", bdr: "#DDD9D1",
  err: "#BE3A2A", ok: "#1D8348", okBg: "#EAFAF1",
  rad: "14px", radS: "10px", sh: "0 2px 20px rgba(26,62,92,0.06)",
  serif: "'Source Serif 4','Georgia',serif", sans: "'DM Sans','Segoe UI',sans-serif",
};

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];
const FREQ = ["Hourly","Weekly","Every 2 weeks","Twice a month","Monthly","Yearly"];
const OTHER_INC = ["Social Security","SSI","Pensions/Retirement","Unemployment","Disability","Interest/Dividends","Alimony","Veteran's Benefits","Trust Funds","Annuities","Net Rental/Royalty","Other"];

let _uid = 0;
const uid = () => `u${++_uid}`;

const calcAge = (dob) => {
  if (!dob) return 0;
  const b = new Date(dob), now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
};

const isMedicare = (d) => {
  if (calcAge(d.dob) >= 65) return true;
  if (d.hasMedicare === "yes") return true;
  if (d.receivesSSDisability === "yes") return true;
  return false;
};
const isACA = (d) => !isMedicare(d);
const hasKids = (d) => (d.householdMembers || []).some(m => m.dob && calcAge(m.dob) < 19);
const isABD = (d) => d.isAged === "yes" || d.anyoneBlind === "yes" || d.anyoneDisabled === "yes" || d.needsLongTermCare === "yes";
const isMSP = (d) => d.needsMedicareSavings === "yes";

const SECTIONS = [
  { id: "welcome", label: "Welcome", show: () => true },
  { id: "contact", label: "Your Information", show: () => true },
  { id: "loss", label: "Medicaid Loss", show: () => true },
  { id: "citizenship", label: "Citizenship", show: () => true },
  { id: "situation", label: "Your Situation", show: () => true },
  { id: "income", label: "Employment & Income", show: () => true },
  { id: "other_income", label: "Other Income", show: () => true },
  { id: "household", label: "Household Members", show: () => true },
  { id: "coverage", label: "Current Coverage", show: () => true },
  { id: "needs", label: "Additional Needs", show: () => true },
  { id: "abd_info", label: "ABD Details", show: d => isABD(d) },
  { id: "abd_shelter", label: "Shelter Expenses", show: d => d.needsLongTermCare === "yes" || d.nursingHome === "yes" },
  { id: "abd_assets", label: "Assets & Property", show: d => isABD(d) },
  { id: "abd_insurance", label: "Insurance & Burial", show: d => isABD(d) },
  { id: "msp_info", label: "Medicare Savings", show: d => isMSP(d) },
  { id: "msp_assets", label: "MSP Assets", show: d => isMSP(d) },
  { id: "med_info", label: "Medicare Details", show: d => isMedicare(d) },
  { id: "med_plans", label: "Current Plans", show: d => isMedicare(d) },
  { id: "med_doctors", label: "Your Doctors", show: d => isMedicare(d) },
  { id: "med_rx", label: "Prescriptions", show: d => isMedicare(d) },
  { id: "med_pharmacy", label: "Pharmacy", show: d => isMedicare(d) },
  { id: "med_soa", label: "Scope of Appointment", show: d => isMedicare(d) },
  { id: "aca_income", label: "ACA Income", show: d => isACA(d) },
  { id: "aca_prefs", label: "ACA Preferences", show: d => isACA(d) },
  { id: "aca_employer", label: "Employer Coverage", show: d => isACA(d) && d.employerOffersCoverage === "yes" },
  { id: "aca_attest", label: "ACA Attestation", show: d => isACA(d) },
  { id: "aca_plan", label: "Plan Selection", show: d => isACA(d) },
  { id: "review", label: "Review", show: () => true },
  { id: "complete", label: "Complete", show: () => true },
];

const INIT = {
  firstName:"",middleName:"",lastName:"",dob:"",sex:"",ssn:"",
  homeAddress:"",apt:"",city:"",state:"MO",zip:"",county:"",
  mailingDifferent:"no",mailingAddress:"",mailingCity:"",mailingState:"MO",mailingZip:"",
  phone:"",phoneType:"cell",altPhone:"",email:"",preferredContact:"phone",
  medicaidLossDate:"",previousDCN:"",reasonForLoss:"",
  isCitizen:"yes",hasImmigrantStatus:"no",immigrationDocType:"",immigrationDocId:"",immigrationStartDate:"",livedInUSSince1996:"",veteranOrMilitary:"",
  maritalStatus:"",isPregnant:"no",mcdDueDate:"",mcdBabiesExpected:"",
  caretakerOfChild:"no",fullTimeStudent:"no",schoolType:"",
  formerFosterCare:"no",fosterCareState:"",
  hasMedicare:"no",medicareEligibleDate:"",receivesSSDisability:"no",
  planToFileTaxes:"",fileJointlySpouse:"",claimDependents:"",claimedOnOtherReturn:"",taxFilerName:"",
  employmentStatus:"",employerName:"",employerPhone:"",
  wages:"",wageFrequency:"Monthly",hoursPerWeek:"",jobStartDate:"",
  selfEmploymentType:"",selfEmploymentIncome:"",pastYearChange:"",
  otherIncomeTypes:[],otherIncomeAmounts:{},yearlyIncome:"",nextYearIncome:"",
  householdMembers:[],
  currentHealthCoverage:"no",currentCoverageType:"",coverageCompany:"",coveragePolicyNumber:"",
  employerOffersCoverage:"no",empEmployerName:"",empPhone:"",empMeetsMinValue:"",empPremium:"",empFrequency:"",
  anyoneBlind:"no",blindWho:"",anyoneDisabled:"no",disabledWho:"",
  anyoneLimitations:"no",limitationsWho:"",
  anyoneInFacility:"no",facilityWho:"",facilityName:"",facilityAddress:"",
  isAged:"no",needsLongTermCare:"no",needsMedicareSavings:"no",
  abdDCN:"",receivesSSDisabilityWho:"",disabledNoSSI:"no",
  hasConservator:"no",planToContinueLivingInMO:"yes",
  nursingHome:"no",nursingHomeWho:"",nursingFacilityName:"",nursingFacilityDate:"",nursingFacilityAddress:"",
  mortgage:"",rent:"",electric:"",water:"",homeownersInsurance:"",realEstateTaxes:"",condoFees:"",phoneExpense:"",
  overAge63NeedNursingCare:"no",paysChildSupportAlimony:"no",marriageDate:"",
  hasMoneyAccounts:"no",moneyAccounts:[],
  hasTrust:"no",trustName:"",trustRole:"",
  hasVehicles:"no",vehicles:[],
  hasRealEstate:"no",realEstate:[],
  hasTransferredAssets:"no",transferDetails:"",
  hasLifeInsurance:"no",lifeInsCompany:"",lifeInsPolicyNum:"",lifeInsCashValue:"",
  hasBurialPlan:"no",burialCompany:"",burialPolicyNum:"",burialCashValue:"",
  paysHealthInsurance:"no",hasLongTermCareIns:"no",
  medicareNumber:"",mspApplyForSpouse:"no",mspSpouseName:"",
  mspAllCitizens:"yes",mspNonCitizenInfo:"",
  mspEmployed:"no",mspEmployerName:"",mspPayAmount:"",mspPayFrequency:"",
  mspSelfEmployed:"no",mspSelfEmployType:"",mspSelfEmployAmount:"",
  mspOtherIncome:"no",mspOtherIncomeDetail:"",mspAssets:"",
  partADate:"",partBDate:"",medicareEligReason:"age_65",
  hasPartD:"no",partDCarrier:"",partDPlan:"",partDPremium:"",
  hasMedigap:"no",medigapCarrier:"",medigapPlan:"",
  hasMA:"no",maCarrier:"",maPlan:"",
  doctors:[{id:uid(),name:"",specialty:"",phone:""}],
  prescriptions:[{id:uid(),name:"",dosage:"",frequency:"",qty:""}],
  pharmacyName:"",pharmacyAddress:"",mailOrderPharmacy:"no",medicareBudget:"",
  soaDate:"",soaProducts:[],soaAgentName:"",soaAgentPhone:"",soaConsent:false,
  annualHouseholdIncome:"",tobaccoUse:"no",
  preferredDoctors:"",preferredHospital:"",acaBudget:"",
  acaAttestConsent:false,
  // Plan selection
  planCarrier:"Ambetter (Home State Health)",planName:"Elite Bronze – Expanded Bronze (EPO)",planType:"EPO",
  planPremium:"$0.00",planMedDeductible:"$0",planRxDeductible:"$3,800",planOOPMax:"$10,500",
  planPCP:"$50 copay",planSpecialist:"$115 copay",planGenericDrugs:"$3",
  planEffectiveDate:(() => { const n = new Date(); n.setMonth(n.getMonth() + 1); n.setDate(1); return n.toISOString().split("T")[0]; })(),planSelectionConsent:false,planSelectionSigned:false,
  notes:"",
};

// ═══ UI COMPONENTS ═══════════════════════════════════════════════

const iSt={width:"100%",padding:"11px 13px",border:`1.5px solid ${T.bdr}`,borderRadius:T.radS,fontSize:15,fontFamily:T.sans,color:T.txt,background:T.bg,outline:"none",boxSizing:"border-box",transition:"border-color .2s,box-shadow .2s"};
const fOn=e=>{e.target.style.borderColor=T.priL;e.target.style.boxShadow=`0 0 0 3px ${T.priF}`;};
const fOff=e=>{e.target.style.borderColor=T.bdr;e.target.style.boxShadow="none";};

function F({label,req,hint,error,children,style}){return <div style={{marginBottom:18,...style}}>{label&&<label style={{display:"block",fontSize:13,fontWeight:600,color:T.txt,marginBottom:5}}>{label}{req&&<span style={{color:T.err,marginLeft:3}}>*</span>}</label>}{children}{hint&&!error&&<div style={{fontSize:12,color:T.mut,marginTop:4}}>{hint}</div>}{error&&<div style={{fontSize:12,color:T.err,marginTop:4,fontWeight:500}}>{error}</div>}</div>;}
function I({label,req,hint,error,...p}){return <F label={label} req={req} hint={hint} error={error}><input style={iSt} onFocus={fOn} onBlur={fOff} {...p}/></F>;}
function S({label,req,hint,error,options,placeholder,...p}){return <F label={label} req={req} hint={hint} error={error}><select style={{...iSt,cursor:"pointer"}} {...p}>{placeholder&&<option value="">{placeholder}</option>}{options.map(o=>{const v=typeof o==="string"?o:o.v;const l=typeof o==="string"?o:o.l;return <option key={v} value={v}>{l}</option>;})}</select></F>;}
function Tx({label,req,hint,error,...p}){return <F label={label} req={req} hint={hint} error={error}><textarea style={{...iSt,minHeight:80,resize:"vertical"}} onFocus={fOn} onBlur={fOff} {...p}/></F>;}
function R({children,cols=2}){return <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:14}}>{children}</div>;}

function YN({label,value,onChange,req}){
  return <F label={label} req={req}><div style={{display:"flex",gap:10}}>{["yes","no"].map(v=><button key={v} type="button" onClick={()=>onChange(v)} style={{flex:1,padding:"10px 0",borderRadius:T.radS,fontSize:14,fontWeight:600,fontFamily:T.sans,cursor:"pointer",border:`2px solid ${value===v?T.pri:T.bdr}`,background:value===v?T.priF:T.card,color:value===v?T.pri:T.mut,transition:"all .15s"}}>{v==="yes"?"Yes":"No"}</button>)}</div></F>;
}

function OC({options,value,onChange,multi,cols=2}){
  const sel=multi?(value||[]):[value];
  return <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:10,marginBottom:18}}>{options.map(o=>{
    const is=sel.includes(o.value);
    return <div key={o.value} onClick={()=>{if(multi){onChange(is?sel.filter(x=>x!==o.value):[...sel,o.value]);}else{onChange(o.value);}}} style={{border:`2px solid ${is?T.pri:T.bdr}`,borderRadius:T.radS,padding:"14px 16px",cursor:"pointer",background:is?T.priF:T.card,position:"relative",transition:"all .15s"}}>
      <div style={{position:"absolute",top:10,right:12,width:20,height:20,borderRadius:"50%",border:`2px solid ${is?T.pri:T.bdr}`,display:"flex",alignItems:"center",justifyContent:"center",background:is?T.pri:"transparent",color:"#fff",fontSize:12,fontWeight:700}}>{is?"✓":""}</div>
      <div style={{fontWeight:600,fontSize:14,color:T.pri,paddingRight:28}}>{o.label}</div>
      {o.desc&&<div style={{fontSize:12,color:T.mut,lineHeight:1.4,marginTop:2}}>{o.desc}</div>}
    </div>;
  })}</div>;
}

function Hdr({t,d}){return <><h2 style={{fontFamily:T.serif,fontSize:21,fontWeight:600,color:T.pri,margin:"0 0 4px"}}>{t}</h2>{d&&<p style={{fontSize:13.5,color:T.mut,margin:"0 0 22px",lineHeight:1.5}}>{d}</p>}</>;}
function Dv({label}){return <div style={{display:"flex",alignItems:"center",gap:10,margin:"22px 0 16px"}}><div style={{flex:1,height:1,background:T.bdr}}/>{label&&<span style={{fontSize:12,fontWeight:600,color:T.mut,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</span>}<div style={{flex:1,height:1,background:T.bdr}}/></div>;}
function RI({children,onRemove,idx}){return <div style={{border:`1.5px solid ${T.bdr}`,borderRadius:T.radS,padding:"16px 14px",marginBottom:10,background:T.bg,position:"relative"}}>{idx>0&&<button type="button" onClick={onRemove} style={{position:"absolute",top:8,right:10,background:"none",border:"none",color:T.err,cursor:"pointer",fontSize:16,fontWeight:700,padding:4}}>✕</button>}{children}</div>;}
function AB({onClick,label}){return <button type="button" onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"9px 16px",border:`1.5px dashed ${T.priL}`,borderRadius:T.radS,background:"transparent",color:T.priL,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:T.sans}}>+ {label}</button>;}

function Nav({onBack,onNext,nextLabel="Continue",showBack=true,disabled=false}){
  return <div style={{display:"flex",gap:10,marginTop:26}}>
    {showBack&&<button type="button" onClick={onBack} style={{padding:"12px 24px",borderRadius:T.radS,fontSize:14,fontWeight:600,fontFamily:T.sans,cursor:"pointer",background:"transparent",color:T.mut,border:`1.5px solid ${T.bdr}`}}>Back</button>}
    <button type="button" onClick={onNext} disabled={disabled} style={{padding:"12px 28px",borderRadius:T.radS,fontSize:14,fontWeight:600,fontFamily:T.sans,cursor:disabled?"not-allowed":"pointer",background:disabled?T.bdr:T.pri,color:"#fff",border:"none",opacity:disabled?.6:1}}>{nextLabel}</button>
  </div>;
}

function RvB({title,items}){const f=items.filter(i=>i[1]&&i[1]!==""&&i[1]!=="no"&&i[1]!=="N/A");if(!f.length)return null;return <div style={{marginBottom:20}}><h3 style={{fontFamily:T.serif,fontSize:15,fontWeight:600,color:T.pri,borderBottom:`1px solid ${T.bdr}`,paddingBottom:5,marginBottom:10}}>{title}</h3>{f.map(([k,v],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13.5}}><span style={{color:T.mut,marginRight:12}}>{k}</span><span style={{color:T.txt,fontWeight:500,textAlign:"right",wordBreak:"break-word"}}>{String(v)}</span></div>)}</div>;}

// ═══ MAIN ════════════════════════════════════════════════════════

export default function CoverageRecoveryIntake() {
  const [d, setD] = useState(INIT);
  const [ci, setCi] = useState(0);
  const ref = useRef(null);
  const sigCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const flow = useMemo(() => SECTIONS.filter(x => x.show(d)), [d]);
  const cur = flow[ci] || flow[0];
  const pct = flow.length > 2 ? (ci / (flow.length - 2)) * 100 : 0;

  const set = useCallback((k, v) => setD(p => ({ ...p, [k]: v })), []);
  const sn = useCallback((f, i, k, v) => setD(p => { const a = [...(p[f] || [])]; a[i] = { ...a[i], [k]: v }; return { ...p, [f]: a }; }), []);
  const addA = useCallback((f, t) => setD(p => ({ ...p, [f]: [...(p[f] || []), { ...t, id: uid() }] })), []);
  const rmA = useCallback((f, i) => setD(p => ({ ...p, [f]: p[f].filter((_, x) => x !== i) })), []);

  const scroll = () => { if (ref.current) ref.current.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const [submitting, setSubmitting] = useState(false);

  // ═══ GHL WEBHOOK SUBMISSION ═══
  // Replace this URL with your GHL Inbound Webhook URL
  const GHL_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/uPIrIrap13QDWphtKGx7/webhook-trigger/7f02151f-580b-4040-ba82-e8f035bbbc64";

  const submitToGHL = async () => {
    setSubmitting(true);
    const bridgeType = isMedicare(d) ? "Medicare Review" : "ACA Marketplace (SEP)";

    // Get signature as base64 if available
    let signatureData = "";
    try {
      if (sigCanvasRef.current) {
        signatureData = sigCanvasRef.current.toDataURL("image/png");
      }
    } catch (e) { /* ignore */ }

    const payload = {
      // ── GHL Standard Contact Fields ──
      firstName: d.firstName,
      lastName: d.lastName,
      name: `${d.firstName} ${d.middleName} ${d.lastName}`.replace(/\s+/g, " ").trim(),
      email: d.email,
      phone: d.phone,
      address1: d.homeAddress,
      city: d.city,
      state: d.state,
      postalCode: d.zip,
      dateOfBirth: d.dob,
      source: "Coverage Recovery Intake Form",
      tags: [
        "Medicaid Loss",
        bridgeType,
        d.coverageType || "medicaid",
        isABD(d) ? "ABD Supplement" : null,
        isMSP(d) ? "Medicare Savings" : null,
      ].filter(Boolean),

      // ── Custom Fields (create these in GHL) ──
      // Contact & Demographics
      customField: {
        middle_name: d.middleName,
        suffix: d.suffix,
        ssn: d.ssn,
        sex: d.sex,
        county: d.county,
        preferred_contact: d.preferredContact,
        mailing_address: d.mailingDifferent === "yes" ? `${d.mailingAddress}, ${d.mailingCity}, ${d.mailingState} ${d.mailingZip}` : "",
        alt_phone: d.altPhone,

        // Medicaid Loss
        medicaid_loss_date: d.medicaidLossDate,
        previous_dcn: d.previousDCN,
        loss_reason: d.reasonForLoss,

        // Citizenship
        us_citizen: d.isCitizen,
        immigrant_status: d.hasImmigrantStatus,
        immigration_doc_type: d.immigrationDocType,
        immigration_doc_id: d.immigrationDocId,

        // Situation
        marital_status: d.maritalStatus,
        pregnant: d.isPregnant,
        due_date: d.mcdDueDate,
        caretaker_of_child: d.caretakerOfChild,
        full_time_student: d.fullTimeStudent,
        former_foster_care: d.formerFosterCare,
        has_medicare: d.hasMedicare,
        medicare_eligible_date: d.medicareEligibleDate,
        receives_ss_disability: d.receivesSSDisability,
        plan_to_file_taxes: d.planToFileTaxes,

        // Employment & Income
        employment_status: d.employmentStatus,
        employer_name: d.employerName,
        employer_phone: d.employerPhone,
        wages: d.wages,
        wage_frequency: d.wageFrequency,
        hours_per_week: d.hoursPerWeek,
        self_employment_type: d.selfEmploymentType,
        self_employment_income: d.selfEmploymentIncome,
        other_income_types: (d.otherIncomeTypes || []).join(", "),
        other_income_amounts: JSON.stringify(d.otherIncomeAmounts || {}),
        yearly_income: d.yearlyIncome,
        next_year_income: d.nextYearIncome,

        // Household
        household_size: String((d.householdMembers || []).length + 1),
        household_members: JSON.stringify((d.householdMembers || []).map(m => ({
          name: `${m.firstName} ${m.lastName}`,
          relationship: m.relationship,
          dob: m.dob,
          ssn: m.ssn,
          needs_coverage: m.needsCoverage,
        }))),

        // Coverage
        current_health_coverage: d.currentHealthCoverage,
        coverage_type: d.currentCoverageType,
        coverage_company: d.coverageCompany,
        employer_offers_coverage: d.employerOffersCoverage,

        // Disabilities / ABD
        anyone_blind: d.anyoneBlind,
        anyone_disabled: d.anyoneDisabled,
        anyone_in_facility: d.anyoneInFacility,
        facility_name: d.facilityName,
        needs_long_term_care: d.needsLongTermCare,
        needs_medicare_savings: d.needsMedicareSavings,
        is_aged: d.isAged,

        // Bridge type
        bridge_coverage_type: bridgeType,

        // Medicare (if applicable)
        medicare_number: d.medicareNumber,
        part_a_date: d.partADate,
        part_b_date: d.partBDate,
        medicare_elig_reason: d.medicareEligReason,
        has_part_d: d.hasPartD,
        part_d_carrier: d.partDCarrier,
        has_medigap: d.hasMedigap,
        medigap_carrier: d.medigapCarrier,
        has_ma: d.hasMA,
        ma_carrier: d.maCarrier,
        doctors: JSON.stringify((d.doctors || []).filter(x => x.name).map(x => ({ name: x.name, specialty: x.specialty, phone: x.phone }))),
        prescriptions: JSON.stringify((d.prescriptions || []).filter(x => x.name).map(x => ({ name: x.name, dosage: x.dosage, frequency: x.frequency, qty: x.qty }))),
        pharmacy_name: d.pharmacyName,
        pharmacy_address: d.pharmacyAddress,
        mail_order_pharmacy: d.mailOrderPharmacy,
        medicare_budget: d.medicareBudget,
        soa_date: d.soaDate,
        soa_products: (d.soaProducts || []).join(", "),

        // ACA (if applicable)
        annual_household_income: d.annualHouseholdIncome,
        tobacco_use: d.tobaccoUse,
        preferred_doctors: d.preferredDoctors,
        preferred_hospital: d.preferredHospital,
        aca_budget: d.acaBudget,

        // Plan Selection
        plan_carrier: d.planCarrier,
        plan_name: d.planName,
        plan_type: d.planType,
        plan_premium: d.planPremium,
        plan_med_deductible: d.planMedDeductible,
        plan_rx_deductible: d.planRxDeductible,
        plan_oop_max: d.planOOPMax,
        plan_effective_date: d.planEffectiveDate,

        // ABD Assets (if applicable)
        has_money_accounts: d.hasMoneyAccounts,
        has_vehicles: d.hasVehicles,
        has_real_estate: d.hasRealEstate,
        has_life_insurance: d.hasLifeInsurance,
        has_burial_plan: d.hasBurialPlan,

        // Signature & consent
        aca_attestation_signed: d.acaAttestConsent ? "Yes" : "No",
        plan_selection_signed: d.planSelectionSigned ? "Yes" : "No",
        soa_signed: d.soaConsent ? "Yes" : "No",
        signature_image: signatureData,

        // Audit trail
        submission_timestamp: new Date().toISOString(),
        submission_source: "Coverage Recovery Intake Form",
        notes: d.notes,
      },
    };

    try {
      if (GHL_WEBHOOK_URL && GHL_WEBHOOK_URL !== "YOUR_GHL_WEBHOOK_URL_HERE") {
        await fetch(GHL_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      // Also log to console for testing
      console.log("📋 Form Submission Payload:", JSON.stringify(payload, null, 2));
    } catch (err) {
      console.error("GHL webhook error:", err);
      // Still proceed — don't block the user
    }
    setSubmitting(false);
  };

  const next = () => {
    const nf = SECTIONS.filter(x => x.show(d));
    const curSection = nf[ci];
    // If we're on review, submit before moving to complete
    if (curSection && curSection.id === "review") {
      submitToGHL().then(() => {
        if (ci < nf.length - 1) { setCi(ci + 1); setTimeout(scroll, 60); }
      });
    } else {
      if (ci < nf.length - 1) { setCi(ci + 1); setTimeout(scroll, 60); }
    }
  };
  const back = () => { if (ci > 0) { setCi(ci - 1); setTimeout(scroll, 60); } };

  useEffect(() => { if (d.dob && calcAge(d.dob) >= 65 && d.isAged !== "yes") set("isAged", "yes"); }, [d.dob]);
  useEffect(() => { const nf = SECTIONS.filter(x => x.show(d)); if (ci >= nf.length) setCi(Math.max(0, nf.length - 1)); }, [d]);

  const renderSection = () => {
    switch (cur.id) {

      case "welcome": return (
        <div style={{ textAlign: "center", padding: "36px 20px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 18px", background: `linear-gradient(135deg,${T.pri},${T.priL})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.acc, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 8 }}>[ Your Brokerage Name ]</div>
          <h2 style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 700, color: T.pri, margin: "0 0 8px" }}>Lost Your Medicaid Coverage?</h2>
          <p style={{ fontSize: 14, color: T.mut, maxWidth: 420, margin: "0 auto 10px", lineHeight: 1.6 }}>We're here to help. This form collects everything we need to <strong>resubmit your MO HealthNet application</strong> and get you set up with coverage in the meantime.</p>
          <p style={{ fontSize: 12.5, color: T.mut, maxWidth: 380, margin: "0 auto 24px", lineHeight: 1.5, fontStyle: "italic" }}>Takes about 10 minutes. We only ask what's necessary.</p>
          <Nav onNext={next} showBack={false} nextLabel="Let's Get Started" />
        </div>
      );

      case "contact": return (<>
        <Hdr t="Your Information" d="We'll use this for your MO HealthNet resubmission and any bridge coverage." />
        <R cols={3}><I label="First Name" req value={d.firstName} onChange={e => set("firstName", e.target.value)} /><I label="Middle" value={d.middleName} onChange={e => set("middleName", e.target.value)} /><I label="Last Name" req value={d.lastName} onChange={e => set("lastName", e.target.value)} /></R>
        <R><I label="Date of Birth" req type="date" value={d.dob} onChange={e => set("dob", e.target.value)} /><S label="Sex" req value={d.sex} onChange={e => set("sex", e.target.value)} placeholder="Select..." options={[{ v: "male", l: "Male" }, { v: "female", l: "Female" }]} /></R>
        <I label="Social Security Number" req value={d.ssn} onChange={e => set("ssn", e.target.value)} placeholder="XXX-XX-XXXX" />
        <Dv label="Address" />
        <I label="Home Address" req value={d.homeAddress} onChange={e => set("homeAddress", e.target.value)} />
        <R cols={3}><I label="City" req value={d.city} onChange={e => set("city", e.target.value)} /><S label="State" req value={d.state} onChange={e => set("state", e.target.value)} options={STATES} /><I label="ZIP" req value={d.zip} onChange={e => set("zip", e.target.value)} /></R>
        <I label="County" value={d.county} onChange={e => set("county", e.target.value)} />
        <YN label="Mailing address different?" value={d.mailingDifferent} onChange={v => set("mailingDifferent", v)} />
        {d.mailingDifferent === "yes" && <><I label="Mailing Address" value={d.mailingAddress} onChange={e => set("mailingAddress", e.target.value)} /><R cols={3}><I label="City" value={d.mailingCity} onChange={e => set("mailingCity", e.target.value)} /><S label="State" value={d.mailingState} onChange={e => set("mailingState", e.target.value)} options={STATES} /><I label="ZIP" value={d.mailingZip} onChange={e => set("mailingZip", e.target.value)} /></R></>}
        <Dv label="Contact" />
        <R><I label="Phone" req value={d.phone} onChange={e => set("phone", e.target.value)} placeholder="(555) 555-1234" /><I label="Email" value={d.email} onChange={e => set("email", e.target.value)} type="email" /></R>
        <S label="Preferred Contact" value={d.preferredContact} onChange={e => set("preferredContact", e.target.value)} options={[{ v: "phone", l: "Phone" }, { v: "text", l: "Text" }, { v: "email", l: "Email" }]} />
        <Nav onBack={back} onNext={next} showBack={ci > 0} />
      </>);

      case "loss": return (<>
        <Hdr t="Medicaid Loss Details" d="This info is needed for resubmission and qualifies you for bridge coverage." />
        <I label="Date You Lost Coverage" req type="date" value={d.medicaidLossDate} onChange={e => set("medicaidLossDate", e.target.value)} hint="Also serves as your qualifying event for Marketplace enrollment" />
        <I label="Previous DCN / Medicaid Number (if known)" value={d.previousDCN} onChange={e => set("previousDCN", e.target.value)} hint="Your MO HealthNet case number — found on your approval letter or benefit card" />
        <S label="Reason (if known)" value={d.reasonForLoss} onChange={e => set("reasonForLoss", e.target.value)} placeholder="Select or skip..."
          options={[{ v: "redetermination", l: "Redetermination / Renewal" }, { v: "income", l: "Income over limit" }, { v: "paperwork", l: "Didn't return paperwork" }, { v: "unknown", l: "Not sure" }, { v: "other", l: "Other" }]} />
        <Nav onBack={back} onNext={next} />
      </>);

      case "citizenship": return (<>
        <Hdr t="Citizenship" d="Required for MO HealthNet." />
        <YN label="Are you a US Citizen?" value={d.isCitizen} onChange={v => set("isCitizen", v)} req />
        {d.isCitizen === "no" && <>
          <YN label="Eligible immigrant status?" value={d.hasImmigrantStatus} onChange={v => set("hasImmigrantStatus", v)} />
          {d.hasImmigrantStatus === "yes" && <>
            <R><I label="Document Type" value={d.immigrationDocType} onChange={e => set("immigrationDocType", e.target.value)} /><I label="Document ID" value={d.immigrationDocId} onChange={e => set("immigrationDocId", e.target.value)} /></R>
            <I label="Status Start Date" type="date" value={d.immigrationStartDate} onChange={e => set("immigrationStartDate", e.target.value)} />
            <YN label="Lived in US since 1996?" value={d.livedInUSSince1996} onChange={v => set("livedInUSSince1996", v)} />
            <YN label="You/spouse/parent veteran or active military?" value={d.veteranOrMilitary} onChange={v => set("veteranOrMilitary", v)} />
          </>}
        </>}
        <Nav onBack={back} onNext={next} />
      </>);

      case "situation": return (<>
        <Hdr t="Your Situation" d="Helps determine which MO HealthNet programs you qualify for." />
        <S label="Marital Status" req value={d.maritalStatus} onChange={e => set("maritalStatus", e.target.value)} placeholder="Select..." options={["Never Married", "Married", "Divorced", "Widowed", "Separated"]} />
        <YN label="Pregnant?" value={d.isPregnant} onChange={v => set("isPregnant", v)} />
        {d.isPregnant === "yes" && <R><I label="Due Date" type="date" value={d.mcdDueDate} onChange={e => set("mcdDueDate", e.target.value)} /><I label="Babies Expected" type="number" min="1" value={d.mcdBabiesExpected} onChange={e => set("mcdBabiesExpected", e.target.value)} /></R>}
        <YN label="Main caretaker of a child under 19?" value={d.caretakerOfChild} onChange={v => set("caretakerOfChild", v)} />
        <YN label="Full-time student?" value={d.fullTimeStudent} onChange={v => set("fullTimeStudent", v)} />
        {d.fullTimeStudent === "yes" && <I label="Type of school" value={d.schoolType} onChange={e => set("schoolType", e.target.value)} placeholder="High school, college..." />}
        <YN label="Were you in foster care at age 18+?" value={d.formerFosterCare} onChange={v => set("formerFosterCare", v)} />
        {d.formerFosterCare === "yes" && <I label="What state?" value={d.fosterCareState} onChange={e => set("fosterCareState", e.target.value)} />}
        <YN label="Do you have or are you eligible for Medicare?" value={d.hasMedicare} onChange={v => set("hasMedicare", v)} />
        {d.hasMedicare === "yes" && <I label="When eligible?" type="date" value={d.medicareEligibleDate} onChange={e => set("medicareEligibleDate", e.target.value)} />}
        <YN label="Receive Social Security Disability or SSI?" value={d.receivesSSDisability} onChange={v => set("receivesSSDisability", v)} />
        <Dv label="Tax Filing" />
        <YN label="Plan to file taxes next year?" value={d.planToFileTaxes} onChange={v => set("planToFileTaxes", v)} />
        {d.planToFileTaxes === "yes" && <><YN label="File jointly?" value={d.fileJointlySpouse} onChange={v => set("fileJointlySpouse", v)} /><YN label="Claim dependents?" value={d.claimDependents} onChange={v => set("claimDependents", v)} /></>}
        <YN label="Claimed on someone else's return?" value={d.claimedOnOtherReturn} onChange={v => set("claimedOnOtherReturn", v)} />
        {d.claimedOnOtherReturn === "yes" && <I label="Tax filer name" value={d.taxFilerName} onChange={e => set("taxFilerName", e.target.value)} />}
        <Nav onBack={back} onNext={next} />
      </>);

      case "income": return (<>
        <Hdr t="Employment & Income" />
        <S label="Employment Status" req value={d.employmentStatus} onChange={e => set("employmentStatus", e.target.value)} placeholder="Select..." options={[{ v: "employed", l: "Employed" }, { v: "self_employed", l: "Self-Employed" }, { v: "not_employed", l: "Not Employed" }]} />
        {d.employmentStatus === "employed" && <>
          <I label="Employer Name" value={d.employerName} onChange={e => set("employerName", e.target.value)} />
          <I label="Employer Phone" value={d.employerPhone} onChange={e => set("employerPhone", e.target.value)} />
          <R><I label="Wages (before taxes)" value={d.wages} onChange={e => set("wages", e.target.value)} placeholder="$" /><S label="Frequency" value={d.wageFrequency} onChange={e => set("wageFrequency", e.target.value)} options={FREQ} /></R>
          <R><I label="Hours/Week" type="number" value={d.hoursPerWeek} onChange={e => set("hoursPerWeek", e.target.value)} /><I label="Job Start Date" type="date" value={d.jobStartDate} onChange={e => set("jobStartDate", e.target.value)} /></R>
        </>}
        {d.employmentStatus === "self_employed" && <R><I label="Type of Work" value={d.selfEmploymentType} onChange={e => set("selfEmploymentType", e.target.value)} /><I label="Net Monthly Income" value={d.selfEmploymentIncome} onChange={e => set("selfEmploymentIncome", e.target.value)} placeholder="$" /></R>}
        <S label="In the past year, did you:" value={d.pastYearChange} onChange={e => set("pastYearChange", e.target.value)} placeholder="Select..." options={[{ v: "change", l: "Change jobs" }, { v: "stop", l: "Stop working" }, { v: "fewer", l: "Fewer hours" }, { v: "none", l: "None of these" }]} />
        <Nav onBack={back} onNext={next} />
      </>);

      case "other_income": return (<>
        <Hdr t="Other Income" d="Select all that apply. If none, just continue." />
        <OC multi cols={2} value={d.otherIncomeTypes} onChange={v => set("otherIncomeTypes", v)} options={OTHER_INC.map(t => ({ value: t, label: t }))} />
        {d.otherIncomeTypes.length > 0 && <>{d.otherIncomeTypes.map(t => <I key={t} label={`${t} — per month`} value={d.otherIncomeAmounts[t] || ""} onChange={e => set("otherIncomeAmounts", { ...d.otherIncomeAmounts, [t]: e.target.value })} placeholder="$" />)}</>}
        <Dv label="Annual Totals (if varies)" />
        <R><I label="This Year" value={d.yearlyIncome} onChange={e => set("yearlyIncome", e.target.value)} placeholder="$" /><I label="Next Year" value={d.nextYearIncome} onChange={e => set("nextYearIncome", e.target.value)} placeholder="$" /></R>
        <Nav onBack={back} onNext={next} />
      </>);

      case "household": return (<>
        <Hdr t="Household Members" d="Spouse, children, anyone on your tax return. If just you, skip ahead." />
        {d.householdMembers.map((m, i) => <RI key={m.id} idx={i} onRemove={() => rmA("householdMembers", i)}>
          <R cols={3}><I label="First Name" value={m.firstName} onChange={e => sn("householdMembers", i, "firstName", e.target.value)} /><I label="Last Name" value={m.lastName} onChange={e => sn("householdMembers", i, "lastName", e.target.value)} /><I label="Relationship" value={m.relationship} onChange={e => sn("householdMembers", i, "relationship", e.target.value)} placeholder="Spouse, child..." /></R>
          <R cols={3}><I label="DOB" type="date" value={m.dob} onChange={e => sn("householdMembers", i, "dob", e.target.value)} /><I label="SSN" value={m.ssn} onChange={e => sn("householdMembers", i, "ssn", e.target.value)} /><S label="Sex" value={m.sex} onChange={e => sn("householdMembers", i, "sex", e.target.value)} placeholder="Select" options={["Male", "Female"]} /></R>
          <YN label="Needs coverage?" value={m.needsCoverage || ""} onChange={v => sn("householdMembers", i, "needsCoverage", v)} />
        </RI>)}
        <AB onClick={() => addA("householdMembers", { firstName: "", lastName: "", relationship: "", dob: "", ssn: "", sex: "", needsCoverage: "" })} label="Add Household Member" />
        <Nav onBack={back} onNext={next} />
      </>);

      case "coverage": return (<>
        <Hdr t="Current Health Coverage" />
        {hasKids(d) && <YN label="Do all children under 19 currently have health coverage?" value={d.allChildrenMEC || ""} onChange={v => set("allChildrenMEC", v)} />}
        <YN label="Is anyone currently enrolled in health coverage?" value={d.currentHealthCoverage} onChange={v => set("currentHealthCoverage", v)} />
        {d.currentHealthCoverage === "yes" && <>
          <I label="Type" value={d.currentCoverageType} onChange={e => set("currentCoverageType", e.target.value)} placeholder="MO HealthNet, Medicare, Employer..." />
          <R><I label="Company" value={d.coverageCompany} onChange={e => set("coverageCompany", e.target.value)} /><I label="Policy #" value={d.coveragePolicyNumber} onChange={e => set("coveragePolicyNumber", e.target.value)} /></R>
        </>}
        <YN label="Anyone offered coverage from a job?" value={d.employerOffersCoverage} onChange={v => set("employerOffersCoverage", v)} />
        {d.employerOffersCoverage === "yes" && <>
          <I label="Employer Name" value={d.empEmployerName} onChange={e => set("empEmployerName", e.target.value)} />
          <I label="Employer Phone" value={d.empPhone} onChange={e => set("empPhone", e.target.value)} />
          <YN label="Plan meets minimum value (60%+)?" value={d.empMeetsMinValue} onChange={v => set("empMeetsMinValue", v)} />
          <R><I label="Employee Premium" value={d.empPremium} onChange={e => set("empPremium", e.target.value)} placeholder="$" /><S label="Frequency" value={d.empFrequency} onChange={e => set("empFrequency", e.target.value)} options={FREQ} placeholder="Select..." /></R>
        </>}
        <Nav onBack={back} onNext={next} />
      </>);

      case "needs": {
        const hasMed = d.hasMedicare === "yes" || calcAge(d.dob) >= 65 || d.receivesSSDisability === "yes";
        const hasBlindOrDisabled = d.anyoneBlind === "yes" || d.anyoneDisabled === "yes";
        return (<>
        <Hdr t="Additional Needs" d="Just a few more questions to make sure we file the right forms." />
        <YN label="Is anyone on this application blind?" value={d.anyoneBlind} onChange={v => set("anyoneBlind", v)} />
        {d.anyoneBlind === "yes" && <I label="Who?" value={d.blindWho} onChange={e => set("blindWho", e.target.value)} />}
        <YN label="Is anyone disabled?" value={d.anyoneDisabled} onChange={v => set("anyoneDisabled", v)} />
        {d.anyoneDisabled === "yes" && <I label="Who?" value={d.disabledWho} onChange={e => set("disabledWho", e.target.value)} />}
        {/* Only ask about limitations if blind or disabled */}
        {hasBlindOrDisabled && <YN label="Does anyone have limitations in daily activities (bathing, dressing, etc.)?" value={d.anyoneLimitations} onChange={v => set("anyoneLimitations", v)} />}
        {/* Only ask about facility if there's a reason to */}
        {hasBlindOrDisabled && <YN label="Is anyone in or entering a nursing home or care facility?" value={d.anyoneInFacility} onChange={v => { set("anyoneInFacility", v); if (v === "yes") set("needsLongTermCare", "yes"); }} />}
        {d.anyoneInFacility === "yes" && <><I label="Who?" value={d.facilityWho} onChange={e => set("facilityWho", e.target.value)} /><I label="Facility Name" value={d.facilityName} onChange={e => set("facilityName", e.target.value)} /><I label="Facility Address" value={d.facilityAddress} onChange={e => set("facilityAddress", e.target.value)} /></>}
        {/* Only ask about Medicare premiums if they actually have Medicare */}
        {hasMed && <YN label="Do you need help paying Medicare premiums?" value={d.needsMedicareSavings} onChange={v => set("needsMedicareSavings", v)} />}
        <Nav onBack={back} onNext={next} />
      </>);
      }

      // ABD
      case "abd_info": return (<><Hdr t="Aged, Blind & Disabled Supplement" d="IM-1ABDS — Required for ABD programs." /><I label="DCN / Medicaid Number" value={d.abdDCN || d.previousDCN} onChange={e=>set("abdDCN",e.target.value)} hint="Auto-filled from earlier if provided" /><YN label="Disabled/blind but do NOT receive SS Disability/SSI?" value={d.disabledNoSSI} onChange={v=>set("disabledNoSSI",v)} /><YN label="Have a conservator or guardian?" value={d.hasConservator} onChange={v=>set("hasConservator",v)} /><YN label="Plan to stay in Missouri?" value={d.planToContinueLivingInMO} onChange={v=>set("planToContinueLivingInMO",v)} /><Dv label="Nursing Facility" /><YN label="Live in or plan to enter a nursing home?" value={d.nursingHome} onChange={v=>set("nursingHome",v)} />{d.nursingHome==="yes"&&<><I label="Who?" value={d.nursingHomeWho} onChange={e=>set("nursingHomeWho",e.target.value)} /><R><I label="Facility" value={d.nursingFacilityName} onChange={e=>set("nursingFacilityName",e.target.value)} /><I label="Date" type="date" value={d.nursingFacilityDate} onChange={e=>set("nursingFacilityDate",e.target.value)} /></R><I label="Address" value={d.nursingFacilityAddress} onChange={e=>set("nursingFacilityAddress",e.target.value)} /></>}<Nav onBack={back} onNext={next} /></>);

      case "abd_shelter": return (<><Hdr t="Shelter Expenses" d="Monthly amounts for you and your spouse." /><R><I label="Mortgage" value={d.mortgage} onChange={e=>set("mortgage",e.target.value)} placeholder="$" /><I label="Rent" value={d.rent} onChange={e=>set("rent",e.target.value)} placeholder="$" /></R><R><I label="Electric" value={d.electric} onChange={e=>set("electric",e.target.value)} placeholder="$" /><I label="Water" value={d.water} onChange={e=>set("water",e.target.value)} placeholder="$" /></R><R><I label="Phone" value={d.phoneExpense} onChange={e=>set("phoneExpense",e.target.value)} placeholder="$" /><I label="Condo Fees" value={d.condoFees} onChange={e=>set("condoFees",e.target.value)} placeholder="$" /></R><R><I label="Homeowner's Insurance" value={d.homeownersInsurance} onChange={e=>set("homeownersInsurance",e.target.value)} placeholder="$" /><I label="Real Estate Taxes" value={d.realEstateTaxes} onChange={e=>set("realEstateTaxes",e.target.value)} placeholder="$" /></R><YN label="Over 63 and need in-home nursing care?" value={d.overAge63NeedNursingCare} onChange={v=>set("overAge63NeedNursingCare",v)} /><YN label="Pay court-ordered child support or alimony?" value={d.paysChildSupportAlimony} onChange={v=>set("paysChildSupportAlimony",v)} /><I label="Marriage Date (if applicable)" type="date" value={d.marriageDate} onChange={e=>set("marriageDate",e.target.value)} /><Nav onBack={back} onNext={next} /></>);

      case "abd_assets": return (<><Hdr t="Assets & Property" /><YN label="Have bank accounts/investments/cash?" value={d.hasMoneyAccounts} onChange={v=>set("hasMoneyAccounts",v)} />{d.hasMoneyAccounts==="yes"&&<>{d.moneyAccounts.map((a,i)=><RI key={a.id} idx={i} onRemove={()=>rmA("moneyAccounts",i)}><R cols={3}><I label="Name" value={a.who} onChange={e=>sn("moneyAccounts",i,"who",e.target.value)} /><I label="Type" value={a.type} onChange={e=>sn("moneyAccounts",i,"type",e.target.value)} /><I label="Balance" value={a.balance} onChange={e=>sn("moneyAccounts",i,"balance",e.target.value)} placeholder="$" /></R></RI>)}<AB onClick={()=>addA("moneyAccounts",{who:"",type:"",bank:"",balance:""})} label="Add Account" /></>}<YN label="Own vehicles?" value={d.hasVehicles} onChange={v=>set("hasVehicles",v)} />{d.hasVehicles==="yes"&&<>{d.vehicles.map((v,i)=><RI key={v.id} idx={i} onRemove={()=>rmA("vehicles",i)}><R><I label="Year/Make/Model" value={v.desc} onChange={e=>sn("vehicles",i,"desc",e.target.value)} /><I label="Value" value={v.value} onChange={e=>sn("vehicles",i,"value",e.target.value)} placeholder="$" /></R></RI>)}<AB onClick={()=>addA("vehicles",{desc:"",value:"",owed:""})} label="Add Vehicle" /></>}<YN label="Own real estate?" value={d.hasRealEstate} onChange={v=>set("hasRealEstate",v)} />{d.hasRealEstate==="yes"&&<>{d.realEstate.map((r,i)=><RI key={r.id} idx={i} onRemove={()=>rmA("realEstate",i)}><R><I label="What/Where" value={r.desc} onChange={e=>sn("realEstate",i,"desc",e.target.value)} /><I label="Value" value={r.value} onChange={e=>sn("realEstate",i,"value",e.target.value)} placeholder="$" /></R></RI>)}<AB onClick={()=>addA("realEstate",{desc:"",value:"",owed:""})} label="Add Property" /></>}<YN label="Transferred assets in last 5 years?" value={d.hasTransferredAssets} onChange={v=>set("hasTransferredAssets",v)} />{d.hasTransferredAssets==="yes"&&<Tx label="Details" value={d.transferDetails} onChange={e=>set("transferDetails",e.target.value)} />}<Nav onBack={back} onNext={next} /></>);

      case "abd_insurance": return (<><Hdr t="Insurance & Burial" /><YN label="Own life insurance?" value={d.hasLifeInsurance} onChange={v=>set("hasLifeInsurance",v)} />{d.hasLifeInsurance==="yes"&&<R cols={3}><I label="Company" value={d.lifeInsCompany} onChange={e=>set("lifeInsCompany",e.target.value)} /><I label="Policy #" value={d.lifeInsPolicyNum} onChange={e=>set("lifeInsPolicyNum",e.target.value)} /><I label="Cash Value" value={d.lifeInsCashValue} onChange={e=>set("lifeInsCashValue",e.target.value)} placeholder="$" /></R>}<YN label="Prepaid burial plan?" value={d.hasBurialPlan} onChange={v=>set("hasBurialPlan",v)} />{d.hasBurialPlan==="yes"&&<R cols={3}><I label="Company" value={d.burialCompany} onChange={e=>set("burialCompany",e.target.value)} /><I label="Policy #" value={d.burialPolicyNum} onChange={e=>set("burialPolicyNum",e.target.value)} /><I label="Cash Value" value={d.burialCashValue} onChange={e=>set("burialCashValue",e.target.value)} placeholder="$" /></R>}<YN label="Pay health insurance/Medicare premiums?" value={d.paysHealthInsurance} onChange={v=>set("paysHealthInsurance",v)} /><YN label="Long-term care insurance?" value={d.hasLongTermCareIns} onChange={v=>set("hasLongTermCareIns",v)} /><Nav onBack={back} onNext={next} /></>);

      // MSP
      case "msp_info": return (<><Hdr t="Medicare Savings Program" d="IM-1MSP — Help paying Medicare premiums." /><I label="Medicare Number" req value={d.medicareNumber} onChange={e=>set("medicareNumber",e.target.value)} /><YN label="Apply for spouse too?" value={d.mspApplyForSpouse} onChange={v=>set("mspApplyForSpouse",v)} />{d.mspApplyForSpouse==="yes"&&<I label="Spouse Name" value={d.mspSpouseName} onChange={e=>set("mspSpouseName",e.target.value)} />}<YN label="All applicants US Citizens?" value={d.mspAllCitizens} onChange={v=>set("mspAllCitizens",v)} />{d.mspAllCitizens==="no"&&<Tx label="Non-citizen details" value={d.mspNonCitizenInfo} onChange={e=>set("mspNonCitizenInfo",e.target.value)} />}<Dv label="MSP Income" /><YN label="Employed?" value={d.mspEmployed} onChange={v=>set("mspEmployed",v)} />{d.mspEmployed==="yes"&&<R><I label="Who/Employer" value={d.mspEmployerName} onChange={e=>set("mspEmployerName",e.target.value)} /><I label="Pay" value={d.mspPayAmount} onChange={e=>set("mspPayAmount",e.target.value)} placeholder="$" /></R>}<YN label="Other income (SS, pensions)?" value={d.mspOtherIncome} onChange={v=>set("mspOtherIncome",v)} />{d.mspOtherIncome==="yes"&&<Tx label="Details (type, who, amount)" value={d.mspOtherIncomeDetail} onChange={e=>set("mspOtherIncomeDetail",e.target.value)} />}<Nav onBack={back} onNext={next} /></>);

      case "msp_assets": return (<><Hdr t="MSP Assets" /><Tx label="Cash, accounts, investments, vehicles, real estate, life insurance" value={d.mspAssets} onChange={e=>set("mspAssets",e.target.value)} hint="List each with name, bank/type, balance" /><Nav onBack={back} onNext={next} /></>);

      // MEDICARE REVIEW
      case "med_info": return (<><div style={{background:T.priF,border:`1px solid ${T.priL}33`,borderRadius:T.radS,padding:"12px 16px",marginBottom:20,fontSize:13,color:T.pri,lineHeight:1.5}}><strong>Medicare Review:</strong> Based on your answers, let's review your Medicare to make sure you're getting the best benefits.</div><Hdr t="Medicare Details" /><I label="Medicare Number (MBI)" req value={d.medicareNumber} onChange={e=>set("medicareNumber",e.target.value)} hint="Red, white, and blue card" /><R><I label="Part A Date" type="date" value={d.partADate} onChange={e=>set("partADate",e.target.value)} /><I label="Part B Date" type="date" value={d.partBDate} onChange={e=>set("partBDate",e.target.value)} /></R><S label="Eligibility Reason" value={d.medicareEligReason} onChange={e=>set("medicareEligReason",e.target.value)} options={[{v:"age_65",l:"Age 65+"},{v:"disability",l:"Disability"},{v:"esrd",l:"ESRD"},{v:"als",l:"ALS"}]} /><Nav onBack={back} onNext={next} /></>);

      case "med_plans": return (<><Hdr t="Current Medicare Plans" /><YN label="Part D (drug plan)?" value={d.hasPartD} onChange={v=>set("hasPartD",v)} />{d.hasPartD==="yes"&&<R cols={3}><I label="Carrier" value={d.partDCarrier} onChange={e=>set("partDCarrier",e.target.value)} /><I label="Plan" value={d.partDPlan} onChange={e=>set("partDPlan",e.target.value)} /><I label="Premium" value={d.partDPremium} onChange={e=>set("partDPremium",e.target.value)} placeholder="$/mo" /></R>}<YN label="Medigap (Supplement)?" value={d.hasMedigap} onChange={v=>set("hasMedigap",v)} />{d.hasMedigap==="yes"&&<R><I label="Carrier" value={d.medigapCarrier} onChange={e=>set("medigapCarrier",e.target.value)} /><I label="Plan Letter" value={d.medigapPlan} onChange={e=>set("medigapPlan",e.target.value)} placeholder="G, N..." /></R>}<YN label="Medicare Advantage?" value={d.hasMA} onChange={v=>set("hasMA",v)} />{d.hasMA==="yes"&&<R><I label="Carrier" value={d.maCarrier} onChange={e=>set("maCarrier",e.target.value)} /><I label="Plan" value={d.maPlan} onChange={e=>set("maPlan",e.target.value)} /></R>}<Nav onBack={back} onNext={next} /></>);

      case "med_doctors": return (<><Hdr t="Your Doctors" d="We'll check network coverage." />{d.doctors.map((doc,i)=><RI key={doc.id} idx={i} onRemove={()=>rmA("doctors",i)}><R cols={3}><I label="Name" value={doc.name} onChange={e=>sn("doctors",i,"name",e.target.value)} /><I label="Specialty" value={doc.specialty} onChange={e=>sn("doctors",i,"specialty",e.target.value)} /><I label="Phone" value={doc.phone} onChange={e=>sn("doctors",i,"phone",e.target.value)} /></R></RI>)}<AB onClick={()=>addA("doctors",{name:"",specialty:"",phone:""})} label="Add Doctor" /><Nav onBack={back} onNext={next} /></>);

      case "med_rx": return (<><Hdr t="Prescriptions" d="We'll compare drug formularies." />{d.prescriptions.map((rx,i)=><RI key={rx.id} idx={i} onRemove={()=>rmA("prescriptions",i)}><R cols={2}><I label="Medication" value={rx.name} onChange={e=>sn("prescriptions",i,"name",e.target.value)} /><I label="Dosage" value={rx.dosage} onChange={e=>sn("prescriptions",i,"dosage",e.target.value)} placeholder="20mg" /></R><R cols={2}><I label="Frequency" value={rx.frequency} onChange={e=>sn("prescriptions",i,"frequency",e.target.value)} placeholder="Once daily" /><I label="Quantity" value={rx.qty} onChange={e=>sn("prescriptions",i,"qty",e.target.value)} placeholder="30 tablets" /></R></RI>)}<AB onClick={()=>addA("prescriptions",{name:"",dosage:"",frequency:"",qty:""})} label="Add Medication" /><Nav onBack={back} onNext={next} /></>);

      case "med_pharmacy": return (<><Hdr t="Pharmacy" /><I label="Preferred Pharmacy" value={d.pharmacyName} onChange={e=>set("pharmacyName",e.target.value)} /><I label="Address" value={d.pharmacyAddress} onChange={e=>set("pharmacyAddress",e.target.value)} /><YN label="Want mail-order pharmacy?" value={d.mailOrderPharmacy} onChange={v=>set("mailOrderPharmacy",v)} /><I label="Monthly Budget" value={d.medicareBudget} onChange={e=>set("medicareBudget",e.target.value)} placeholder="$" /><Nav onBack={back} onNext={next} /></>);

      case "med_soa": return (<><Hdr t="Scope of Appointment" d="Required by CMS before discussing Medicare products." /><div style={{background:T.bg,border:`1px solid ${T.bdr}`,borderRadius:T.radS,padding:14,fontSize:13,lineHeight:1.6,marginBottom:16}}>By signing, you agree to discuss the selected products. This is <strong>NOT</strong> a contract or obligation to enroll.</div><I label="Appointment Date" type="date" value={d.soaDate} onChange={e=>set("soaDate",e.target.value)} /><F label="Products to Discuss" req><OC multi cols={2} value={d.soaProducts} onChange={v=>set("soaProducts",v)} options={[{value:"ma",label:"Medicare Advantage"},{value:"mapd",label:"MA + Drug Plan"},{value:"pdp",label:"Part D Drug Plans"},{value:"snp",label:"Special Needs Plans"},{value:"medigap",label:"Medigap / Supplement"},{value:"dental",label:"Dental / Vision / Hearing"},{value:"hospital",label:"Hospital Indemnity"},{value:"msp",label:"Medicare Savings"}]} /></F><R><I label="Agent Name" value={d.soaAgentName} onChange={e=>set("soaAgentName",e.target.value)} /><I label="Agent Phone" value={d.soaAgentPhone} onChange={e=>set("soaAgentPhone",e.target.value)} /></R><label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",fontSize:13,lineHeight:1.5,marginTop:10}}><input type="checkbox" checked={d.soaConsent} onChange={e=>set("soaConsent",e.target.checked)} style={{width:18,height:18,marginTop:2,accentColor:T.pri,flexShrink:0}} />I agree the agent may discuss selected products. Not an enrollment form.</label><Nav onBack={back} onNext={next} disabled={!d.soaConsent} /></>);

      // ACA SEP
      case "aca_income": {
        // Auto-calculate from Medicaid income data
        const calcIncome = () => {
          let monthly = 0;
          // Wages — strip $ and commas
          if (d.wages) {
            const w = parseFloat(String(d.wages).replace(/[$,]/g, "")) || 0;
            const hrs = parseFloat(d.hoursPerWeek) || 40;
            if (d.wageFrequency === "Hourly") monthly = w * hrs * 4.33;
            else if (d.wageFrequency === "Weekly") monthly = w * 4.33;
            else if (d.wageFrequency === "Every 2 weeks") monthly = w * 2.17;
            else if (d.wageFrequency === "Twice a month") monthly = w * 2;
            else if (d.wageFrequency === "Monthly") monthly = w;
            else if (d.wageFrequency === "Yearly") monthly = w / 12;
          }
          // Self-employment
          if (d.selfEmploymentIncome) monthly += parseFloat(String(d.selfEmploymentIncome).replace(/[$,]/g, "")) || 0;
          // Other income amounts
          if (d.otherIncomeAmounts && typeof d.otherIncomeAmounts === "object") {
            Object.values(d.otherIncomeAmounts).forEach(v => {
              monthly += parseFloat(String(v).replace(/[$,]/g, "")) || 0;
            });
          }
          // Yearly income override if provided
          if (d.yearlyIncome) {
            const y = parseFloat(String(d.yearlyIncome).replace(/[$,]/g, "")) || 0;
            if (y > 0) return y;
          }
          return Math.round(monthly * 12);
        };
        const estimated = calcIncome();
        // Auto-fill if empty
        if (!d.annualHouseholdIncome && estimated > 0) {
          setTimeout(() => set("annualHouseholdIncome", String(estimated)), 0);
        }
        return (<>
          <div style={{background:T.priF,border:`1px solid ${T.priL}33`,borderRadius:T.radS,padding:"12px 16px",marginBottom:20,fontSize:13,color:T.pri,lineHeight:1.5}}><strong>Bridge Coverage:</strong> Your Medicaid loss qualifies you for a Special Enrollment Period. We'll get you a $0 or low-cost Marketplace plan while MO HealthNet processes.</div>
          <Hdr t="ACA Income Verification" />
          <I label="Estimated Annual Household Income" req value={d.annualHouseholdIncome} onChange={e=>set("annualHouseholdIncome",e.target.value)} placeholder="$" hint={estimated > 0 ? `Auto-calculated from your earlier answers (~$${estimated.toLocaleString()}/yr). Adjust if needed.` : "All sources, everyone in household"} />
          <I label="Household Size" value={String(d.householdMembers.length+1)} disabled style={{opacity:.7}} />
          <YN label="Use tobacco?" value={d.tobaccoUse} onChange={v=>set("tobaccoUse",v)} />
          <Nav onBack={back} onNext={next} />
        </>);
      }

      case "aca_prefs": return (<><Hdr t="Plan Preferences" /><Tx label="Preferred Doctors" value={d.preferredDoctors} onChange={e=>set("preferredDoctors",e.target.value)} placeholder="Dr. Smith — Primary Care..." /><I label="Preferred Hospital" value={d.preferredHospital} onChange={e=>set("preferredHospital",e.target.value)} /><I label="Monthly Budget" value={d.acaBudget} onChange={e=>set("acaBudget",e.target.value)} placeholder="$0 — most qualify for free" hint="Most people losing Medicaid qualify for $0 premium plans" /><Nav onBack={back} onNext={next} /></>);

      case "aca_employer": return (<><Hdr t="Employer Coverage Details" /><I label="Employer" value={d.empEmployerName} onChange={e=>set("empEmployerName",e.target.value)} /><YN label="Plan meets minimum value?" value={d.empMeetsMinValue} onChange={v=>set("empMeetsMinValue",v)} /><R><I label="Employee Premium" value={d.empPremium} onChange={e=>set("empPremium",e.target.value)} placeholder="$" /><S label="Frequency" value={d.empFrequency} onChange={e=>set("empFrequency",e.target.value)} options={FREQ} placeholder="Select..." /></R><Nav onBack={back} onNext={next} /></>);

      case "aca_attest": {
        const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
        const hhSize = d.householdMembers.length + 1;
        const estIncome = d.annualHouseholdIncome || d.yearlyIncome || "Not provided";

        const startDraw = (e) => {
          const canvas = sigCanvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          const rect = canvas.getBoundingClientRect();
          const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
          const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
          ctx.beginPath();
          ctx.moveTo(x, y);
          setIsDrawing(true);
        };
        const draw = (e) => {
          if (!isDrawing) return;
          const canvas = sigCanvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          const rect = canvas.getBoundingClientRect();
          const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
          const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.strokeStyle = T.pri;
          ctx.lineTo(x, y);
          ctx.stroke();
          setHasSigned(true);
        };
        const endDraw = () => setIsDrawing(false);
        const clearSig = () => {
          const canvas = sigCanvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setHasSigned(false);
        };

        const sectionStyle = { marginBottom: 16 };
        const sectionHead = { fontSize: 13, fontWeight: 700, color: T.pri, marginBottom: 6 };
        const bodyText = { fontSize: 12.5, color: T.txt, lineHeight: 1.6, marginBottom: 4 };
        const fieldRow = { fontSize: 12.5, color: T.txt, lineHeight: 1.8 };
        const fieldLabel = { fontWeight: 600, color: T.mut, marginRight: 6 };
        const bullet = { fontSize: 12.5, color: T.txt, lineHeight: 1.7, paddingLeft: 14 };

        return (<>
          <Hdr t="ACA Consumer Authorization & Attestation" d="2026 Affordable Care Act — Please review and sign below." />
          <div style={{ background: T.bg, border: `1px solid ${T.bdr}`, borderRadius: T.radS, padding: "20px 18px", fontSize: 13, lineHeight: 1.6, maxHeight: 420, overflowY: "auto", marginBottom: 20 }}>

            <div style={sectionStyle}>
              <div style={sectionHead}>Agency & Agent Information</div>
              <div style={fieldRow}><span style={fieldLabel}>Agency:</span> Muehl Group LLC &nbsp;&nbsp;|&nbsp;&nbsp; <span style={fieldLabel}>NPN:</span> 20605819</div>
              <div style={fieldRow}><span style={fieldLabel}>Writing Agent:</span> Jason Muehlheausler &nbsp;&nbsp;|&nbsp;&nbsp; <span style={fieldLabel}>Agent NPN:</span> 19779611</div>
            </div>

            <div style={{ height: 1, background: T.bdr, margin: "12px 0" }} />

            <div style={sectionStyle}>
              <div style={sectionHead}>Consumer Information</div>
              <div style={fieldRow}><span style={fieldLabel}>Name:</span> {d.firstName} {d.middleName} {d.lastName}</div>
              <div style={fieldRow}><span style={fieldLabel}>DOB:</span> {d.dob} &nbsp;&nbsp;|&nbsp;&nbsp; <span style={fieldLabel}>Phone:</span> {d.phone}</div>
              <div style={fieldRow}><span style={fieldLabel}>Address:</span> {d.homeAddress}, {d.city}, {d.state} {d.zip}</div>
              <div style={fieldRow}><span style={fieldLabel}>Email:</span> {d.email || "Not provided"}</div>
            </div>

            <div style={{ height: 1, background: T.bdr, margin: "12px 0" }} />

            <div style={sectionStyle}>
              <div style={sectionHead}>Authorization to Assist</div>
              <div style={bodyText}>By signing below, I authorize Muehl Group LLC and its licensed agents to:</div>
              <div style={bullet}>• Access and update my Health Insurance Marketplace account</div>
              <div style={bullet}>• Complete and submit my ACA application</div>
              <div style={bullet}>• Review eligibility for Advance Premium Tax Credits (APTC), Medicaid, or other programs</div>
              <div style={bullet}>• Communicate with the Marketplace on my behalf</div>
              <div style={bullet}>• Assist with plan selection and enrollment</div>
              <div style={{ ...bodyText, marginTop: 6 }}>This authorization applies to the current plan year and future coverage updates unless revoked.</div>
            </div>

            <div style={{ height: 1, background: T.bdr, margin: "12px 0" }} />

            <div style={sectionStyle}>
              <div style={sectionHead}>Income & Household Attestation</div>
              <div style={bodyText}>I understand that my eligibility for financial assistance is based on my estimated annual household income and household size.</div>
              <div style={{ ...fieldRow, fontWeight: 600 }}><span style={fieldLabel}>Estimated Annual Income:</span> ${estIncome}</div>
              <div style={{ ...fieldRow, fontWeight: 600 }}><span style={fieldLabel}>Household Size:</span> {hhSize}</div>
              <div style={{ ...bodyText, marginTop: 8 }}>I attest that this information is true and accurate to the best of my knowledge. I understand:</div>
              <div style={bullet}>• Underreporting income may result in repayment of tax credits</div>
              <div style={bullet}>• Overreporting income may reduce available assistance</div>
            </div>

            <div style={{ height: 1, background: T.bdr, margin: "12px 0" }} />

            <div style={sectionStyle}>
              <div style={sectionHead}>Data Accuracy Acknowledgment</div>
              <div style={bodyText}>I confirm that all information provided in my application is complete and accurate. I understand that providing false or incomplete information may result in:</div>
              <div style={bullet}>• Loss of coverage</div>
              <div style={bullet}>• Repayment obligations</div>
              <div style={bullet}>• Potential penalties</div>
            </div>

            <div style={{ height: 1, background: T.bdr, margin: "12px 0" }} />

            <div style={sectionStyle}>
              <div style={sectionHead}>Agent Disclosure</div>
              <div style={bodyText}>I understand that:</div>
              <div style={bullet}>• The agent listed above is a licensed health insurance professional</div>
              <div style={bullet}>• The agent may receive compensation from insurance carriers</div>
              <div style={bullet}>• There is no additional cost to me for using their services</div>
              <div style={bullet}>• The agent may present multiple plan options from different carriers</div>
            </div>

            <div style={{ height: 1, background: T.bdr, margin: "12px 0" }} />

            <div style={sectionStyle}>
              <div style={sectionHead}>Communication Consent (TCPA Compliance)</div>
              <div style={bodyText}>By providing my contact information, I consent to receive calls, text messages, and emails from Muehl Group LLC and its representatives regarding my health insurance options, application status, and coverage.</div>
              <div style={{ ...bodyText, fontStyle: "italic" }}>Message and data rates may apply. Consent is not a condition of enrollment.</div>
            </div>

            <div style={{ height: 1, background: T.bdr, margin: "12px 0" }} />

            <div style={sectionStyle}>
              <div style={sectionHead}>Special Enrollment Period</div>
              <div style={bodyText}>I am applying during a Special Enrollment Period due to loss of Medicaid/MO HealthNet coverage{d.medicaidLossDate ? ` on ${d.medicaidLossDate}` : ""} (qualifying life event).</div>
            </div>
          </div>

          {/* Consent checkbox */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
            <input type="checkbox" checked={d.acaAttestConsent} onChange={e => set("acaAttestConsent", e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: T.pri, flexShrink: 0 }} />
            I have read and agree to all sections of this authorization and attestation form.
          </label>

          {/* Signature pad */}
          <F label="Consumer Signature" req>
            <div style={{ border: `2px solid ${hasSigned ? T.pri : T.bdr}`, borderRadius: T.radS, overflow: "hidden", background: "#fff", position: "relative", touchAction: "none" }}>
              <canvas
                ref={sigCanvasRef}
                width={580} height={120}
                style={{ width: "100%", height: 120, cursor: "crosshair", display: "block" }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
              />
              {!hasSigned && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: T.mut, fontSize: 13, pointerEvents: "none" }}>Sign here</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
              <button type="button" onClick={clearSig} style={{ background: "none", border: "none", color: T.err, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.sans }}>Clear Signature</button>
              <span style={{ fontSize: 12, color: T.mut }}>Date: {today}</span>
            </div>
          </F>

          <R>
            <I label="Printed Name" value={`${d.firstName} ${d.lastName}`} disabled style={{ opacity: .8 }} />
            <I label="Date" value={today} disabled style={{ opacity: .8 }} />
          </R>

          <Nav onBack={back} onNext={next} disabled={!d.acaAttestConsent || !hasSigned} />
        </>);
      }

      // PLAN SELECTION
      case "aca_plan": {
        const todayPlan = new Date().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
        const startDrawP = (e) => { const c = sigCanvasRef.current; if (!c) return; const ctx = c.getContext("2d"); const r = c.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top; ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true); };
        const drawP = (e) => { if (!isDrawing) return; const c = sigCanvasRef.current; if (!c) return; const ctx = c.getContext("2d"); const r = c.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = T.pri; ctx.lineTo(x, y); ctx.stroke(); set("planSelectionSigned", true); };
        const endDrawP = () => setIsDrawing(false);
        const clearSigP = () => { const c = sigCanvasRef.current; if (!c) return; c.getContext("2d").clearRect(0, 0, c.width, c.height); set("planSelectionSigned", false); };

        const sh = { fontSize: 13, fontWeight: 700, color: T.pri, marginBottom: 6 };
        const bt = { fontSize: 12.5, color: T.txt, lineHeight: 1.6, marginBottom: 4 };
        const fl = { fontSize: 12.5, color: T.txt, lineHeight: 1.8 };
        const fll = { fontWeight: 600, color: T.mut, marginRight: 6 };
        const bl = { fontSize: 12.5, color: T.txt, lineHeight: 1.7, paddingLeft: 14 };
        const sep = { height: 1, background: T.bdr, margin: "12px 0" };

        return (<>
          <Hdr t="ACA Plan Selection & Coverage Acknowledgment" d="2026 — Review your selected plan and confirm." />
          <div style={{ background: T.bg, border: `1px solid ${T.bdr}`, borderRadius: T.radS, padding: "20px 18px", fontSize: 13, lineHeight: 1.6, maxHeight: 480, overflowY: "auto", marginBottom: 20 }}>

            <div style={{ marginBottom: 16 }}>
              <div style={sh}>Selected Plan Overview</div>
              <div style={fl}><span style={fll}>Insurance Carrier:</span> {d.planCarrier}</div>
              <div style={fl}><span style={fll}>Plan Name:</span> {d.planName}</div>
              <div style={fl}><span style={fll}>Plan Type:</span> {d.planType} (Exclusive Provider Organization)</div>
            </div>

            <div style={sep} />

            <div style={{ marginBottom: 16 }}>
              <div style={sh}>Key Plan Details</div>
              <div style={fl}><span style={fll}>Monthly Premium:</span> <strong>{d.planPremium}</strong> (after subsidy)</div>
              <div style={fl}><span style={fll}>Medical Deductible:</span> {d.planMedDeductible}</div>
              <div style={fl}><span style={fll}>Rx Drug Deductible:</span> {d.planRxDeductible}</div>
              <div style={fl}><span style={fll}>Out-of-Pocket Max:</span> {d.planOOPMax} (individual)</div>
              <div style={fl}><span style={fll}>Primary Care Visit:</span> {d.planPCP}</div>
              <div style={fl}><span style={fll}>Specialist Visit:</span> {d.planSpecialist}</div>
              <div style={fl}><span style={fll}>Generic Drugs:</span> {d.planGenericDrugs}</div>
            </div>

            <div style={sep} />

            <div style={{ marginBottom: 16 }}>
              <div style={sh}>Plan Summary (SBC) Reference</div>
              <div style={bt}>This plan selection is based on the official Summary of Benefits and Coverage (SBC) document provided and reviewed at the time of enrollment.</div>
            </div>

            <div style={sep} />

            <div style={{ marginBottom: 16 }}>
              <div style={sh}>Plan Selection Screenshot</div>
              <img src="data:image/jpeg;base64,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DnsVJZfex1uRsz27qeXTNkMLmc3FpcBvRPoQrAowxxwwshiYGRsaGsaBoADsAFJd6YmIiJfNxq6a65qpi0Ty1YREVcxERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERBCw0ugka0bJaQP+FTq1TNWujqvTEmFsVHGqytYtTzQmNjQ0Bzmhj3Oce3YED6kK6IrE2SYuouSwN+WxdY3EeNkJbglqZjxWD2ePY0Nk+IOIBHFoIP8AuVtw4RjsvZGV6cGRkmtyPbkS6JzWwuB4sPJwfoDylgaW+/vtW9Fd7K2uX4TdUHH4CatjsRFY6WbZq1YnRWqI8DUk/FgFgNLuD/4ubtxDhy3pb2I6cndPiDlaUclerHac2GSQStrc5I3RR9/5cWgjfcAt7egKuCJvze6bkK/1dSyjnVslg4myX4Q+Atc4NDo5Bokk/K4Mfr38SPeuPd6ZkhqXKMdC3ZqEVGRCB8PJ/hh3IubKeLhvWw713/urwikTaLNWzuoY6cyNvEWq9zFVIzJiZIIYRx4Mk8R7owAXO4kAtPYkNPYHQC+vws/7vSt4/piSqY/BaGz+zeDA1ryXlvhv5xu7k+Qua7enNO+17Ra35uzNETru/AiIsNiIiAiIgIiICIiAiIgIiICIiAiIgIiIC8ppYnqFn6myXsJ01kcBE+Vj70sl2N1CzEHTl/GNr3f1JCYnbDGua4vJPmPierIkZTcnOJh5PN0VazL7teh0fW6L9pxdynkJYnwOjuyStDWFvgnlI1rgXc5Wsd30B5nasWJq57NdS0srlcJPgv23GTVW+JZilM00xj5OZ4bnf02+ENF3Fx5fxGldkViq1uz3/KTF9d34ecNiw1rpLG9PZaWrj8hj42VrEViUROawabJJHy7HkASHjuN+oO1YMJLFlOrpsvj9vx0NAVBYH8bD+fLyn/U1oB83pt50rFYrVrGhYrxTcTsc2B2v+VlAAGgAAPcF6a9oiqJtHG/nxeWjZppqiZnhblnlwERF5XrEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQFp08ri7tqSrTyVOzYi34kUU7X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" alt="Plan selection screenshot" style={{ width: '100%', borderRadius: T.radS, border: '1px solid ' + T.bdr, marginBottom: 8 }} />
              <div style={{ fontSize: 11, color: T.mut, fontStyle: "italic" }}>This image reflects the plan options and pricing presented at the time of selection.</div>
            </div>

            <div style={sep} />

            <div style={{ marginBottom: 16 }}>
              <div style={sh}>Plan Understanding Acknowledgment</div>
              <div style={bt}>By signing below, I confirm that:</div>
              <div style={bl}>• I have reviewed and selected the plan shown above</div>
              <div style={bl}>• I understand the cost-sharing structure, including deductibles, copays, and coinsurance</div>
              <div style={bl}>• I understand that this plan has a $0 medical deductible but includes a separate prescription drug deductible</div>
              <div style={bl}>• I understand that this plan has a high out-of-pocket maximum, and I may be responsible for significant costs before reaching that limit</div>
            </div>

            <div style={sep} />

            <div style={{ marginBottom: 16 }}>
              <div style={sh}>Network & Coverage Limitations</div>
              <div style={bt}>I understand that:</div>
              <div style={bl}>• This plan is an EPO network plan</div>
              <div style={bl}>• Services received outside of the network are generally NOT covered</div>
              <div style={bl}>• It is my responsibility to verify that my doctors are in-network and my medications are covered</div>
            </div>

            <div style={sep} />

            <div style={{ marginBottom: 16 }}>
              <div style={sh}>Temporary Coverage & Enrollment Status</div>
              <div style={bt}>I understand that:</div>
              <div style={bl}>• This document reflects plan selection only, not active coverage</div>
              <div style={bl}>• Coverage is not guaranteed until my application is approved by the Marketplace and/or carrier and any required payments are completed</div>
              <div style={bl}>• My coverage will begin on the official effective date assigned after enrollment approval</div>
            </div>

            <div style={sep} />

            <div style={{ marginBottom: 16 }}>
              <div style={sh}>Effective Date (Estimated)</div>
              <div style={{ ...fl, fontWeight: 600 }}><span style={fll}>Estimated Start Date:</span> {d.planEffectiveDate ? new Date(d.planEffectiveDate + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "To be determined"}</div>
              <div style={{ fontSize: 11, color: T.mut, fontStyle: "italic" }}>Subject to Marketplace approval and enrollment completion.</div>
            </div>

            <div style={sep} />

            <div style={{ marginBottom: 16 }}>
              <div style={sh}>Plan Selection Confirmation</div>
              <div style={bt}>I confirm that:</div>
              <div style={bl}>• I am voluntarily selecting this plan</div>
              <div style={bl}>• I understand that other plan options may have been available</div>
              <div style={bl}>• I have had the opportunity to ask questions before making my selection</div>
            </div>

            <div style={sep} />

            <div style={{ marginBottom: 8 }}>
              <div style={sh}>Agent Certification</div>
              <div style={bt}>I certify that:</div>
              <div style={bl}>• I reviewed plan options with the consumer</div>
              <div style={bl}>• I answered all questions to the best of my ability</div>
              <div style={bl}>• The final plan selection was made by the consumer</div>
              <div style={{ ...fl, marginTop: 8 }}><span style={fll}>Agent:</span> Jason Muehlheausler &nbsp;|&nbsp; <span style={fll}>NPN:</span> 19779611</div>
              <div style={{ ...fl }}><span style={fll}>Agency:</span> Muehl Group LLC &nbsp;|&nbsp; <span style={fll}>Agency NPN:</span> 20605819</div>
            </div>
          </div>

          {/* Editable plan fields for agent */}
          <Dv label="Plan Details (Agent Editable)" />
          <R cols={2}>
            <I label="Insurance Carrier" value={d.planCarrier} onChange={e => set("planCarrier", e.target.value)} />
            <I label="Plan Name" value={d.planName} onChange={e => set("planName", e.target.value)} />
          </R>
          <R cols={3}>
            <I label="Monthly Premium" value={d.planPremium} onChange={e => set("planPremium", e.target.value)} />
            <I label="Medical Deductible" value={d.planMedDeductible} onChange={e => set("planMedDeductible", e.target.value)} />
            <I label="Rx Deductible" value={d.planRxDeductible} onChange={e => set("planRxDeductible", e.target.value)} />
          </R>
          <R cols={3}>
            <I label="OOP Max" value={d.planOOPMax} onChange={e => set("planOOPMax", e.target.value)} />
            <I label="PCP Copay" value={d.planPCP} onChange={e => set("planPCP", e.target.value)} />
            <I label="Specialist Copay" value={d.planSpecialist} onChange={e => set("planSpecialist", e.target.value)} />
          </R>
          <I label="Estimated Effective Date" type="date" value={d.planEffectiveDate} onChange={e => set("planEffectiveDate", e.target.value)} />

          <Dv label="Consumer Signature" />

          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
            <input type="checkbox" checked={d.planSelectionConsent} onChange={e => set("planSelectionConsent", e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: T.pri, flexShrink: 0 }} />
            I have reviewed and agree to all sections of this Plan Selection & Coverage Acknowledgment.
          </label>

          <F label="Consumer Signature" req>
            <div style={{ border: `2px solid ${d.planSelectionSigned ? T.pri : T.bdr}`, borderRadius: T.radS, overflow: "hidden", background: "#fff", position: "relative", touchAction: "none" }}>
              <canvas ref={sigCanvasRef} width={580} height={120} style={{ width: "100%", height: 120, cursor: "crosshair", display: "block" }}
                onMouseDown={startDrawP} onMouseMove={drawP} onMouseUp={endDrawP} onMouseLeave={endDrawP}
                onTouchStart={startDrawP} onTouchMove={drawP} onTouchEnd={endDrawP} />
              {!d.planSelectionSigned && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: T.mut, fontSize: 13, pointerEvents: "none" }}>Sign here</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
              <button type="button" onClick={clearSigP} style={{ background: "none", border: "none", color: T.err, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.sans }}>Clear Signature</button>
              <span style={{ fontSize: 12, color: T.mut }}>Date: {todayPlan}</span>
            </div>
          </F>

          <R>
            <I label="Printed Name" value={`${d.firstName} ${d.lastName}`} disabled style={{ opacity: .8 }} />
            <I label="Date" value={todayPlan} disabled style={{ opacity: .8 }} />
          </R>

          <Nav onBack={back} onNext={next} disabled={!d.planSelectionConsent || !d.planSelectionSigned} />
        </>);
      }

      // REVIEW
      case "review": {
        const bridge = isMedicare(d) ? "Medicare Review" : "ACA Marketplace (SEP)";
        return (<><Hdr t="Review" d="Verify your info, then submit." /><div style={{background:T.priF,borderRadius:T.radS,padding:"10px 14px",marginBottom:20,fontSize:13,color:T.pri}}><strong>Filing:</strong> MO HealthNet Resubmission{isABD(d)?" + ABD Supplement":""}{isMSP(d)?" + Medicare Savings":""} + {bridge}</div>
          <RvB title="Personal" items={[["Name",`${d.firstName} ${d.lastName}`],["DOB",d.dob],["SSN",d.ssn?"•••-••-"+d.ssn.slice(-4):""],["Address",`${d.homeAddress}, ${d.city}, ${d.state} ${d.zip}`],["Phone",d.phone],["Email",d.email]]} />
          <RvB title="Medicaid" items={[["Loss Date",d.medicaidLossDate],["DCN",d.previousDCN],["Reason",d.reasonForLoss]]} />
          <RvB title="Situation" items={[["Marital",d.maritalStatus],["Citizen",d.isCitizen],["Pregnant",d.isPregnant],["Medicare",d.hasMedicare],["SS Disability",d.receivesSSDisability],["Employment",d.employmentStatus]]} />
          {d.householdMembers.length>0&&<RvB title={`Household (${d.householdMembers.length})`} items={d.householdMembers.map(m=>[`${m.firstName} ${m.lastName}`,m.relationship])} />}
          {isMedicare(d)&&<RvB title="Medicare" items={[["MBI",d.medicareNumber],["Part A",d.partADate],["Part D",d.hasPartD],["Medigap",d.hasMedigap],["MA",d.hasMA]]} />}
          {isMedicare(d)&&<RvB title="Doctors" items={d.doctors.filter(x=>x.name).map(x=>[x.name,x.specialty])} />}
          {isMedicare(d)&&<RvB title="Rx" items={d.prescriptions.filter(x=>x.name).map(x=>[x.name,x.dosage])} />}
          {isACA(d)&&<RvB title="ACA Bridge" items={[["Income",d.annualHouseholdIncome],["Tobacco",d.tobaccoUse],["Budget",d.acaBudget]]} />}
          <Tx label="Final Notes" value={d.notes} onChange={e=>set("notes",e.target.value)} />
          <Nav onBack={back} onNext={next} nextLabel={submitting ? "Submitting..." : "Submit Application"} disabled={submitting} />
        </>);
      }

      // COMPLETE
      case "complete": return (
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:T.okBg,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:18}}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.ok} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <h2 style={{fontFamily:T.serif,fontSize:22,fontWeight:700,color:T.pri,margin:"0 0 8px"}}>You're All Set, {d.firstName}!</h2>
          <p style={{fontSize:14,color:T.mut,maxWidth:420,margin:"0 auto 12px",lineHeight:1.6}}>We have everything to <strong>resubmit your MO HealthNet application</strong> and get you {isMedicare(d)?"improved Medicare benefits":"free Marketplace coverage"} in the meantime.</p>
          <p style={{fontSize:13,color:T.mut,maxWidth:400,margin:"0 auto",lineHeight:1.5}}>We'll contact you via <strong>{d.preferredContact}</strong> within 1 business day.</p>
        </div>
      );

      default: return <p>Unknown</p>;
    }
  };

  return <>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Source+Serif+4:opsz,wght@8..60,300;8..60,400;8..60,600;8..60,700&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:T.sans,color:T.txt,display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 14px 60px"}}>
      <div style={{textAlign:"center",marginBottom:6,animation:"fadeIn .4s"}}>
        <div style={{fontSize:10,fontWeight:700,color:T.acc,textTransform:"uppercase",letterSpacing:".14em",marginBottom:2}}>[ Your Brokerage ]</div>
        <h1 style={{fontFamily:T.serif,fontSize:22,fontWeight:700,color:T.pri}}>Coverage Recovery Intake</h1>
      </div>
      {cur.id!=="welcome"&&cur.id!=="complete"&&<div style={{width:"100%",maxWidth:640,margin:"12px 0 18px",animation:"fadeIn .5s"}}>
        <div style={{height:5,background:T.bdr,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:`linear-gradient(90deg,${T.pri},${T.acc})`,borderRadius:3,transition:"width .5s cubic-bezier(.4,0,.2,1)"}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.mut,marginTop:5,fontWeight:500}}><span>{cur.label}</span><span>{Math.round(pct)}%</span></div>
      </div>}
      <div ref={ref} key={cur.id} style={{width:"100%",maxWidth:640,background:T.card,borderRadius:T.rad,boxShadow:T.sh,padding:cur.id==="welcome"||cur.id==="complete"?"0":"28px 26px",animation:"fadeUp .35s",border:`1px solid ${T.bdr}`}}>
        {renderSection()}
      </div>
      <p style={{fontSize:11,color:T.mut,marginTop:22,textAlign:"center",opacity:.6}}>Your data is encrypted. We never share or sell your information.</p>
    </div>
  </>;
}

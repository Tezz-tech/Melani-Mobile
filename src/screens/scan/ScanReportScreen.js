// src/screens/scan/ScanReportScreen.js
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, ScrollView, Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg:          '#0F0500',
  bgCard:      '#1A0A02',
  bgCard2:     '#200E03',
  bgCardDeep:  '#120701',
  border:      'rgba(200,134,10,0.22)',
  borderBright:'rgba(200,134,10,0.50)',
  gold:        '#C8860A',
  goldLight:   '#E8A020',
  goldPale:    'rgba(200,134,10,0.13)',
  goldStrong:  'rgba(200,134,10,0.28)',
  cream:       '#F5DEB3',
  creamDim:    'rgba(245,222,179,0.55)',
  creamFaint:  'rgba(245,222,179,0.20)',
  success:     '#5DBE8A',
  successPale: 'rgba(93,190,138,0.12)',
  warn:        '#E8A020',
  warnPale:    'rgba(232,160,32,0.12)',
  error:       '#E05C3A',
  errorPale:   'rgba(224,92,58,0.10)',
};

// ── Default result (fallback) ─────────────────────────────────
const DEFAULT_RESULT = {
  skinType:    'Oily',
  confidence:  'High',
  score:        74,
  date:        new Date().toISOString(),
  scanId:      'MS-20260228-001',
  conditions: [
    { name:'Post-Inflammatory Hyperpigmentation', severity:'Moderate', icon:'◑', melaninNote:'Very common after acne on melanin skin. Targeted ingredients like alpha arbutin help fade over 8–12 weeks.' },
    { name:'Active Acne',                         severity:'Mild',     icon:'●', melaninNote:'Each breakout risks leaving a PIH mark. Treat gently — benzoyl peroxide sparingly, avoid picking.' },
    { name:'Uneven Skin Tone',                    severity:'Mild',     icon:'◒', melaninNote:'Natural variation across zones. Niacinamide daily and consistent SPF are the two most effective interventions.' },
    { name:'Surface Texture',                     severity:'Mild',     icon:'◈', melaninNote:'Gentle chemical exfoliation 2x weekly with AHA will smooth texture without causing inflammation.' },
  ],
  melaninInsights: {
    pihRisk:       'Moderate',
    fitzpatrickEst:'IV–V',
    spfNote:       'Essential daily. UV rays worsen hyperpigmentation even through clouds. Use SPF 50+ with no white cast.',
    sensitivity:   'Avoid fragrance, high-% retinoids without gradual introduction, and alcohol denat.',
    goodIngredients:['Niacinamide 5–10%', 'Alpha Arbutin 2%', 'Hyaluronic Acid', 'Ceramides', 'Azelaic Acid', 'Glycolic Acid (low %)'],
    avoidIngredients:['Fragrance/Parfum', 'Alcohol Denat.', 'High-% Retinol (>0.5%)', 'Sodium Lauryl Sulfate'],
  },
  routinePlan: {
    morning: [
      { step:1, action:'Cleanse',    product:'Gentle Foaming Cleanser',       note:'Removes overnight sebum without stripping' },
      { step:2, action:'Tone',       product:'Niacinamide + Zinc Toner',      note:'Controls oil, starts brightening' },
      { step:3, action:'Serum',      product:'Alpha Arbutin 2% Serum',        note:'Targets dark spots and PIH directly' },
      { step:4, action:'Moisturise', product:'Oil-Free Gel Moisturiser',      note:'Lightweight hydration without clogging pores' },
      { step:5, action:'SPF',        product:'Tinted Mineral SPF 50',         note:'Non-negotiable — no white cast formula' },
    ],
    night: [
      { step:1, action:'Oil Cleanse', product:'Cleansing Oil or Micellar Water',  note:'Breaks down SPF and pollution' },
      { step:2, action:'Cleanse',     product:'Gentle Foaming Cleanser',          note:'Second cleanse for clean skin' },
      { step:3, action:'Exfoliate',   product:'5% Glycolic Acid Toner (2x/week)', note:'Smooths texture, fades spots gradually' },
      { step:4, action:'Serum',       product:'Niacinamide 10% Night Serum',      note:'High-dose for overnight brightening' },
      { step:5, action:'Moisturise',  product:'Shea Butter Night Cream',          note:'Barrier repair and deep hydration overnight' },
    ],
  },
  productRecs: [
    { name:'Naturale SPF 50 Sunscreen', brand:'SunSafe NG',    why:'No white cast, affordable, widely available in Lagos & Abuja', price:'₦3,500' },
    { name:'10% Niacinamide Serum',     brand:'Hydrelle',      why:'Nigerian brand formulated for oily + acne-prone melanin skin',  price:'₦4,200' },
    { name:'Gentle Foam Cleanser',      brand:'CeraVe',        why:'Widely available in Nigerian pharmacies. Ceramide-rich formula',price:'₦6,800' },
    { name:'Alpha Arbutin 2% + HA',     brand:'The Ordinary',  why:'Fragrance-free, targets PIH effectively, accessible online',    price:'₦5,100' },
  ],
  weeklyPlan: [
    { day:'Mon',  tasks:['AM Routine', 'PM Routine'] },
    { day:'Tue',  tasks:['AM Routine', 'PM Routine + AHA Exfoliate'] },
    { day:'Wed',  tasks:['AM Routine', 'PM Routine'] },
    { day:'Thu',  tasks:['AM Routine', 'PM Routine + AHA Exfoliate'] },
    { day:'Fri',  tasks:['AM Routine', 'PM Routine'] },
    { day:'Sat',  tasks:['AM Routine', 'PM Routine — rest night'] },
    { day:'Sun',  tasks:['AM Routine', 'PM Routine — hydration mask'] },
  ],
  progressMilestones: [
    { week:2,  title:'First signs',         desc:'Skin feels more balanced. Oil control improving. PIH may look slightly darker before fading — this is normal.' },
    { week:6,  title:'Visible fading',      desc:'Dark spots begin to lighten noticeably. Texture smoother with consistent exfoliation.' },
    { week:12, title:'Significant change',  desc:'PIH significantly reduced. Skin tone more even. Acne frequency decreasing with consistent routine.' },
    { week:24, title:'Transformation',      desc:'Most PIH resolved. Clear baseline established. Ready to introduce more targeted treatments if needed.' },
  ],
  disclaimer: 'This report is a cosmetic, observational skin analysis. It is not a medical diagnosis and does not replace professional dermatological advice. Results are based on image analysis and may not capture all conditions.',
};

// ── Extract all unique products from routine step matchedProducts ──
function extractProductsFromRoutine(routine) {
  const seen = new Set();
  const out  = [];
  for (const step of (routine || [])) {
    for (const p of (step.matchedProducts || [])) {
      const key = (p.name || '').toLowerCase().trim();
      if (key && !seen.has(key)) { seen.add(key); out.push(p); }
    }
  }
  return out;
}

// ── Deep merge helper ─────────────────────────────────────────────
function mergeResultWithDefault(incoming) {
  if (!incoming) return DEFAULT_RESULT;

  // Build the best available product list:
  // 1. scan.products (AI-matched at scan time)  — most complete
  // 2. products embedded in routine matchedProducts  — guaranteed to match routine
  // 3. legacy productRecs  4. default placeholder
  const routineProducts = extractProductsFromRoutine(incoming.routine);
  const resolvedProductRecs =
    (incoming.products?.length        ? incoming.products        : null) ||
    (routineProducts.length           ? routineProducts          : null) ||
    incoming.productRecs              ||
    DEFAULT_RESULT.productRecs;

  return {
    ...DEFAULT_RESULT,
    ...incoming,
    // Normalise score field (backend sends overallScore)
    score: incoming.overallScore ?? incoming.score ?? DEFAULT_RESULT.score,
    // Ensure arrays exist
    conditions:          incoming.conditions          || DEFAULT_RESULT.conditions,
    // Products: scan products → routine matchedProducts → legacy → default
    productRecs:         resolvedProductRecs,
    weeklyPlan:          incoming.weeklyPlan          || DEFAULT_RESULT.weeklyPlan,
    progressMilestones:  incoming.progressMilestones  ||
                         incoming.progressMilestones  ||
                         DEFAULT_RESULT.progressMilestones,
    // Normalise scanId
    scanId: incoming.scanId || DEFAULT_RESULT.scanId,
    // date
    date: incoming.createdAt || incoming.date || DEFAULT_RESULT.date,
    // Deep merge melaninInsights
    melaninInsights: {
      ...DEFAULT_RESULT.melaninInsights,
      ...(incoming.melaninInsights || {}),
      // spfGuidance is the correct backend field name (spfNote is legacy)
      spfNote:         incoming.melaninInsights?.spfGuidance ||
                       incoming.melaninInsights?.spfNote     ||
                       DEFAULT_RESULT.melaninInsights.spfNote,
      fitzpatrickEst:  incoming.fitzpatrickEst || incoming.melaninInsights?.fitzpatrickEst || DEFAULT_RESULT.melaninInsights.fitzpatrickEst,
      goodIngredients: incoming.goodIngredients  || incoming.melaninInsights?.goodIngredients  || DEFAULT_RESULT.melaninInsights.goodIngredients,
      avoidIngredients:incoming.avoidIngredients || incoming.melaninInsights?.avoidIngredients || DEFAULT_RESULT.melaninInsights.avoidIngredients,
    },
    // Deep merge routinePlan — backend sends "routine" array, not routinePlan
    routinePlan: {
      ...DEFAULT_RESULT.routinePlan,
      morning: incoming.routinePlan?.morning ||
               (incoming.routine || []).filter(r => r.timeOfDay === 'morning' || r.timeOfDay === 'both') ||
               DEFAULT_RESULT.routinePlan.morning,
      night:   incoming.routinePlan?.night ||
               (incoming.routine || []).filter(r => r.timeOfDay === 'night' || r.timeOfDay === 'both') ||
               DEFAULT_RESULT.routinePlan.night,
    },
    // Pass through real scoreBreakdown for the score meter
    scoreBreakdown: incoming.scoreBreakdown || null,
  };
}

// ── African background ────────────────────────────────────────
function AfricanBG({ children }) {
  return (
    <View style={{ flex:1, backgroundColor:C.bg }}>
      <View style={[ab.b,{ width:500,height:500,borderRadius:250,backgroundColor:'#5A2800',opacity:0.10,top:-160,left:-130 }]} />
      <View style={[ab.b,{ width:340,height:340,borderRadius:170,backgroundColor:C.gold,  opacity:0.04,bottom:-90,right:-90 }]} />
      <View style={[ab.b,{ width:220,height:220,borderRadius:110,borderWidth:1,borderColor:'rgba(200,134,10,0.09)',top:-70,left:-70 }]} />
      <View style={[ab.stripe,{ top:H*0.07 }]} />
      {children}
    </View>
  );
}
const ab = StyleSheet.create({
  b:      { position:'absolute' },
  stripe: { position:'absolute',width:W,height:1,backgroundColor:'rgba(200,134,10,0.11)' },
});

// ── FadeSlide ─────────────────────────────────────────────────
function FadeSlide({ delay=0, from=16, children, style }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue:1,duration:500,delay,useNativeDriver:true }),
      Animated.spring(ty, { toValue:0,friction:8,tension:50,delay,useNativeDriver:true }),
    ]).start();
  }, []);
  return <Animated.View style={[{opacity:op,transform:[{translateY:ty}]},style]}>{children}</Animated.View>;
}

// ── Gold button ───────────────────────────────────────────────
function GoldButton({ label, onPress, icon, style, loading }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[{transform:[{scale}]},style]}>
      <TouchableOpacity
        style={[gbtn.root, loading && gbtn.rootLoading]} onPress={loading ? null : onPress} activeOpacity={1}
        onPressIn={()=>{ if(!loading) Animated.spring(scale,{toValue:0.96,useNativeDriver:true}).start(); }}
        onPressOut={()=>{ if(!loading) Animated.spring(scale,{toValue:1,  useNativeDriver:true}).start(); }}
      >
        <View style={gbtn.shimmer}/>
        {loading
          ? <ActivityIndicator size="small" color="#0F0500" style={{marginRight:6}}/>
          : icon && <Text style={gbtn.icon}>{icon}</Text>
        }
        <Text style={gbtn.label}>{loading ? 'Generating PDF…' : label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
const gbtn = StyleSheet.create({
  root:        { backgroundColor:C.gold,borderRadius:14,paddingVertical:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,overflow:'hidden',shadowColor:C.gold,shadowOffset:{width:0,height:6},shadowOpacity:0.45,shadowRadius:16,elevation:10 },
  rootLoading: { opacity:0.75 },
  shimmer:     { position:'absolute',top:0,left:0,right:0,height:'55%',backgroundColor:'rgba(255,255,255,0.10)',borderRadius:14 },
  icon:        { fontSize:16 },
  label:       { color:'#0F0500',fontSize:15,fontWeight:'800',letterSpacing:1.2,textTransform:'uppercase' },
});

// ── Section wrapper ───────────────────────────────────────────
function ReportSection({ title, icon, delay=0, children, style }) {
  return (
    <FadeSlide delay={delay} style={[rsc.wrap, style]}>
      <View style={rsc.header}>
        <View style={rsc.headerLeft}>
          <View style={rsc.accentBar}/>
          <Text style={rsc.title}>{title}</Text>
        </View>
        {icon && <Text style={rsc.icon}>{icon}</Text>}
      </View>
      {children}
    </FadeSlide>
  );
}
const rsc = StyleSheet.create({
  wrap:       { marginBottom:28 },
  header:     { flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14 },
  headerLeft: { flexDirection:'row',alignItems:'center',gap:8 },
  accentBar:  { width:4,height:18,borderRadius:2,backgroundColor:C.gold },
  title:      { color:C.cream,fontSize:17,fontWeight:'800',letterSpacing:0.2 },
  icon:       { fontSize:18 },
});

// ── Report cover card ─────────────────────────────────────────
function ReportCoverCard({ result }) {
  const shimmer = useRef(new Animated.Value(-W)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer,{toValue:W*1.5,duration:3000,delay:800,useNativeDriver:true}),
      Animated.timing(shimmer,{toValue:-W,   duration:0,           useNativeDriver:true}),
    ])).start();
  },[]);

  const scorePct = result.score / 100;
  const scoreColor = scorePct >= 0.75 ? C.success : scorePct >= 0.55 ? C.warn : C.error;
  const formattedDate = new Date(result.date).toLocaleDateString('en-NG',{
    weekday:'long', day:'numeric', month:'long', year:'numeric',
  });

  return (
    <FadeSlide delay={0} style={cv.wrap}>
      <View style={cv.card}>
        <Animated.View style={[cv.shimmer,{transform:[{translateX:shimmer}]}]} />
        <View style={cv.topRow}>
          <View style={cv.logoMark}>
            <Text style={cv.logoLetter}>M</Text>
          </View>
          <View style={cv.topRight}>
            <Text style={cv.brandName}>MELANIN SCAN</Text>
            <Text style={cv.reportLabel}>Skin Analysis Report</Text>
          </View>
        </View>
        <View style={cv.divider}/>
        <View style={cv.infoRow}>
          <View style={cv.infoBlock}>
            <Text style={cv.infoLabel}>Skin Score</Text>
            <Text style={[cv.infoValue,{color:scoreColor}]}>{result.score}<Text style={{fontSize:14}}>/100</Text></Text>
          </View>
          <View style={cv.infoSep}/>
          <View style={cv.infoBlock}>
            <Text style={cv.infoLabel}>Skin Type</Text>
            <Text style={cv.infoValue}>{result.skinType}</Text>
          </View>
          <View style={cv.infoSep}/>
          <View style={cv.infoBlock}>
            <Text style={cv.infoLabel}>Fitzpatrick</Text>
            <Text style={cv.infoValue}>{result.melaninInsights.fitzpatrickEst}</Text>
          </View>
        </View>
        <View style={cv.metaRow}>
          <Text style={cv.metaDate}>{formattedDate}</Text>
          <Text style={cv.metaId}>ID: {result.scanId}</Text>
        </View>
        <View style={cv.condChips}>
          {result.conditions.map((c,i) => (
            <View key={i} style={[cv.chip,{
              borderColor:
                c.severity==='Mild'     ? 'rgba(93,190,138,0.40)'  :
                c.severity==='Moderate' ? 'rgba(232,160,32,0.40)'  :
                                          'rgba(224,92,58,0.40)',
              backgroundColor:
                c.severity==='Mild'     ? 'rgba(93,190,138,0.10)'  :
                c.severity==='Moderate' ? 'rgba(232,160,32,0.10)'  :
                                          'rgba(224,92,58,0.10)',
            }]}>
              <Text style={cv.chipText}>{c.name.split(' ').slice(-1)[0]}</Text>
            </View>
          ))}
        </View>
      </View>
    </FadeSlide>
  );
}
const cv = StyleSheet.create({
  wrap:       { marginBottom:24 },
  card:       { backgroundColor:C.bgCardDeep,borderWidth:1.5,borderColor:C.borderBright,borderRadius:20,padding:20,overflow:'hidden' },
  shimmer:    { position:'absolute',top:0,bottom:0,width:120,backgroundColor:'rgba(200,134,10,0.06)',borderRadius:60 },
  topRow:     { flexDirection:'row',alignItems:'center',gap:14,marginBottom:16 },
  logoMark:   { width:48,height:48,borderRadius:24,backgroundColor:C.goldPale,borderWidth:1.5,borderColor:C.gold,alignItems:'center',justifyContent:'center',shadowColor:C.gold,shadowOpacity:0.4,shadowOffset:{width:0,height:0},shadowRadius:10,elevation:6 },
  logoLetter: { color:C.gold,fontSize:20,fontWeight:'900' },
  topRight:   { flex:1 },
  brandName:  { color:C.gold,fontSize:11,fontWeight:'800',letterSpacing:2.5,marginBottom:2 },
  reportLabel:{ color:C.creamDim,fontSize:14,fontWeight:'600' },
  divider:    { height:1,backgroundColor:C.border,marginBottom:16 },
  infoRow:    { flexDirection:'row',alignItems:'center',marginBottom:14 },
  infoBlock:  { flex:1,alignItems:'center',gap:4 },
  infoLabel:  { color:C.creamDim,fontSize:10,fontWeight:'600',textTransform:'uppercase',letterSpacing:0.8 },
  infoValue:  { color:C.cream,fontSize:22,fontWeight:'900' },
  infoSep:    { width:1,height:40,backgroundColor:C.border },
  metaRow:    { flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:8 },
  metaDate:   { color:C.creamDim,fontSize:11,flex:1,flexShrink:1 },
  metaId:     { color:'rgba(200,134,10,0.45)',fontSize:10,fontWeight:'700',letterSpacing:1,flexShrink:0 },
  condChips:  { flexDirection:'row',flexWrap:'wrap',gap:6 },
  chip:       { borderWidth:1,borderRadius:20,paddingHorizontal:10,paddingVertical:4 },
  chipText:   { color:C.creamDim,fontSize:10,fontWeight:'600' },
});

// ── Score breakdown meter ─────────────────────────────────────────────
function ScoreMeter({ score, scoreBreakdown }) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fillAnim,{toValue:score/100,duration:900,delay:200,useNativeDriver:false}).start();
  },[]);
  const fillW = fillAnim.interpolate({inputRange:[0,1],outputRange:['0%','100%']});
  const color = score>=75?C.success:score>=55?C.warn:C.error;
  const label = score>=75?'Excellent':score>=65?'Good':score>=50?'Fair':'Needs Attention';

  // Only show sub-breakdown when the backend provides real scoreBreakdown data.
  // Never show random/derived numbers on a health app — it erodes trust.
  const hasRealBreakdown = scoreBreakdown &&
    Object.keys(scoreBreakdown).length > 0 &&
    Object.values(scoreBreakdown).some(v => v != null);

  const SEGMENTS = hasRealBreakdown ? [
    { label: 'Hydration', score: Math.min(100, Math.max(0, scoreBreakdown.hydration ?? 0)) },
    { label: 'Clarity',   score: Math.min(100, Math.max(0, scoreBreakdown.clarity   ?? 0)) },
    { label: 'Evenness',  score: Math.min(100, Math.max(0, scoreBreakdown.evenness   ?? 0)) },
    { label: 'Texture',   score: Math.min(100, Math.max(0, scoreBreakdown.texture    ?? 0)) },
    { label: 'Glow',      score: Math.min(100, Math.max(0, scoreBreakdown.glow       ?? 0)) },
  ] : [];

  return (
    <View style={sm.wrap}>
      <View style={sm.mainRow}>
        <Text style={[sm.scoreNum,{color}]}>{score}</Text>
        <View style={{flex:1}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:6}}>
            <Text style={sm.label}>Overall Skin Health</Text>
            <Text style={[sm.labelScore,{color}]}>{label}</Text>
          </View>
          <View style={sm.track}>
            <Animated.View style={[sm.fill,{width:fillW,backgroundColor:color}]}>
              <View style={sm.fillGlow}/>
            </Animated.View>
          </View>
        </View>
      </View>
      {hasRealBreakdown && (
        <View style={sm.subGrid}>
          {SEGMENTS.map((seg,i) => {
            const c = seg.score>=70?C.success:seg.score>=55?C.warn:C.error;
            return (
              <View key={i} style={sm.subItem}>
                <View style={sm.subTrack}>
                  <SubFillBar value={seg.score/100} color={c} delay={300+i*80}/>
                </View>
                <Text style={sm.subLabel}>{seg.label}</Text>
                <Text style={[sm.subScore,{color:c}]}>{seg.score}</Text>
              </View>
            );
          })}
        </View>
      )}
      {!hasRealBreakdown && (
        <View style={sm.pendingNote}>
          <Text style={sm.pendingText}>
            ◎  Detailed sub-scores will appear after your next scan once available from the AI.
          </Text>
        </View>
      )}
    </View>
  );
}
function SubFillBar({value,color,delay}) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    Animated.timing(w,{toValue:value,duration:700,delay,useNativeDriver:false}).start();
  },[]);
  const width = w.interpolate({inputRange:[0,1],outputRange:['0%','100%']});
  return <Animated.View style={{height:'100%',borderRadius:3,backgroundColor:color,width}}/>;
}
const sm = StyleSheet.create({
  wrap:        { backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:16,padding:18 },
  mainRow:     { flexDirection:'row',alignItems:'center',gap:16,marginBottom:20 },
  scoreNum:    { fontSize:44,fontWeight:'900',lineHeight:48,width:70 },
  label:       { color:C.creamDim,fontSize:12,fontWeight:'600' },
  labelScore:  { fontSize:12,fontWeight:'800' },
  track:       { height:8,backgroundColor:C.border,borderRadius:4,overflow:'hidden' },
  fill:        { height:'100%',borderRadius:4 },
  fillGlow:    { position:'absolute',right:0,top:-2,width:16,height:12,backgroundColor:'rgba(255,255,255,0.25)',borderRadius:6 },
  subGrid:     { flexDirection:'row',gap:8 },
  subItem:     { flex:1,alignItems:'center',gap:5 },
  subTrack:    { width:'100%',height:6,backgroundColor:C.border,borderRadius:3,overflow:'hidden' },
  subLabel:    { color:C.creamFaint,fontSize:9,fontWeight:'600',textAlign:'center' },
  subScore:    { fontSize:11,fontWeight:'800' },
  pendingNote: { marginTop:4,backgroundColor:'rgba(245,222,179,0.04)',borderRadius:8,padding:10,borderWidth:1,borderColor:C.border },
  pendingText: { color:C.creamFaint,fontSize:11,lineHeight:17,textAlign:'center' },
});

// ── Conditions detail ─────────────────────────────────────────
function ConditionDetailCard({ item, index }) {
  const SCOLOR = { Mild:C.success, Moderate:C.warn, Severe:C.error };
  const color = SCOLOR[item.severity]||C.warn;
  return (
    <FadeSlide delay={index*70} style={{ marginBottom:12 }}>
      <View style={cdc.card}>
        <View style={cdc.top}>
          <View style={[cdc.badge,{backgroundColor:`${color}18`,borderColor:`${color}40`}]}>
            <Text style={{color,fontSize:14}}>{item.icon}</Text>
          </View>
          <View style={{flex:1}}>
            <Text style={cdc.name}>{item.name}</Text>
            <View style={[cdc.sevRow]}>
              <View style={[cdc.sevDot,{backgroundColor:color}]}/>
              <Text style={[cdc.sev,{color}]}>{item.severity}</Text>
            </View>
          </View>
        </View>
        <View style={cdc.noteBox}>
          <Text style={cdc.noteLabel}>🧬  Melanin-Specific Note</Text>
          <Text style={cdc.noteText}>{item.melaninNote}</Text>
        </View>
      </View>
    </FadeSlide>
  );
}
const cdc = StyleSheet.create({
  card:     { backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:14,padding:16 },
  top:      { flexDirection:'row',alignItems:'flex-start',gap:12,marginBottom:12 },
  badge:    { width:40,height:40,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center' },
  name:     { color:C.cream,fontSize:14,fontWeight:'700',marginBottom:5,flex:1 },
  sevRow:   { flexDirection:'row',alignItems:'center',gap:5 },
  sevDot:   { width:6,height:6,borderRadius:3 },
  sev:      { fontSize:11,fontWeight:'700' },
  noteBox:  { backgroundColor:'rgba(200,134,10,0.07)',borderRadius:10,padding:12,borderWidth:1,borderColor:C.border },
  noteLabel:{ color:C.gold,fontSize:10,fontWeight:'700',letterSpacing:0.8,marginBottom:6 },
  noteText: { color:C.creamDim,fontSize:12,lineHeight:18 },
});

// ── Ingredient grid ───────────────────────────────────────────
function IngredientGrid({ items, type }) {
  const isGood = type === 'good';
  return (
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      {(items || []).map((ing,i)=>(
        <View key={i} style={[ig.chip,
          isGood
            ? {backgroundColor:'rgba(93,190,138,0.10)',borderColor:'rgba(93,190,138,0.30)'}
            : {backgroundColor:C.errorPale,borderColor:'rgba(224,92,58,0.30)'}
        ]}>
          <Text style={{color:isGood?C.success:C.error,fontSize:10,fontWeight:'900'}}>
            {isGood?'✓':'✕'}
          </Text>
          <Text style={{color:isGood?'rgba(93,190,138,0.90)':C.error,fontSize:12,fontWeight:'600'}}>
            {ing}
          </Text>
        </View>
      ))}
    </View>
  );
}
const ig = StyleSheet.create({
  chip:{ flexDirection:'row',alignItems:'center',gap:6,borderWidth:1,borderRadius:20,paddingHorizontal:12,paddingVertical:7 },
});

// ── Full routine plan ─────────────────────────────────────────
function FullRoutinePlan({ plan }) {
  const [active, setActive] = useState('morning');
  const slideAnim = useRef(new Animated.Value(0)).current;

  const switchTab = (tab) => {
    Animated.timing(slideAnim,{toValue:tab==='morning'?0:1,duration:220,useNativeDriver:false}).start();
    setActive(tab);
  };

  const steps = active==='morning' ? plan.morning : plan.night;
  const AM_COLOR = '#E8A020';
  const PM_COLOR = '#7B6DC8';
  const accentColor = active==='morning' ? AM_COLOR : PM_COLOR;

  return (
    <View style={frp.wrap}>
      <View style={frp.tabs}>
        {['morning','night'].map(t=>(
          <TouchableOpacity key={t} style={[frp.tab, active===t && {borderBottomColor:accentColor,borderBottomWidth:2}]} onPress={()=>switchTab(t)}>
            <Text style={[frp.tabText, active===t && {color:accentColor,fontWeight:'700'}]}>
              {t==='morning'?'☀  Morning':'🌙  Night'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={frp.steps}>
        {(steps || []).map((step,i)=>{
          // Support both backend field names (step/productType/notes) and legacy (action/product/note)
          const stepName    = step.step    || step.action      || '';
          const productName = step.productType || step.product || '';
          const noteText    = step.notes   || step.note        || step.keyIngredient || '';
          return (
            <View key={i} style={frp.stepRow}>
              {/* Step number circle — never put text longer than 2 chars here */}
              <View style={frp.timelineCol}>
                <View style={[frp.num,{backgroundColor:`${accentColor}18`,borderColor:`${accentColor}40`}]}>
                  <Text style={[frp.numText,{color:accentColor}]}>{i+1}</Text>
                </View>
                {i < steps.length-1 && <View style={[frp.connector,{backgroundColor:`${accentColor}30`}]}/>}
              </View>
              <View style={frp.stepContent}>
                <Text style={[frp.action,{color:accentColor}]}>{stepName.toUpperCase()}</Text>
                {productName ? <Text style={frp.product}>{productName}</Text> : null}
                {noteText    ? <Text style={frp.note}>{noteText}</Text>        : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const frp = StyleSheet.create({
  wrap:        { backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:16,overflow:'hidden' },
  tabs:        { flexDirection:'row',borderBottomWidth:1,borderBottomColor:C.border },
  tab:         { flex:1,paddingVertical:13,alignItems:'center',borderBottomWidth:2,borderBottomColor:'transparent' },
  tabText:     { color:C.creamDim,fontSize:13,fontWeight:'600' },
  steps:       { padding:16 },
  stepRow:     { flexDirection:'row',gap:14,marginBottom:0 },
  timelineCol: { alignItems:'center',width:36 },
  num:         { width:36,height:36,borderRadius:10,borderWidth:1.5,alignItems:'center',justifyContent:'center' },
  numText:     { fontSize:14,fontWeight:'900' },
  connector:   { width:2,flex:1,minHeight:18,borderRadius:1,marginVertical:3 },
  stepContent: { flex:1,paddingBottom:20,paddingTop:4 },
  action:      { fontSize:10,fontWeight:'800',letterSpacing:1.2,marginBottom:4 },
  product:     { color:C.cream,fontSize:14,fontWeight:'700',marginBottom:4 },
  note:        { color:C.creamDim,fontSize:12,lineHeight:17 },
});

// ── Product recommendations ────────────────────────────────────────────
const REPORT_STORE_ICONS = { Jumia: '🛒', Konga: '🛍', GlowRoad: '✦', default: '🔗' };

function ProductRecCard({ item, index }) {
  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    setExpanded(e => {
      Animated.timing(expandAnim, { toValue: e ? 0 : 1, duration: 240, useNativeDriver: false }).start();
      return !e;
    });
  };

  const priceDisplay = ''; // pricing removed
  const descText = item.description || item.why || '';
  const links    = Array.isArray(item.affiliateLinks) ? item.affiliateLinks : [];
  const isNigerian = (item.brandOrigin || '').toLowerCase().includes('nigerian') ||
                     (item.brandOrigin || '').toLowerCase().includes('african') ||
                     (item.brandOrigin || '').toLowerCase().includes('ghana');

  const [detailH, setDetailH] = useState(0);
  const detailHAnim = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, detailH || 200] });
  const detailOp    = expandAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  const DetailContent = () => (
    <View style={{ paddingTop: 12 }}>
      {item.howToUse ? (
        <View style={prc.howToBox}>
          <Text style={prc.sectionLabel}>HOW TO USE</Text>
          <Text style={prc.howToText}>{item.howToUse}</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {item.frequency ? (
          <View style={prc.metaChip}>
            <Text style={prc.metaChipText}>🕐  {item.frequency}</Text>
          </View>
        ) : null}
        {item.amountToUse ? (
          <View style={prc.metaChip}>
            <Text style={prc.metaChipText}>⚗  {item.amountToUse}</Text>
          </View>
        ) : null}
      </View>
      {links.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={prc.sectionLabel}>WHERE TO BUY</Text>
          {links.map((lnk, li) => (
            <View key={li} style={prc.storeRow}>
              <Text style={prc.storeIcon}>{REPORT_STORE_ICONS[lnk.store] || REPORT_STORE_ICONS.default}</Text>
              <Text style={prc.storeName}>{lnk.store}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <FadeSlide delay={index*70} style={{ marginBottom:12 }}>
      <TouchableOpacity style={prc.card} onPress={toggle} activeOpacity={0.88}>
        <View style={prc.iconBox}>
          <Text style={prc.iconText}>{item.category === 'spf' ? '☀' : item.category === 'serum' ? '✦' : item.category === 'eye-cream' ? '◎' : '◈'}</Text>
        </View>
        <View style={{flex:1}}>
          <View style={prc.topRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={prc.brand}>{item.brand || ''}</Text>
              {isNigerian && (
                <View style={prc.originBadge}>
                  <Text style={prc.originText}>🌍</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {priceDisplay ? <Text style={prc.price}>{priceDisplay}</Text> : null}
              <Text style={prc.expandHint}>{expanded ? '▲' : '▼'}</Text>
            </View>
          </View>
          <Text style={prc.name}>{item.name}</Text>
          {descText ? <Text style={prc.why} numberOfLines={expanded ? 0 : 2}>{descText}</Text> : null}
          {item.keyIngredients?.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {item.keyIngredients.map((ing, ki) => (
                <View key={ki} style={prc.ingPill}><Text style={prc.ingText}>{ing}</Text></View>
              ))}
            </View>
          )}
          {item.productStep ? (
            <View style={prc.stepTag}>
              <Text style={prc.stepTagText}>{item.productStep} step • {item.routineSlot || 'daily'}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Expandable sourcing + usage */}
      <Animated.View style={[prc.expandWrap, { height: detailHAnim, overflow: 'hidden' }]}>
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: 0, zIndex: -1 }}
          onLayout={(e) => { const h = e.nativeEvent.layout.height; if (h > 0 && h !== detailH) setDetailH(h); }}
        >
          <DetailContent />
        </View>
        <Animated.View style={{ opacity: detailOp }}>
          <DetailContent />
        </Animated.View>
      </Animated.View>
    </FadeSlide>
  );
}
const prc = StyleSheet.create({
  card:        { flexDirection:'row', alignItems:'flex-start', gap:12, backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, borderRadius:14, padding:14 },
  iconBox:     { width:38, height:38, borderRadius:10, backgroundColor:C.goldPale, borderWidth:1, borderColor:C.border, alignItems:'center', justifyContent:'center', flexShrink:0 },
  iconText:    { color:C.gold, fontSize:15 },
  topRow:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:3, gap:6 },
  brand:       { color:C.gold, fontSize:11, fontWeight:'700', letterSpacing:0.5, flexShrink:1 },
  originBadge: { backgroundColor:'rgba(93,190,138,0.14)', borderWidth:1, borderColor:'rgba(93,190,138,0.35)', borderRadius:5, paddingHorizontal:4, paddingVertical:1 },
  originText:  { fontSize:10 },
  price:       { color:C.creamDim, fontSize:12, fontWeight:'700' },
  expandHint:  { color:C.creamFaint, fontSize:9, fontWeight:'700' },
  name:        { color:C.cream, fontSize:14, fontWeight:'800', marginBottom:4, flexShrink:1 },
  why:         { color:C.creamDim, fontSize:12, lineHeight:17 },
  ingPill:     { backgroundColor:C.goldPale, borderWidth:1, borderColor:C.border, borderRadius:6, paddingHorizontal:6, paddingVertical:2 },
  ingText:     { color:C.creamDim, fontSize:9, fontWeight:'600' },
  stepTag:     { marginTop:6, alignSelf:'flex-start', backgroundColor:'rgba(200,134,10,0.10)', borderWidth:1, borderColor:'rgba(200,134,10,0.25)', borderRadius:6, paddingHorizontal:7, paddingVertical:2 },
  stepTagText: { color:C.gold, fontSize:9, fontWeight:'700', letterSpacing:0.5 },
  expandWrap:  { paddingHorizontal:14 },
  sectionLabel:{ color:C.gold, fontSize:9, fontWeight:'700', letterSpacing:1, marginBottom:6 },
  howToBox:    { backgroundColor:'rgba(245,222,179,0.04)', borderLeftWidth:2, borderLeftColor:C.gold, borderRadius:8, padding:10 },
  howToText:   { color:C.creamDim, fontSize:12, lineHeight:18 },
  metaChip:    { backgroundColor:'rgba(245,222,179,0.06)', borderWidth:1, borderColor:C.border, borderRadius:6, paddingHorizontal:8, paddingVertical:3 },
  metaChipText:{ color:C.creamDim, fontSize:11, fontWeight:'600' },
  storeRow:    { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:6, borderBottomWidth:1, borderBottomColor:C.border },
  storeIcon:   { fontSize:14, width:22 },
  storeName:   { color:C.cream, fontSize:12, fontWeight:'700', flex:1 },
  storePrice:  { color:C.gold, fontSize:12, fontWeight:'800' },
});


// ── Weekly schedule ───────────────────────────────────────────
function WeeklySchedule({ plan }) {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const today = days[new Date().getDay()-1] || 'Mon';
  return (
    <View style={ws.grid}>
      {(plan || []).map((item,i)=>{
        const isToday = item.day === today;
        return (
          <View key={i} style={[ws.col, isToday && ws.colToday]}>
            <Text style={[ws.day, isToday && ws.dayToday]}>{item.day}</Text>
            <View style={ws.dotsWrap}>
              {(item.tasks || []).map((_,j)=>(
                <View key={j} style={[ws.dot, isToday && ws.dotToday]}/>
              ))}
            </View>
            <Text style={[ws.count, isToday && ws.countToday]}>{item.tasks?.length || 0}</Text>
          </View>
        );
      })}
    </View>
  );
}
const ws = StyleSheet.create({
  grid:      { flexDirection:'row',gap:6 },
  col:       { flex:1,backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:10,padding:8,alignItems:'center',gap:5 },
  colToday:  { backgroundColor:C.goldPale,borderColor:C.gold },
  day:       { color:C.creamDim,fontSize:10,fontWeight:'700' },
  dayToday:  { color:C.gold },
  dotsWrap:  { gap:3 },
  dot:       { width:5,height:5,borderRadius:2.5,backgroundColor:'rgba(200,134,10,0.25)' },
  dotToday:  { backgroundColor:C.gold },
  count:     { color:C.creamFaint,fontSize:11,fontWeight:'800' },
  countToday:{ color:C.gold },
});

// ── Progress milestones ───────────────────────────────────────
function ProgressMilestones({ milestones }) {
  return (
    <View style={pm.wrap}>
      {(milestones || []).map((m,i)=>(
        <View key={i} style={pm.row}>
          <View style={pm.timelineCol}>
            <View style={[pm.circle, i===0 && pm.circleFirst]}>
              <Text style={pm.circleText}>{m.week}w</Text>
            </View>
            {i < milestones.length-1 && <View style={pm.line}/>}
          </View>
          <View style={pm.content}>
            <Text style={pm.milestoneTitle}>{m.label || m.title}</Text>
            <Text style={pm.milestoneDesc}>{m.description || m.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
const pm = StyleSheet.create({
  wrap:          { paddingLeft:4 },
  row:           { flexDirection:'row',gap:16,marginBottom:0 },
  timelineCol:   { alignItems:'center',width:46 },
  circle:        { width:46,height:46,borderRadius:23,backgroundColor:C.goldPale,borderWidth:1.5,borderColor:C.border,alignItems:'center',justifyContent:'center' },
  circleFirst:   { borderColor:C.gold,backgroundColor:'rgba(200,134,10,0.20)' },
  circleText:    { color:C.gold,fontSize:11,fontWeight:'900' },
  line:          { width:1.5,flex:1,minHeight:20,backgroundColor:C.border,marginVertical:4 },
  content:       { flex:1,paddingBottom:24,paddingTop:10 },
  milestoneTitle:{ color:C.cream,fontSize:14,fontWeight:'800',marginBottom:5 },
  milestoneDesc: { color:C.creamDim,fontSize:12,lineHeight:19 },
});

// ── Disclaimer card ───────────────────────────────────────────
function DisclaimerCard({ text }) {
  return (
    <View style={dc.card}>
      <View style={dc.top}>
        <Text style={dc.icon}>⚕</Text>
        <Text style={dc.title}>Medical Disclaimer</Text>
      </View>
      <Text style={dc.text}>{text}</Text>
    </View>
  );
}
const dc = StyleSheet.create({
  card:  { backgroundColor:'rgba(224,92,58,0.06)',borderWidth:1,borderColor:'rgba(224,92,58,0.22)',borderRadius:14,padding:16,marginBottom:20 },
  top:   { flexDirection:'row',alignItems:'center',gap:8,marginBottom:8 },
  icon:  { fontSize:16 },
  title: { color:'rgba(224,92,58,0.80)',fontSize:13,fontWeight:'800' },
  text:  { color:'rgba(245,222,179,0.45)',fontSize:12,lineHeight:18 },
});

// ── PDF HTML generator ────────────────────────────────────────
function generateReportHTML(result) {
  const scoreColor = result.score>=75?'#5DBE8A':result.score>=55?'#E8A020':'#E05C3A';
  const scoreLabel = result.score>=75?'Excellent':result.score>=65?'Good':result.score>=50?'Fair':'Needs Attention';
  const formattedDate = new Date(result.date).toLocaleDateString('en-NG',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const sevColor = s => s==='Mild'?'#5DBE8A':s==='Moderate'?'#E8A020':'#E05C3A';

  const condChips = result.conditions.map(c=>{
    const col=sevColor(c.severity);
    return `<span style="border:1px solid ${col}40;background:${col}18;border-radius:20px;padding:4px 12px;font-size:10px;font-weight:600;color:${col};margin:3px 3px 3px 0;display:inline-block;">${c.name.split(' ').slice(-1)[0]}</span>`;
  }).join('');

  const conditionsHTML = result.conditions.map(c=>{
    const col=sevColor(c.severity);
    return `
      <div style="background:#1A0A02;border:1px solid rgba(200,134,10,0.22);border-radius:14px;padding:16px;margin-bottom:10px;">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;">
          <div style="width:40px;height:40px;min-width:40px;border-radius:10px;border:1px solid ${col}40;background:${col}18;display:flex;align-items:center;justify-content:center;font-size:16px;">${c.icon||'●'}</div>
          <div style="flex:1;">
            <div style="color:#F5DEB3;font-size:14px;font-weight:700;margin-bottom:4px;">${c.name}</div>
            <div style="display:flex;align-items:center;gap:5px;">
              <span style="width:6px;height:6px;border-radius:50%;background:${col};display:inline-block;"></span>
              <span style="color:${col};font-size:11px;font-weight:700;">${c.severity}</span>
            </div>
          </div>
        </div>
        <div style="background:rgba(200,134,10,0.07);border-radius:10px;padding:12px;border:1px solid rgba(200,134,10,0.22);">
          <div style="color:#C8860A;font-size:10px;font-weight:700;letter-spacing:0.8px;margin-bottom:6px;">🧬  MELANIN-SPECIFIC NOTE</div>
          <div style="color:rgba(245,222,179,0.6);font-size:12px;line-height:1.7;">${c.melaninNote||''}</div>
        </div>
      </div>`;
  }).join('');

  const renderSteps = (steps, type) => {
    const ac = type==='am' ? '#E8A020' : '#7B6DC8';
    return (steps||[]).map((step,i)=>{
      const name    = step.step    || step.action      || '';
      const product = step.productType || step.product || '';
      const note    = step.notes   || step.note        || step.keyIngredient || '';
      const isLast  = i === steps.length-1;
      return `
        <div style="display:flex;gap:14px;">
          <div style="display:flex;flex-direction:column;align-items:center;width:36px;min-width:36px;">
            <div style="width:36px;height:36px;border-radius:10px;border:1.5px solid ${ac}40;background:${ac}18;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:${ac};">${i+1}</div>
            ${!isLast?`<div style="width:2px;flex:1;min-height:18px;border-radius:1px;background:${ac}30;margin:3px 0;"></div>`:''}
          </div>
          <div style="flex:1;padding-bottom:${isLast?4:20}px;padding-top:4px;">
            <div style="color:${ac};font-size:10px;font-weight:800;letter-spacing:1.2px;margin-bottom:4px;">${name.toUpperCase()}</div>
            ${product?`<div style="color:#F5DEB3;font-size:14px;font-weight:700;margin-bottom:4px;">${product}</div>`:''}
            ${note?`<div style="color:rgba(245,222,179,0.6);font-size:12px;line-height:1.5;">${note}</div>`:''}
          </div>
        </div>`;
    }).join('');
  };

  const productsHTML = (result.productRecs||[]).map(p=>{
    const ings = (p.keyIngredients||[]).slice(0,5).map(ing=>`<span style="background:rgba(200,134,10,0.13);border:1px solid rgba(200,134,10,0.22);border-radius:6px;padding:2px 6px;color:rgba(245,222,179,0.55);font-size:9px;font-weight:600;margin:2px;display:inline-block;">${ing}</span>`).join('');
    const icon = p.category==='spf'?'☀':p.category==='serum'?'✦':p.category==='eye-cream'?'◎':'◈';
    return `
      <div style="background:#1A0A02;border:1px solid rgba(200,134,10,0.22);border-radius:14px;padding:14px;margin-bottom:10px;display:flex;gap:12px;align-items:flex-start;">
        <div style="width:38px;height:38px;min-width:38px;border-radius:10px;background:rgba(200,134,10,0.13);border:1px solid rgba(200,134,10,0.22);display:flex;align-items:center;justify-content:center;font-size:15px;">${icon}</div>
        <div style="flex:1;">
          ${p.brand?`<div style="color:#C8860A;font-size:11px;font-weight:700;margin-bottom:3px;">${p.brand}</div>`:''}
          <div style="color:#F5DEB3;font-size:14px;font-weight:800;margin-bottom:4px;">${p.name||''}</div>
          ${p.description||p.why?`<div style="color:rgba(245,222,179,0.6);font-size:12px;line-height:1.5;margin-bottom:6px;">${p.description||p.why}</div>`:''}
          ${ings?`<div style="margin-top:4px;">${ings}</div>`:''}
          ${p.productStep?`<span style="display:inline-block;margin-top:6px;background:rgba(200,134,10,0.10);border:1px solid rgba(200,134,10,0.25);border-radius:6px;padding:2px 7px;color:#C8860A;font-size:9px;font-weight:700;letter-spacing:0.5px;">${p.productStep} step • ${p.routineSlot||'daily'}</span>`:''}
          ${p.howToUse?`<div style="margin-top:8px;background:rgba(245,222,179,0.04);border-left:2px solid #C8860A;border-radius:8px;padding:8px 10px;"><div style="color:#C8860A;font-size:9px;font-weight:700;letter-spacing:1px;margin-bottom:4px;">HOW TO USE</div><div style="color:rgba(245,222,179,0.6);font-size:11px;line-height:1.6;">${p.howToUse}</div></div>`:''}
        </div>
      </div>`;
  }).join('');

  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const today = days[new Date().getDay()-1]||'Mon';
  const weeklyHTML = (result.weeklyPlan||[]).map(item=>{
    const isToday = item.day===today;
    const dots = (item.tasks||[]).map(()=>`<div style="width:5px;height:5px;border-radius:50%;background:${isToday?'#C8860A':'rgba(200,134,10,0.25)'};margin:2px auto;"></div>`).join('');
    return `<div style="flex:1;background:${isToday?'rgba(200,134,10,0.13)':'#1A0A02'};border:1px solid ${isToday?'#C8860A':'rgba(200,134,10,0.22)'};border-radius:10px;padding:8px;text-align:center;">
      <div style="color:${isToday?'#C8860A':'rgba(245,222,179,0.55)'};font-size:10px;font-weight:700;margin-bottom:5px;">${item.day}</div>
      ${dots}
      <div style="color:${isToday?'#C8860A':'rgba(245,222,179,0.55)'};font-size:11px;font-weight:800;margin-top:3px;">${item.tasks?.length||0}</div>
    </div>`;
  }).join('');

  const milestonesHTML = (result.progressMilestones||[]).map((m,i,arr)=>{
    const isFirst=i===0, isLast=i===arr.length-1;
    return `
      <div style="display:flex;gap:16px;">
        <div style="display:flex;flex-direction:column;align-items:center;width:46px;min-width:46px;">
          <div style="width:46px;height:46px;border-radius:50%;background:${isFirst?'rgba(200,134,10,0.20)':'rgba(200,134,10,0.13)'};border:1.5px solid ${isFirst?'#C8860A':'rgba(200,134,10,0.22)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#C8860A;">${m.week}w</div>
          ${!isLast?`<div style="width:1.5px;flex:1;min-height:20px;background:rgba(200,134,10,0.22);margin:4px 0;"></div>`:''}
        </div>
        <div style="flex:1;padding-bottom:${isLast?4:24}px;padding-top:10px;">
          <div style="color:#F5DEB3;font-size:14px;font-weight:800;margin-bottom:5px;">${m.label||m.title||''}</div>
          <div style="color:rgba(245,222,179,0.6);font-size:12px;line-height:1.7;">${m.description||m.desc||''}</div>
        </div>
      </div>`;
  }).join('');

  const goodIngs = (result.melaninInsights.goodIngredients||[]).map(ing=>
    `<span style="display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(93,190,138,0.30);background:rgba(93,190,138,0.10);border-radius:20px;padding:6px 12px;margin:3px;"><span style="color:#5DBE8A;font-weight:900;font-size:10px;">✓</span><span style="color:#5DBE8A;font-size:12px;font-weight:600;">${ing}</span></span>`
  ).join('');
  const avoidIngs = (result.melaninInsights.avoidIngredients||[]).map(ing=>
    `<span style="display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(224,92,58,0.30);background:rgba(224,92,58,0.10);border-radius:20px;padding:6px 12px;margin:3px;"><span style="color:#E05C3A;font-weight:900;font-size:10px;">✕</span><span style="color:#E05C3A;font-size:12px;font-weight:600;">${ing}</span></span>`
  ).join('');

  const pihColor = result.melaninInsights.pihRisk==='Low'?'#5DBE8A':result.melaninInsights.pihRisk==='Moderate'?'#E8A020':'#E05C3A';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  body{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;background:#0F0500;color:#F5DEB3;}
  .page{padding:40px 36px;max-width:820px;margin:0 auto;}
  .section{margin-bottom:28px;}
  .sec-header{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
  .accent-bar{width:4px;height:18px;border-radius:2px;background:#C8860A;flex-shrink:0;}
  .sec-title{color:#F5DEB3;font-size:16px;font-weight:800;}
  .sec-icon{font-size:18px;margin-left:auto;}
  .sub{color:rgba(245,222,179,0.55);font-size:12px;margin-bottom:12px;margin-top:-6px;}
  @media print{body{background:#0F0500;}*{-webkit-print-color-adjust:exact;}}
</style>
</head>
<body>
<div class="page">

<!-- ── HEADER ── -->
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;padding-bottom:20px;border-bottom:1.5px solid rgba(200,134,10,0.35);">
  <div style="display:flex;align-items:center;gap:14px;">
    <div style="width:54px;height:54px;border-radius:14px;background:rgba(200,134,10,0.13);border:1.5px solid #C8860A;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#C8860A;letter-spacing:-1px;">M</div>
    <div>
      <div style="color:#C8860A;font-size:12px;font-weight:800;letter-spacing:3.5px;text-transform:uppercase;">MELANI SCAN</div>
      <div style="color:rgba(245,222,179,0.55);font-size:14px;font-weight:600;margin-top:3px;">AI Skin Analysis Report</div>
      <div style="color:rgba(245,222,179,0.30);font-size:10px;margin-top:2px;">Built for melanin-rich skin, by design.</div>
    </div>
  </div>
  <div style="text-align:right;">
    <div style="color:rgba(245,222,179,0.45);font-size:11px;">${formattedDate}</div>
    <div style="color:rgba(200,134,10,0.55);font-size:10px;font-weight:700;letter-spacing:1px;margin-top:4px;">Report ID: ${result.scanId}</div>
  </div>
</div>

<!-- ── COVER CARD ── -->
<div style="background:#120701;border:1.5px solid rgba(200,134,10,0.5);border-radius:20px;padding:24px;margin-bottom:28px;">
  <div style="display:flex;margin-bottom:16px;">
    <div style="flex:1;text-align:center;padding:0 8px;">
      <div style="color:rgba(245,222,179,0.55);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Skin Score</div>
      <div style="font-size:34px;font-weight:900;color:${scoreColor};">${result.score}<span style="font-size:16px;">/100</span></div>
      <div style="font-size:11px;font-weight:700;color:${scoreColor};margin-top:2px;">${scoreLabel}</div>
    </div>
    <div style="width:1px;background:rgba(200,134,10,0.22);"></div>
    <div style="flex:1;text-align:center;padding:0 8px;">
      <div style="color:rgba(245,222,179,0.55);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Skin Type</div>
      <div style="font-size:24px;font-weight:900;color:#F5DEB3;">${result.skinType}</div>
    </div>
    <div style="width:1px;background:rgba(200,134,10,0.22);"></div>
    <div style="flex:1;text-align:center;padding:0 8px;">
      <div style="color:rgba(245,222,179,0.55);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Fitzpatrick</div>
      <div style="font-size:24px;font-weight:900;color:#F5DEB3;">${result.melaninInsights.fitzpatrickEst}</div>
    </div>
  </div>
  <div style="height:1px;background:rgba(200,134,10,0.22);margin-bottom:14px;"></div>
  <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
    <span style="color:rgba(245,222,179,0.55);font-size:11px;font-weight:600;">Overall Skin Health</span>
    <span style="font-size:11px;font-weight:700;color:${scoreColor};">${scoreLabel}</span>
  </div>
  <div style="background:rgba(200,134,10,0.22);border-radius:6px;height:10px;overflow:hidden;margin-bottom:16px;">
    <div style="width:${result.score}%;height:100%;background:${scoreColor};border-radius:6px;"></div>
  </div>
  <div style="display:flex;flex-wrap:wrap;">${condChips}</div>
</div>

<!-- ── DETECTED CONDITIONS ── -->
<div class="section">
  <div class="sec-header"><div class="accent-bar"></div><span class="sec-title">Detected Conditions</span><span class="sec-icon">◑</span></div>
  ${conditionsHTML}
</div>

<!-- ── MELANIN INSIGHTS ── -->
<div class="section">
  <div class="sec-header"><div class="accent-bar"></div><span class="sec-title">Melanin Insights</span><span class="sec-icon">🧬</span></div>
  <div style="background:#1A0A02;border:1px solid rgba(200,134,10,0.22);border-radius:16px;padding:16px;">
    <div style="display:flex;gap:24px;margin-bottom:14px;">
      <div style="flex:1;">
        <div style="color:rgba(245,222,179,0.55);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">PIH Risk</div>
        <div style="font-size:16px;font-weight:900;color:${pihColor};">${result.melaninInsights.pihRisk}</div>
      </div>
      <div style="flex:1;">
        <div style="color:rgba(245,222,179,0.55);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">Fitzpatrick Est.</div>
        <div style="font-size:16px;font-weight:900;color:#F5DEB3;">${result.melaninInsights.fitzpatrickEst}</div>
      </div>
    </div>
    <div style="height:1px;background:rgba(200,134,10,0.22);margin-bottom:14px;"></div>
    <div style="margin-bottom:14px;">
      <div style="color:#C8860A;font-size:11px;font-weight:700;letter-spacing:0.8px;margin-bottom:6px;">☀  SPF Guidance</div>
      <div style="color:rgba(245,222,179,0.6);font-size:12px;line-height:1.7;">${result.melaninInsights.spfNote}</div>
    </div>
    <div style="height:1px;background:rgba(200,134,10,0.22);margin-bottom:14px;"></div>
    <div>
      <div style="color:#C8860A;font-size:11px;font-weight:700;letter-spacing:0.8px;margin-bottom:6px;">⚠  Sensitivity Flags</div>
      <div style="color:rgba(245,222,179,0.6);font-size:12px;line-height:1.7;">${result.melaninInsights.sensitivity}</div>
    </div>
  </div>
</div>

<!-- ── RECOMMENDED INGREDIENTS ── -->
<div class="section">
  <div class="sec-header"><div class="accent-bar"></div><span class="sec-title">Recommended Ingredients</span><span class="sec-icon">✓</span></div>
  <div style="display:flex;flex-wrap:wrap;">${goodIngs}</div>
</div>

<!-- ── AVOID THESE ── -->
<div class="section">
  <div class="sec-header"><div class="accent-bar"></div><span class="sec-title">Avoid These</span><span class="sec-icon">✕</span></div>
  <div style="display:flex;flex-wrap:wrap;">${avoidIngs}</div>
</div>

<!-- ── COMPLETE ROUTINE PLAN ── -->
<div class="section">
  <div class="sec-header"><div class="accent-bar"></div><span class="sec-title">Complete Routine Plan</span><span class="sec-icon">✦</span></div>
  <div style="background:#1A0A02;border:1px solid rgba(200,134,10,0.22);border-radius:16px;overflow:hidden;margin-bottom:14px;">
    <div style="display:flex;border-bottom:1px solid rgba(200,134,10,0.22);">
      <div style="flex:1;text-align:center;padding:12px;color:#E8A020;font-size:13px;font-weight:700;border-bottom:2px solid #E8A020;">☀  Morning Routine</div>
    </div>
    <div style="padding:16px;">${renderSteps(result.routinePlan.morning,'am')}</div>
  </div>
  <div style="background:#1A0A02;border:1px solid rgba(200,134,10,0.22);border-radius:16px;overflow:hidden;">
    <div style="display:flex;border-bottom:1px solid rgba(200,134,10,0.22);">
      <div style="flex:1;text-align:center;padding:12px;color:#7B6DC8;font-size:13px;font-weight:700;border-bottom:2px solid #7B6DC8;">🌙  Night Routine</div>
    </div>
    <div style="padding:16px;">${renderSteps(result.routinePlan.night,'pm')}</div>
  </div>
</div>

<!-- ── RECOMMENDED PRODUCTS ── -->
<div class="section">
  <div class="sec-header"><div class="accent-bar"></div><span class="sec-title">Recommended Products</span><span class="sec-icon">◈</span></div>
  <div class="sub">Products vetted for melanin-rich skin</div>
  ${productsHTML}
</div>

<!-- ── WEEKLY SCHEDULE ── -->
<div class="section">
  <div class="sec-header"><div class="accent-bar"></div><span class="sec-title">Weekly Schedule</span><span class="sec-icon">📅</span></div>
  <div class="sub">Each dot represents one routine step. Today is highlighted.</div>
  <div style="display:flex;gap:6px;">${weeklyHTML}</div>
</div>

<!-- ── EXPECTED PROGRESS ── -->
<div class="section">
  <div class="sec-header"><div class="accent-bar"></div><span class="sec-title">Expected Progress</span><span class="sec-icon">↑</span></div>
  <div class="sub">With daily consistency on this routine</div>
  <div style="padding-left:4px;">${milestonesHTML}</div>
</div>

<!-- ── DISCLAIMER ── -->
<div style="background:rgba(224,92,58,0.06);border:1px solid rgba(224,92,58,0.22);border-radius:14px;padding:16px;margin-bottom:24px;">
  <div style="color:rgba(224,92,58,0.80);font-size:13px;font-weight:800;margin-bottom:8px;">⚕  Medical Disclaimer</div>
  <div style="color:rgba(245,222,179,0.45);font-size:12px;line-height:1.7;">${result.disclaimer}</div>
</div>

<!-- ── FOOTER ── -->
<div style="text-align:center;padding:20px 0 10px;border-top:1px solid rgba(200,134,10,0.15);">
  <div style="color:#C8860A;font-size:12px;font-weight:800;letter-spacing:3.5px;margin-bottom:4px;">MELANI SCAN</div>
  <div style="color:rgba(245,222,179,0.35);font-size:11px;margin-bottom:6px;">Built for melanin-rich skin, by design.</div>
  <div style="color:rgba(200,134,10,0.35);font-size:9px;letter-spacing:1px;">Report ID: ${result.scanId}</div>
</div>

</div>
</body>
</html>`;
}

// ── PDF share handler ─────────────────────────────────────────
async function handleSharePDF(result, setSharing) {
  setSharing(true);
  try {
    const html = generateReportHTML(result);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Your Melani Skin Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Report Ready', 'PDF has been saved to your device.');
    }
  } catch (e) {
    console.error('PDF error:', e);
    Alert.alert('Error', 'Could not generate PDF report. Please try again.');
  } finally {
    setSharing(false);
  }
}

// ── Main Screen ───────────────────────────────────────────────
export default function ScanReportScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const [sharing, setSharing] = useState(false);

  // Merge incoming params with default to avoid missing fields
  const result = mergeResultWithDefault(route.params?.result);

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Nav bar */}
        <FadeSlide delay={0} style={s.nav}>
          <TouchableOpacity style={s.navBack} onPress={() => navigation.goBack()}>
            <Text style={s.navBackArrow}>←</Text>
          </TouchableOpacity>
          <Text style={s.navTitle} numberOfLines={1}>Full Report</Text>
          <TouchableOpacity
            style={[s.shareBtn, sharing && { opacity: 0.6 }]}
            onPress={() => handleSharePDF(result, setSharing)}
            disabled={sharing}
          >
            {sharing
              ? <ActivityIndicator size="small" color={C.gold} />
              : <Text style={s.shareIcon}>↑</Text>
            }
            <Text style={s.shareLabel}>{sharing ? '…' : 'Share'}</Text>
          </TouchableOpacity>
        </FadeSlide>

        {/* COVER */}
        <ReportCoverCard result={result} />

        {/* SCORE BREAKDOWN */}
        <ReportSection title="Skin Health Score" icon="◎" delay={80}>
          <ScoreMeter score={result.score} scoreBreakdown={result.scoreBreakdown} />
        </ReportSection>

        {/* CONDITIONS */}
        <ReportSection title="Detected Conditions" icon="◑" delay={160}>
          {result.conditions.map((c,i)=>(
            <ConditionDetailCard key={i} item={c} index={i}/>
          ))}
        </ReportSection>

        {/* MELANIN INSIGHTS */}
        <ReportSection title="Melanin Insights" icon="🧬" delay={240}>
          <View style={s.insightBox}>
            <View style={s.insightRow}>
              <View style={s.insightLeft}>
                <Text style={s.insightIcon}>◑</Text>
                <View>
                  <Text style={s.insightLabel}>PIH Risk</Text>
                  <Text style={[s.insightValue,{
                    color:result.melaninInsights.pihRisk==='Low'?C.success:result.melaninInsights.pihRisk==='Moderate'?C.warn:C.error
                  }]}>{result.melaninInsights.pihRisk}</Text>
                </View>
              </View>
              <View style={s.insightLeft}>
                <Text style={s.insightIcon}>◎</Text>
                <View>
                  <Text style={s.insightLabel}>Fitzpatrick Est.</Text>
                  <Text style={[s.insightValue,{color:C.cream}]}>{result.melaninInsights.fitzpatrickEst}</Text>
                </View>
              </View>
            </View>
            <View style={s.insightDivider}/>
            <View style={s.insightNote}>
              <Text style={s.insightNoteLabel}>☀  SPF Guidance</Text>
              <Text style={s.insightNoteText}>{result.melaninInsights.spfNote}</Text>
            </View>
            <View style={s.insightDivider}/>
            <View style={s.insightNote}>
              <Text style={s.insightNoteLabel}>⚠  Sensitivity Flags</Text>
              <Text style={s.insightNoteText}>{result.melaninInsights.sensitivity}</Text>
            </View>
          </View>
        </ReportSection>

        {/* INGREDIENTS */}
        <ReportSection title="Recommended Ingredients" icon="✓" delay={300}>
          <IngredientGrid items={result.melaninInsights.goodIngredients} type="good"/>
        </ReportSection>
        <ReportSection title="Avoid These" icon="✕" delay={360}>
          <IngredientGrid items={result.melaninInsights.avoidIngredients} type="avoid"/>
        </ReportSection>

        {/* FULL ROUTINE */}
        <ReportSection title="Complete Routine Plan" icon="✦" delay={420}>
          <FullRoutinePlan plan={result.routinePlan}/>
        </ReportSection>

        {/* PRODUCT RECS */}
        <ReportSection title="Recommended Products" icon="◈" delay={480}>
          <Text style={s.recSub}>Products available in Nigeria, vetted for melanin skin</Text>
          {result.productRecs.map((p,i)=>(
            <ProductRecCard key={i} item={p} index={i}/>
          ))}
        </ReportSection>

        {/* WEEKLY SCHEDULE */}
        <ReportSection title="Weekly Schedule" icon="📅" delay={540}>
          <Text style={s.recSub}>Today is highlighted. Each dot = one routine step.</Text>
          <WeeklySchedule plan={result.weeklyPlan}/>
        </ReportSection>

        {/* PROGRESS MILESTONES */}
        <ReportSection title="Expected Progress" icon="↑" delay={600}>
          <Text style={s.recSub}>With daily consistency on this routine</Text>
          <ProgressMilestones milestones={result.progressMilestones}/>
        </ReportSection>

        {/* DISCLAIMER */}
        <FadeSlide delay={660}>
          <DisclaimerCard text={result.disclaimer}/>
        </FadeSlide>

        {/* ACTION BUTTONS */}
        <FadeSlide delay={700} style={s.ctaBlock}>
          <GoldButton
            label="Share Report"
            icon="↑"
            onPress={() => handleSharePDF(result, setSharing)}
            loading={sharing}
            style={{ marginBottom:12 }}
          />
          <TouchableOpacity
            style={s.outlineBtn}
            onPress={() => navigation.navigate('ScanCamera')}
          >
            <Text style={s.outlineBtnText}>Take Another Scan</Text>
          </TouchableOpacity>
        </FadeSlide>

        {/* Footer */}
        <FadeSlide delay={760} style={s.footer}>
          <Text style={s.footerBrand}>MELANI SCAN</Text>
          <Text style={s.footerTagline}>Built for melanin-rich skin, by design.</Text>
          <Text style={s.footerMeta}>Report ID: {result.scanId}</Text>
        </FadeSlide>

        <View style={{ height:80 }}/>
      </ScrollView>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll: { paddingTop:64, paddingHorizontal:22 },

  nav:         { flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:24 },
  navBack:     { width:42,height:42,borderRadius:12,backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center',flexShrink:0 },
  navBackArrow:{ color:C.cream,fontSize:18 },
  navTitle:    { flex:1,color:C.cream,fontSize:18,fontWeight:'800',textAlign:'center',paddingHorizontal:8 },
  shareBtn:    { flexDirection:'row',alignItems:'center',gap:5,backgroundColor:C.goldPale,borderWidth:1,borderColor:C.border,borderRadius:10,paddingHorizontal:14,paddingVertical:8,flexShrink:0 },
  shareIcon:   { color:C.gold,fontSize:14,fontWeight:'800' },
  shareLabel:  { color:C.gold,fontSize:12,fontWeight:'700' },

  insightBox:       { backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:16,padding:16 },
  insightRow:       { flexDirection:'row',gap:24,marginBottom:0 },
  insightLeft:      { flexDirection:'row',alignItems:'center',gap:10,flex:1 },
  insightIcon:      { color:C.gold,fontSize:18 },
  insightLabel:     { color:C.creamDim,fontSize:10,fontWeight:'600',textTransform:'uppercase',letterSpacing:0.8,marginBottom:3 },
  insightValue:     { fontSize:16,fontWeight:'900' },
  insightDivider:   { height:1,backgroundColor:C.border,marginVertical:14 },
  insightNote:      { gap:6 },
  insightNoteLabel: { color:C.gold,fontSize:11,fontWeight:'700',letterSpacing:0.8 },
  insightNoteText:  { color:C.creamDim,fontSize:12,lineHeight:18 },

  recSub:     { color:C.creamDim,fontSize:12,marginBottom:12,marginTop:-6 },

  ctaBlock:   { marginBottom:20 },
  outlineBtn: { borderWidth:1.5,borderColor:C.border,borderRadius:14,paddingVertical:16,alignItems:'center' },
  outlineBtnText:{ color:C.cream,fontSize:15,fontWeight:'600' },

  footer:         { alignItems:'center',paddingBottom:10,gap:5 },
  footerBrand:    { color:'rgba(200,134,10,0.40)',fontSize:11,fontWeight:'800',letterSpacing:2.5 },
  footerTagline:  { color:'rgba(245,222,179,0.20)',fontSize:11 },
  footerMeta:     { color:'rgba(200,134,10,0.25)',fontSize:10,letterSpacing:0.5 },
});
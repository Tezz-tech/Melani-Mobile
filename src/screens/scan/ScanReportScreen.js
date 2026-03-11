// src/screens/scan/ScanReportScreen.js
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, ScrollView, Dimensions, Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

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

// ── Deep merge helper ─────────────────────────────────────────
function mergeResultWithDefault(incoming) {
  if (!incoming) return DEFAULT_RESULT;

  return {
    ...DEFAULT_RESULT,
    ...incoming,
    // Ensure arrays exist
    conditions: incoming.conditions || DEFAULT_RESULT.conditions,
    productRecs: incoming.productRecs || DEFAULT_RESULT.productRecs,
    weeklyPlan: incoming.weeklyPlan || DEFAULT_RESULT.weeklyPlan,
    progressMilestones: incoming.progressMilestones || DEFAULT_RESULT.progressMilestones,
    // Deep merge melaninInsights
    melaninInsights: {
      ...DEFAULT_RESULT.melaninInsights,
      ...(incoming.melaninInsights || {}),
      goodIngredients: incoming.melaninInsights?.goodIngredients || DEFAULT_RESULT.melaninInsights.goodIngredients,
      avoidIngredients: incoming.melaninInsights?.avoidIngredients || DEFAULT_RESULT.melaninInsights.avoidIngredients,
    },
    // Deep merge routinePlan
    routinePlan: {
      ...DEFAULT_RESULT.routinePlan,
      ...(incoming.routinePlan || {}),
      morning: incoming.routinePlan?.morning || DEFAULT_RESULT.routinePlan.morning,
      night: incoming.routinePlan?.night || DEFAULT_RESULT.routinePlan.night,
    },
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
function GoldButton({ label, onPress, icon, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[{transform:[{scale}]},style]}>
      <TouchableOpacity
        style={gbtn.root} onPress={onPress} activeOpacity={1}
        onPressIn={()=>Animated.spring(scale,{toValue:0.96,useNativeDriver:true}).start()}
        onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()}
      >
        <View style={gbtn.shimmer}/>
        {icon && <Text style={gbtn.icon}>{icon}</Text>}
        <Text style={gbtn.label}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
const gbtn = StyleSheet.create({
  root:    { backgroundColor:C.gold,borderRadius:14,paddingVertical:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,overflow:'hidden',shadowColor:C.gold,shadowOffset:{width:0,height:6},shadowOpacity:0.45,shadowRadius:16,elevation:10 },
  shimmer: { position:'absolute',top:0,left:0,right:0,height:'55%',backgroundColor:'rgba(255,255,255,0.10)',borderRadius:14 },
  icon:    { fontSize:16 },
  label:   { color:'#0F0500',fontSize:15,fontWeight:'800',letterSpacing:1.2,textTransform:'uppercase' },
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
  metaRow:    { flexDirection:'row',justifyContent:'space-between',marginBottom:14 },
  metaDate:   { color:C.creamDim,fontSize:11 },
  metaId:     { color:'rgba(200,134,10,0.45)',fontSize:10,fontWeight:'700',letterSpacing:1 },
  condChips:  { flexDirection:'row',flexWrap:'wrap',gap:6 },
  chip:       { borderWidth:1,borderRadius:20,paddingHorizontal:10,paddingVertical:4 },
  chipText:   { color:C.creamDim,fontSize:10,fontWeight:'600' },
});

// ── Score breakdown meter ─────────────────────────────────────
function ScoreMeter({ score }) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fillAnim,{toValue:score/100,duration:900,delay:200,useNativeDriver:false}).start();
  },[]);
  const fillW = fillAnim.interpolate({inputRange:[0,1],outputRange:['0%','100%']});
  const color = score>=75?C.success:score>=55?C.warn:C.error;
  const label = score>=75?'Excellent':score>=65?'Good':score>=50?'Fair':'Needs Attention';

  const SEGMENTS = [
    { label:'Hydration', score:68 },
    { label:'Clarity',   score:72 },
    { label:'Evenness',  score:58 },
    { label:'Texture',   score:80 },
    { label:'Glow',      score:74 },
  ];

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
  wrap:       { backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:16,padding:18 },
  mainRow:    { flexDirection:'row',alignItems:'center',gap:16,marginBottom:20 },
  scoreNum:   { fontSize:44,fontWeight:'900',lineHeight:48,width:70 },
  label:      { color:C.creamDim,fontSize:12,fontWeight:'600' },
  labelScore: { fontSize:12,fontWeight:'800' },
  track:      { height:8,backgroundColor:C.border,borderRadius:4,overflow:'hidden' },
  fill:       { height:'100%',borderRadius:4 },
  fillGlow:   { position:'absolute',right:0,top:-2,width:16,height:12,backgroundColor:'rgba(255,255,255,0.25)',borderRadius:6 },
  subGrid:    { flexDirection:'row',gap:8 },
  subItem:    { flex:1,alignItems:'center',gap:5 },
  subTrack:   { width:'100%',height:6,backgroundColor:C.border,borderRadius:3,overflow:'hidden' },
  subLabel:   { color:C.creamFaint,fontSize:9,fontWeight:'600',textAlign:'center' },
  subScore:   { fontSize:11,fontWeight:'800' },
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
        {(steps || []).map((step,i)=>(
          <View key={i} style={frp.stepRow}>
            <View style={[frp.num,{backgroundColor:`${accentColor}18`,borderColor:`${accentColor}40`}]}>
              <Text style={[frp.numText,{color:accentColor}]}>{step.step}</Text>
            </View>
            <View style={{flex:1}}>
              <View style={frp.stepTop}>
                <Text style={frp.action}>{step.action}</Text>
              </View>
              <Text style={frp.product}>{step.product}</Text>
              <Text style={frp.note}>{step.note}</Text>
            </View>
            {i < steps.length-1 && (
              <View style={[frp.connector,{backgroundColor:`${accentColor}30`}]}/>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
const frp = StyleSheet.create({
  wrap:     { backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:16,overflow:'hidden' },
  tabs:     { flexDirection:'row',borderBottomWidth:1,borderBottomColor:C.border },
  tab:      { flex:1,paddingVertical:13,alignItems:'center',borderBottomWidth:2,borderBottomColor:'transparent' },
  tabText:  { color:C.creamDim,fontSize:13,fontWeight:'600' },
  steps:    { padding:16 },
  stepRow:  { flexDirection:'row',gap:12,marginBottom:16,position:'relative' },
  num:      { width:30,height:30,borderRadius:8,borderWidth:1.5,alignItems:'center',justifyContent:'center',marginTop:2 },
  numText:  { fontSize:12,fontWeight:'900' },
  stepTop:  { flexDirection:'row',alignItems:'center',gap:8,marginBottom:3 },
  action:   { color:C.creamDim,fontSize:10,fontWeight:'700',textTransform:'uppercase',letterSpacing:1 },
  product:  { color:C.cream,fontSize:14,fontWeight:'700',marginBottom:3 },
  note:     { color:C.creamDim,fontSize:12,lineHeight:17 },
  connector:{ position:'absolute',left:14,top:32,width:2,height:16,borderRadius:1 },
});

// ── Product recommendations ───────────────────────────────────
function ProductRecCard({ item, index }) {
  return (
    <FadeSlide delay={index*70} style={{ marginBottom:10 }}>
      <View style={prc.card}>
        <View style={prc.iconBox}>
          <Text style={prc.iconText}>◈</Text>
        </View>
        <View style={{flex:1}}>
          <View style={prc.topRow}>
            <Text style={prc.brand}>{item.brand}</Text>
            <Text style={prc.price}>{item.price}</Text>
          </View>
          <Text style={prc.name}>{item.name}</Text>
          <Text style={prc.why}>{item.why}</Text>
        </View>
      </View>
    </FadeSlide>
  );
}
const prc = StyleSheet.create({
  card:    { flexDirection:'row',alignItems:'flex-start',gap:12,backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:14,padding:14 },
  iconBox: { width:36,height:36,borderRadius:10,backgroundColor:C.goldPale,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center' },
  iconText:{ color:C.gold,fontSize:14 },
  topRow:  { flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:3 },
  brand:   { color:C.gold,fontSize:11,fontWeight:'700',letterSpacing:0.5 },
  price:   { color:C.creamDim,fontSize:12,fontWeight:'600' },
  name:    { color:C.cream,fontSize:14,fontWeight:'700',marginBottom:4 },
  why:     { color:C.creamDim,fontSize:12,lineHeight:17 },
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
            <Text style={pm.milestoneTitle}>{m.title}</Text>
            <Text style={pm.milestoneDesc}>{m.desc}</Text>
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

// ── Share handler ─────────────────────────────────────────────
async function handleShare(result) {
  try {
    const scoreLabel = result.score>=75?'Excellent':result.score>=55?'Good':'Fair';
    const conditionNames = result.conditions.map(c=>c.name).join(', ');
    const message = `🌿 My Melanin Scan Report\n\nSkin Score: ${result.score}/100 (${scoreLabel})\nSkin Type: ${result.skinType}\nConditions: ${conditionNames}\n\nGenerated by Melanin Scan — AI skincare for melanin-rich skin.\nID: ${result.scanId}`;
    await Share.share({ message, title:'My Melanin Scan Report' });
  } catch (e) {
    console.log('Share error:', e);
  }
}

// ── Main Screen ───────────────────────────────────────────────
export default function ScanReportScreen() {
  const navigation = useNavigation();
  const route      = useRoute();

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
          <Text style={s.navTitle}>Full Report</Text>
          <TouchableOpacity style={s.shareBtn} onPress={() => handleShare(result)}>
            <Text style={s.shareIcon}>↑</Text>
            <Text style={s.shareLabel}>Share</Text>
          </TouchableOpacity>
        </FadeSlide>

        {/* COVER */}
        <ReportCoverCard result={result} />

        {/* SCORE BREAKDOWN */}
        <ReportSection title="Skin Health Score" icon="◎" delay={80}>
          <ScoreMeter score={result.score} />
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
            onPress={() => handleShare(result)}
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
          <Text style={s.footerBrand}>MELANIN SCAN</Text>
          <Text style={s.footerTagline}>Built for melanin-rich skin, by design.</Text>
          <Text style={s.footerMeta}>Report ID: {result.scanId}</Text>
        </FadeSlide>

        <View style={{ height:80 }}/>
      </ScrollView>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll: { paddingTop:56, paddingHorizontal:22 },

  nav:        { flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:24 },
  navBack:    { width:42,height:42,borderRadius:12,backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center' },
  navBackArrow:{ color:C.cream,fontSize:18 },
  navTitle:   { color:C.cream,fontSize:18,fontWeight:'800' },
  shareBtn:   { flexDirection:'row',alignItems:'center',gap:5,backgroundColor:C.goldPale,borderWidth:1,borderColor:C.border,borderRadius:10,paddingHorizontal:14,paddingVertical:8 },
  shareIcon:  { color:C.gold,fontSize:14,fontWeight:'800' },
  shareLabel: { color:C.gold,fontSize:12,fontWeight:'700' },

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
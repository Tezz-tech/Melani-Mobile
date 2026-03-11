// src/screens/settings/PrivacyScreen.js
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, ScrollView, Switch, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg:         '#0F0500',
  bgCard:     '#1A0A02',
  bgCard2:    '#200E03',
  border:     'rgba(200,134,10,0.20)',
  gold:       '#C8860A',
  goldPale:   'rgba(200,134,10,0.13)',
  cream:      '#F5DEB3',
  creamDim:   'rgba(245,222,179,0.55)',
  creamFaint: 'rgba(245,222,179,0.18)',
  success:    '#5DBE8A',
  successPale:'rgba(93,190,138,0.10)',
  error:      '#E05C3A',
  errorPale:  'rgba(224,92,58,0.08)',
  warn:       '#E8A020',
  warnPale:   'rgba(232,160,32,0.10)',
};

function AfricanBG({ children }) {
  return (
    <View style={{ flex:1,backgroundColor:C.bg }}>
      <View style={[p.b,{ width:420,height:420,borderRadius:210,backgroundColor:'#6B3000',opacity:0.09,top:-130,left:-110 }]} />
      <View style={[p.b,{ width:280,height:280,borderRadius:140,backgroundColor:C.gold,opacity:0.04,bottom:-70,right:-70 }]} />
      <View style={[p.stripe,{ top:H*0.07 }]} />
      {[{top:H*0.10,left:W*0.06,o:0.18},{top:H*0.82,left:W*0.88,o:0.12}].map((d,i)=>(
        <View key={i} style={[p.dot,{top:d.top,left:d.left,opacity:d.o}]}/>
      ))}
      {children}
    </View>
  );
}
const p = StyleSheet.create({
  b:{ position:'absolute' },
  stripe:{ position:'absolute',width:W,height:1.5,backgroundColor:'rgba(200,134,10,0.10)' },
  dot:{ position:'absolute',width:5,height:5,borderRadius:2.5,backgroundColor:C.gold },
});

function FadeSlide({ delay=0, from=16, children, style }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(from)).current;
  useEffect(()=>{
    Animated.parallel([
      Animated.timing(op,{toValue:1,duration:480,delay,useNativeDriver:true}),
      Animated.spring(ty,{toValue:0,friction:8,tension:50,delay,useNativeDriver:true}),
    ]).start();
  },[]);
  return <Animated.View style={[{opacity:op,transform:[{translateY:ty}]},style]}>{children}</Animated.View>;
}

function BackButton({ onPress }) {
  return (
    <TouchableOpacity style={{ position:'absolute',top:56,left:22,zIndex:99 }} onPress={onPress} activeOpacity={0.8}>
      <View style={{ width:42,height:42,borderRadius:12,backgroundColor:C.goldPale,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center' }}>
        <Text style={{ color:C.cream,fontSize:18 }}>←</Text>
      </View>
    </TouchableOpacity>
  );
}

function SectionLabel({ text, delay=0 }) {
  return (
    <FadeSlide delay={delay} style={{ flexDirection:'row',alignItems:'center',gap:8,marginBottom:10,marginTop:6 }}>
      <View style={{ width:3,height:14,borderRadius:2,backgroundColor:C.gold }}/>
      <Text style={{ color:C.gold,fontSize:10,fontWeight:'800',letterSpacing:1.8,textTransform:'uppercase' }}>{text}</Text>
    </FadeSlide>
  );
}

// ── Permission row ────────────────────────────────────────────
function PermissionRow({ icon, label, desc, status, delay }) {
  const STATUS_CONFIG = {
    granted:  { color:C.success,  bg:C.successPale, border:'rgba(93,190,138,0.30)',  label:'Granted'  },
    denied:   { color:C.error,    bg:C.errorPale,   border:'rgba(224,92,58,0.30)',   label:'Denied'   },
    limited:  { color:C.warn,     bg:C.warnPale,    border:'rgba(232,160,32,0.30)',  label:'Limited'  },
  };
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.denied;
  return (
    <FadeSlide delay={delay} style={{ marginBottom:8 }}>
      <View style={[pr.row, { borderColor:`${cfg.color}22` }]}>
        <View style={[pr.iconBox, { backgroundColor:`${cfg.color}12`, borderColor:`${cfg.color}30` }]}>
          <Text style={{ fontSize:16 }}>{icon}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={pr.label}>{label}</Text>
          <Text style={pr.desc}>{desc}</Text>
        </View>
        <View style={[pr.badge,{backgroundColor:cfg.bg,borderColor:cfg.border}]}>
          <View style={[pr.badgeDot,{backgroundColor:cfg.color}]}/>
          <Text style={[pr.badgeText,{color:cfg.color}]}>{cfg.label}</Text>
        </View>
      </View>
    </FadeSlide>
  );
}
const pr = StyleSheet.create({
  row:     { flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.bgCard,borderWidth:1,borderRadius:14,padding:14 },
  iconBox: { width:40,height:40,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center' },
  label:   { color:C.cream,fontSize:14,fontWeight:'700',marginBottom:3 },
  desc:    { color:C.creamDim,fontSize:11,lineHeight:16 },
  badge:   { flexDirection:'row',alignItems:'center',gap:5,borderWidth:1,borderRadius:8,paddingHorizontal:9,paddingVertical:4 },
  badgeDot:{ width:5,height:5,borderRadius:2.5 },
  badgeText:{ fontSize:10,fontWeight:'800',letterSpacing:0.5 },
});

// ── Data usage toggle ─────────────────────────────────────────
function DataToggle({ icon, label, sublabel, enabled, onToggle, delay, riskLevel='low' }) {
  const RISK = {
    low:    { color:C.success },
    medium: { color:C.warn    },
    high:   { color:C.error   },
  };
  const { color } = RISK[riskLevel];
  return (
    <FadeSlide delay={delay} style={{ marginBottom:8 }}>
      <View style={[dt.row,{borderColor:enabled?`${color}25`:C.border}]}>
        <View style={[dt.iconBox,{backgroundColor:`${color}10`,borderColor:`${color}25`}]}>
          <Text style={{ fontSize:16 }}>{icon}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={dt.label}>{label}</Text>
          <Text style={dt.sub}>{sublabel}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false:'rgba(200,134,10,0.12)', true:color }}
          thumbColor={enabled ? C.cream : C.creamFaint}
          ios_backgroundColor="rgba(200,134,10,0.10)"
        />
      </View>
    </FadeSlide>
  );
}
const dt = StyleSheet.create({
  row:    { flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.bgCard,borderWidth:1,borderRadius:14,padding:14 },
  iconBox:{ width:36,height:36,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center' },
  label:  { color:C.cream,fontSize:14,fontWeight:'600' },
  sub:    { color:C.creamDim,fontSize:11,marginTop:2,lineHeight:16 },
});

// ── Data usage meter ──────────────────────────────────────────
function DataMeter({ label, used, total, unit, color, delay }) {
  const pct = used / total;
  const width = useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    Animated.timing(width,{toValue:pct,duration:900,delay:delay+200,useNativeDriver:false}).start();
  },[]);
  const barW = width.interpolate({inputRange:[0,1],outputRange:['0%','100%']});
  return (
    <FadeSlide delay={delay} style={dm.wrap}>
      <View style={dm.topRow}>
        <Text style={dm.label}>{label}</Text>
        <Text style={[dm.val,{color}]}>{used} / {total} {unit}</Text>
      </View>
      <View style={dm.track}>
        <Animated.View style={[dm.fill,{width:barW,backgroundColor:color}]}/>
      </View>
    </FadeSlide>
  );
}
const dm = StyleSheet.create({
  wrap:   { marginBottom:10 },
  topRow: { flexDirection:'row',justifyContent:'space-between',marginBottom:6 },
  label:  { color:C.creamDim,fontSize:12,fontWeight:'600' },
  val:    { fontSize:12,fontWeight:'700' },
  track:  { height:4,backgroundColor:C.border,borderRadius:2,overflow:'hidden' },
  fill:   { height:'100%',borderRadius:2 },
});

// ── Action row ────────────────────────────────────────────────
function ActionRow({ icon, label, sublabel, onPress, delay, danger=false, external=false }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <FadeSlide delay={delay} style={{ marginBottom:8 }}>
      <TouchableOpacity
        onPress={onPress} activeOpacity={1}
        onPressIn={()=>Animated.spring(scale,{toValue:0.97,useNativeDriver:true}).start()}
        onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()}
      >
        <Animated.View style={[ar.row,danger&&ar.dangerRow,{transform:[{scale}]}]}>
          <View style={[ar.iconBox,danger&&ar.dangerIconBox]}>
            <Text style={{ fontSize:16 }}>{icon}</Text>
          </View>
          <View style={{ flex:1 }}>
            <Text style={[ar.label,danger&&ar.dangerLabel]}>{label}</Text>
            {sublabel && <Text style={ar.sub}>{sublabel}</Text>}
          </View>
          <Text style={[ar.arrow, danger&&{color:C.error}, external&&{fontSize:14,color:C.gold}]}>
            {external ? '↗' : '›'}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </FadeSlide>
  );
}
const ar = StyleSheet.create({
  row:         { flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:14,padding:14 },
  dangerRow:   { backgroundColor:C.errorPale,borderColor:'rgba(224,92,58,0.22)' },
  iconBox:     { width:36,height:36,borderRadius:10,backgroundColor:C.goldPale,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center' },
  dangerIconBox:{ backgroundColor:'rgba(224,92,58,0.10)',borderColor:'rgba(224,92,58,0.25)' },
  label:       { color:C.cream,fontSize:14,fontWeight:'600' },
  dangerLabel: { color:C.error },
  sub:         { color:C.creamDim,fontSize:11,marginTop:2 },
  arrow:       { color:C.creamDim,fontSize:22,fontWeight:'300' },
});

// ── Screen ────────────────────────────────────────────────────
export default function PrivacyScreen() {
  const navigation = useNavigation();

  const [privacy, setPrivacy] = useState({
    storeScans:     true,
    analytics:      true,
    crashReports:   true,
    personalisation:true,
    shareWithPartners:false,
    aiTraining:     false,
  });

  const toggle = (key) => setPrivacy(p=>({...p,[key]:!p[key]}));

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BackButton onPress={()=>navigation.goBack()} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <FadeSlide delay={0} style={s.header}>
          <View style={s.shieldWrap}>
            <View style={s.shieldOrb}>
              <Text style={{ fontSize:24 }}>🛡</Text>
            </View>
            <PulseRing size={80} delay={0}/>
            <PulseRing size={110} delay={500}/>
          </View>
          <Text style={s.title}>Privacy & Data</Text>
          <Text style={s.subtitle}>You control exactly what Melanin Scan collects and how it's used.</Text>
        </FadeSlide>

        {/* Privacy score */}
        <FadeSlide delay={150} style={s.scoreCard}>
          <View style={s.scoreLeft}>
            <Text style={s.scoreLabel}>Privacy Score</Text>
            <Text style={s.scoreDesc}>Based on your current settings</Text>
          </View>
          <View style={s.scoreRight}>
            <PrivacyScoreArc privacy={privacy} />
          </View>
        </FadeSlide>

        {/* Device permissions */}
        <SectionLabel text="Device Permissions" delay={220} />
        <PermissionRow icon="📷" label="Camera"         desc="Required for skin scanning"                    status="granted" delay={250} />
        <PermissionRow icon="📁" label="Photo Library"  desc="Saving scan photos and reports"                status="limited" delay={300} />
        <PermissionRow icon="📍" label="Location"       desc="Not requested — we never need your location"   status="denied"  delay={350} />
        <PermissionRow icon="🔔" label="Notifications"  desc="Routine reminders and scan alerts"             status="granted" delay={400} />

        {/* Data collection */}
        <SectionLabel text="Data Collection" delay={450} />
        <DataToggle icon="◉" label="Store Scan History"      sublabel="Keep scans in your account history"                         enabled={privacy.storeScans}      onToggle={()=>toggle('storeScans')}      delay={480} riskLevel="low"    />
        <DataToggle icon="📊" label="Usage Analytics"        sublabel="Anonymous stats on how you use the app"                     enabled={privacy.analytics}       onToggle={()=>toggle('analytics')}       delay={530} riskLevel="low"    />
        <DataToggle icon="🐛" label="Crash Reports"          sublabel="Auto-send error logs to help us fix bugs"                   enabled={privacy.crashReports}    onToggle={()=>toggle('crashReports')}    delay={580} riskLevel="low"    />
        <DataToggle icon="✦" label="Personalisation"         sublabel="Use your scan data to improve recommendations"              enabled={privacy.personalisation} onToggle={()=>toggle('personalisation')} delay={630} riskLevel="medium" />
        <DataToggle icon="◈" label="Share with Partners"     sublabel="Share anonymised data with skincare partners"               enabled={privacy.shareWithPartners}onToggle={()=>toggle('shareWithPartners')}delay={680} riskLevel="high"   />
        <DataToggle icon="🧠" label="AI Model Training"      sublabel="Allow your scans to improve our melanin AI models"         enabled={privacy.aiTraining}      onToggle={()=>toggle('aiTraining')}      delay={730} riskLevel="medium" />

        {/* Data usage meter */}
        <SectionLabel text="Your Data Footprint" delay={790} />
        <FadeSlide delay={820} style={s.meterCard}>
          <DataMeter label="Scan images stored"  used={3}   total={50}   unit="scans"  color={C.success} delay={840} />
          <DataMeter label="Storage used"        used={12}  total={100}  unit="MB"     color={C.gold}    delay={900} />
          <DataMeter label="Routine history"     used={7}   total={365}  unit="days"   color={C.warn}    delay={960} />
        </FadeSlide>

        {/* Your rights */}
        <SectionLabel text="Your Rights" delay={1020} />
        <ActionRow icon="↓"  label="Download My Data"      sublabel="Export all data as a ZIP file"              onPress={()=>{}}  delay={1050} />
        <ActionRow icon="◎"  label="View Stored Scans"     sublabel="See exactly what images we hold"            onPress={()=>{}}  delay={1090} />
        <ActionRow icon="✕"  label="Delete All Scan Data"  sublabel="Remove images while keeping your account"  onPress={()=>{}} danger delay={1130} />

        {/* Policies */}
        <SectionLabel text="Policies & Legal" delay={1180} />
        <ActionRow icon="📄" label="Privacy Policy"         sublabel="How we handle your personal data"  onPress={()=>{}} external delay={1210} />
        <ActionRow icon="📋" label="Terms of Service"       sublabel="Your agreement with Melanin Scan"  onPress={()=>{}} external delay={1250} />
        <ActionRow icon="🍪" label="Cookie Policy"          sublabel="Cookies and tracking technologies"  onPress={()=>{}} external delay={1290} />

        {/* NDPR notice */}
        <FadeSlide delay={1340} style={s.ndprCard}>
          <Text style={s.ndprIcon}>🇳🇬</Text>
          <View style={{ flex:1 }}>
            <Text style={s.ndprTitle}>NDPR Compliant</Text>
            <Text style={s.ndprText}>
              Melanin Scan complies with the Nigeria Data Protection Regulation (NDPR). Your data is processed lawfully and you have the right to access, correct, or delete it at any time.
            </Text>
          </View>
        </FadeSlide>

        <View style={{ height:80 }}/>
      </ScrollView>
    </AfricanBG>
  );
}

// ── Privacy score arc ─────────────────────────────────────────
function PrivacyScoreArc({ privacy }) {
  const values = Object.values(privacy);
  // Count "privacy-protecting" settings (off = better for privacy on data sharing)
  const risky   = ['shareWithPartners','aiTraining','personalisation'];
  const riskOn  = risky.filter(k=>privacy[k]).length;
  const score   = Math.round(100 - riskOn * 20);
  const color   = score >= 80 ? C.success : score >= 60 ? C.warn : C.error;
  return (
    <View style={{ alignItems:'center' }}>
      <View style={[psa.ring,{borderColor:color}]}>
        <Text style={[psa.score,{color}]}>{score}</Text>
        <Text style={psa.label}>/100</Text>
      </View>
      <Text style={[psa.verdict,{color}]}>{score>=80?'Strong':score>=60?'Good':'Fair'}</Text>
    </View>
  );
}
const psa = StyleSheet.create({
  ring:    { width:70,height:70,borderRadius:35,borderWidth:2.5,alignItems:'center',justifyContent:'center',backgroundColor:C.bgCard2 },
  score:   { fontSize:22,fontWeight:'900',lineHeight:24 },
  label:   { color:C.creamDim,fontSize:9,fontWeight:'600' },
  verdict: { fontSize:11,fontWeight:'800',marginTop:5 },
});

// ── Pulse ring ────────────────────────────────────────────────
function PulseRing({ size, delay }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const op    = useRef(new Animated.Value(0.5)).current;
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(scale,{toValue:1.1,duration:1400,useNativeDriver:true}),
        Animated.timing(op,  {toValue:0,  duration:1400,useNativeDriver:true}),
      ]),
      Animated.parallel([
        Animated.timing(scale,{toValue:0.8,duration:0,useNativeDriver:true}),
        Animated.timing(op,  {toValue:0.5,duration:0,useNativeDriver:true}),
      ]),
    ])).start();
  },[]);
  return (
    <Animated.View style={{
      position:'absolute',width:size,height:size,borderRadius:size/2,
      borderWidth:1,borderColor:'rgba(200,134,10,0.28)',
      transform:[{scale}],opacity:op,
    }}/>
  );
}

const s = StyleSheet.create({
  scroll:   { paddingTop:110,paddingHorizontal:22 },
  header:   { alignItems:'center',marginBottom:28 },
  shieldWrap:{ width:120,height:120,alignItems:'center',justifyContent:'center',marginBottom:16 },
  shieldOrb: { width:64,height:64,borderRadius:32,backgroundColor:C.goldPale,borderWidth:1.5,borderColor:C.gold,alignItems:'center',justifyContent:'center',shadowColor:C.gold,shadowOpacity:0.35,shadowOffset:{width:0,height:0},shadowRadius:12,elevation:8 },
  title:    { color:C.cream,fontSize:26,fontWeight:'900',marginBottom:8 },
  subtitle: { color:C.creamDim,fontSize:13,textAlign:'center',lineHeight:21,paddingHorizontal:16 },

  scoreCard:  { flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:16,padding:18,marginBottom:22 },
  scoreLeft:  { flex:1 },
  scoreLabel: { color:C.cream,fontSize:16,fontWeight:'800',marginBottom:4 },
  scoreDesc:  { color:C.creamDim,fontSize:12 },
  scoreRight: {},

  meterCard:  { backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:14,padding:16,marginBottom:8 },

  ndprCard:   { flexDirection:'row',alignItems:'flex-start',gap:12,backgroundColor:'rgba(93,190,138,0.07)',borderWidth:1,borderColor:'rgba(93,190,138,0.22)',borderRadius:14,padding:16,marginTop:4 },
  ndprIcon:   { fontSize:20 },
  ndprTitle:  { color:C.success,fontSize:13,fontWeight:'800',marginBottom:5 },
  ndprText:   { color:C.creamDim,fontSize:12,lineHeight:18 },
});
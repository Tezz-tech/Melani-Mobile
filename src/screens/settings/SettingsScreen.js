// src/screens/settings/SettingsScreen.js
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
  error:      '#E05C3A',
  errorPale:  'rgba(224,92,58,0.08)',
};

function AfricanBG({ children }) {
  return (
    <View style={{ flex:1, backgroundColor:C.bg }}>
      <View style={[bg.b,{ width:440,height:440,borderRadius:220,backgroundColor:'#6B3000',opacity:0.09,top:-140,left:-110 }]} />
      <View style={[bg.b,{ width:300,height:300,borderRadius:150,backgroundColor:C.gold,opacity:0.04,bottom:-80,right:-80 }]} />
      <View style={[bg.stripe,{ top:H*0.07 }]} />
      {[{top:H*0.10,left:W*0.05,o:0.20},{top:H*0.82,left:W*0.88,o:0.14}].map((d,i)=>(
        <View key={i} style={[bg.dot,{top:d.top,left:d.left,opacity:d.o}]}/>
      ))}
      {children}
    </View>
  );
}
const bg = StyleSheet.create({
  b:      { position:'absolute' },
  stripe: { position:'absolute',width:W,height:1.5,backgroundColor:'rgba(200,134,10,0.11)' },
  dot:    { position:'absolute',width:5,height:5,borderRadius:2.5,backgroundColor:C.gold },
});

function FadeSlide({ delay=0, from=16, children, style }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue:1,duration:480,delay,useNativeDriver:true }),
      Animated.spring(ty, { toValue:0,friction:8,tension:50,delay,useNativeDriver:true }),
    ]).start();
  }, []);
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
    <FadeSlide delay={delay} style={sl.wrap}>
      <View style={sl.bar}/>
      <Text style={sl.text}>{text}</Text>
    </FadeSlide>
  );
}
const sl = StyleSheet.create({
  wrap:{ flexDirection:'row',alignItems:'center',gap:8,marginBottom:10,marginTop:6 },
  bar: { width:3,height:14,borderRadius:2,backgroundColor:C.gold },
  text:{ color:C.gold,fontSize:10,fontWeight:'800',letterSpacing:1.8,textTransform:'uppercase' },
});

// ── Toggle row ────────────────────────────────────────────────
function ToggleRow({ icon, label, sublabel, value, onToggle, delay=0, danger=false }) {
  return (
    <FadeSlide delay={delay} style={{ marginBottom:8 }}>
      <View style={[tr.row, danger && tr.dangerRow]}>
        <View style={[tr.iconBox, danger && tr.dangerIconBox]}>
          <Text style={tr.icon}>{icon}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={[tr.label, danger && tr.dangerLabel]}>{label}</Text>
          {sublabel && <Text style={tr.sublabel}>{sublabel}</Text>}
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false:'rgba(200,134,10,0.15)', true:danger?'rgba(224,92,58,0.40)':C.gold }}
          thumbColor={value ? (danger?C.error:C.cream) : C.creamFaint}
          ios_backgroundColor="rgba(200,134,10,0.12)"
        />
      </View>
    </FadeSlide>
  );
}
const tr = StyleSheet.create({
  row:          { flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:14,padding:14 },
  dangerRow:    { backgroundColor:C.errorPale,borderColor:'rgba(224,92,58,0.22)' },
  iconBox:      { width:36,height:36,borderRadius:10,backgroundColor:C.goldPale,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center' },
  dangerIconBox:{ backgroundColor:'rgba(224,92,58,0.10)',borderColor:'rgba(224,92,58,0.25)' },
  icon:         { fontSize:16 },
  label:        { color:C.cream,fontSize:14,fontWeight:'600' },
  dangerLabel:  { color:C.error },
  sublabel:     { color:C.creamDim,fontSize:11,marginTop:2 },
});

// ── Nav row ───────────────────────────────────────────────────
function NavRow({ icon, label, sublabel, badge, badgeColor, onPress, delay=0, danger=false }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <FadeSlide delay={delay} style={{ marginBottom:8 }}>
      <TouchableOpacity
        onPress={onPress} activeOpacity={1}
        onPressIn={()=>Animated.spring(scale,{toValue:0.97,useNativeDriver:true}).start()}
        onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()}
      >
        <Animated.View style={[nr.row, danger && nr.dangerRow, {transform:[{scale}]}]}>
          <View style={[nr.iconBox, danger && nr.dangerIconBox]}>
            <Text style={nr.icon}>{icon}</Text>
          </View>
          <View style={{ flex:1 }}>
            <Text style={[nr.label, danger && nr.dangerLabel]}>{label}</Text>
            {sublabel && <Text style={nr.sublabel}>{sublabel}</Text>}
          </View>
          {badge && (
            <View style={[nr.badge,{backgroundColor:`${badgeColor||C.gold}18`,borderColor:`${badgeColor||C.gold}40`}]}>
              <Text style={[nr.badgeText,{color:badgeColor||C.gold}]}>{badge}</Text>
            </View>
          )}
          <Text style={[nr.arrow, danger && {color:C.error}]}>›</Text>
        </Animated.View>
      </TouchableOpacity>
    </FadeSlide>
  );
}
const nr = StyleSheet.create({
  row:          { flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:14,padding:14 },
  dangerRow:    { backgroundColor:C.errorPale,borderColor:'rgba(224,92,58,0.22)' },
  iconBox:      { width:36,height:36,borderRadius:10,backgroundColor:C.goldPale,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center' },
  dangerIconBox:{ backgroundColor:'rgba(224,92,58,0.10)',borderColor:'rgba(224,92,58,0.25)' },
  icon:         { fontSize:16 },
  label:        { color:C.cream,fontSize:14,fontWeight:'600' },
  dangerLabel:  { color:C.error },
  sublabel:     { color:C.creamDim,fontSize:11,marginTop:2 },
  badge:        { borderWidth:1,borderRadius:8,paddingHorizontal:8,paddingVertical:3,marginRight:4 },
  badgeText:    { fontSize:10,fontWeight:'800',letterSpacing:0.5 },
  arrow:        { color:C.creamDim,fontSize:22,fontWeight:'300',lineHeight:24 },
});

// ── Selector row ──────────────────────────────────────────────
function SelectorRow({ icon, label, value, options, onSelect, delay=0 }) {
  const [open, setOpen] = useState(false);
  return (
    <FadeSlide delay={delay} style={{ marginBottom:8 }}>
      <TouchableOpacity onPress={()=>setOpen(o=>!o)} activeOpacity={0.8}>
        <View style={[nr.row, open && { borderColor:C.gold }]}>
          <View style={nr.iconBox}>
            <Text style={nr.icon}>{icon}</Text>
          </View>
          <View style={{ flex:1 }}>
            <Text style={nr.label}>{label}</Text>
            <Text style={{ color:C.gold,fontSize:12,fontWeight:'700',marginTop:2 }}>{value}</Text>
          </View>
          <Text style={[nr.arrow,{transform:[{rotate:open?'90deg':'0deg'}]}]}>›</Text>
        </View>
      </TouchableOpacity>
      {open && (
        <View style={sel.optWrap}>
          {options.map((opt,i)=>(
            <TouchableOpacity key={i} style={[sel.opt, opt===value && sel.optActive]} onPress={()=>{onSelect(opt);setOpen(false);}}>
              <Text style={[sel.optText, opt===value && sel.optTextActive]}>{opt}</Text>
              {opt===value && <Text style={{ color:C.gold,fontSize:12,fontWeight:'800' }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </FadeSlide>
  );
}
const sel = StyleSheet.create({
  optWrap:     { backgroundColor:C.bgCard2,borderWidth:1,borderColor:C.border,borderRadius:12,marginTop:4,overflow:'hidden' },
  opt:         { flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:13,borderBottomWidth:1,borderBottomColor:C.border },
  optActive:   { backgroundColor:C.goldPale },
  optText:     { color:C.creamDim,fontSize:13,fontWeight:'500' },
  optTextActive:{ color:C.cream,fontWeight:'700' },
});

// ── Screen ────────────────────────────────────────────────────
export default function SettingsScreen() {
  const navigation = useNavigation();

  const [settings, setSettings] = useState({
    darkMode:       true,
    hapticFeedback: true,
    faceDetection:  true,
    autoSave:       true,
    analytics:      true,
    crashReports:   true,
    betaFeatures:   false,
    offlineMode:    false,
    highQualityScan:true,
  });

  const [language,   setLanguage]   = useState('English');
  const [currency,   setCurrency]   = useState('₦ NGN');
  const [scanQuality, setScanQuality] = useState('High Quality');
  const [cameraMode,  setCameraMode]  = useState('Front Camera');

  const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BackButton onPress={()=>navigation.goBack()} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <FadeSlide delay={0} style={s.header}>
          <Text style={s.title}>Settings</Text>
          <Text style={s.subtitle}>Customise your Melanin Scan experience</Text>
        </FadeSlide>

        {/* ── Account ── */}
        <SectionLabel text="Account" delay={80} />
        <NavRow icon="◉" label="Edit Profile"      sublabel="Name, email, phone"                           onPress={()=>{}}                                  delay={110} />
        <NavRow icon="💎" label="Subscription"      sublabel="Pro Plan · Renews Dec 1" badge="PRO" badgeColor={C.gold} onPress={()=>navigation.navigate('Subscription')} delay={160} />
        <NavRow icon="🔒" label="Security"          sublabel="Password, biometrics, 2FA"                   onPress={()=>{}}                                  delay={210} />
        <NavRow icon="🔔" label="Notifications"     sublabel="Reminders, alerts, marketing"                onPress={()=>navigation.navigate('Notifications')} delay={260} />

        {/* ── App Preferences ── */}
        <SectionLabel text="App Preferences" delay={300} />
        <ToggleRow icon="🌙" label="Dark Mode"          sublabel="Optimised for night viewing"    value={settings.darkMode}       onToggle={()=>toggle('darkMode')}       delay={330} />
        <ToggleRow icon="📳" label="Haptic Feedback"    sublabel="Vibration on interactions"      value={settings.hapticFeedback} onToggle={()=>toggle('hapticFeedback')} delay={370} />
        <SelectorRow icon="🌍" label="Language"     value={language}   options={['English','Pidgin English','Yoruba','Igbo','Hausa']} onSelect={setLanguage}  delay={410} />
        <SelectorRow icon="💰" label="Currency"     value={currency}   options={['₦ NGN','$ USD','£ GBP','€ EUR']}                  onSelect={setCurrency}  delay={450} />

        {/* ── Scan Settings ── */}
        <SectionLabel text="Scan Settings" delay={490} />
        <SelectorRow icon="◉" label="Camera"        value={cameraMode}  options={['Front Camera','Rear Camera']}                    onSelect={setCameraMode}  delay={520} />
        <SelectorRow icon="✦" label="Scan Quality"  value={scanQuality} options={['High Quality','Balanced','Battery Saver']}       onSelect={setScanQuality} delay={560} />
        <ToggleRow icon="◎" label="Face Detection Guide" sublabel="Show face alignment overlay" value={settings.faceDetection} onToggle={()=>toggle('faceDetection')} delay={600} />
        <ToggleRow icon="💾" label="Auto-Save Scans"     sublabel="Save all results to history" value={settings.autoSave}       onToggle={()=>toggle('autoSave')}       delay={640} />

        {/* ── Privacy & Data ── */}
        <SectionLabel text="Privacy & Data" delay={680} />
        <NavRow icon="🛡" label="Privacy Settings"  sublabel="Data usage, camera permissions"  onPress={()=>navigation.navigate('Privacy')}      delay={710} />
        <ToggleRow icon="📊" label="Analytics"       sublabel="Help us improve the app"        value={settings.analytics}   onToggle={()=>toggle('analytics')}   delay={750} />
        <ToggleRow icon="🐛" label="Crash Reports"   sublabel="Automatically send error logs"  value={settings.crashReports}onToggle={()=>toggle('crashReports')} delay={790} />

        {/* ── Advanced ── */}
        <SectionLabel text="Advanced" delay={830} />
        <ToggleRow icon="🧪" label="Beta Features"   sublabel="Early access to new tools"       value={settings.betaFeatures} onToggle={()=>toggle('betaFeatures')} delay={860} />
        <ToggleRow icon="📴" label="Offline Mode"    sublabel="Cache data for offline access"   value={settings.offlineMode}  onToggle={()=>toggle('offlineMode')}  delay={900} />
        <NavRow icon="🗑" label="Clear Cache"        sublabel="Free up storage space"           onPress={()=>{}}                                                   delay={940} />
        <NavRow icon="↓"  label="Export My Data"    sublabel="Download all your scan data"      onPress={()=>{}}                                                   delay={980} />

        {/* ── Support ── */}
        <SectionLabel text="Support" delay={1020} />
        <NavRow icon="◎" label="Help & FAQ"         sublabel="Get help using the app"           onPress={()=>navigation.navigate('Help')}          delay={1050} />
        <NavRow icon="✉" label="Contact Support"    sublabel="support@melaninscan.com"          onPress={()=>{}}                                                   delay={1090} />
        <NavRow icon="⭐" label="Rate the App"      sublabel="Leave a review on the App Store"  onPress={()=>{}}                                                   delay={1130} />

        {/* ── About ── */}
        <SectionLabel text="About" delay={1170} />
        <FadeSlide delay={1200} style={s.aboutCard}>
          <View style={s.aboutRow}>
            <View style={s.aboutLogoMark}><Text style={{ color:C.gold,fontSize:14,fontWeight:'900' }}>M</Text></View>
            <View>
              <Text style={s.aboutName}>Melanin Scan</Text>
              <Text style={s.aboutVersion}>Version 1.0.0  ·  Build 100</Text>
            </View>
          </View>
          <Text style={s.aboutTagline}>Built for melanin-rich skin, by design.</Text>
          <View style={s.aboutLinks}>
            {['Terms of Service','Privacy Policy','Licenses'].map((l,i)=>(
              <TouchableOpacity key={i}><Text style={s.aboutLink}>{l}</Text></TouchableOpacity>
            ))}
          </View>
        </FadeSlide>

        {/* Danger zone */}
        <SectionLabel text="Danger Zone" delay={1260} />
        <NavRow icon="↩" label="Sign Out"           danger onPress={()=>navigation.reset({index:0,routes:[{name:'Welcome'}]})} delay={1290} />
        <NavRow icon="✕" label="Delete Account"     danger sublabel="Permanently remove all data"   onPress={()=>navigation.navigate('DeleteAccount')} delay={1330} />

        <View style={{ height:80 }}/>
      </ScrollView>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll:  { paddingTop:110,paddingHorizontal:22 },
  header:  { marginBottom:24 },
  title:   { color:C.cream,fontSize:28,fontWeight:'900',marginBottom:4 },
  subtitle:{ color:C.creamDim,fontSize:13 },

  aboutCard:    { backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:14,padding:16,marginBottom:8 },
  aboutRow:     { flexDirection:'row',alignItems:'center',gap:12,marginBottom:10 },
  aboutLogoMark:{ width:38,height:38,borderRadius:10,backgroundColor:C.goldPale,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center' },
  aboutName:    { color:C.cream,fontSize:15,fontWeight:'800',marginBottom:2 },
  aboutVersion: { color:C.creamDim,fontSize:11 },
  aboutTagline: { color:C.creamFaint,fontSize:12,marginBottom:12,fontStyle:'italic' },
  aboutLinks:   { flexDirection:'row',gap:16 },
  aboutLink:    { color:C.gold,fontSize:11,fontWeight:'600',textDecorationLine:'underline' },
});
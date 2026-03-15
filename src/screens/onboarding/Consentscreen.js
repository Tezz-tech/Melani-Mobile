// src/screens/onboarding/ConsentScreen.js
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, ScrollView, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg:        '#0F0500',
  bgCard:    '#1A0A02',
  bgInput:   '#1E0C03',
  border:    'rgba(200,134,10,0.25)',
  gold:      '#C8860A',
  goldPale:  'rgba(200,134,10,0.15)',
  cream:     '#F5DEB3',
  creamDim:  'rgba(245,222,179,0.55)',
  creamFaint:'rgba(245,222,179,0.20)',
  success:   '#5DBE8A',
  error:     '#E05C3A',
};

// ── African background ────────────────────────────────────────
function AfricanBG({ children }) {
  return (
    <View style={{ flex:1, backgroundColor:C.bg }}>
      <View style={[ab.b, { width:460, height:460, borderRadius:230, backgroundColor:'#7B3F00', opacity:0.11, top:-140, left:-110 }]} />
      <View style={[ab.b, { width:300, height:300, borderRadius:150, backgroundColor:C.gold,   opacity:0.05, bottom:-80, right:-80 }]} />
      <View style={[ab.b, { width:200, height:200, borderRadius:100, borderWidth:1, borderColor:'rgba(200,134,10,0.13)', top:-65, left:-65 }]} />
      <View style={[ab.stripe, { top:H*0.07 }]} />
      <View style={[ab.stripe, { top:H*0.073, height:0.8, backgroundColor:'rgba(240,192,64,0.09)' }]} />
      {[{top:H*0.10,left:W*0.07,o:0.28},{top:H*0.18,left:W*0.89,o:0.18},{top:H*0.82,left:W*0.06,o:0.22}].map((d,i)=>(
        <View key={i} style={[ab.dot,{top:d.top,left:d.left,opacity:d.o}]} />
      ))}
      {children}
    </View>
  );
}
const ab = StyleSheet.create({
  b:      { position:'absolute' },
  stripe: { position:'absolute', width:W, height:1.5, backgroundColor:'rgba(200,134,10,0.16)' },
  dot:    { position:'absolute', width:5, height:5, borderRadius:2.5, backgroundColor:C.gold },
});

// ── FadeSlide ─────────────────────────────────────────────────
function FadeSlide({ delay=0, from=20, children, style }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue:1, duration:520, delay, useNativeDriver:true }),
      Animated.spring(translateY, { toValue:0, friction:8, tension:50, delay, useNativeDriver:true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform:[{translateY}] }, style]}>{children}</Animated.View>;
}

// ── Gold button ───────────────────────────────────────────────
function GoldButton({ label, onPress, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform:[{scale}] }}>
      <TouchableOpacity
        style={[gb.root, disabled && gb.disabled]} onPress={onPress} activeOpacity={1} disabled={disabled}
        onPressIn={()=>!disabled && Animated.spring(scale,{toValue:0.96,useNativeDriver:true}).start()}
        onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()}
      >
        <View style={gb.shimmer} />
        <Text style={[gb.label, disabled && gb.labelDisabled]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
const gb = StyleSheet.create({
  root:         { backgroundColor:C.gold, borderRadius:14, paddingVertical:17, alignItems:'center', overflow:'hidden', shadowColor:C.gold, shadowOffset:{width:0,height:6}, shadowOpacity:0.45, shadowRadius:16, elevation:10 },
  disabled:     { backgroundColor:'rgba(200,134,10,0.25)', shadowOpacity:0 },
  shimmer:      { position:'absolute', top:0, left:0, right:0, height:'55%', backgroundColor:'rgba(255,255,255,0.10)', borderRadius:14 },
  label:        { color:'#0F0500', fontSize:16, fontWeight:'800', letterSpacing:1.5, textTransform:'uppercase' },
  labelDisabled:{ color:'rgba(15,5,0,0.4)' },
});

// ── Back button ───────────────────────────────────────────────
function BackButton({ onPress }) {
  return (
    <TouchableOpacity style={{ position:'absolute', top:56, left:24, zIndex:99 }} onPress={onPress} activeOpacity={0.7}>
      <View style={{ width:42, height:42, borderRadius:12, backgroundColor:'rgba(200,134,10,0.12)', borderWidth:1, borderColor:C.border, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ color:C.cream, fontSize:18, lineHeight:22 }}>←</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Animated checkbox ─────────────────────────────────────────
function Checkbox({ checked, onToggle }) {
  const scale    = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const bgAnim   = useRef(new Animated.Value(checked ? 1 : 0)).current;

  const toggle = () => {
    onToggle();
    const toVal = checked ? 0 : 1;
    Animated.parallel([
      Animated.spring(scale,  { toValue:toVal, friction:5, tension:60, useNativeDriver:true }),
      Animated.timing(bgAnim, { toValue:toVal, duration:200, useNativeDriver:false }),
    ]).start();
  };

  const bg = bgAnim.interpolate({ inputRange:[0,1], outputRange:[C.bgInput,'rgba(200,134,10,0.18)'] });
  const border = bgAnim.interpolate({ inputRange:[0,1], outputRange:[C.border, C.gold] });

  return (
    <TouchableOpacity onPress={toggle} activeOpacity={0.8}>
      <Animated.View style={{ width:24, height:24, borderRadius:6, borderWidth:1.5, borderColor:border, backgroundColor:bg, alignItems:'center', justifyContent:'center' }}>
        <Animated.Text style={{ color:C.gold, fontSize:13, fontWeight:'900', transform:[{scale}] }}>✓</Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Consent item ──────────────────────────────────────────────
function ConsentItem({ icon, title, body, checked, onToggle, delay, required = false }) {
  return (
    <FadeSlide delay={delay} style={{ marginBottom: 14 }}>
      <View style={ci.card}>
        {/* Icon badge */}
        <View style={ci.iconBadge}>
          <Text style={ci.iconText}>{icon}</Text>
        </View>
        {/* Text */}
        <View style={ci.text}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:4 }}>
            <Text style={ci.title}>{title}</Text>
            {required && (
              <View style={ci.requiredBadge}>
                <Text style={ci.requiredText}>Required</Text>
              </View>
            )}
          </View>
          <Text style={ci.body}>{body}</Text>
        </View>
        {/* Checkbox */}
        <Checkbox checked={checked} onToggle={onToggle} />
      </View>
    </FadeSlide>
  );
}
const ci = StyleSheet.create({
  card: {
    flexDirection:'row', alignItems:'flex-start', gap:14,
    backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border,
    borderRadius:16, padding:16,
  },
  iconBadge: { width:40, height:40, borderRadius:10, backgroundColor:C.goldPale, borderWidth:1, borderColor:C.border, alignItems:'center', justifyContent:'center' },
  iconText:  { fontSize:18 },
  text:      { flex:1 },
  title:     { color:C.cream, fontSize:14, fontWeight:'700' },
  body:      { color:C.creamDim, fontSize:12, lineHeight:18 },
  requiredBadge: { backgroundColor:'rgba(200,134,10,0.15)', borderRadius:6, paddingHorizontal:8, paddingVertical:2 },
  requiredText:  { color:C.gold, fontSize:9, fontWeight:'700', letterSpacing:0.5 },
});

// ── Disclaimer box ────────────────────────────────────────────
function DisclaimerBox() {
  return (
    <FadeSlide delay={550} style={db.wrap}>
      <View style={db.iconRow}>
        <Text style={db.icon}>⚕</Text>
        <Text style={db.title}>Not Medical Advice</Text>
      </View>
      <Text style={db.body}>
        Melani Scan provides cosmetic, observational skin analysis only. This is not a medical diagnosis and should not replace professional dermatological advice.
      </Text>
    </FadeSlide>
  );
}
const db = StyleSheet.create({
  wrap: {
    backgroundColor:'rgba(224,92,58,0.08)', borderWidth:1, borderColor:'rgba(224,92,58,0.25)',
    borderRadius:14, padding:16, marginBottom:20,
  },
  iconRow: { flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 },
  icon:    { fontSize:16 },
  title:   { color:'#E05C3A', fontSize:13, fontWeight:'700' },
  body:    { color:'rgba(245,222,179,0.55)', fontSize:12, lineHeight:18 },
});

// ── Screen ────────────────────────────────────────────────────
const CONSENTS = [
  { id:'camera',   icon:'📷', title:'Camera Access',       body:'We use your front camera to capture your skin for analysis. Images are processed securely and never stored without your permission.', required:true  },
  { id:'process',  icon:'🔒', title:'Image Processing',    body:'Your image is sent to our secure servers for AI analysis. We do not use your images to train AI models without explicit opt-in.', required:true  },
  { id:'storage',  icon:'📁', title:'Store Scan History',  body:'We save your past scans so you can track progress over time. You can delete your history at any time from Settings.',              required:false },
  { id:'notifs',   icon:'🔔', title:'Routine Reminders',   body:'Get gentle reminders to follow your skincare routine and re-scan monthly. You can turn these off anytime.',                         required:false },
];

export default function ConsentScreen() {
  const navigation = useNavigation();
  const [checked, setChecked] = useState({ camera:false, process:false, storage:false, notifs:false });

  const allRequired = checked.camera && checked.process;

  const toggle = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BackButton onPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <FadeSlide delay={0} style={s.header}>
          {/* Shield icon */}
          <View style={s.shieldWrap}>
            <View style={s.shieldOuter}>
              <View style={s.shieldInner}>
                <Text style={s.shieldIcon}>🛡</Text>
              </View>
            </View>
            {/* Pulse rings */}
            <PulseRing size={100} delay={0} />
            <PulseRing size={130} delay={400} />
          </View>
          <Text style={s.title}>Your Privacy{'\n'}Comes First</Text>
          <Text style={s.subtitle}>
            Before we begin, we need a few permissions. Required items are needed for the app to work.
          </Text>
        </FadeSlide>

        {/* Consent items */}
        <View style={{ marginBottom: 8 }}>
          {CONSENTS.map((item, i) => (
            <ConsentItem
              key={item.id}
              icon={item.icon}
              title={item.title}
              body={item.body}
              checked={checked[item.id]}
              onToggle={() => toggle(item.id)}
              delay={200 + i * 80}
              required={item.required}
            />
          ))}
        </View>

        {/* Disclaimer */}
        <DisclaimerBox />

        {/* CTA */}
        <FadeSlide delay={650}>
          <GoldButton
            label={allRequired ? 'I Agree — Continue' : 'Accept Required to Continue'}
            onPress={() => navigation.navigate('ProfileSetup')}
            disabled={!allRequired}
          />
        </FadeSlide>

        {/* Accept all shortcut */}
        {!Object.values(checked).every(Boolean) && (
          <FadeSlide delay={720} style={{ alignItems:'center', marginTop:16 }}>
            <TouchableOpacity onPress={() => setChecked({ camera:true, process:true, storage:true, notifs:true })}>
              <Text style={{ color:C.gold, fontSize:13, fontWeight:'600' }}>Accept All Permissions</Text>
            </TouchableOpacity>
          </FadeSlide>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </AfricanBG>
  );
}

// ── Pulsing ring animation ────────────────────────────────────
function PulseRing({ size, delay }) {
  const scale   = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(scale,   { toValue:1.1, duration:1400, useNativeDriver:true }),
        Animated.timing(opacity, { toValue:0,   duration:1400, useNativeDriver:true }),
      ]),
      Animated.parallel([
        Animated.timing(scale,   { toValue:0.8, duration:0, useNativeDriver:true }),
        Animated.timing(opacity, { toValue:0.6, duration:0, useNativeDriver:true }),
      ]),
    ])).start();
  }, []);
  return (
    <Animated.View style={{
      position:'absolute',
      width:size, height:size, borderRadius:size/2,
      borderWidth:1, borderColor:`rgba(200,134,10,0.30)`,
      transform:[{scale}], opacity,
    }} />
  );
}

const s = StyleSheet.create({
  scroll: { paddingTop:110, paddingHorizontal:24 },
  header: { alignItems:'center', marginBottom:32 },

  shieldWrap:  { width:130, height:130, alignItems:'center', justifyContent:'center', marginBottom:24 },
  shieldOuter: { width:76, height:76, borderRadius:38, backgroundColor:C.goldPale, borderWidth:1.5, borderColor:C.gold, alignItems:'center', justifyContent:'center', shadowColor:C.gold, shadowOpacity:0.4, shadowOffset:{width:0,height:0}, shadowRadius:14, elevation:8 },
  shieldInner: { width:54, height:54, borderRadius:27, backgroundColor:'rgba(200,134,10,0.20)', alignItems:'center', justifyContent:'center' },
  shieldIcon:  { fontSize:24 },

  title:    { color:C.cream, fontSize:30, fontWeight:'800', letterSpacing:0.3, textAlign:'center', marginBottom:10 },
  subtitle: { color:C.creamDim, fontSize:14, textAlign:'center', lineHeight:22, paddingHorizontal:16 },
});
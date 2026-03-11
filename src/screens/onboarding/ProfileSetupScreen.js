// src/screens/onboarding/ProfileSetupScreen.js
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
};

// ── African background ────────────────────────────────────────
function AfricanBG({ children }) {
  return (
    <View style={{ flex:1, backgroundColor:C.bg }}>
      <View style={[ab.b, { width:460, height:460, borderRadius:230, backgroundColor:'#7B3F00', opacity:0.11, top:-130, left:-110 }]} />
      <View style={[ab.b, { width:320, height:320, borderRadius:160, backgroundColor:C.gold,   opacity:0.05, bottom:-90, right:-90 }]} />
      <View style={[ab.b, { width:200, height:200, borderRadius:100, borderWidth:1, borderColor:'rgba(200,134,10,0.12)', top:-65, left:-65 }]} />
      <View style={[ab.stripe, { top:H*0.07 }]} />
      <View style={[ab.stripe, { top:H*0.073, height:0.8, backgroundColor:'rgba(240,192,64,0.08)' }]} />
      {[{top:H*0.10,left:W*0.07,o:0.26},{top:H*0.16,left:W*0.89,o:0.18},{top:H*0.84,left:W*0.88,o:0.20}].map((d,i)=>(
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
function GoldButton({ label, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform:[{scale}] }}>
      <TouchableOpacity
        style={gb.root} onPress={onPress} activeOpacity={1}
        onPressIn={()=>Animated.spring(scale,{toValue:0.96,useNativeDriver:true}).start()}
        onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()}
      >
        <View style={gb.shimmer} />
        <Text style={gb.label}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
const gb = StyleSheet.create({
  root:    { backgroundColor:C.gold, borderRadius:14, paddingVertical:17, alignItems:'center', overflow:'hidden', shadowColor:C.gold, shadowOffset:{width:0,height:6}, shadowOpacity:0.45, shadowRadius:16, elevation:10 },
  shimmer: { position:'absolute', top:0, left:0, right:0, height:'55%', backgroundColor:'rgba(255,255,255,0.10)', borderRadius:14 },
  label:   { color:'#0F0500', fontSize:16, fontWeight:'800', letterSpacing:1.5, textTransform:'uppercase' },
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

// ── Section header ────────────────────────────────────────────
function SectionHeader({ icon, label, delay }) {
  return (
    <FadeSlide delay={delay} style={sh.wrap}>
      <View style={sh.dot} />
      <Text style={sh.label}>{label}</Text>
    </FadeSlide>
  );
}
const sh = StyleSheet.create({
  wrap:  { flexDirection:'row', alignItems:'center', gap:8, marginBottom:12, marginTop:4 },
  dot:   { width:6, height:6, borderRadius:3, backgroundColor:C.gold },
  label: { color:C.gold, fontSize:11, fontWeight:'700', letterSpacing:1.5, textTransform:'uppercase' },
});

// ── Pill chip selector ────────────────────────────────────────
function ChipGroup({ options, selected, onSelect, multi = false, delay = 0 }) {
  return (
    <FadeSlide delay={delay}>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:4 }}>
        {options.map((opt, i) => {
          const active = multi ? selected.includes(opt.value) : selected === opt.value;
          return (
            <ChipItem
              key={opt.value}
              label={opt.label}
              icon={opt.icon}
              active={active}
              onPress={() => {
                if (multi) {
                  onSelect(prev =>
                    prev.includes(opt.value)
                      ? prev.filter(v => v !== opt.value)
                      : [...prev, opt.value]
                  );
                } else {
                  onSelect(opt.value);
                }
              }}
            />
          );
        })}
      </View>
    </FadeSlide>
  );
}

function ChipItem({ label, icon, active, onPress }) {
  const scale    = useRef(new Animated.Value(1)).current;
  const bgAnim   = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(bgAnim, { toValue:active?1:0, duration:200, useNativeDriver:false }).start();
  }, [active]);

  const bgColor     = bgAnim.interpolate({ inputRange:[0,1], outputRange:[C.bgCard, 'rgba(200,134,10,0.18)'] });
  const borderColor = bgAnim.interpolate({ inputRange:[0,1], outputRange:[C.border, C.gold] });

  return (
    <Animated.View style={{ transform:[{scale}] }}>
      <TouchableOpacity
        onPress={onPress} activeOpacity={1}
        onPressIn={()=>Animated.spring(scale,{toValue:0.94,useNativeDriver:true}).start()}
        onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()}
      >
        <Animated.View style={[chip.root, { backgroundColor:bgColor, borderColor }]}>
          {icon && <Text style={chip.icon}>{icon}</Text>}
          <Text style={[chip.label, active && chip.labelActive]}>{label}</Text>
          {active && <Text style={chip.check}>✓</Text>}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const chip = StyleSheet.create({
  root:        { flexDirection:'row', alignItems:'center', gap:6, borderWidth:1.5, borderRadius:22, paddingHorizontal:14, paddingVertical:9 },
  icon:        { fontSize:14 },
  label:       { color:C.creamDim, fontSize:13, fontWeight:'600' },
  labelActive: { color:C.cream },
  check:       { color:C.gold, fontSize:11, fontWeight:'900', marginLeft:2 },
});

// ── Data ──────────────────────────────────────────────────────
const AGE_RANGES = [
  { value:'under18', label:'Under 18' },
  { value:'18-24',   label:'18 – 24'  },
  { value:'25-34',   label:'25 – 34'  },
  { value:'35-44',   label:'35 – 44'  },
  { value:'45plus',  label:'45+'      },
];

const GENDERS = [
  { value:'female', label:'Female', icon:'♀' },
  { value:'male',   label:'Male',   icon:'♂' },
  { value:'nb',     label:'Non-binary', icon:'◎' },
  { value:'prefer', label:'Prefer not to say' },
];

const CONCERNS = [
  { value:'acne',            label:'Acne',              icon:'●' },
  { value:'hyperpigmentation',label:'Hyperpigmentation',icon:'◑' },
  { value:'dark_spots',      label:'Dark Spots',        icon:'◔' },
  { value:'oiliness',        label:'Oiliness',          icon:'💧' },
  { value:'dryness',         label:'Dryness',           icon:'🌿' },
  { value:'uneven_tone',     label:'Uneven Tone',       icon:'◒' },
  { value:'texture',         label:'Texture',           icon:'◈' },
  { value:'sensitivity',     label:'Sensitivity',       icon:'✦' },
  { value:'dark_circles',    label:'Dark Circles',      icon:'○' },
  { value:'none',            label:'No concerns yet',   icon:'◎' },
];

const SKIN_GOALS = [
  { value:'glow',       label:'Even Glow',      icon:'✨' },
  { value:'clear',      label:'Clear Skin',     icon:'◉' },
  { value:'hydrated',   label:'Hydration',      icon:'💧' },
  { value:'anti_age',   label:'Anti-Aging',     icon:'⟳' },
  { value:'brighten',   label:'Brightening',    icon:'☀' },
  { value:'reduce_oiliness', label:'Less Oily', icon:'◈' },
];

// ── Progress bar ──────────────────────────────────────────────
function StepBar({ step, total }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(progress, { toValue: step/total, friction:8, tension:50, useNativeDriver:false }).start();
  }, [step]);
  const width = progress.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] });
  return (
    <View style={pb.track}>
      <Animated.View style={[pb.fill, { width }]} />
    </View>
  );
}
const pb = StyleSheet.create({
  track: { height:3, backgroundColor:C.border, borderRadius:2, marginBottom:24, overflow:'hidden' },
  fill:  { height:'100%', backgroundColor:C.gold, borderRadius:2 },
});

// ── Screen ────────────────────────────────────────────────────
export default function ProfileSetupScreen() {
  const navigation = useNavigation();

  const [step,     setStep]     = useState(0); // 0=age 1=gender 2=concerns 3=goals
  const [ageRange, setAgeRange] = useState('');
  const [gender,   setGender]   = useState('');
  const [concerns, setConcerns] = useState([]);
  const [goals,    setGoals]    = useState([]);

  const canNext = () => {
    if (step === 0) return !!ageRange;
    if (step === 1) return !!gender;
    if (step === 2) return concerns.length > 0;
    if (step === 3) return goals.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 3) { setStep(s => s + 1); return; }
    // TODO: save profile to backend / context
    navigation.reset({ index:0, routes:[{ name:'Main' }] });
  };

  const handleSkip = () => {
    navigation.reset({ index:0, routes:[{ name:'Main' }] });
  };

  // Slide content
  const slideIn = useRef(new Animated.Value(40)).current;
  const slideOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slideIn.setValue(40);
    slideOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(slideOpacity, { toValue:1, duration:400, useNativeDriver:true }),
      Animated.spring(slideIn,      { toValue:0, friction:8, tension:50, useNativeDriver:true }),
    ]).start();
  }, [step]);

  const STEPS = [
    { title: 'How old are you?',       subtitle: 'We tailor ingredient recommendations by age group.' },
    { title: 'How do you identify?',   subtitle: 'Optional — helps us personalise your recommendations.' },
    { title: 'What are your concerns?', subtitle: 'Select all that apply. You can update these anytime.' },
    { title: 'What are your goals?',   subtitle: 'What does great skin look like for you?' },
  ];

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BackButton onPress={() => step > 0 ? setStep(s=>s-1) : navigation.goBack()} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <FadeSlide delay={0} style={s.header}>
          {/* Logo mark */}
          <View style={s.logoRing}>
            <Text style={s.logoLetter}>M</Text>
          </View>
          <View style={s.stepLabel}>
            <View style={s.stepDot} />
            <Text style={s.stepLabelText}>STEP {step + 1} OF 4</Text>
          </View>
        </FadeSlide>

        {/* Progress */}
        <StepBar step={step + 1} total={4} />

        {/* Step title */}
        <Animated.View style={{ opacity:slideOpacity, transform:[{translateY:slideIn}], marginBottom:6 }}>
          <Text style={s.title}>{STEPS[step].title}</Text>
          <Text style={s.subtitle}>{STEPS[step].subtitle}</Text>
        </Animated.View>

        {/* Step content */}
        <Animated.View style={{ opacity:slideOpacity, transform:[{translateY:slideIn}] }}>
          {step === 0 && (
            <>
              <SectionHeader label="Age Range" delay={0} />
              <ChipGroup options={AGE_RANGES} selected={ageRange} onSelect={setAgeRange} delay={100} />
            </>
          )}
          {step === 1 && (
            <>
              <SectionHeader label="Gender (Optional)" delay={0} />
              <ChipGroup options={GENDERS} selected={gender} onSelect={setGender} delay={100} />
              <FadeSlide delay={300} style={{ marginTop:10 }}>
                <TouchableOpacity onPress={() => { setGender('prefer'); }}>
                  <Text style={{ color:C.creamDim, fontSize:13, textDecorationLine:'underline' }}>
                    Prefer not to share
                  </Text>
                </TouchableOpacity>
              </FadeSlide>
            </>
          )}
          {step === 2 && (
            <>
              <SectionHeader label="Skin Concerns" delay={0} />
              <ChipGroup options={CONCERNS} selected={concerns} onSelect={setConcerns} multi delay={100} />
            </>
          )}
          {step === 3 && (
            <>
              <SectionHeader label="Skin Goals" delay={0} />
              <ChipGroup options={SKIN_GOALS} selected={goals} onSelect={setGoals} multi delay={100} />

              {/* Summary card */}
              <FadeSlide delay={400} style={s.summaryCard}>
                <Text style={s.summaryTitle}>Your Profile Summary</Text>
                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Age Range</Text>
                  <Text style={s.summaryVal}>{ageRange || '—'}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Gender</Text>
                  <Text style={s.summaryVal}>{gender || '—'}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Concerns</Text>
                  <Text style={s.summaryVal}>{concerns.length > 0 ? concerns.slice(0,3).join(', ') + (concerns.length > 3 ? ` +${concerns.length - 3}` : '') : '—'}</Text>
                </View>
              </FadeSlide>
            </>
          )}
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom actions — fixed */}
      <View style={s.bottomBar}>
        {step < 3 && (
          <TouchableOpacity onPress={handleSkip} style={s.skipBtn}>
            <Text style={s.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex:1, marginLeft: step < 3 ? 14 : 0 }}>
          <GoldButton
            label={step < 3 ? 'Continue' : 'Start My Journey'}
            onPress={handleNext}
          />
        </View>
      </View>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll: { paddingTop:108, paddingHorizontal:24 },

  header:        { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:20 },
  logoRing:      { width:42, height:42, borderRadius:21, borderWidth:1.5, borderColor:C.gold, backgroundColor:C.goldPale, alignItems:'center', justifyContent:'center' },
  logoLetter:    { color:C.gold, fontSize:16, fontWeight:'900' },
  stepLabel:     { flexDirection:'row', alignItems:'center', gap:6 },
  stepDot:       { width:6, height:6, borderRadius:3, backgroundColor:C.gold },
  stepLabelText: { color:C.gold, fontSize:11, fontWeight:'700', letterSpacing:1.5 },

  title:    { color:C.cream, fontSize:28, fontWeight:'800', letterSpacing:0.3, marginBottom:8 },
  subtitle: { color:C.creamDim, fontSize:14, lineHeight:21, marginBottom:24 },

  summaryCard:  { backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, borderRadius:14, padding:16, marginTop:20 },
  summaryTitle: { color:C.gold, fontSize:12, fontWeight:'700', letterSpacing:1, textTransform:'uppercase', marginBottom:12 },
  summaryRow:   { flexDirection:'row', justifyContent:'space-between', marginBottom:8 },
  summaryKey:   { color:C.creamDim, fontSize:13 },
  summaryVal:   { color:C.cream, fontSize:13, fontWeight:'600', flex:1, textAlign:'right', textTransform:'capitalize' },

  bottomBar: {
    position:'absolute', bottom:0, left:0, right:0,
    flexDirection:'row', alignItems:'center',
    paddingHorizontal:24, paddingBottom:36, paddingTop:16,
    backgroundColor:'rgba(15,5,0,0.92)',
    borderTopWidth:1, borderTopColor:C.border,
  },
  skipBtn:  { paddingVertical:17, paddingHorizontal:4 },
  skipText: { color:C.creamDim, fontSize:14, fontWeight:'600' },
});
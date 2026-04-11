// src/screens/onboarding/OnboardingScreen.js
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  StatusBar, Dimensions, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg:        '#0F0500',
  bgCard:    '#1A0A02',
  border:    'rgba(200,134,10,0.25)',
  gold:      '#C8860A',
  goldLight: '#E8A020',
  goldPale:  'rgba(200,134,10,0.15)',
  cream:     '#F5DEB3',
  creamDim:  'rgba(245,222,179,0.55)',
  creamFaint:'rgba(245,222,179,0.20)',
};

// ── Slide data ────────────────────────────────────────────────
const SLIDES = [
  {
    id: '1',
    icon: '◉',
    iconBig: '⬡',
    accent: '#C8860A',
    tag: 'MELANIN-FIRST',
    title: 'Built for\nYour Skin',
    body: 'Most skincare AI was trained on lighter skin tones. Melani Scan was built from the ground up for melanin-rich skin — nothing is adapted, everything is intentional.',
    decorShape: 'hexagon',
  },
  {
    id: '2',
    icon: '◈',
    iconBig: '⬟',
    accent: '#B8760A',
    tag: 'AI ANALYSIS',
    title: 'Scan.\nUnderstand.\nGlow.',
    body: 'Point your camera. Our AI reads your skin type, spots hyperpigmentation, dark spots, texture — and explains what it all means for melanin skin specifically.',
    decorShape: 'diamond',
  },
  {
    id: '3',
    icon: '✦',
    iconBig: '❋',
    accent: '#D09020',
    tag: 'AFRICAN ROOTS',
    title: 'Routines Made\nfor Africa',
    body: 'We account for Nigerian climate, water quality, local brands, and your budget. Every recommendation is something you can actually find and afford.',
    decorShape: 'star',
  },
  {
    id: '4',
    icon: '◎',
    iconBig: '◯',
    accent: '#C8860A',
    tag: 'YOUR JOURNEY',
    title: 'Track Your\nSkin Story',
    body: 'Scan today, compare next month. Watch your routine work in real time. Melani Scan grows with you — a companion, not just a scanner.',
    decorShape: 'circle',
  },
];

// ── African background ────────────────────────────────────────
function AfricanBG({ children, accent = C.gold }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[ab.b, { width: 500, height: 500, borderRadius: 250, backgroundColor: '#6B3000', opacity: 0.13, top: -160, left: -140 }]} />
      <View style={[ab.b, { width: 400, height: 400, borderRadius: 200, backgroundColor: accent,   opacity: 0.05, bottom: -100, right: -100 }]} />
      <View style={[ab.b, { width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: 'rgba(200,134,10,0.14)', top: -70, left: -70 }]} />
      <View style={[ab.b, { width: 160, height: 160, borderRadius: 80,  borderWidth: 1, borderColor: 'rgba(200,134,10,0.09)', bottom: -50, right: -50 }]} />
      <View style={[ab.stripe, { top: H * 0.07 }]} />
      <View style={[ab.stripe, { top: H * 0.073, height: 0.8, backgroundColor: 'rgba(240,192,64,0.09)' }]} />
      <View style={[ab.stripe, { bottom: H * 0.07 }]} />
      {[{top:H*0.10,left:W*0.06,o:0.30},{top:H*0.16,left:W*0.90,o:0.20},{top:H*0.80,left:W*0.88,o:0.22}].map((d,i)=>(
        <View key={i} style={[ab.dot,{top:d.top,left:d.left,opacity:d.o}]} />
      ))}
      {children}
    </View>
  );
}
const ab = StyleSheet.create({
  b:      { position: 'absolute' },
  stripe: { position: 'absolute', width: W, height: 1.5, backgroundColor: 'rgba(200,134,10,0.16)' },
  dot:    { position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.gold },
});

// ── FadeSlide ─────────────────────────────────────────────────
function FadeSlide({ delay = 0, from = 20, children, style }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 520, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 50, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform:[{ translateY }] }, style]}>{children}</Animated.View>;
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
  root:    { backgroundColor: C.gold, borderRadius: 14, paddingVertical: 17, alignItems: 'center', overflow: 'hidden', shadowColor: C.gold, shadowOffset:{width:0,height:6}, shadowOpacity:0.45, shadowRadius:16, elevation:10 },
  shimmer: { position:'absolute', top:0, left:0, right:0, height:'55%', backgroundColor:'rgba(255,255,255,0.10)', borderRadius:14 },
  label:   { color: '#0F0500', fontSize: 16, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
});

// ── Decorative icon illustration ──────────────────────────────
function SlideIllustration({ item, animVal }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spin,  { toValue: 1, duration: 12000, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1,    duration: 1600, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.85, duration: 1600, useNativeDriver: true }),
    ])).start();
  }, []);

  const rotate = spin.interpolate({ inputRange:[0,1], outputRange:['0deg','360deg'] });

  return (
    <View style={il.wrap}>
      {/* Outer spinning ring */}
      <Animated.View style={[il.outerRing, { transform:[{rotate}] }]} />
      {/* Middle pulsing ring */}
      <Animated.View style={[il.midRing, { transform:[{scale:pulse}] }]} />
      {/* Inner glow */}
      <Animated.View style={[il.glow, { backgroundColor: item.accent, transform:[{scale:pulse}] }]} />
      {/* Center icon */}
      <View style={il.center}>
        <Text style={[il.mainIcon, { color: item.accent }]}>{item.icon}</Text>
      </View>
      {/* Orbiting dots */}
      {[0,1,2,3].map(i => {
        const angle = (i / 4) * Math.PI * 2;
        const r = 68;
        return (
          <View key={i} style={[il.orbitDot, {
            top:  90 + Math.sin(angle) * r - 4,
            left: 90 + Math.cos(angle) * r - 4,
            opacity: 0.5 + i * 0.12,
          }]} />
        );
      })}
    </View>
  );
}
const il = StyleSheet.create({
  wrap:     { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  outerRing:{ position:'absolute', width:170, height:170, borderRadius:85, borderWidth:1, borderColor:'rgba(200,134,10,0.22)', borderStyle:'dashed' },
  midRing:  { position:'absolute', width:130, height:130, borderRadius:65, borderWidth:1.5, borderColor:'rgba(200,134,10,0.30)' },
  glow:     { position:'absolute', width:90, height:90, borderRadius:45, opacity:0.18 },
  center:   { width:80, height:80, borderRadius:40, backgroundColor:'rgba(200,134,10,0.12)', borderWidth:1.5, borderColor:'rgba(200,134,10,0.45)', alignItems:'center', justifyContent:'center' },
  mainIcon: { fontSize:30, fontWeight:'900' },
  orbitDot: { position:'absolute', width:8, height:8, borderRadius:4, backgroundColor:C.gold },
});

// ── Single slide content ──────────────────────────────────────
function SlideContent({ item }) {
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY       = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    contentOpacity.setValue(0);
    contentY.setValue(30);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue:1, duration:500, delay:100, useNativeDriver:true }),
      Animated.spring(contentY,       { toValue:0, friction:8, tension:50, delay:100, useNativeDriver:true }),
    ]).start();
  }, [item.id]);

  return (
    <View style={sc.wrap}>
      {/* Illustration */}
      <View style={sc.illusWrap}>
        <SlideIllustration item={item} />
      </View>

      {/* Tag */}
      <Animated.View style={[sc.tagWrap, { opacity:contentOpacity, transform:[{translateY:contentY}] }]}>
        <View style={sc.tag}>
          <View style={sc.tagDot} />
          <Text style={sc.tagText}>{item.tag}</Text>
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.Text style={[sc.title, { opacity:contentOpacity, transform:[{translateY:contentY}] }]}>
        {item.title}
      </Animated.Text>

      {/* Body */}
      <Animated.Text style={[sc.body, { opacity:contentOpacity, transform:[{translateY:contentY}] }]}>
        {item.body}
      </Animated.Text>
    </View>
  );
}
const sc = StyleSheet.create({
  wrap:      { width: W, paddingHorizontal: 28, alignItems: 'flex-start', paddingTop: 20 },
  illusWrap: { width: '100%', alignItems: 'center', marginBottom: 32 },
  tagWrap:   { marginBottom: 14 },
  tag: {
    flexDirection:'row', alignItems:'center', gap:8,
    backgroundColor:'rgba(200,134,10,0.12)', borderWidth:1, borderColor:'rgba(200,134,10,0.30)',
    borderRadius:20, paddingHorizontal:14, paddingVertical:6, alignSelf:'flex-start',
  },
  tagDot:  { width:6, height:6, borderRadius:3, backgroundColor:C.gold },
  tagText: { color:C.gold, fontSize:11, fontWeight:'700', letterSpacing:1.5 },
  title: {
    color:C.cream, fontSize:36, fontWeight:'800', lineHeight:44, letterSpacing:0.3,
    marginBottom:16,
    textShadowColor:'rgba(200,134,10,0.25)', textShadowOffset:{width:0,height:2}, textShadowRadius:8,
  },
  body: { color:C.creamDim, fontSize:15, lineHeight:24, fontWeight:'400' },
});

// ── Dot indicator ─────────────────────────────────────────────
function DotIndicator({ count, active }) {
  return (
    <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
      {Array.from({length:count}).map((_,i) => {
        const isActive = i === active;
        return (
          <View key={i} style={{
            width: isActive ? 22 : 7,
            height: 7, borderRadius: 3.5,
            backgroundColor: isActive ? C.gold : 'rgba(200,134,10,0.25)',
          }} />
        );
      })}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const navigation  = useNavigation();
  const [current, setCurrent] = useState(0);
  const flatRef     = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const isLast = current === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) {
      navigation.navigate('Consent');
      return;
    }
    const next = current + 1;
    flatRef.current?.scrollToIndex({ index: next, animated: true });
    setCurrent(next);
  };

  const skip = () => navigation.navigate('Consent');

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    if (idx !== current) setCurrent(idx);
  };

  return (
    <AfricanBG accent={SLIDES[current].accent}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Skip button */}
      {!isLast && (
        <FadeSlide delay={200} style={s.skipWrap}>
          <TouchableOpacity onPress={skip} style={s.skipBtn}>
            <Text style={s.skipText}>Skip</Text>
          </TouchableOpacity>
        </FadeSlide>
      )}

      {/* Slide list */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <SlideContent item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        style={{ flex: 1, marginTop: 80 }}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
      />

      {/* Bottom controls */}
      <FadeSlide delay={400} style={s.bottom}>
        <DotIndicator count={SLIDES.length} active={current} />

        <View style={s.navRow}>
          {current > 0 && (
            <TouchableOpacity
              style={s.backCircle}
              onPress={() => {
                const prev = current - 1;
                flatRef.current?.scrollToIndex({ index: prev, animated: true });
                setCurrent(prev);
              }}
            >
              <Text style={s.backArrow}>←</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1, marginLeft: current > 0 ? 14 : 0 }}>
            <GoldButton
              label={isLast ? 'Get Started' : 'Next'}
              onPress={goNext}
            />
          </View>
        </View>
      </FadeSlide>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  skipWrap: { position:'absolute', top:56, right:24, zIndex:99 },
  skipBtn:  { backgroundColor:'rgba(200,134,10,0.12)', borderWidth:1, borderColor:C.border, borderRadius:20, paddingHorizontal:16, paddingVertical:8 },
  skipText: { color:C.creamDim, fontSize:13, fontWeight:'600' },

  bottom:   { paddingHorizontal:24, paddingBottom:44, gap:20 },
  navRow:   { flexDirection:'row', alignItems:'center' },
  backCircle: {
    width:52, height:52, borderRadius:14,
    backgroundColor:'rgba(200,134,10,0.10)',
    borderWidth:1.5, borderColor:C.border,
    alignItems:'center', justifyContent:'center',
  },
  backArrow: { color:C.cream, fontSize:20 },
});
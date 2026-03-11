// src/screens/main/MainTabNavigator.js
// Drop-in replacement for the MainTabNavigator in App.js
// Includes placeholder screens for Home, History, Routine, Profile

import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, Dimensions, ScrollView,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg:        '#0F0500',
  bgCard:    '#1A0A02',
  tabBg:     '#0A0300',
  border:    'rgba(200,134,10,0.22)',
  gold:      '#C8860A',
  goldPale:  'rgba(200,134,10,0.15)',
  cream:     '#F5DEB3',
  creamDim:  'rgba(245,222,179,0.50)',
  creamFaint:'rgba(245,222,179,0.18)',
  success:   '#5DBE8A',
};

const Tab = createBottomTabNavigator();

// ── African background (shared) ───────────────────────────────
function AfricanBG({ children }) {
  return (
    <View style={{ flex:1, backgroundColor:C.bg }}>
      <View style={[ab.b, { width:420, height:420, borderRadius:210, backgroundColor:'#6B3000', opacity:0.10, top:-130, left:-110 }]} />
      <View style={[ab.b, { width:280, height:280, borderRadius:140, backgroundColor:C.gold, opacity:0.05, bottom:-70, right:-70 }]} />
      <View style={[ab.stripe, { top:H*0.07 }]} />
      {children}
    </View>
  );
}
const ab = StyleSheet.create({
  b:      { position:'absolute' },
  stripe: { position:'absolute', width:W, height:1, backgroundColor:'rgba(200,134,10,0.14)' },
});

// ── FadeSlide ─────────────────────────────────────────────────
function FadeSlide({ delay=0, from=18, children, style }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue:1, duration:500, delay, useNativeDriver:true }),
      Animated.spring(translateY, { toValue:0, friction:8, tension:50, delay, useNativeDriver:true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform:[{translateY}] }, style]}>{children}</Animated.View>;
}

// ── Gold scan CTA ─────────────────────────────────────────────
function ScanButton({ onPress }) {
  const pulse  = useRef(new Animated.Value(1)).current;
  const glow   = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue:1, duration:1500, useNativeDriver:true }),
      Animated.timing(glow, { toValue:0.5, duration:1500, useNativeDriver:true }),
    ])).start();
  }, []);

  const scale = useRef(new Animated.Value(1)).current;

  return (
    <View style={{ alignItems:'center', marginVertical:32 }}>
      {/* Glow halo */}
      <Animated.View style={[sb.glow, { opacity:glow }]} />
      <Animated.View style={{ transform:[{scale}] }}>
        <TouchableOpacity
          style={sb.btn} onPress={onPress} activeOpacity={0.9}
          onPressIn={()=>Animated.spring(scale,{toValue:0.95,useNativeDriver:true}).start()}
          onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()}
        >
          <View style={sb.shimmer} />
          <Text style={sb.icon}>◉</Text>
          <Text style={sb.label}>Scan My Skin</Text>
          <Text style={sb.sub}>Tap to begin analysis</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
const sb = StyleSheet.create({
  glow: {
    position:'absolute', width:200, height:200, borderRadius:100,
    backgroundColor:C.gold, opacity:0.15,
    shadowColor:C.gold, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:40, elevation:20,
  },
  btn: {
    width:170, height:170, borderRadius:85,
    backgroundColor:C.gold, alignItems:'center', justifyContent:'center',
    overflow:'hidden',
    shadowColor:C.gold, shadowOffset:{width:0,height:8}, shadowOpacity:0.5, shadowRadius:24, elevation:16,
  },
  shimmer: { position:'absolute', top:0, left:0, right:0, height:'50%', backgroundColor:'rgba(255,255,255,0.12)', borderRadius:85 },
  icon:    { color:'#0F0500', fontSize:28, marginBottom:6 },
  label:   { color:'#0F0500', fontSize:15, fontWeight:'800', letterSpacing:1 },
  sub:     { color:'rgba(15,5,0,0.55)', fontSize:10, fontWeight:'600', marginTop:3 },
});

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ icon, value, label, delay }) {
  return (
    <FadeSlide delay={delay} style={stat.card}>
      <Text style={stat.icon}>{icon}</Text>
      <Text style={stat.value}>{value}</Text>
      <Text style={stat.label}>{label}</Text>
    </FadeSlide>
  );
}
const stat = StyleSheet.create({
  card:  { flex:1, backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, borderRadius:14, padding:14, alignItems:'center', gap:4 },
  icon:  { fontSize:18, marginBottom:2 },
  value: { color:C.cream, fontSize:20, fontWeight:'800' },
  label: { color:C.creamDim, fontSize:11, fontWeight:'600', textAlign:'center', letterSpacing:0.3 },
});

// ─────────────────────────────────────────────────────────────
// ── HOME SCREEN ───────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
function HomeScreen() {
  const navigation = useNavigation();

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView contentContainerStyle={hs.scroll} showsVerticalScrollIndicator={false}>

        {/* Greeting */}
        <FadeSlide delay={0} style={hs.greeting}>
          <View>
            <Text style={hs.greetSub}>Good morning ✦</Text>
            <Text style={hs.greetName}>Your Skin Journey</Text>
          </View>
          <TouchableOpacity
            style={hs.notifBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={hs.notifIcon}>🔔</Text>
          </TouchableOpacity>
        </FadeSlide>

        {/* Skin status card */}
        <FadeSlide delay={150} style={hs.statusCard}>
          <View style={hs.statusTop}>
            <View>
              <Text style={hs.statusLabel}>Last Scan</Text>
              <Text style={hs.statusValue}>No scans yet</Text>
            </View>
            <View style={hs.statusBadge}>
              <Text style={hs.statusBadgeText}>NEW</Text>
            </View>
          </View>
          <Text style={hs.statusHint}>Scan your skin today to get your personalised routine.</Text>
        </FadeSlide>

        {/* Scan button */}
        <ScanButton onPress={() => navigation.navigate('ScanCamera')} />

        {/* Stats row */}
        <FadeSlide delay={350} style={hs.statsRow}>
          <StatCard icon="◉" value="0" label="Total Scans" delay={400} />
          <StatCard icon="◈" value="—" label="Skin Type"   delay={480} />
          <StatCard icon="✦" value="0" label="Day Streak"  delay={560} />
        </FadeSlide>

        {/* Quick tips */}
        <FadeSlide delay={600} style={hs.tipsHeader}>
          <View style={hs.tipsHeaderLeft}>
            <View style={hs.tipsDot} />
            <Text style={hs.tipsTitle}>Melanin Tips</Text>
          </View>
        </FadeSlide>

        {[
          { icon:'☀', tip:'Always wear SPF 30+ — melanin skin still needs sun protection.' },
          { icon:'💧', tip:'Drink water and moisturise. Ashy skin is very real for melanin tones.' },
          { icon:'◎', tip:'Niacinamide is your best friend for hyperpigmentation.' },
        ].map((t, i) => (
          <FadeSlide key={i} delay={660 + i*80} style={hs.tipCard}>
            <Text style={hs.tipIcon}>{t.icon}</Text>
            <Text style={hs.tipText}>{t.tip}</Text>
          </FadeSlide>
        ))}

        <View style={{ height:100 }} />
      </ScrollView>
    </AfricanBG>
  );
}
const hs = StyleSheet.create({
  scroll:       { paddingTop:64, paddingHorizontal:22 },
  greeting:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:20 },
  greetSub:     { color:C.creamDim, fontSize:13, fontWeight:'600', marginBottom:4 },
  greetName:    { color:C.cream, fontSize:24, fontWeight:'800' },
  notifBtn:     { width:42, height:42, borderRadius:12, backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, alignItems:'center', justifyContent:'center' },
  notifIcon:    { fontSize:16 },

  statusCard:   { backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, borderRadius:16, padding:18, marginBottom:4 },
  statusTop:    { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 },
  statusLabel:  { color:C.creamDim, fontSize:12, fontWeight:'600', marginBottom:4 },
  statusValue:  { color:C.cream, fontSize:16, fontWeight:'700' },
  statusBadge:  { backgroundColor:C.goldPale, borderRadius:8, paddingHorizontal:10, paddingVertical:4, borderWidth:1, borderColor:C.border },
  statusBadgeText:{ color:C.gold, fontSize:10, fontWeight:'800', letterSpacing:1 },
  statusHint:   { color:C.creamDim, fontSize:13, lineHeight:19 },

  statsRow:     { flexDirection:'row', gap:10, marginBottom:28 },

  tipsHeader:   { marginBottom:12 },
  tipsHeaderLeft:{ flexDirection:'row', alignItems:'center', gap:8 },
  tipsDot:      { width:6, height:6, borderRadius:3, backgroundColor:C.gold },
  tipsTitle:    { color:C.gold, fontSize:12, fontWeight:'700', letterSpacing:1.5, textTransform:'uppercase' },
  tipCard:      { flexDirection:'row', alignItems:'flex-start', gap:12, backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, borderRadius:12, padding:14, marginBottom:10 },
  tipIcon:      { fontSize:18, marginTop:1 },
  tipText:      { flex:1, color:C.creamDim, fontSize:13, lineHeight:20 },
});

// ─────────────────────────────────────────────────────────────
// ── SCAN HISTORY SCREEN ───────────────────────────────────────
// ─────────────────────────────────────────────────────────────
function ScanHistoryScreen() {
  const navigation = useNavigation();
  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={shs.container}>
        <FadeSlide delay={0} style={shs.header}>
          <Text style={shs.title}>Scan History</Text>
          <Text style={shs.subtitle}>Track your skin's journey over time.</Text>
        </FadeSlide>

        {/* Empty state */}
        <FadeSlide delay={200} style={shs.empty}>
          <View style={shs.emptyIcon}>
            <Text style={shs.emptyIconText}>◎</Text>
          </View>
          <Text style={shs.emptyTitle}>No scans yet</Text>
          <Text style={shs.emptyBody}>Your scan results will appear here. Each scan helps you track your skin's progress.</Text>
          <TouchableOpacity
            style={shs.scanCta}
            onPress={() => navigation.navigate('ScanCamera')}
          >
            <Text style={shs.scanCtaText}>Take Your First Scan →</Text>
          </TouchableOpacity>
        </FadeSlide>
      </View>
    </AfricanBG>
  );
}
const shs = StyleSheet.create({
  container: { flex:1, paddingTop:64, paddingHorizontal:24 },
  header:    { marginBottom:32 },
  title:     { color:C.cream, fontSize:28, fontWeight:'800', marginBottom:6 },
  subtitle:  { color:C.creamDim, fontSize:14, lineHeight:21 },

  empty:     { flex:1, alignItems:'center', justifyContent:'center', paddingBottom:80 },
  emptyIcon: { width:90, height:90, borderRadius:45, backgroundColor:C.goldPale, borderWidth:1.5, borderColor:C.border, alignItems:'center', justifyContent:'center', marginBottom:20, shadowColor:C.gold, shadowOpacity:0.3, shadowOffset:{width:0,height:0}, shadowRadius:12, elevation:6 },
  emptyIconText: { color:C.gold, fontSize:34 },
  emptyTitle:{ color:C.cream, fontSize:20, fontWeight:'800', marginBottom:10 },
  emptyBody: { color:C.creamDim, fontSize:14, lineHeight:22, textAlign:'center', paddingHorizontal:20, marginBottom:24 },
  scanCta:   { backgroundColor:C.goldPale, borderWidth:1, borderColor:C.border, borderRadius:12, paddingHorizontal:22, paddingVertical:12 },
  scanCtaText:{ color:C.gold, fontSize:14, fontWeight:'700' },
});

// ─────────────────────────────────────────────────────────────
// ── ROUTINE SCREEN ────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
function RoutineScreen() {
  const navigation = useNavigation();
  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={rs.container}>
        <FadeSlide delay={0} style={rs.header}>
          <Text style={rs.title}>My Routine</Text>
          <Text style={rs.subtitle}>Your personalised skincare schedule.</Text>
        </FadeSlide>

        {/* Tabs */}
        <FadeSlide delay={150} style={rs.tabRow}>
          <View style={[rs.tabItem, rs.tabActive]}><Text style={rs.tabTextActive}>Morning</Text></View>
          <View style={rs.tabItem}><Text style={rs.tabText}>Night</Text></View>
        </FadeSlide>

        {/* Empty state */}
        <FadeSlide delay={300} style={rs.empty}>
          <View style={rs.emptyIcon}>
            <Text style={rs.emptyIconText}>✦</Text>
          </View>
          <Text style={rs.emptyTitle}>No routine yet</Text>
          <Text style={rs.emptyBody}>Complete your first scan and we'll generate a personalised AM + PM routine for your skin.</Text>
          <TouchableOpacity
            style={rs.scanCta}
            onPress={() => navigation.navigate('ScanCamera')}
          >
            <Text style={rs.scanCtaText}>Scan to Get Routine →</Text>
          </TouchableOpacity>
        </FadeSlide>
      </View>
    </AfricanBG>
  );
}
const rs = StyleSheet.create({
  container: { flex:1, paddingTop:64, paddingHorizontal:24 },
  header:    { marginBottom:24 },
  title:     { color:C.cream, fontSize:28, fontWeight:'800', marginBottom:6 },
  subtitle:  { color:C.creamDim, fontSize:14 },

  tabRow:       { flexDirection:'row', gap:10, marginBottom:28 },
  tabItem:      { flex:1, paddingVertical:11, alignItems:'center', borderRadius:12, borderWidth:1.5, borderColor:C.border },
  tabActive:    { backgroundColor:C.goldPale, borderColor:C.gold },
  tabText:      { color:C.creamDim, fontSize:14, fontWeight:'600' },
  tabTextActive:{ color:C.gold, fontSize:14, fontWeight:'700' },

  empty:      { flex:1, alignItems:'center', justifyContent:'center', paddingBottom:80 },
  emptyIcon:  { width:90, height:90, borderRadius:45, backgroundColor:C.goldPale, borderWidth:1.5, borderColor:C.border, alignItems:'center', justifyContent:'center', marginBottom:20, shadowColor:C.gold, shadowOpacity:0.3, shadowOffset:{width:0,height:0}, shadowRadius:12, elevation:6 },
  emptyIconText: { color:C.gold, fontSize:30 },
  emptyTitle: { color:C.cream, fontSize:20, fontWeight:'800', marginBottom:10 },
  emptyBody:  { color:C.creamDim, fontSize:14, lineHeight:22, textAlign:'center', paddingHorizontal:20, marginBottom:24 },
  scanCta:    { backgroundColor:C.goldPale, borderWidth:1, borderColor:C.border, borderRadius:12, paddingHorizontal:22, paddingVertical:12 },
  scanCtaText:{ color:C.gold, fontSize:14, fontWeight:'700' },
});

// ─────────────────────────────────────────────────────────────
// ── PROFILE SCREEN ────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
function ProfileScreen() {
  const navigation = useNavigation();

  const MENU_ITEMS = [
    { icon:'◉', label:'Subscription Plan',   screen:'Subscription', badge:'Free' },
    { icon:'🔔', label:'Notifications',       screen:'Notifications' },
    { icon:'🔒', label:'Privacy & Data',      screen:'Privacy' },
    { icon:'◈', label:'Help & Support',       screen:'Help' },
    { icon:'⚙', label:'Settings',            screen:'Settings' },
  ];

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView contentContainerStyle={ps.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar header */}
        <FadeSlide delay={0} style={ps.avatarSection}>
          <View style={ps.avatarWrap}>
            <View style={ps.avatar}>
              <Text style={ps.avatarInitial}>S</Text>
            </View>
            <View style={ps.avatarRing} />
          </View>
          <Text style={ps.name}>Skin Lover</Text>
          <Text style={ps.email}>user@melaninscan.com</Text>

          {/* Plan badge */}
          <View style={ps.planBadge}>
            <View style={ps.planDot} />
            <Text style={ps.planText}>FREE PLAN</Text>
          </View>
        </FadeSlide>

        {/* Upgrade card */}
        <FadeSlide delay={200} style={ps.upgradeCard}>
          <View>
            <Text style={ps.upgradeTitle}>Upgrade to Pro</Text>
            <Text style={ps.upgradeBody}>Unlimited scans, advanced analysis & no watermarks.</Text>
          </View>
          <TouchableOpacity
            style={ps.upgradeBtn}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={ps.upgradeBtnText}>Upgrade →</Text>
          </TouchableOpacity>
        </FadeSlide>

        {/* Menu */}
        <FadeSlide delay={300} style={ps.sectionLabel}>
          <View style={{ width:5, height:5, borderRadius:2.5, backgroundColor:C.gold }} />
          <Text style={{ color:C.gold, fontSize:11, fontWeight:'700', letterSpacing:1.5, textTransform:'uppercase' }}>Account</Text>
        </FadeSlide>

        {MENU_ITEMS.map((item, i) => (
          <FadeSlide key={i} delay={360 + i * 60}>
            <TouchableOpacity
              style={ps.menuItem}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={ps.menuIconWrap}>
                <Text style={ps.menuIcon}>{item.icon}</Text>
              </View>
              <Text style={ps.menuLabel}>{item.label}</Text>
              <View style={{ flex:1 }} />
              {item.badge && (
                <View style={ps.badge}>
                  <Text style={ps.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Text style={ps.menuArrow}>›</Text>
            </TouchableOpacity>
          </FadeSlide>
        ))}

        {/* Sign out */}
        <FadeSlide delay={720} style={{ marginTop:16, marginBottom:8 }}>
          <TouchableOpacity
            style={ps.signOutBtn}
            onPress={() => navigation.reset({ index:0, routes:[{ name:'Welcome' }] })}
          >
            <Text style={ps.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </FadeSlide>

        <View style={{ height:100 }} />
      </ScrollView>
    </AfricanBG>
  );
}
const ps = StyleSheet.create({
  scroll: { paddingTop:64, paddingHorizontal:22 },

  avatarSection: { alignItems:'center', marginBottom:24 },
  avatarWrap:    { position:'relative', marginBottom:12 },
  avatar:        { width:80, height:80, borderRadius:40, backgroundColor:C.goldPale, borderWidth:2, borderColor:C.gold, alignItems:'center', justifyContent:'center', shadowColor:C.gold, shadowOpacity:0.4, shadowOffset:{width:0,height:0}, shadowRadius:14, elevation:8 },
  avatarInitial: { color:C.gold, fontSize:32, fontWeight:'900' },
  avatarRing:    { position:'absolute', top:-4, left:-4, width:88, height:88, borderRadius:44, borderWidth:1, borderColor:'rgba(200,134,10,0.25)', borderStyle:'dashed' },
  name:          { color:C.cream, fontSize:22, fontWeight:'800', marginBottom:4 },
  email:         { color:C.creamDim, fontSize:13, marginBottom:12 },
  planBadge:     { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:C.goldPale, borderWidth:1, borderColor:C.border, borderRadius:20, paddingHorizontal:14, paddingVertical:6 },
  planDot:       { width:6, height:6, borderRadius:3, backgroundColor:C.gold },
  planText:      { color:C.gold, fontSize:11, fontWeight:'700', letterSpacing:1.5 },

  upgradeCard:   { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(200,134,10,0.10)', borderWidth:1.5, borderColor:C.gold, borderRadius:16, padding:16, marginBottom:28, gap:14 },
  upgradeTitle:  { color:C.cream, fontSize:15, fontWeight:'800', marginBottom:4 },
  upgradeBody:   { color:C.creamDim, fontSize:12, flex:1 },
  upgradeBtn:    { backgroundColor:C.gold, borderRadius:10, paddingHorizontal:16, paddingVertical:10 },
  upgradeBtnText:{ color:'#0F0500', fontSize:13, fontWeight:'800' },

  sectionLabel:  { flexDirection:'row', alignItems:'center', gap:8, marginBottom:12 },

  menuItem:      { flexDirection:'row', alignItems:'center', backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, borderRadius:14, padding:14, marginBottom:10, gap:12 },
  menuIconWrap:  { width:36, height:36, borderRadius:10, backgroundColor:C.goldPale, borderWidth:1, borderColor:C.border, alignItems:'center', justifyContent:'center' },
  menuIcon:      { fontSize:16 },
  menuLabel:     { color:C.cream, fontSize:14, fontWeight:'600' },
  badge:         { backgroundColor:C.goldPale, borderRadius:8, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:C.border, marginRight:6 },
  badgeText:     { color:C.gold, fontSize:10, fontWeight:'700', letterSpacing:0.5 },
  menuArrow:     { color:C.creamDim, fontSize:20, fontWeight:'300' },

  signOutBtn:    { borderWidth:1.5, borderColor:'rgba(224,92,58,0.35)', borderRadius:14, paddingVertical:16, alignItems:'center' },
  signOutText:   { color:'#E05C3A', fontSize:15, fontWeight:'700' },
});

// ── Custom tab bar ────────────────────────────────────────────
const TAB_ITEMS = [
  { name:'HomeTab',    label:'Home',    icon:'⌂',  screen:'Home'        },
  { name:'HistoryTab', label:'History', icon:'◎',  screen:'ScanHistory' },
  { name:'RoutineTab', label:'Routine', icon:'✦',  screen:'Routine'     },
  { name:'ProfileTab', label:'Profile', icon:'◉',  screen:'Profile'     },
];

function CustomTabBar({ state, navigation }) {
  return (
    <View style={tb.bar}>
      {/* Top border glow */}
      <View style={tb.topBorder} />

      {state.routes.map((route, i) => {
        const item    = TAB_ITEMS[i];
        const focused = state.index === i;
        const scale   = useRef(new Animated.Value(1)).current;

        const press = () => {
          Animated.sequence([
            Animated.spring(scale, { toValue:0.88, friction:5, useNativeDriver:true }),
            Animated.spring(scale, { toValue:1,    friction:5, useNativeDriver:true }),
          ]).start();
          navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity key={i} style={tb.item} onPress={press} activeOpacity={1}>
            <Animated.View style={[tb.iconWrap, focused && tb.iconWrapActive, { transform:[{scale}] }]}>
              <Text style={[tb.icon, focused && tb.iconActive]}>{item.icon}</Text>
            </Animated.View>
            <Text style={[tb.label, focused && tb.labelActive]}>{item.label}</Text>
            {focused && <View style={tb.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const tb = StyleSheet.create({
  bar: {
    flexDirection:'row', backgroundColor:C.tabBg,
    paddingBottom:28, paddingTop:10, paddingHorizontal:8,
    borderTopWidth:0, position:'relative',
  },
  topBorder: { position:'absolute', top:0, left:0, right:0, height:1, backgroundColor:C.border },
  item:      { flex:1, alignItems:'center', gap:4 },
  iconWrap:  { width:40, height:36, borderRadius:10, alignItems:'center', justifyContent:'center' },
  iconWrapActive: { backgroundColor:C.goldPale, borderWidth:1, borderColor:'rgba(200,134,10,0.35)' },
  icon:      { fontSize:18, color:C.creamFaint },
  iconActive:{ color:C.gold },
  label:     { fontSize:10, fontWeight:'600', color:C.creamFaint, letterSpacing:0.3 },
  labelActive:{ color:C.gold },
  activeDot: { position:'absolute', top:-2, width:4, height:4, borderRadius:2, backgroundColor:C.gold },
});

// ── Main Tab Navigator (export this into App.js) ──────────────
export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown:false }}
    >
      <Tab.Screen name="HomeTab"    component={HomeScreen}        />
      <Tab.Screen name="HistoryTab" component={ScanHistoryScreen} />
      <Tab.Screen name="RoutineTab" component={RoutineScreen}     />
      <Tab.Screen name="ProfileTab" component={ProfileScreen}     />
    </Tab.Navigator>
  );
}
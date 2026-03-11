// src/screens/settings/NotificationsScreen.js
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
  warn:       '#E8A020',
};

function AfricanBG({ children }) {
  return (
    <View style={{ flex:1,backgroundColor:C.bg }}>
      <View style={[g.b,{ width:420,height:420,borderRadius:210,backgroundColor:'#6B3000',opacity:0.09,top:-140,left:-110 }]} />
      <View style={[g.b,{ width:280,height:280,borderRadius:140,backgroundColor:C.gold,opacity:0.04,bottom:-70,right:-70 }]} />
      <View style={[g.stripe,{ top:H*0.07 }]} />
      {[{top:H*0.10,left:W*0.06,o:0.20},{top:H*0.82,left:W*0.88,o:0.13}].map((d,i)=>(
        <View key={i} style={[g.dot,{top:d.top,left:d.left,opacity:d.o}]}/>
      ))}
      {children}
    </View>
  );
}
const g = StyleSheet.create({
  b:{ position:'absolute' }, stripe:{ position:'absolute',width:W,height:1.5,backgroundColor:'rgba(200,134,10,0.10)' },
  dot:{ position:'absolute',width:5,height:5,borderRadius:2.5,backgroundColor:C.gold },
});

function FadeSlide({ delay=0, from=16, children, style }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op,{toValue:1,duration:480,delay,useNativeDriver:true}),
      Animated.spring(ty,{toValue:0,friction:8,tension:50,delay,useNativeDriver:true}),
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
    <FadeSlide delay={delay} style={{ flexDirection:'row',alignItems:'center',gap:8,marginBottom:10,marginTop:6 }}>
      <View style={{ width:3,height:14,borderRadius:2,backgroundColor:C.gold }}/>
      <Text style={{ color:C.gold,fontSize:10,fontWeight:'800',letterSpacing:1.8,textTransform:'uppercase' }}>{text}</Text>
    </FadeSlide>
  );
}

// ── Notification category card ─────────────────────────────────
function NotifCategory({ icon, title, desc, enabled, onToggle, children, delay, accentColor }) {
  const [expanded, setExpanded] = useState(false);
  const expandH = useRef(new Animated.Value(0)).current;
  const acc = accentColor || C.gold;

  const toggleExpand = () => {
    setExpanded(e => {
      Animated.timing(expandH, { toValue:e?0:1, duration:280, useNativeDriver:false }).start();
      return !e;
    });
  };

  const childH = expandH.interpolate({ inputRange:[0,1], outputRange:[0, children ? 120 : 0] });
  const childOp = expandH.interpolate({ inputRange:[0,0.4,1], outputRange:[0,0,1] });

  return (
    <FadeSlide delay={delay} style={{ marginBottom:10 }}>
      <View style={[nc.card, { borderColor:enabled ? `${acc}35` : C.border }]}>
        {/* Header */}
        <View style={nc.header}>
          <View style={[nc.iconBox, { backgroundColor:`${acc}14`, borderColor:`${acc}30` }]}>
            <Text style={{ fontSize:17 }}>{icon}</Text>
          </View>
          <TouchableOpacity style={{ flex:1 }} onPress={toggleExpand} activeOpacity={0.7}>
            <Text style={nc.title}>{title}</Text>
            <Text style={nc.desc}>{desc}</Text>
          </TouchableOpacity>
          <Switch
            value={enabled}
            onValueChange={onToggle}
            trackColor={{ false:'rgba(200,134,10,0.12)', true:acc }}
            thumbColor={enabled ? C.cream : C.creamFaint}
            ios_backgroundColor="rgba(200,134,10,0.10)"
          />
        </View>
        {/* Expandable sub-settings */}
        {children && (
          <Animated.View style={{ height:childH, overflow:'hidden' }}>
            <Animated.View style={{ opacity:childOp, borderTopWidth:1, borderTopColor:C.border, paddingTop:12 }}>
              {children}
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </FadeSlide>
  );
}
const nc = StyleSheet.create({
  card:    { backgroundColor:C.bgCard,borderWidth:1,borderRadius:14,padding:14 },
  header:  { flexDirection:'row',alignItems:'center',gap:12 },
  iconBox: { width:40,height:40,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center' },
  title:   { color:C.cream,fontSize:14,fontWeight:'700',marginBottom:3 },
  desc:    { color:C.creamDim,fontSize:11,lineHeight:16 },
});

// ── Time picker row ───────────────────────────────────────────
function TimePickerRow({ label, time, onTimeChange }) {
  const HOURS   = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}`);
  const MINUTES = ['00','15','30','45'];
  const [h, m]  = time.split(':');
  const [showH, setShowH] = useState(false);
  const [showM, setShowM] = useState(false);

  return (
    <View style={{ marginBottom:10 }}>
      <Text style={{ color:C.creamDim,fontSize:11,fontWeight:'600',marginBottom:6 }}>{label}</Text>
      <View style={{ flexDirection:'row',gap:8 }}>
        {/* Hour */}
        <TouchableOpacity style={tp.seg} onPress={()=>{setShowH(o=>!o);setShowM(false);}}>
          <Text style={tp.segText}>{h}h</Text>
          <Text style={tp.caret}>▾</Text>
        </TouchableOpacity>
        <Text style={{ color:C.gold,fontSize:18,fontWeight:'700',alignSelf:'center' }}>:</Text>
        {/* Minute */}
        <TouchableOpacity style={tp.seg} onPress={()=>{setShowM(o=>!o);setShowH(false);}}>
          <Text style={tp.segText}>{m}m</Text>
          <Text style={tp.caret}>▾</Text>
        </TouchableOpacity>
      </View>
      {showH && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tp.picker}>
          {HOURS.map(hr=>(
            <TouchableOpacity key={hr} style={[tp.opt,hr===h&&tp.optActive]} onPress={()=>{onTimeChange(`${hr}:${m}`);setShowH(false);}}>
              <Text style={[tp.optText,hr===h&&tp.optTextActive]}>{hr}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {showM && (
        <View style={[tp.picker,{flexDirection:'row',gap:8}]}>
          {MINUTES.map(mn=>(
            <TouchableOpacity key={mn} style={[tp.opt,mn===m&&tp.optActive]} onPress={()=>{onTimeChange(`${h}:${mn}`);setShowM(false);}}>
              <Text style={[tp.optText,mn===m&&tp.optTextActive]}>{mn}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
const tp = StyleSheet.create({
  seg:         { flexDirection:'row',alignItems:'center',gap:6,backgroundColor:C.bgCard2,borderWidth:1,borderColor:C.border,borderRadius:10,paddingHorizontal:14,paddingVertical:9 },
  segText:     { color:C.cream,fontSize:16,fontWeight:'700' },
  caret:       { color:C.gold,fontSize:10 },
  picker:      { marginTop:8,paddingVertical:4 },
  opt:         { backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:8,paddingHorizontal:12,paddingVertical:7,marginRight:6 },
  optActive:   { backgroundColor:C.goldPale,borderColor:C.gold },
  optText:     { color:C.creamDim,fontSize:13,fontWeight:'600' },
  optTextActive:{ color:C.gold,fontWeight:'700' },
});

// ── Screen ────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const navigation = useNavigation();

  const [notifs, setNotifs] = useState({
    masterToggle:  true,
    routine:       true,
    scanReminder:  true,
    progressReport:true,
    tips:          true,
    promotional:   false,
    appUpdates:    true,
  });

  const [times, setTimes] = useState({
    amRoutine:  '07:00',
    pmRoutine:  '21:00',
    scanReminder:'09:00',
  });

  const toggle = (key) => setNotifs(p=>({...p,[key]:!p[key]}));

  const enabledCount = Object.values(notifs).filter(Boolean).length;

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BackButton onPress={()=>navigation.goBack()} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <FadeSlide delay={0} style={s.header}>
          <View style={s.headerIcon}>
            <Text style={{ fontSize:22 }}>🔔</Text>
          </View>
          <View>
            <Text style={s.title}>Notifications</Text>
            <Text style={s.subtitle}>{enabledCount} of {Object.keys(notifs).length} categories active</Text>
          </View>
        </FadeSlide>

        {/* Master toggle */}
        <FadeSlide delay={100} style={s.masterCard}>
          <View style={s.masterLeft}>
            <Text style={s.masterLabel}>All Notifications</Text>
            <Text style={s.masterSub}>{notifs.masterToggle ? 'Notifications are on' : 'All notifications paused'}</Text>
          </View>
          <Switch
            value={notifs.masterToggle}
            onValueChange={()=>toggle('masterToggle')}
            trackColor={{ false:'rgba(200,134,10,0.12)', true:C.gold }}
            thumbColor={notifs.masterToggle ? C.cream : C.creamFaint}
            ios_backgroundColor="rgba(200,134,10,0.10)"
          />
        </FadeSlide>

        {/* ── Routine reminders ── */}
        <SectionLabel text="Routine Reminders" delay={160} />
        <NotifCategory
          icon="☀"
          title="Morning Routine"
          desc="Daily reminder to complete your AM skincare steps"
          enabled={notifs.routine}
          onToggle={()=>toggle('routine')}
          delay={190}
          accentColor={C.warn}
        >
          <TimePickerRow label="AM Reminder Time" time={times.amRoutine} onTimeChange={t=>setTimes(p=>({...p,amRoutine:t}))} />
          <TimePickerRow label="PM Reminder Time" time={times.pmRoutine} onTimeChange={t=>setTimes(p=>({...p,pmRoutine:t}))} />
        </NotifCategory>

        {/* ── Scan reminders ── */}
        <SectionLabel text="Scan & Progress" delay={260} />
        <NotifCategory
          icon="◉"
          title="Monthly Scan Reminder"
          desc="Remind me to scan every 30 days to track progress"
          enabled={notifs.scanReminder}
          onToggle={()=>toggle('scanReminder')}
          delay={290}
        >
          <TimePickerRow label="Reminder Time" time={times.scanReminder} onTimeChange={t=>setTimes(p=>({...p,scanReminder:t}))} />
        </NotifCategory>

        <NotifCategory
          icon="◈"
          title="Progress Reports"
          desc="Weekly summary of your skin improvement trends"
          enabled={notifs.progressReport}
          onToggle={()=>toggle('progressReport')}
          delay={350}
          accentColor={C.success}
        />

        {/* ── Content & Tips ── */}
        <SectionLabel text="Content & Tips" delay={400} />
        <NotifCategory
          icon="✦"
          title="Melanin Skin Tips"
          desc="Weekly tips, ingredient spotlights, and skincare education"
          enabled={notifs.tips}
          onToggle={()=>toggle('tips')}
          delay={430}
        />

        {/* ── Marketing ── */}
        <SectionLabel text="Marketing" delay={490} />
        <NotifCategory
          icon="🎁"
          title="Offers & Promotions"
          desc="Discount codes, plan upgrades, and special deals"
          enabled={notifs.promotional}
          onToggle={()=>toggle('promotional')}
          delay={520}
          accentColor="#B86BC8"
        />
        <NotifCategory
          icon="⚙"
          title="App Updates & News"
          desc="New features, maintenance windows, and announcements"
          enabled={notifs.appUpdates}
          onToggle={()=>toggle('appUpdates')}
          delay={580}
          accentColor={C.creamDim}
        />

        {/* Quiet hours */}
        <SectionLabel text="Quiet Hours" delay={640} />
        <FadeSlide delay={670} style={s.quietCard}>
          <View style={s.quietTop}>
            <Text style={s.quietIcon}>🌙</Text>
            <View style={{ flex:1 }}>
              <Text style={s.quietTitle}>Do Not Disturb</Text>
              <Text style={s.quietDesc}>No notifications between these hours</Text>
            </View>
            <Switch
              value={true}
              onValueChange={()=>{}}
              trackColor={{ false:'rgba(200,134,10,0.12)', true:C.gold }}
              thumbColor={C.cream}
              ios_backgroundColor="rgba(200,134,10,0.10)"
            />
          </View>
          <View style={s.quietTimes}>
            <TimePickerRow label="Start (Night)" time="22:00" onTimeChange={()=>{}} />
            <TimePickerRow label="End (Morning)" time="07:00" onTimeChange={()=>{}} />
          </View>
        </FadeSlide>

        {/* Info note */}
        <FadeSlide delay={740} style={s.infoNote}>
          <Text style={{ fontSize:14 }}>ℹ</Text>
          <Text style={s.infoText}>
            You can also manage notification permissions from your device Settings → Melanin Scan.
          </Text>
        </FadeSlide>

        <View style={{ height:80 }}/>
      </ScrollView>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll:  { paddingTop:110,paddingHorizontal:22 },
  header:  { flexDirection:'row',alignItems:'center',gap:14,marginBottom:24 },
  headerIcon:{ width:52,height:52,borderRadius:14,backgroundColor:C.goldPale,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center',shadowColor:C.gold,shadowOpacity:0.30,shadowOffset:{width:0,height:0},shadowRadius:10,elevation:6 },
  title:   { color:C.cream,fontSize:26,fontWeight:'900' },
  subtitle:{ color:C.creamDim,fontSize:12,marginTop:2 },

  masterCard: { flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:C.bgCard,borderWidth:1.5,borderColor:C.border,borderRadius:14,padding:16,marginBottom:20 },
  masterLeft: { flex:1 },
  masterLabel:{ color:C.cream,fontSize:15,fontWeight:'700',marginBottom:3 },
  masterSub:  { color:C.creamDim,fontSize:12 },

  quietCard:  { backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:14,padding:14,marginBottom:8 },
  quietTop:   { flexDirection:'row',alignItems:'center',gap:12,marginBottom:14 },
  quietIcon:  { fontSize:20 },
  quietTitle: { color:C.cream,fontSize:14,fontWeight:'700',marginBottom:2 },
  quietDesc:  { color:C.creamDim,fontSize:11 },
  quietTimes: {},

  infoNote:   { flexDirection:'row',gap:10,backgroundColor:'rgba(200,134,10,0.07)',borderWidth:1,borderColor:'rgba(200,134,10,0.18)',borderRadius:12,padding:14,marginTop:4 },
  infoText:   { flex:1,color:C.creamDim,fontSize:12,lineHeight:18 },
});
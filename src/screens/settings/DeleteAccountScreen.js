// src/screens/settings/DeleteAccountScreen.js
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, ScrollView, TextInput, Dimensions, KeyboardAvoidingView, Platform,
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
  error:      '#E05C3A',
  errorPale:  'rgba(224,92,58,0.08)',
  errorBorder:'rgba(224,92,58,0.35)',
  success:    '#5DBE8A',
};

function AfricanBG({ children }) {
  return (
    <View style={{ flex:1,backgroundColor:C.bg }}>
      <View style={[z.b,{ width:400,height:400,borderRadius:200,backgroundColor:'#500000',opacity:0.13,top:-130,left:-100 }]}/>
      <View style={[z.b,{ width:280,height:280,borderRadius:140,backgroundColor:'#600000',opacity:0.08,bottom:-70,right:-70 }]}/>
      <View style={[z.stripe,{ top:H*0.07 }]}/>
      {children}
    </View>
  );
}
const z = StyleSheet.create({
  b:     { position:'absolute' },
  stripe:{ position:'absolute',width:W,height:1.5,backgroundColor:'rgba(224,92,58,0.10)' },
});

function FadeSlide({ delay=0, from=16, children, style }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(from)).current;
  useEffect(()=>{
    Animated.parallel([
      Animated.timing(op,{toValue:1,duration:500,delay,useNativeDriver:true}),
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

// ── Step indicator ────────────────────────────────────────────
function StepIndicator({ step, total }) {
  return (
    <View style={si.wrap}>
      {Array.from({length:total}).map((_,i)=>(
        <View key={i} style={[si.seg, i<=step && si.segActive, { width:(W-48-((total-1)*6))/total }]}/>
      ))}
    </View>
  );
}
const si = StyleSheet.create({
  wrap:      { flexDirection:'row',gap:6,marginBottom:28 },
  seg:       { height:3,borderRadius:2,backgroundColor:'rgba(224,92,58,0.15)' },
  segActive: { backgroundColor:C.error },
});

// ── Data impact card ──────────────────────────────────────────
function DataImpactCard({ icon, label, detail, delay }) {
  return (
    <FadeSlide delay={delay} style={{ marginBottom:8 }}>
      <View style={dic.row}>
        <View style={dic.iconBox}>
          <Text style={{ fontSize:16 }}>{icon}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={dic.label}>{label}</Text>
          <Text style={dic.detail}>{detail}</Text>
        </View>
        <Text style={dic.gone}>Gone</Text>
      </View>
    </FadeSlide>
  );
}
const dic = StyleSheet.create({
  row:     { flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'rgba(224,92,58,0.06)',borderWidth:1,borderColor:C.errorBorder,borderRadius:12,padding:14 },
  iconBox: { width:36,height:36,borderRadius:10,backgroundColor:'rgba(224,92,58,0.12)',borderWidth:1,borderColor:C.errorBorder,alignItems:'center',justifyContent:'center' },
  label:   { color:C.cream,fontSize:13,fontWeight:'600',marginBottom:2 },
  detail:  { color:C.creamDim,fontSize:11 },
  gone:    { color:C.error,fontSize:10,fontWeight:'800',letterSpacing:0.5 },
});

// ── Reason selector ───────────────────────────────────────────
function ReasonSelector({ selected, onSelect }) {
  const REASONS = [
    'I found a better app',
    'Privacy concerns',
    'Too expensive',
    'App is not working correctly',
    'I no longer use skincare apps',
    'Other reason',
  ];
  return (
    <View style={{ gap:8 }}>
      {REASONS.map((r,i)=>(
        <TouchableOpacity key={i} onPress={()=>onSelect(r)} activeOpacity={0.8}>
          <View style={[rs.row, selected===r && rs.rowActive]}>
            <View style={[rs.radio, selected===r && rs.radioActive]}>
              {selected===r && <View style={rs.radioDot}/>}
            </View>
            <Text style={[rs.label, selected===r && rs.labelActive]}>{r}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const rs = StyleSheet.create({
  row:         { flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:12,padding:13 },
  rowActive:   { backgroundColor:'rgba(224,92,58,0.08)',borderColor:C.errorBorder },
  radio:       { width:20,height:20,borderRadius:10,borderWidth:2,borderColor:C.border,alignItems:'center',justifyContent:'center' },
  radioActive: { borderColor:C.error },
  radioDot:    { width:8,height:8,borderRadius:4,backgroundColor:C.error },
  label:       { color:C.creamDim,fontSize:13,fontWeight:'500',flex:1 },
  labelActive: { color:C.cream,fontWeight:'600' },
});

// ── Screen ────────────────────────────────────────────────────
const CONFIRM_PHRASE = 'DELETE MY ACCOUNT';

export default function DeleteAccountScreen() {
  const navigation  = useNavigation();
  const [step,      setStep]      = useState(0); // 0=impact, 1=reason, 2=confirm
  const [reason,    setReason]    = useState('');
  const [inputText, setInputText] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [inputError,setInputError]= useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const confirmMatch = inputText === CONFIRM_PHRASE;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim,{toValue:8, duration:55,useNativeDriver:true}),
      Animated.timing(shakeAnim,{toValue:-8,duration:55,useNativeDriver:true}),
      Animated.timing(shakeAnim,{toValue:5, duration:55,useNativeDriver:true}),
      Animated.timing(shakeAnim,{toValue:0, duration:55,useNativeDriver:true}),
    ]).start();
  };

  const handleNext = () => {
    if (step === 0) { setStep(1); return; }
    if (step === 1) {
      if (!reason) return;
      setStep(2); return;
    }
    if (step === 2) {
      if (!confirmMatch) {
        setInputError(`Type "${CONFIRM_PHRASE}" exactly`);
        shake();
        return;
      }
      setInputError('');
      setLoading(true);
      // TODO: API call to delete account
      setTimeout(()=>{
        setLoading(false);
        navigation.reset({ index:0, routes:[{ name:'Welcome' }] });
      }, 2000);
    }
  };

  const STEPS = [
    { label:'Review impact',     actionLabel:'I Understand — Continue' },
    { label:'Tell us why',       actionLabel:'Continue to Confirmation' },
    { label:'Final confirmation',actionLabel:loading ? 'Deleting...' : 'Permanently Delete Account' },
  ];

  const canContinue = () => {
    if (step === 0) return true;
    if (step === 1) return !!reason;
    if (step === 2) return confirmMatch;
    return false;
  };

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BackButton onPress={()=>step>0?setStep(s=>s-1):navigation.goBack()} />

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Warning icon */}
          <FadeSlide delay={0} style={s.iconWrap}>
            <WarningOrb step={step}/>
          </FadeSlide>

          {/* Step bar */}
          <StepIndicator step={step} total={3}/>

          {/* Step label */}
          <FadeSlide delay={80} style={s.stepLabel}>
            <View style={s.stepDot}/>
            <Text style={s.stepText}>STEP {step+1} OF 3  ·  {STEPS[step].label.toUpperCase()}</Text>
          </FadeSlide>

          {/* ── STEP 0: Impact ── */}
          {step===0 && (
            <>
              <FadeSlide delay={100} style={s.headBlock}>
                <Text style={s.title}>This Cannot{'\n'}Be Undone</Text>
                <Text style={s.subtitle}>
                  Deleting your account permanently erases everything. Here's exactly what you will lose.
                </Text>
              </FadeSlide>

              <DataImpactCard icon="◉" label="All Scan History"       detail="Every scan result and photo permanently deleted" delay={180} />
              <DataImpactCard icon="✦" label="Personalised Routine"   detail="Your AI-generated AM + PM routine"              delay={240} />
              <DataImpactCard icon="◈" label="Progress Tracking"      detail="All improvement data and trend history"         delay={300} />
              <DataImpactCard icon="💎" label="Subscription & Credits" detail="Unused subscription time will not be refunded" delay={360} />
              <DataImpactCard icon="🔒" label="Account & Profile"      detail="Your email, name, and preferences"             delay={420} />

              <FadeSlide delay={480} style={s.alternativeCard}>
                <Text style={s.altTitle}>Instead of deleting, you could:</Text>
                {[
                  { icon:'⏸', text:'Pause your subscription instead of cancelling' },
                  { icon:'🔕', text:'Turn off all notifications in Settings' },
                  { icon:'🛡', text:'Opt out of data collection in Privacy settings' },
                ].map((alt,i)=>(
                  <View key={i} style={s.altRow}>
                    <Text style={s.altIcon}>{alt.icon}</Text>
                    <Text style={s.altText}>{alt.text}</Text>
                  </View>
                ))}
                <TouchableOpacity style={s.keepBtn} onPress={()=>navigation.navigate('Subscription')}>
                  <Text style={s.keepBtnText}>Manage Subscription Instead →</Text>
                </TouchableOpacity>
              </FadeSlide>
            </>
          )}

          {/* ── STEP 1: Reason ── */}
          {step===1 && (
            <>
              <FadeSlide delay={100} style={s.headBlock}>
                <Text style={s.title}>Why Are You{'\n'}Leaving?</Text>
                <Text style={s.subtitle}>Your feedback helps us build a better product. This is optional but appreciated.</Text>
              </FadeSlide>
              <FadeSlide delay={160}>
                <ReasonSelector selected={reason} onSelect={setReason}/>
              </FadeSlide>
            </>
          )}

          {/* ── STEP 2: Type to confirm ── */}
          {step===2 && (
            <>
              <FadeSlide delay={100} style={s.headBlock}>
                <Text style={s.title}>Final{'\n'}Confirmation</Text>
                <Text style={s.subtitle}>
                  To permanently delete your account, type the following exactly:
                </Text>
              </FadeSlide>

              <FadeSlide delay={160} style={s.phraseBox}>
                <Text style={s.phraseText}>{CONFIRM_PHRASE}</Text>
              </FadeSlide>

              <FadeSlide delay={220}>
                <Animated.View style={[s.inputWrap, {
                  borderColor:inputError ? C.error : confirmMatch ? C.success : C.errorBorder,
                  transform:[{translateX:shakeAnim}],
                }]}>
                  <TextInput
                    style={s.input}
                    value={inputText}
                    onChangeText={(t)=>{setInputText(t.toUpperCase());setInputError('');}}
                    placeholder={CONFIRM_PHRASE}
                    placeholderTextColor="rgba(224,92,58,0.30)"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoFocus
                  />
                  {confirmMatch && <Text style={{ color:C.success,fontSize:16,fontWeight:'800',marginRight:4 }}>✓</Text>}
                </Animated.View>
                {inputError ? (
                  <Text style={s.inputError}>{inputError}</Text>
                ) : confirmMatch ? (
                  <Text style={[s.inputHint,{color:C.success}]}>✓ Phrase matched</Text>
                ) : (
                  <Text style={s.inputHint}>{inputText.length} / {CONFIRM_PHRASE.length} characters</Text>
                )}
              </FadeSlide>

              <FadeSlide delay={300} style={s.finalWarning}>
                <Text style={{ fontSize:18 }}>⚠</Text>
                <Text style={s.finalWarningText}>
                  This action is irreversible. Your account and all associated data will be permanently and immediately deleted from our servers.
                </Text>
              </FadeSlide>
            </>
          )}

          <View style={{ height:120 }}/>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom action bar */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.cancelLink} onPress={()=>navigation.goBack()}>
          <Text style={s.cancelText}>Keep My Account</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.deleteBtn, !canContinue() && s.deleteBtnDisabled, loading && s.deleteBtnLoading]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading
            ? <DeleteSpinner/>
            : <Text style={[s.deleteBtnText, step<2 && s.deleteBtnTextNeutral]}>
                {STEPS[step].actionLabel}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </AfricanBG>
  );
}

// ── Warning orb ───────────────────────────────────────────────
function WarningOrb({ step }) {
  const pulse = useRef(new Animated.Value(0.9)).current;
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1.04,duration:1600,useNativeDriver:true}),
      Animated.timing(pulse,{toValue:0.9, duration:1600,useNativeDriver:true}),
    ])).start();
  },[]);
  const icons = ['⚠','◎','✕'];
  return (
    <View style={{ alignItems:'center',justifyContent:'center',height:110,marginBottom:8 }}>
      <Animated.View style={[wo.glow,{transform:[{scale:pulse}]}]}/>
      <View style={wo.orb}>
        <Text style={wo.icon}>{icons[step]}</Text>
      </View>
    </View>
  );
}
const wo = StyleSheet.create({
  glow: { position:'absolute',width:100,height:100,borderRadius:50,backgroundColor:C.error,opacity:0.12,shadowColor:C.error,shadowOpacity:1,shadowRadius:20,elevation:10 },
  orb:  { width:72,height:72,borderRadius:36,backgroundColor:'rgba(224,92,58,0.12)',borderWidth:2,borderColor:C.errorBorder,alignItems:'center',justifyContent:'center' },
  icon: { color:C.error,fontSize:28,fontWeight:'900' },
});

// ── Spinner ───────────────────────────────────────────────────
function DeleteSpinner() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    Animated.loop(Animated.timing(spin,{toValue:1,duration:900,useNativeDriver:true})).start();
  },[]);
  const rotate = spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  return (
    <View style={{ flexDirection:'row',alignItems:'center',gap:10 }}>
      <Animated.View style={{width:18,height:18,borderRadius:9,borderWidth:2.5,borderColor:'rgba(245,222,179,0.25)',borderTopColor:C.cream,transform:[{rotate}]}}/>
      <Text style={{ color:C.cream,fontSize:14,fontWeight:'700' }}>Deleting...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  scroll:     { paddingTop:108,paddingHorizontal:22 },

  iconWrap:   { alignItems:'center',marginBottom:16 },
  stepLabel:  { flexDirection:'row',alignItems:'center',gap:7,marginBottom:16 },
  stepDot:    { width:5,height:5,borderRadius:2.5,backgroundColor:C.error },
  stepText:   { color:C.error,fontSize:10,fontWeight:'800',letterSpacing:1.5 },

  headBlock:  { marginBottom:20 },
  title:      { color:C.cream,fontSize:30,fontWeight:'900',lineHeight:38,marginBottom:10 },
  subtitle:   { color:C.creamDim,fontSize:14,lineHeight:22 },

  alternativeCard:{ backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:14,padding:16,marginTop:8 },
  altTitle:   { color:C.cream,fontSize:13,fontWeight:'700',marginBottom:12 },
  altRow:     { flexDirection:'row',alignItems:'center',gap:10,marginBottom:10 },
  altIcon:    { fontSize:16 },
  altText:    { color:C.creamDim,fontSize:13,flex:1 },
  keepBtn:    { backgroundColor:C.goldPale,borderWidth:1,borderColor:C.border,borderRadius:10,paddingVertical:11,alignItems:'center',marginTop:6 },
  keepBtnText:{ color:C.gold,fontSize:13,fontWeight:'700' },

  phraseBox:  { backgroundColor:'rgba(224,92,58,0.08)',borderWidth:1.5,borderColor:C.errorBorder,borderRadius:12,padding:16,marginBottom:14,alignItems:'center' },
  phraseText: { color:C.error,fontSize:15,fontWeight:'900',letterSpacing:2 },

  inputWrap:  { backgroundColor:C.bgCard,borderWidth:2,borderRadius:14,flexDirection:'row',alignItems:'center',paddingHorizontal:16,marginBottom:6 },
  input:      { flex:1,color:C.cream,fontSize:15,fontWeight:'700',paddingVertical:14,letterSpacing:1 },
  inputError: { color:C.error,fontSize:11,fontWeight:'600',marginBottom:4 },
  inputHint:  { color:C.creamFaint,fontSize:11,marginBottom:14 },

  finalWarning:{ flexDirection:'row',alignItems:'flex-start',gap:10,backgroundColor:'rgba(224,92,58,0.08)',borderWidth:1,borderColor:C.errorBorder,borderRadius:12,padding:14,marginTop:8 },
  finalWarningText:{ flex:1,color:'rgba(224,92,58,0.75)',fontSize:12,lineHeight:18 },

  bottomBar:  { position:'absolute',bottom:0,left:0,right:0,backgroundColor:'rgba(15,5,0,0.95)',borderTopWidth:1,borderTopColor:C.border,paddingHorizontal:22,paddingBottom:36,paddingTop:14,gap:10 },
  cancelLink: { alignItems:'center',paddingVertical:6 },
  cancelText: { color:C.creamDim,fontSize:14,fontWeight:'600' },
  deleteBtn:  { backgroundColor:C.error,borderRadius:14,paddingVertical:16,alignItems:'center',shadowColor:C.error,shadowOpacity:0.35,shadowOffset:{width:0,height:4},shadowRadius:12,elevation:8 },
  deleteBtnDisabled:{ backgroundColor:'rgba(224,92,58,0.25)',shadowOpacity:0 },
  deleteBtnLoading: { backgroundColor:'rgba(224,92,58,0.60)',shadowOpacity:0 },
  deleteBtnText:    { color:C.cream,fontSize:14,fontWeight:'900',letterSpacing:0.5 },
  deleteBtnTextNeutral:{ color:C.cream },
});
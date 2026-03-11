// src/screens/subscription/PaymentScreen.js
//
//  API CONNECTIONS:
//  ─────────────────────────────────────────────────────────────
//  • Receives { plan, billing, reference, authorizationUrl, amountNGN }
//    from SubscriptionScreen (already called /initiate before nav)
//
//  PAYSTACK INTEGRATION FLOW:
//  ─────────────────────────────────────────────────────────────
//  1. SubscriptionScreen calls POST /api/subscription/initiate
//     → gets authorizationUrl from Paystack
//  2. PaymentScreen opens authorizationUrl in WebBrowser (Expo)
//     OR react-native-inappbrowser-reborn (bare RN)
//  3. Paystack redirects to callback_url with ?reference=...
//  4. App catches the redirect, calls POST /api/subscription/verify
//  5. Backend verifies with Paystack, activates plan, returns user
//  6. We call updateUser() to sync AuthContext, navigate to Success
//
//  IMPORTANT: Install one of these for in-app browser:
//   Expo:   expo install expo-web-browser expo-linking
//   Bare RN: npm install react-native-inappbrowser-reborn
//
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, ScrollView, TextInput, Dimensions,
  KeyboardAvoidingView, Platform, Alert, Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { SubscriptionAPI } from '../../services/api';

// ── WebBrowser: works for both Expo and bare RN ───────────────
// Uncomment whichever matches your setup:
//
// OPTION A — Expo managed:
// import * as WebBrowser from 'expo-web-browser';
// import * as Linking from 'expo-linking';
//
// OPTION B — Bare RN (react-native-inappbrowser-reborn):
// import InAppBrowser from 'react-native-inappbrowser-reborn';
//
// The openPaystack() function below handles both. Set BROWSER_MODE below.
const BROWSER_MODE = 'linking'; // 'expo-webbrowser' | 'inappbrowser' | 'linking'

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg:         '#0B0300',
  bgCard:     '#180900',
  bgInput:    '#1E0D03',
  border:     'rgba(200,134,10,0.22)',
  borderFocus:'#C8860A',
  gold:       '#C8860A',
  goldLight:  '#E8A020',
  goldPale:   'rgba(200,134,10,0.13)',
  cream:      '#F5DEB3',
  creamDim:   'rgba(245,222,179,0.55)',
  creamFaint: 'rgba(245,222,179,0.18)',
  error:      '#E05C3A',
  success:    '#5DBE8A',
};

// ─────────────────────────────────────────────────────────────
//  Open Paystack checkout
// ─────────────────────────────────────────────────────────────
async function openPaystackBrowser(authorizationUrl) {
  if (BROWSER_MODE === 'expo-webbrowser') {
    // const { type, url } = await WebBrowser.openAuthSessionAsync(
    //   authorizationUrl,
    //   'melaninscan://payment/verify'  // your app scheme
    // );
    // return { type, url };
    throw new Error('Uncomment expo-web-browser import above');
  }

  if (BROWSER_MODE === 'inappbrowser') {
    // const result = await InAppBrowser.openAuth(
    //   authorizationUrl,
    //   'melaninscan://payment/verify',
    //   { showTitle: true, enableUrlBarHiding: true }
    // );
    // return result;
    throw new Error('Uncomment react-native-inappbrowser-reborn import above');
  }

  // Default: open system browser, listen for deep-link return
  await Linking.openURL(authorizationUrl);
  return { type: 'opened' };
}

// ─────────────────────────────────────────────────────────────
//  Background, FadeSlide, BackButton (same as SubscriptionScreen)
// ─────────────────────────────────────────────────────────────
function AfricanBG({children}) {
  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      <View style={[ab.b,{width:420,height:420,borderRadius:210,backgroundColor:'#6B3000',opacity:0.10,top:-130,left:-110}]}/>
      <View style={[ab.b,{width:300,height:300,borderRadius:150,backgroundColor:C.gold,opacity:0.04,bottom:-70,right:-70}]}/>
      <View style={[ab.stripe,{top:H*0.06}]}/>
      {[{top:H*0.10,left:W*0.06,o:0.20},{top:H*0.82,left:W*0.88,o:0.14}].map((d,i)=>(
        <View key={i} style={[ab.dot,{top:d.top,left:d.left,opacity:d.o}]}/>
      ))}
      {children}
    </View>
  );
}
const ab = StyleSheet.create({
  b:      {position:'absolute'},
  stripe: {position:'absolute',width:W,height:1.5,backgroundColor:'rgba(200,134,10,0.12)'},
  dot:    {position:'absolute',width:5,height:5,borderRadius:2.5,backgroundColor:C.gold},
});

function FadeSlide({delay=0, from=18, children, style}) {
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

function BackButton({onPress}) {
  return (
    <TouchableOpacity style={{position:'absolute',top:56,left:22,zIndex:99}} onPress={onPress} activeOpacity={0.8}>
      <View style={{width:42,height:42,borderRadius:12,backgroundColor:'rgba(200,134,10,0.10)',borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'}}>
        <Text style={{color:C.cream,fontSize:18}}>←</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
//  Order summary
// ─────────────────────────────────────────────────────────────
function OrderSummary({plan, billing, amountNGN}) {
  const display = `₦${amountNGN.toLocaleString()}`;
  const period  = billing==='yearly' ? '/year' : '/month';
  return (
    <FadeSlide delay={0} style={os.card}>
      <View style={os.row}>
        <View style={[os.planIcon,{backgroundColor:`${plan.color}15`,borderColor:`${plan.color}35`}]}>
          <Text style={{color:plan.color,fontSize:16}}>{plan.icon}</Text>
        </View>
        <View style={{flex:1}}>
          <Text style={os.planName}>{plan.name} Plan</Text>
          <Text style={os.billingLabel}>{billing==='yearly'?'Annual billing  🏷  20% off':'Monthly billing'}</Text>
        </View>
        <View style={{alignItems:'flex-end'}}>
          <Text style={[os.amount,{color:plan.color}]}>{display}</Text>
          <Text style={os.period}>{period}</Text>
        </View>
      </View>
      <View style={os.divider}/>
      <View style={os.totalRow}>
        <Text style={os.totalLabel}>Total Due Today</Text>
        <Text style={[os.totalAmount,{color:plan.color}]}>{display}</Text>
      </View>
    </FadeSlide>
  );
}
const os = StyleSheet.create({
  card:       {backgroundColor:C.bgCard,borderWidth:1.5,borderColor:C.border,borderRadius:16,padding:16,marginBottom:24},
  row:        {flexDirection:'row',alignItems:'center',gap:14,marginBottom:12},
  planIcon:   {width:40,height:40,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center'},
  planName:   {color:C.cream,fontSize:16,fontWeight:'800',marginBottom:3},
  billingLabel:{color:C.creamDim,fontSize:11},
  amount:     {fontSize:18,fontWeight:'900'},
  period:     {color:C.creamDim,fontSize:10},
  divider:    {height:1,backgroundColor:C.border,marginBottom:12},
  totalRow:   {flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  totalLabel: {color:C.creamDim,fontSize:13,fontWeight:'600'},
  totalAmount:{fontSize:20,fontWeight:'900'},
});

// ─────────────────────────────────────────────────────────────
//  Pay button
// ─────────────────────────────────────────────────────────────
function PayButton({label, onPress, loading}) {
  const scale   = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(-W)).current;
  useEffect(()=>{
    if (!loading) {
      Animated.loop(Animated.sequence([
        Animated.timing(shimmer,{toValue:W,duration:2000,delay:300,useNativeDriver:true}),
        Animated.timing(shimmer,{toValue:-W,duration:0,useNativeDriver:true}),
      ])).start();
    }
  },[loading]);
  return (
    <Animated.View style={{transform:[{scale}],marginBottom:16}}>
      <TouchableOpacity
        style={[pb.btn,loading&&pb.btnLoading]}
        onPress={loading?undefined:onPress} activeOpacity={0.9}
        onPressIn={()=>!loading&&Animated.spring(scale,{toValue:0.96,useNativeDriver:true}).start()}
        onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()}
      >
        {!loading&&<Animated.View style={[pb.shimmer,{transform:[{translateX:shimmer}]}]}/>}
        {loading
          ? <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
              <LoadingSpinner/>
              <Text style={pb.label}>Processing...</Text>
            </View>
          : <Text style={pb.label}>{label}</Text>
        }
      </TouchableOpacity>
    </Animated.View>
  );
}
const pb = StyleSheet.create({
  btn:       {backgroundColor:C.gold,borderRadius:14,paddingVertical:18,alignItems:'center',overflow:'hidden',shadowColor:C.gold,shadowOffset:{width:0,height:6},shadowOpacity:0.45,shadowRadius:16,elevation:10},
  btnLoading:{backgroundColor:'rgba(200,134,10,0.65)',shadowOpacity:0},
  shimmer:   {position:'absolute',top:0,bottom:0,width:100,backgroundColor:'rgba(255,255,255,0.12)',borderRadius:50},
  label:     {color:'#0B0300',fontSize:16,fontWeight:'900',letterSpacing:1.5,textTransform:'uppercase'},
});

function LoadingSpinner() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(()=>{Animated.loop(Animated.timing(spin,{toValue:1,duration:800,useNativeDriver:true})).start();},[]);
  const rotate = spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  return <Animated.View style={{width:20,height:20,borderRadius:10,borderWidth:2.5,borderColor:'rgba(11,3,0,0.3)',borderTopColor:'#0B0300',transform:[{rotate}]}}/>;
}

// ─────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────
export default function PaymentScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { updateUser } = useAuth();

  const {
    plan = { id:'pro', name:'Pro', price:'₦2,500', color:C.gold, icon:'◈' },
    billing      = 'monthly',
    reference    = '',
    authorizationUrl = '',
    amountNGN    = 2500,
  } = route.params || {};

  const [loading,      setLoading]      = useState(false);
  const [verifying,    setVerifying]    = useState(false);
  const [waitingReturn,setWaitingReturn]= useState(false);

  // ── Handle deep-link return from Paystack ────────────────
  // When Paystack redirects to melaninscan://payment/verify?reference=...
  // or the user taps "I've paid" button
  useEffect(() => {
    const sub = Linking.addEventListener('url', handleDeepLink);
    return () => sub.remove();
  }, []);

  const handleDeepLink = useCallback(({ url }) => {
    if (!url) return;
    // Extract reference from callback URL: ?reference=MS-xxx
    try {
      const parsed  = new URL(url);
      const ref     = parsed.searchParams.get('reference') || parsed.searchParams.get('trxref');
      if (ref) handleVerify(ref);
    } catch {
      // URL parsing failed — not our callback
    }
  }, []);

  // ── Open Paystack checkout ────────────────────────────────
  const handleOpenPaystack = useCallback(async () => {
    if (!authorizationUrl) {
      Alert.alert('Error', 'Payment session expired. Please go back and try again.');
      return;
    }
    setLoading(true);
    try {
      await openPaystackBrowser(authorizationUrl);
      // Show "I've paid" button after browser opens
      setWaitingReturn(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not open payment page.');
    } finally {
      setLoading(false);
    }
  }, [authorizationUrl]);

  // ── Verify payment after return ───────────────────────────
  const handleVerify = useCallback(async (ref = reference) => {
    if (!ref) return;
    setVerifying(true);
    try {
      const result = await SubscriptionAPI.verify(ref);
      // Sync user in AuthContext so ProfileScreen, HomeScreen update immediately
      if (result.user) updateUser(result.user);

      navigation.replace('PaymentSuccess', {
        plan,
        billing,
        amount: `₦${(result.amountNGN || amountNGN).toLocaleString()}`,
      });
    } catch (err) {
      Alert.alert(
        'Payment Verification Failed',
        err?.message || 'We could not confirm your payment. If you were charged, contact support@melaninscan.com with your reference: ' + ref,
        [
          { text: 'Try Again',   onPress: () => handleVerify(ref) },
          { text: 'Go Back',     onPress: () => navigation.goBack(), style: 'cancel' },
        ]
      );
    } finally {
      setVerifying(false);
    }
  }, [reference, plan, billing, amountNGN, navigation, updateUser]);

  const displayAmount = `₦${amountNGN.toLocaleString()}`;

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent/>
      <BackButton onPress={()=>navigation.goBack()}/>

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <FadeSlide delay={0} style={s.header}>
            <Text style={s.title}>Checkout</Text>
            <Text style={s.subtitle}>Secure payment via Paystack</Text>
          </FadeSlide>

          {/* Order summary */}
          <OrderSummary plan={plan} billing={billing} amountNGN={amountNGN}/>

          {/* Reference chip */}
          {reference ? (
            <FadeSlide delay={120} style={s.refCard}>
              <Text style={s.refLabel}>Payment Reference</Text>
              <Text style={s.refValue} selectable>{reference}</Text>
            </FadeSlide>
          ) : null}

          {/* What happens section */}
          <FadeSlide delay={180} style={s.stepsCard}>
            <Text style={s.stepsTitle}>How it works</Text>
            {[
              {n:'1', text:`Tap "Pay ${displayAmount}" to open Paystack's secure checkout`},
              {n:'2', text:'Complete payment with your card, bank transfer or USSD'},
              {n:'3', text:'Return to the app — your plan activates instantly'},
            ].map((step,i)=>(
              <View key={i} style={s.stepRow}>
                <View style={s.stepNum}><Text style={s.stepNumText}>{step.n}</Text></View>
                <Text style={s.stepText}>{step.text}</Text>
              </View>
            ))}
          </FadeSlide>

          {/* Paystack method chips */}
          <FadeSlide delay={240} style={s.methodsRow}>
            {[{icon:'💳',label:'Card'},{icon:'🏦',label:'Bank Transfer'},{icon:'📱',label:'USSD'}].map((m,i)=>(
              <View key={i} style={s.methodChip}>
                <Text style={{fontSize:16}}>{m.icon}</Text>
                <Text style={s.methodLabel}>{m.label}</Text>
              </View>
            ))}
          </FadeSlide>

          {/* Security badge */}
          <FadeSlide delay={300} style={s.securityRow}>
            <Text style={{fontSize:14}}>🔒</Text>
            <Text style={s.secText}>256-bit SSL encryption · Powered by Paystack · PCI-DSS compliant</Text>
          </FadeSlide>

          {/* Main CTA */}
          <FadeSlide delay={360}>
            <PayButton
              loading={loading || verifying}
              label={verifying ? 'Verifying...' : `Pay ${displayAmount} via Paystack`}
              onPress={handleOpenPaystack}
            />
          </FadeSlide>

          {/* After browser opens — "I've already paid" button */}
          {waitingReturn && !verifying && (
            <FadeSlide delay={0} style={{marginBottom:16}}>
              <TouchableOpacity
                style={s.alreadyPaidBtn}
                onPress={() => handleVerify(reference)}
                activeOpacity={0.85}
              >
                <Text style={s.alreadyPaidText}>I've completed payment →</Text>
              </TouchableOpacity>
              <Text style={{color:C.creamFaint,fontSize:11,textAlign:'center',marginTop:8}}>
                Tap above after completing payment in the browser
              </Text>
            </FadeSlide>
          )}

          {/* Logos row */}
          <FadeSlide delay={420} style={s.logosRow}>
            {['Paystack','Visa','Mastercard','Verve'].map((l,i)=>(
              <View key={i} style={s.logoChip}>
                <Text style={s.logoText}>{l}</Text>
              </View>
            ))}
          </FadeSlide>

          {/* Reference reminder */}
          <FadeSlide delay={480} style={s.refReminder}>
            <Text style={s.refReminderText}>
              Keep your reference handy: <Text style={{color:C.gold,fontWeight:'700'}}>{reference}</Text>
            </Text>
          </FadeSlide>

          <View style={{height:60}}/>
        </ScrollView>
      </KeyboardAvoidingView>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll:         {paddingTop:112,paddingHorizontal:22},
  header:         {marginBottom:24},
  title:          {color:C.cream,fontSize:28,fontWeight:'900',marginBottom:4},
  subtitle:       {color:C.creamDim,fontSize:13},

  refCard:        {backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:12,padding:14,marginBottom:16},
  refLabel:       {color:C.creamDim,fontSize:10,fontWeight:'700',letterSpacing:1,textTransform:'uppercase',marginBottom:4},
  refValue:       {color:C.gold,fontSize:13,fontWeight:'700',letterSpacing:0.5},

  stepsCard:      {backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:14,padding:16,marginBottom:20},
  stepsTitle:     {color:C.cream,fontSize:14,fontWeight:'800',marginBottom:14},
  stepRow:        {flexDirection:'row',alignItems:'flex-start',gap:12,marginBottom:12},
  stepNum:        {width:22,height:22,borderRadius:6,backgroundColor:C.goldPale,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center',marginTop:1},
  stepNumText:    {color:C.gold,fontSize:11,fontWeight:'900'},
  stepText:       {flex:1,color:C.creamDim,fontSize:13,lineHeight:19},

  methodsRow:     {flexDirection:'row',gap:8,marginBottom:20},
  methodChip:     {flex:1,backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:12,paddingVertical:12,alignItems:'center',gap:5},
  methodLabel:    {color:C.creamDim,fontSize:11,fontWeight:'600'},

  securityRow:    {flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(93,190,138,0.07)',borderWidth:1,borderColor:'rgba(93,190,138,0.20)',borderRadius:10,padding:12,marginBottom:18},
  secText:        {color:C.creamDim,fontSize:10,flex:1,lineHeight:16},

  alreadyPaidBtn: {borderWidth:1.5,borderColor:C.gold,borderRadius:14,paddingVertical:16,alignItems:'center',backgroundColor:C.goldPale},
  alreadyPaidText:{color:C.gold,fontSize:14,fontWeight:'800'},

  logosRow:       {flexDirection:'row',justifyContent:'center',gap:8,marginTop:4,marginBottom:16},
  logoChip:       {backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:8,paddingHorizontal:10,paddingVertical:5},
  logoText:       {color:C.creamFaint,fontSize:10,fontWeight:'700',letterSpacing:0.5},

  refReminder:    {alignItems:'center',marginBottom:8},
  refReminderText:{color:C.creamFaint,fontSize:11,textAlign:'center'},
});
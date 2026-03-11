// src/screens/subscription/SubscriptionScreen.js
//
//  API CONNECTIONS:
//  ─────────────────────────────────────────────────────────────
//  • SubscriptionAPI.get()       → GET  /api/subscription
//    Shows current plan + locks out already-subscribed plan
//  • SubscriptionAPI.initiate()  → POST /api/subscription/initiate
//    Gets Paystack authorizationUrl, opens in-app browser
//  • useAuth() → user.subscription.plan  — live plan badge
//  • useFocusEffect — refreshes plan status on tab focus
//
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, ScrollView, Dimensions, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { SubscriptionAPI } from '../../services/api';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg:          '#0B0300',
  bgCard:      '#180900',
  bgCardHigh:  '#1E0C02',
  border:      'rgba(200,134,10,0.20)',
  borderBright:'rgba(200,134,10,0.55)',
  gold:        '#C8860A',
  goldLight:   '#E8A020',
  goldPale:    'rgba(200,134,10,0.13)',
  goldStrong:  'rgba(200,134,10,0.25)',
  cream:       '#F5DEB3',
  creamDim:    'rgba(245,222,179,0.55)',
  creamFaint:  'rgba(245,222,179,0.18)',
  elite:       '#E8D48A',
  elitePale:   'rgba(232,212,138,0.12)',
  eliteBorder: 'rgba(232,212,138,0.40)',
  success:     '#5DBE8A',
};

// ─────────────────────────────────────────────────────────────
const PLANS = [
  {
    id:       'free',
    name:     'Free',
    price:    '₦0',
    period:   'forever',
    tagline:  'Start your skin journey',
    color:    C.creamDim,
    colorPale:'rgba(245,222,179,0.08)',
    border:   C.border,
    icon:     '◎',
    features: [
      { label:'3 scans per month',          included:true  },
      { label:'Basic skin type detection',  included:true  },
      { label:'2-step routine suggestion',  included:true  },
      { label:'General melanin tips',       included:true  },
      { label:'Full condition analysis',    included:false },
      { label:'Unlimited scans',            included:false },
      { label:'Ingredient scanner',         included:false },
      { label:'Progress tracking',          included:false },
      { label:'African product recs',       included:false },
      { label:'Priority AI model',          included:false },
    ],
  },
  {
    id:       'pro',
    name:     'Pro',
    price:    '₦2,500',
    period:   'per month',
    yearPrice:'₦24,000 / year  (Save 20%)',
    tagline:  'For serious skin transformation',
    color:    C.gold,
    colorPale:C.goldPale,
    border:   C.gold,
    icon:     '◈',
    badge:    'MOST POPULAR',
    features: [
      { label:'Unlimited scans',            included:true },
      { label:'Full condition analysis',    included:true },
      { label:'Complete 5-step routine',    included:true },
      { label:'African product recs',       included:true },
      { label:'Progress tracking',          included:true },
      { label:'Ingredient scanner',         included:true },
      { label:'Melanin-specific insights',  included:true },
      { label:'Export scan reports',        included:true },
      { label:'Priority AI model',          included:false },
      { label:'1-on-1 skin consultation',   included:false },
    ],
  },
  {
    id:       'elite',
    name:     'Elite',
    price:    '₦5,500',
    period:   'per month',
    yearPrice:'₦52,800 / year  (Save 20%)',
    tagline:  'Maximum skin intelligence',
    color:    C.elite,
    colorPale:C.elitePale,
    border:   C.eliteBorder,
    icon:     '✦',
    badge:    'BEST VALUE',
    features: [
      { label:'Everything in Pro',          included:true },
      { label:'Priority AI model',          included:true },
      { label:'Monthly skin consultation',  included:true },
      { label:'Custom ingredient formula',  included:true },
      { label:'Clinic referral network',    included:true },
      { label:'Early feature access',       included:true },
      { label:'Dedicated support',          included:true },
      { label:'Family account (3 users)',   included:true },
      { label:'Scan comparison timeline',   included:true },
      { label:'Dermatologist review',       included:true },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
function AfricanBG({ children }) {
  return (
    <View style={{ flex:1,backgroundColor:C.bg }}>
      <View style={[bg.b,{width:500,height:500,borderRadius:250,backgroundColor:'#6B3000',opacity:0.13,top:-160,left:-130}]}/>
      <View style={[bg.b,{width:380,height:380,borderRadius:190,backgroundColor:C.gold,opacity:0.05,bottom:-100,right:-100}]}/>
      <View style={[bg.b,{width:240,height:240,borderRadius:120,borderWidth:1,borderColor:'rgba(200,134,10,0.10)',top:-75,left:-75}]}/>
      <View style={[bg.stripe,{top:H*0.06}]}/>
      <View style={[bg.stripe,{top:H*0.063,height:0.8,backgroundColor:'rgba(240,192,64,0.08)'}]}/>
      {[{top:H*0.12,left:W*0.06,o:0.25},{top:H*0.18,left:W*0.90,o:0.16},{top:H*0.82,left:W*0.88,o:0.18}].map((d,i)=>(
        <View key={i} style={[bg.dot,{top:d.top,left:d.left,opacity:d.o}]}/>
      ))}
      {children}
    </View>
  );
}
const bg = StyleSheet.create({
  b:      {position:'absolute'},
  stripe: {position:'absolute',width:W,height:1.5,backgroundColor:'rgba(200,134,10,0.14)'},
  dot:    {position:'absolute',width:5,height:5,borderRadius:2.5,backgroundColor:C.gold},
});

function FadeSlide({ delay=0, from=20, children, style }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(from)).current;
  useEffect(()=>{
    Animated.parallel([
      Animated.timing(op,{toValue:1,duration:520,delay,useNativeDriver:true}),
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

function BillingToggle({billing, onChange}) {
  const slide = useRef(new Animated.Value(billing==='monthly'?0:1)).current;
  useEffect(()=>{
    Animated.spring(slide,{toValue:billing==='monthly'?0:1,friction:7,tension:55,useNativeDriver:true}).start();
  },[billing]);
  const tx = slide.interpolate({inputRange:[0,1],outputRange:[2,(W-48)/2-2]});
  return (
    <View style={bt.wrap}>
      <Animated.View style={[bt.pill,{transform:[{translateX:tx}]}]}/>
      {['monthly','yearly'].map(b=>(
        <TouchableOpacity key={b} style={bt.option} onPress={()=>onChange(b)} activeOpacity={0.8}>
          <Text style={[bt.optLabel,billing===b&&bt.optLabelActive]}>
            {b==='monthly'?'Monthly':'Yearly  🏷 Save 20%'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const bt = StyleSheet.create({
  wrap:          {flexDirection:'row',backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:12,padding:3,position:'relative',marginBottom:28},
  pill:          {position:'absolute',top:3,width:(W-48)/2-4,height:38,backgroundColor:C.goldPale,borderRadius:9,borderWidth:1.5,borderColor:C.gold},
  option:        {flex:1,height:38,alignItems:'center',justifyContent:'center',zIndex:1},
  optLabel:      {color:C.creamDim,fontSize:13,fontWeight:'600'},
  optLabelActive:{color:C.gold,fontWeight:'700'},
});

function FeatureRow({feature, planColor, delay}) {
  const op = useRef(new Animated.Value(0)).current;
  useEffect(()=>{Animated.timing(op,{toValue:1,duration:400,delay,useNativeDriver:true}).start();},[]);
  return (
    <Animated.View style={[fr.row,{opacity:op}]}>
      <View style={[fr.iconBox,feature.included
        ?{backgroundColor:`${planColor}15`,borderColor:`${planColor}40`}
        :{backgroundColor:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)'}
      ]}>
        <Text style={[fr.icon,{color:feature.included?planColor:C.creamFaint}]}>
          {feature.included?'✓':'—'}
        </Text>
      </View>
      <Text style={[fr.label,!feature.included&&fr.labelDim]}>{feature.label}</Text>
    </Animated.View>
  );
}
const fr = StyleSheet.create({
  row:      {flexDirection:'row',alignItems:'center',gap:12,marginBottom:10},
  iconBox:  {width:24,height:24,borderRadius:6,borderWidth:1,alignItems:'center',justifyContent:'center'},
  icon:     {fontSize:11,fontWeight:'900'},
  label:    {color:C.cream,fontSize:13,fontWeight:'500',flex:1},
  labelDim: {color:C.creamFaint,textDecorationLine:'line-through'},
});

function PlanCard({plan, selected, billing, currentPlan, onSelect, delay}) {
  const scale = useRef(new Animated.Value(1)).current;
  const isCurrentPlan = currentPlan === plan.id;

  useEffect(()=>{
    // Auto-select next logical plan if user already has this one
  },[]);

  return (
    <FadeSlide delay={delay} style={{marginBottom:16}}>
      <TouchableOpacity
        onPress={()=>onSelect(plan.id)} activeOpacity={0.9}
        onPressIn={()=>Animated.spring(scale,{toValue:0.97,friction:6,useNativeDriver:true}).start()}
        onPressOut={()=>Animated.spring(scale,{toValue:1,friction:6,useNativeDriver:true}).start()}
      >
        <Animated.View style={[pc.card,{
          borderColor:plan.border,
          borderWidth:selected?2:1,
          transform:[{scale}],
          shadowColor:plan.color,
          shadowOpacity:selected?0.30:0,
          shadowOffset:{width:0,height:4},
          shadowRadius:16,
          elevation:selected?8:0,
        }]}>
          {plan.badge && (
            <View style={[pc.badge,{backgroundColor:`${plan.color}20`,borderColor:`${plan.color}50`}]}>
              <Text style={[pc.badgeText,{color:plan.color}]}>{plan.badge}</Text>
            </View>
          )}
          {isCurrentPlan && (
            <View style={[pc.currentBadge]}>
              <Text style={pc.currentBadgeText}>CURRENT PLAN</Text>
            </View>
          )}

          <View style={pc.header}>
            <View style={[pc.iconBox,{backgroundColor:`${plan.color}15`,borderColor:`${plan.color}35`}]}>
              <Text style={[pc.icon,{color:plan.color}]}>{plan.icon}</Text>
            </View>
            <View style={{flex:1}}>
              <Text style={[pc.planName,{color:plan.color}]}>{plan.name}</Text>
              <Text style={pc.tagline}>{plan.tagline}</Text>
            </View>
            <View style={[pc.radio,{borderColor:selected?plan.color:C.border}]}>
              {selected&&<View style={[pc.radioDot,{backgroundColor:plan.color}]}/>}
            </View>
          </View>

          <View style={pc.priceRow}>
            <Text style={[pc.price,{color:plan.id==='free'?C.creamDim:plan.color}]}>{plan.price}</Text>
            <Text style={pc.period}> / {plan.period}</Text>
          </View>
          {billing==='yearly'&&plan.yearPrice&&(
            <Text style={[pc.yearNote,{color:plan.color}]}>{plan.yearPrice}</Text>
          )}

          <View style={[pc.divider,{backgroundColor:`${plan.color}20`}]}/>

          <View>
            {plan.features.map((f,i)=>(
              <FeatureRow key={i} feature={f} planColor={plan.color} delay={delay+i*30}/>
            ))}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </FadeSlide>
  );
}
const pc = StyleSheet.create({
  card:         {backgroundColor:C.bgCard,borderRadius:20,padding:20,position:'relative',overflow:'hidden'},
  badge:        {position:'absolute',top:16,right:16,borderWidth:1,borderRadius:8,paddingHorizontal:8,paddingVertical:3},
  badgeText:    {fontSize:9,fontWeight:'800',letterSpacing:1.5},
  currentBadge: {position:'absolute',top:42,right:16,backgroundColor:'rgba(93,190,138,0.15)',borderWidth:1,borderColor:'rgba(93,190,138,0.40)',borderRadius:8,paddingHorizontal:8,paddingVertical:3},
  currentBadgeText:{color:C.success,fontSize:9,fontWeight:'800',letterSpacing:1},
  header:       {flexDirection:'row',alignItems:'center',gap:14,marginBottom:16},
  iconBox:      {width:44,height:44,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center'},
  icon:         {fontSize:20,fontWeight:'900'},
  planName:     {fontSize:20,fontWeight:'900',marginBottom:2},
  tagline:      {color:C.creamDim,fontSize:12},
  radio:        {width:22,height:22,borderRadius:11,borderWidth:2,alignItems:'center',justifyContent:'center'},
  radioDot:     {width:10,height:10,borderRadius:5},
  priceRow:     {flexDirection:'row',alignItems:'baseline',marginBottom:4},
  price:        {fontSize:32,fontWeight:'900'},
  period:       {color:C.creamDim,fontSize:13,fontWeight:'500'},
  yearNote:     {fontSize:11,fontWeight:'700',marginBottom:12},
  divider:      {height:1,marginBottom:16},
});

function StickyBottom({plan, billing, loading, onContinue, currentPlan}) {
  const shimmer = useRef(new Animated.Value(-W)).current;
  useEffect(()=>{
    if (plan&&plan.id!=='free') {
      Animated.loop(Animated.sequence([
        Animated.timing(shimmer,{toValue:W,duration:2200,delay:500,useNativeDriver:true}),
        Animated.timing(shimmer,{toValue:-W,duration:0,useNativeDriver:true}),
      ])).start();
    }
  },[plan]);

  const isFree       = !plan||plan.id==='free';
  const isCurrentPlan = currentPlan === plan?.id && plan?.id !== 'free';
  const scale        = useRef(new Animated.Value(1)).current;

  let btnLabel = isFree ? 'Continue Free' : `Start ${plan.name} Plan →`;
  if (isCurrentPlan) btnLabel = 'Your Current Plan';

  return (
    <View style={sticky.wrap}>
      <View style={sticky.inner}>
        <View>
          {plan&&<Text style={[sticky.planName,{color:plan.color}]}>{plan.name} Plan</Text>}
          <Text style={sticky.planPrice}>
            {isFree ? 'Free forever' : billing==='yearly'&&plan.yearPrice ? plan.yearPrice : `${plan.price} / month`}
          </Text>
        </View>
        <Animated.View style={{transform:[{scale}],flex:1}}>
          <TouchableOpacity
            style={[sticky.btn, isFree&&sticky.btnFree, isCurrentPlan&&sticky.btnDisabled, loading&&{opacity:0.7}]}
            onPress={loading||isCurrentPlan?undefined:onContinue}
            activeOpacity={isCurrentPlan?1:0.9}
            onPressIn={()=>!isFree&&!isCurrentPlan&&Animated.spring(scale,{toValue:0.96,useNativeDriver:true}).start()}
            onPressOut={()=>Animated.spring(scale,{toValue:1,useNativeDriver:true}).start()}
          >
            {!isFree&&!isCurrentPlan&&<Animated.View style={[sticky.shimmer,{transform:[{translateX:shimmer}]}]}/>}
            {loading
              ? <ActivityIndicator size="small" color="#0B0300"/>
              : <Text style={[sticky.btnText,isFree&&sticky.btnTextFree,isCurrentPlan&&sticky.btnTextDisabled]}>{btnLabel}</Text>
            }
          </TouchableOpacity>
        </Animated.View>
      </View>
      {!isFree&&!isCurrentPlan&&(
        <Text style={sticky.disclaimer}>Cancel anytime. Powered by Paystack. Secure checkout.</Text>
      )}
    </View>
  );
}
const sticky = StyleSheet.create({
  wrap:           {position:'absolute',bottom:0,left:0,right:0,backgroundColor:'rgba(11,3,0,0.96)',borderTopWidth:1,borderTopColor:C.border,paddingHorizontal:22,paddingTop:14,paddingBottom:36},
  inner:          {flexDirection:'row',alignItems:'center',gap:16},
  planName:       {fontSize:11,fontWeight:'800',letterSpacing:1,marginBottom:2},
  planPrice:      {color:C.creamDim,fontSize:12,fontWeight:'600'},
  btn:            {backgroundColor:C.gold,borderRadius:14,paddingVertical:16,alignItems:'center',overflow:'hidden',shadowColor:C.gold,shadowOffset:{width:0,height:4},shadowOpacity:0.45,shadowRadius:14,elevation:8},
  btnFree:        {backgroundColor:'rgba(200,134,10,0.12)',borderWidth:1.5,borderColor:C.border,shadowOpacity:0},
  btnDisabled:    {backgroundColor:'rgba(93,190,138,0.12)',borderWidth:1.5,borderColor:'rgba(93,190,138,0.35)',shadowOpacity:0},
  shimmer:        {position:'absolute',top:0,bottom:0,width:80,backgroundColor:'rgba(255,255,255,0.12)',borderRadius:40},
  btnText:        {color:'#0B0300',fontSize:14,fontWeight:'900',letterSpacing:1.2,textTransform:'uppercase'},
  btnTextFree:    {color:C.creamDim},
  btnTextDisabled:{color:C.success},
  disclaimer:     {color:'rgba(245,222,179,0.22)',fontSize:10,textAlign:'center',marginTop:8,letterSpacing:0.3},
});

function FAQItem({q, a, delay}) {
  const [open, setOpen] = useState(false);
  const h   = useRef(new Animated.Value(0)).current;
  const toggle = () => {
    setOpen(o=>{
      Animated.timing(h,{toValue:o?0:1,duration:240,useNativeDriver:false}).start();
      return !o;
    });
  };
  const height = h.interpolate({inputRange:[0,1],outputRange:[0,70]});
  const op     = h.interpolate({inputRange:[0,1],outputRange:[0,1]});
  return (
    <FadeSlide delay={delay} style={faq.wrap}>
      <TouchableOpacity style={faq.card} onPress={toggle} activeOpacity={0.8}>
        <Text style={faq.q}>{q}</Text>
        <Text style={faq.toggle}>{open?'−':'+'}</Text>
      </TouchableOpacity>
      <Animated.View style={{height,overflow:'hidden'}}>
        <Animated.Text style={[faq.a,{opacity:op}]}>{a}</Animated.Text>
      </Animated.View>
    </FadeSlide>
  );
}
const faq = StyleSheet.create({
  wrap:   {marginBottom:8},
  card:   {flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:12,padding:14},
  q:      {color:C.cream,fontSize:13,fontWeight:'600',flex:1,marginRight:12},
  toggle: {color:C.gold,fontSize:20,fontWeight:'300'},
  a:      {color:C.creamDim,fontSize:12,lineHeight:19,paddingHorizontal:14,paddingVertical:10,backgroundColor:'rgba(200,134,10,0.05)',borderRadius:10,marginTop:4},
});

// ─────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────
export default function SubscriptionScreen() {
  const navigation = useNavigation();
  const { user, updateUser } = useAuth();

  const currentPlan   = user?.subscription?.plan || 'free';
  const [selectedPlan, setSelectedPlan] = useState(currentPlan === 'free' ? 'pro' : currentPlan);
  const [billing,      setBilling]      = useState('monthly');
  const [loading,      setLoading]      = useState(false);
  const [subData,      setSubData]      = useState(null);

  // Fetch current subscription details on focus
  useFocusEffect(
    useCallback(()=>{
      SubscriptionAPI.get()
        .then(d => setSubData(d))
        .catch(()=>{}); // silent — user data already in context
    },[])
  );

  const activePlan = PLANS.find(p => p.id === selectedPlan);

  const handleContinue = useCallback(async () => {
    if (selectedPlan === 'free') {
      navigation.goBack();
      return;
    }
    if (selectedPlan === currentPlan) return; // already on this plan

    setLoading(true);
    try {
      const session = await SubscriptionAPI.initiate(selectedPlan, billing);
      // Pass everything Payment screen needs
      navigation.navigate('Payment', {
        plan:             activePlan,
        billing,
        reference:        session.reference,
        authorizationUrl: session.authorizationUrl,
        accessCode:       session.accessCode,
        amountNGN:        session.amount,
      });
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedPlan, billing, currentPlan, activePlan, navigation]);

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent/>
      <BackButton onPress={()=>navigation.goBack()}/>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <FadeSlide delay={0} style={s.header}>
          <View style={s.logoMark}>
            <Text style={s.logoLetter}>M</Text>
          </View>
          <Text style={s.title}>Unlock Your{'\n'}Skin's Potential</Text>
          <Text style={s.subtitle}>
            Choose the plan that fits your skin journey.{'\n'}Every plan includes melanin-first AI.
          </Text>
          {currentPlan !== 'free' && (
            <View style={s.currentPlanBadge}>
              <Text style={s.currentPlanText}>
                Active: {currentPlan.toUpperCase()} PLAN
                {user?.subscription?.expiresAt
                  ? `  ·  Renews ${new Date(user.subscription.expiresAt).toLocaleDateString('en-NG',{day:'numeric',month:'short'})}`
                  : ''}
              </Text>
            </View>
          )}
        </FadeSlide>

        <FadeSlide delay={150}>
          <BillingToggle billing={billing} onChange={setBilling}/>
        </FadeSlide>

        {PLANS.map((plan,i)=>(
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selectedPlan===plan.id}
            billing={billing}
            currentPlan={currentPlan}
            onSelect={setSelectedPlan}
            delay={200+i*80}
          />
        ))}

        {/* Trust row */}
        <FadeSlide delay={800} style={{flexDirection:'row',justifyContent:'center',gap:24,marginBottom:16}}>
          {[{icon:'🔒',text:'Secure Payment'},{icon:'↺',text:'Cancel Anytime'},{icon:'◎',text:'Melanin-First AI'}].map((it,i)=>(
            <View key={i} style={{alignItems:'center',gap:5}}>
              <Text style={{fontSize:16}}>{it.icon}</Text>
              <Text style={{color:C.creamFaint,fontSize:10,fontWeight:'600',letterSpacing:0.3}}>{it.text}</Text>
            </View>
          ))}
        </FadeSlide>

        {/* Testimonials */}
        <FadeSlide delay={900} style={{marginBottom:24}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:16}}>
            <View style={{width:4,height:18,borderRadius:2,backgroundColor:C.gold}}/>
            <Text style={{color:C.cream,fontSize:17,fontWeight:'800'}}>What Users Say</Text>
          </View>
          {[
            {text:'"Finally a skincare app that actually gets dark skin. My hyperpigmentation faded in 8 weeks."', name:'Adaeze O.', loc:'Lagos'},
            {text:'"The routine suggestions are so practical. Everything on the list I could find at ShopRite."', name:'Fatima K.', loc:'Abuja'},
            {text:'"I\'ve tried 5 skincare apps. None of them understood my skin until Melanin Scan."',           name:'Chiamaka E.', loc:'PH'},
          ].map((t,i)=>(
            <FadeSlide key={i} delay={960+i*70} style={{backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,borderRadius:14,padding:16,marginBottom:10}}>
              <Text style={{color:C.creamDim,fontSize:13,lineHeight:20,marginBottom:12,fontStyle:'italic'}}>{t.text}</Text>
              <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
                <View style={{width:28,height:28,borderRadius:14,backgroundColor:C.goldPale,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'}}>
                  <Text style={{color:C.gold,fontSize:12,fontWeight:'900'}}>{t.name[0]}</Text>
                </View>
                <Text style={{color:C.creamFaint,fontSize:12,fontWeight:'600'}}>{t.name}  ·  {t.loc}</Text>
              </View>
            </FadeSlide>
          ))}
        </FadeSlide>

        {/* FAQ */}
        <FadeSlide delay={1100} style={{marginBottom:8}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:16}}>
            <View style={{width:4,height:18,borderRadius:2,backgroundColor:C.gold}}/>
            <Text style={{color:C.cream,fontSize:17,fontWeight:'800'}}>Common Questions</Text>
          </View>
          {[
            {q:'Can I cancel anytime?', a:'Yes. Cancel with one tap from Profile. Your plan stays active until the end of the billing period.'},
            {q:'What payment methods are accepted?', a:'Cards, bank transfer, and USSD via Paystack. 100% secure checkout.'},
            {q:'Is my scan data private?', a:'Always. We never sell your images. Read our Privacy Policy for full details.'},
          ].map((item,i)=>(
            <FAQItem key={i} q={item.q} a={item.a} delay={1160+i*60}/>
          ))}
        </FadeSlide>

        <View style={{height:160}}/>
      </ScrollView>

      <StickyBottom
        plan={activePlan}
        billing={billing}
        loading={loading}
        currentPlan={currentPlan}
        onContinue={handleContinue}
      />
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll:           {paddingTop:116,paddingHorizontal:22},
  header:           {alignItems:'center',marginBottom:28},
  logoMark:         {width:52,height:52,borderRadius:26,backgroundColor:C.goldPale,borderWidth:1.5,borderColor:C.gold,alignItems:'center',justifyContent:'center',shadowColor:C.gold,shadowOpacity:0.45,shadowOffset:{width:0,height:0},shadowRadius:12,elevation:8,marginBottom:18},
  logoLetter:       {color:C.gold,fontSize:22,fontWeight:'900'},
  title:            {color:C.cream,fontSize:32,fontWeight:'900',textAlign:'center',lineHeight:40,letterSpacing:0.3,marginBottom:10},
  subtitle:         {color:C.creamDim,fontSize:14,textAlign:'center',lineHeight:22},
  currentPlanBadge: {marginTop:14,backgroundColor:'rgba(93,190,138,0.10)',borderWidth:1,borderColor:'rgba(93,190,138,0.30)',borderRadius:10,paddingHorizontal:14,paddingVertical:7},
  currentPlanText:  {color:C.success,fontSize:11,fontWeight:'700',letterSpacing:0.5},
});
import { Request, Response } from 'express';
import twilio from 'twilio';
import UserModel from '../models/User.js';
import DocumentModel from '../models/Document.js';
import PrescriptionModel from '../models/Prescription.js';
import WhatsAppMessageModel from '../models/WhatsAppMessage.js';
import {
  extractDocumentQueued,
  generateEmbedding,
  generateContent,
  transcribeAudio,
} from '../services/geminiService.js';
import { buildUserContext, buildLightContext, assemblePrompt } from '../services/contextBuilder.js';
import { sendWhatsAppMessage, sendWhatsAppMenu, sendEmergencyTemplate } from '../services/whatsappService.js';
import { findTopK } from '../services/vectorService.js';
import { uploadUrlToCloudinary, uploadBufferToCloudinary } from '../services/cloudinaryService.js';

// ─── Session types ────────────────────────────────────────────────────────────
interface WhatsAppSession {
  userId: string | null;
  phoneNumber: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  awaitingUpload: boolean;
  awaitingLanguage: boolean;  // true while waiting for language selection
  preferredLanguage: string;  // e.g. 'English', 'Hindi', 'Tamil'
  lastActivity: Date;
}

// In-memory sessions — fine for demo scale; swap for Redis in production
const sessions = new Map<string, WhatsAppSession>();

// ─── Main webhook handler ─────────────────────────────────────────────────────
export async function handleIncomingWhatsApp(req: Request, res: Response): Promise<void> {
  const MessagingResponse = twilio.twiml.MessagingResponse;
  const twiml = new MessagingResponse();

  const from: string = req.body.From ?? '';           // "whatsapp:+919876543210"
  const body: string = (req.body.Body ?? '').trim();
  const mediaUrl: string | undefined = req.body.MediaUrl0;
  const mediaType: string | undefined = req.body.MediaContentType0;

  res.type('text/xml');

  try {
    const phoneNumber = from.replace('whatsapp:', '');
    const session = sessions.get(phoneNumber) ?? createSession(phoneNumber);
    sessions.set(phoneNumber, session);

    let responseText: string;
    let mediaCloudinaryUrl: string | undefined;
    let mediaCloudinaryType: string | undefined;

    // ── Handle audio voice messages (transcribe with Gemini) ──────────────────
    if (mediaUrl && isAudioMedia(mediaType)) {
      responseText = await handleAudioMessage(session, mediaUrl, mediaType!);
      mediaCloudinaryUrl = undefined; // stored inside handleAudioMessage
    }
    // ── Handle image/PDF document uploads ────────────────────────────────────
    else if (mediaUrl && isDocumentMedia(mediaType)) {
      // Upload to Cloudinary first
      try {
        const cloudResult = await uploadUrlToCloudinary(mediaUrl, mediaType!, 'medvault/whatsapp');
        mediaCloudinaryUrl = cloudResult.url;
        mediaCloudinaryType = mediaType;
      } catch (e) {
        console.warn('Cloudinary upload failed for WA media:', e);
        mediaCloudinaryUrl = mediaUrl;
      }
      responseText = await handleDocumentUpload(session, mediaCloudinaryUrl!, mediaType!);
    }
    // ── Language selection (first-time users) ────────────────────────────────
    else if (session.awaitingLanguage) {
      responseText = handleLanguageSelection(session, body);
    }
    // ── Emergency keywords ───────────────────────────────────────────────────
    else if (isEmergencyKeyword(body)) {
      responseText = await handleEmergencyRequest(session, phoneNumber);
    }
    // ── Account linking ──────────────────────────────────────────────────────
    else if (!session.userId) {
      responseText = await handleAccountLinking(session, phoneNumber);
    }
    // ── Menu commands ────────────────────────────────────────────────────────
    else if (isMenuCommand(body)) {
      responseText = await handleMenuCommand(session, body);
    }
    // ── AI query ─────────────────────────────────────────────────────────────
    else {
      responseText = await handleAIQuery(session, body);
    }

    // Update conversation history
    session.conversationHistory.push({ role: 'user', content: body || '[media]' });
    session.conversationHistory.push({ role: 'assistant', content: responseText });
    session.lastActivity = new Date();
    if (session.conversationHistory.length > 20) {
      session.conversationHistory = session.conversationHistory.slice(-20);
    }

    // ── Persist messages to MongoDB ───────────────────────────────────────────
    const linkedUser = await UserModel.findOne({ whatsappPhone: phoneNumber }).lean();
    const userId = linkedUser ? (linkedUser._id as string) : null;

    await WhatsAppMessageModel.insertMany([
      {
        userId,
        phoneNumber,
        direction: 'in',
        content: body || '[voice/media]',
        mediaUrl: mediaCloudinaryUrl,
        mediaType: mediaCloudinaryType,
        timestamp: new Date(),
      },
      {
        userId,
        phoneNumber,
        direction: 'out',
        content: responseText,
        timestamp: new Date(),
      },
    ]);

    twiml.message(responseText);
    res.send(twiml.toString());
  } catch (err: any) {
    console.error('WhatsApp webhook error:', err);
    twiml.message(`Error: ${err.message}`);
    res.send(twiml.toString());
  }
}

// ─── Session factory ────────────────────────────────────────────────────────────
function createSession(phoneNumber: string): WhatsAppSession {
  return {
    userId: null,
    phoneNumber,
    conversationHistory: [],
    awaitingUpload: false,
    awaitingLanguage: true,   // first message triggers language selection
    preferredLanguage: 'English',
    lastActivity: new Date(),
  };
}

// ─── Guards ───────────────────────────────────────────────────────────────────
function isAudioMedia(mediaType?: string): boolean {
  if (!mediaType) return false;
  return mediaType.startsWith('audio/') || mediaType.startsWith('video/ogg');
}

function isDocumentMedia(mediaType?: string): boolean {
  if (!mediaType) return false;
  return mediaType.startsWith('image/') || mediaType === 'application/pdf';
}

function isEmergencyKeyword(body: string): boolean {
  const lower = body.toLowerCase();
  return ['emergency', 'sos', '911', 'urgent', 'आपातकाल', 'आणीबाणी'].some((k) => lower.includes(k));
}

function isMenuCommand(body: string): boolean {
  const lower = body.toLowerCase().trim();
  const triggers = [
    'menu', 'hi', 'hello', 'start', 'back', 'home',
    'namaste', 'namaskar',
    '1', '2', '3', '4', '5', '6', '7',
    'health summary', 'active medications', 'upload document', 'emergency card',
    'tip', 'tips', 'health tip', 'daily tip',
    'appointment', 'appointments', 'vitals', 'bmi',
    'support', 'language', 'change language',
  ];
  return triggers.includes(lower);
}
const LANGUAGE_MAP: Record<string, string> = {
  '1': 'English',  'english': 'English',
  '2': 'Hindi',    'hindi': 'Hindi',    'हिंदी': 'Hindi',
  '3': 'Marathi',  'marathi': 'Marathi', 'मराठी': 'Marathi',
  '4': 'Tamil',    'tamil': 'Tamil',    'தமிழ்': 'Tamil',
  '5': 'Telugu',   'telugu': 'Telugu',  'తెలుగు': 'Telugu',
  '6': 'Bengali',  'bengali': 'Bengali','বাংলা': 'Bengali',
  '7': 'Gujarati', 'gujarati': 'Gujarati', 'ગુજરાતી': 'Gujarati',
  '8': 'Kannada',  'kannada': 'Kannada',   'ಕನ್ನಡ': 'Kannada',
};

// Welcome messages per language
const LANG_SET_MSG: Record<string, (l: string) => string> = {
  English:  (l) => `✅ Language set to *${l}*!\n\nWelcome to *MedVault Health Assistant* 🏥\n\nSend *menu* to see options!\n_(Send *language* to change anytime)_`,
  Hindi:    (l) => `✅ भाषा *${l}* सेट हो गई!\n\n*MedVault हेल्थ असिस्टेंट* में स्वागत है 🏥\n\nविकल्पों के लिए *menu* भेजें!\n_(बदलने के लिए *language* भेजें)_`,
  Marathi:  (l) => `✅ भाषा *${l}* सेट केली!\n\n*MedVault हेल्थ असिस्टंट* मध्ये स्वागत आहे 🏥\n\nपर्यायांसाठी *menu* पाठवा!\n_(बदलण्यासाठी *language* पाठवा)_`,
  Tamil:    (l) => `✅ மொழி *${l}* அமைக்கப்பட்டது!\n\n*MedVault சுகாதார உதவியாளர்* வரவேற்கிறோம் 🏥\n\nவிருப்பங்களுக்கு *menu* அனுப்புங்கள்!\n_(மாற்ற *language* அனுப்புங்கள்)_`,
  Telugu:   (l) => `✅ భాష *${l}* సెట్ చేయబడింది!\n\n*MedVault హెల్త్ అసిస్టెంట్*కి స్వాగతం 🏥\n\nఎంపికల కోసం *menu* పంపండి!\n_(మార్చడానికి *language* పంపండి)_`,
  Bengali:  (l) => `✅ ভাষা *${l}* সেট করা হয়েছে!\n\n*MedVault স্বাস্থ্য সহকারী*-তে স্বাগতম 🏥\n\nবিকল্পের জন্য *menu* পাঠান!\n_(পরিবর্তন করতে *language* পাঠান)_`,
  Gujarati: (l) => `✅ ભાષા *${l}* સેટ થઈ!\n\n*MedVault હેલ્થ આસિસ્ટન્ટ*માં સ્વાગત છે 🏥\n\nવિકલ્પો માટે *menu* મોકલો!\n_(બદલવા *language* મોકલો)_`,
  Kannada:  (l) => `✅ ಭಾಷೆ *${l}* ಹೊಂದಿಸಲಾಗಿದೆ!\n\n*MedVault ಆರೋಗ್ಯ ಸಹಾಯಕ*ಕ್ಕೆ ಸ್ವಾಗತ 🏥\n\nಆಯ್ಕೆಗಳಿಗೆ *menu* ಕಳುಹಿಸಿ!\n_(ಬದಲಾಯಿಸಲು *language* ಕಳುಹಿಸಿ)_`,
};

// Plain translated strings (T() falls back to English automatically)
const STRINGS: Record<string, Record<string, string>> = {
  noDocs: {
    English:  'No records found. Send me a photo of any medical report!',
    Hindi:    'कोई रिकॉर्ड नहीं मिला। कोई भी मेडिकल रिपोर्ट की फोटो भेजें!',
    Marathi:  'कोणतेही रेकॉर्ड सापडले नाही. वैद्यकीय अहवालाचा फोटो पाठवा!',
    Tamil:    'பதிவுகள் எதுவும் இல்லை. எந்த மருத்துவ அறிக்கையின் புகைப்படம் அனுப்புங்கள்!',
    Telugu:   'రికార్డులు కనుగొనబడలేదు. ఏదైనా వైద్య నివేదిక ఫోటో పంపండి!',
    Bengali:  'কোনো রেকর্ড পাওয়া যায়নি। যেকোনো চিকিৎসা রিপোর্টের ছবি পাঠান!',
    Gujarati: 'કોઈ રેકોર્ડ મળ્યો નથી. કોઈ પણ મેડિકલ રિપોર્ટનો ફોટો મોકલો!',
    Kannada:  'ಯಾವುದೇ ದಾಖಲೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ. ಯಾವುದಾದರೂ ವೈದ್ಯಕೀಯ ವರದಿಯ ಫೋಟೋ ಕಳುಹಿಸಿ!',
  },
  noMeds: {
    English:  'No active medications on record.\n\nSend a prescription photo to add medications!',
    Hindi:    'कोई सक्रिय दवा नहीं है।\n\nप्रिस्क्रिप्शन फोटो भेजें!',
    Marathi:  'कोणतेही सक्रिय औषध नाही.\n\nप्रिस्क्रिप्शनचा फोटो पाठवा!',
    Tamil:    'செயலில் உள்ள மருந்துகள் எதுவும் இல்லை.\n\nமருந்துச் சீட்டின் புகைப்படம் அனுப்புங்கள்!',
    Telugu:   'యాక్టివ్ మందులు లేవు.\n\nప్రిస్క్రిప్షన్ ఫోటో పంపండి!',
    Bengali:  'কোনো সক্রিয় ওষুধ নেই।\n\nপ্রেসক্রিপশনের ছবি পাঠান!',
    Gujarati: 'કોઈ સક્રિય દવા નથી.\n\nપ્રિસ્ક્રિપ્શન ફોટો મોકલો!',
    Kannada:  'ಯಾವುದೇ ಸಕ್ರಿಯ ಔಷಧಿ ಇಲ್ಲ.\n\nಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಫೋಟೋ ಕಳುಹಿಸಿ!',
  },
  noLab: {
    English:  'No lab reports found.\n\nSend me a lab report photo!',
    Hindi:    'कोई लैब रिपोर्ट नहीं मिली।\n\nलैब रिपोर्ट की फोटो भेजें!',
    Marathi:  'कोणताही लॅब अहवाल नाही.\n\nलॅब अहवालाचा फोटो पाठवा!',
    Tamil:    'ஆய்வக அறிக்கைகள் இல்லை.\n\nஆய்வக அறிக்கையின் புகைப்படம் அனுப்புங்கள்!',
    Telugu:   'లాబ్ రిపోర్టులు కనుగొనబడలేదు.\n\nలాబ్ రిపోర్ట్ ఫోటో పంపండి!',
    Bengali:  'কোনো ল্যাব রিপোর্ট নেই।\n\nল্যাব রিপোর্টের ছবি পাঠান!',
    Gujarati: 'કોઈ લેબ રિપોર્ટ મળ્યો નથી.\n\nલેબ રિપોર્ટ ફોટો મોકલો!',
    Kannada:  'ಯಾವುದೇ ಲ್ಯಾಬ್ ವರದಿ ಕಂಡುಬಂದಿಲ್ಲ.\n\nಲ್ಯಾಬ್ ವರದಿಯ ಫೋಟೋ ಕಳುಹಿಸಿ!',
  },
  noInteractions: {
    English:  '✅ No known drug interactions found.',
    Hindi:    '✅ कोई ज्ञात दवा इंटरैक्शन नहीं मिला।',
    Marathi:  '✅ कोणतेही ज्ञात औषध परस्परक्रिया आढळली नाही.',
    Tamil:    '✅ அறியப்பட்ட மருந்து இடைவினைகள் எதுவும் இல்லை.',
    Telugu:   '✅ తెలిసిన డ్రగ్ ఇంటరాక్షన్లు కనుగొనబడలేదు.',
    Bengali:  '✅ কোনো পরিচিত ড্রাগ ইন্টারঅ্যাকশন পাওয়া যায়নি।',
    Gujarati: '✅ કોઈ જાણીતી દવા ક્રિયાપ્રતિક્રિયા મળી નથી.',
    Kannada:  '✅ ತಿಳಿದಿರುವ ಯಾವುದೇ ಔಷಧ ಪರಸ್ಪರ ಕ್ರಿಯೆ ಕಂಡುಬಂದಿಲ್ಲ.',
  },
  uploadReady: {
    English:  "📤 Ready! Send a *photo* of any medical report or PDF.\nI'll extract and save it automatically! 🤖",
    Hindi:    '📤 तैयार! मेडिकल रिपोर्ट या PDF की *फोटो* भेजें।\nमैं स्वचालित रूप से निकालूंगा! 🤖',
    Marathi:  '📤 तयार! वैद्यकीय अहवाल किंवा PDF चा *फोटो* पाठवा.\nमी आपोआप काढेन! 🤖',
    Tamil:    '📤 தயார்! மருத்துவ அறிக்கை அல்லது PDF இன் *புகைப்படம்* அனுப்புங்கள்.\nநான் தானாக பிரித்தெடுக்கிறேன்! 🤖',
    Telugu:   '📤 సిద్ధం! వైద్య నివేదిక లేదా PDF యొక్క *ఫోటో* పంపండి.\nనేను స్వయంచాలకంగా సేవ్ చేస్తాను! 🤖',
    Bengali:  '📤 প্রস্তুত! যেকোনো চিকিৎসা রিপোর্ট বা PDF এর *ছবি* পাঠান.\nআমি স্বয়ংক্রিয়ভাবে সংরক্ষণ করব! 🤖',
    Gujarati: '📤 તૈયાર! કોઈ પણ મેડિકલ રિપોર્ટ અથવા PDF નો *ફોટો* મોકલો.\nહું આપોઆપ સાચવીશ! 🤖',
    Kannada:  '📤 ಸಿದ್ಧ! ಯಾವುದಾದರೂ ವೈದ್ಯಕೀಯ ವರದಿ ಅಥವಾ PDF ಯ *ಫೋಟೋ* ಕಳುಹಿಸಿ.\nನಾನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಉಳಿಸುತ್ತೇನೆ! 🤖',
  },
  openingMenu: {
    English:  '👋 Opening your MedVault menu...',
    Hindi:    '👋 आपका MedVault मेनू खुल रहा है...',
    Marathi:  '👋 तुमचा MedVault मेनू उघडत आहे...',
    Tamil:    '👋 உங்கள் MedVault மெனு திறக்கிறது...',
    Telugu:   '👋 మీ MedVault మెనూ తెరవబడుతోంది...',
    Bengali:  '👋 আপনার MedVault মেনু খুলছে...',
    Gujarati: '👋 તમારો MedVault મેનૂ ખૂલી રહ્યો છે...',
    Kannada:  '👋 ನಿಮ್ಮ MedVault ಮೆನು ತೆರೆಯುತ್ತಿದೆ...',
  },
  consultDoctor: {
    English:  '⚕️ Always consult your doctor before changing medications.',
    Hindi:    '⚕️ दवाएं बदलने से पहले हमेशा अपने डॉक्टर से सलाह लें।',
    Marathi:  '⚕️ औषधे बदलण्यापूर्वी नेहमी डॉक्टरांचा सल्ला घ्या.',
    Tamil:    '⚕️ மருந்துகளை மாற்றுவதற்கு முன் எப்போதும் உங்கள் மருத்துவரை அணுகவும்.',
    Telugu:   '⚕️ మందులు మార్చే ముందు ఎల్లప్పుడూ మీ డాక్టర్‌ను సంప్రదించండి.',
    Bengali:  '⚕️ ওষুধ পরিবর্তনের আগে সর্বদা আপনার ডাক্তারের পরামর্শ নিন।',
    Gujarati: '⚕️ દવાઓ બદલતા પહેલા હંમેશા ડૉક્ટરની સલાહ લો.',
    Kannada:  '⚕️ ಔಷಧಿ ಬದಲಾಯಿಸುವ ಮೊದಲು ಯಾವಾಗಲೂ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.',
  },
};

// Helper: look up a translated string
function T(key: string, lang: string): string {
  return (STRINGS[key] || {})[lang] || (STRINGS[key] || {})['English'] || key;
}

function handleLanguageSelection(session: WhatsAppSession, body: string): string {
  const detected = LANGUAGE_MAP[body.toLowerCase().trim()];
  if (detected) {
    session.preferredLanguage = detected;
    session.awaitingLanguage = false;
    const fn = LANG_SET_MSG[detected] || LANG_SET_MSG['English'];
    return fn(detected);
  }
  // Show full 8-language picker
  return (
    `🌐 *Choose your language / अपनी भाषा चुनें*\n\n` +
    `1️⃣  English\n` +
    `2️⃣  हिंदी (Hindi)\n` +
    `3️⃣  मराठी (Marathi)\n` +
    `4️⃣  தமிழ் (Tamil)\n` +
    `5️⃣  తెలుగు (Telugu)\n` +
    `6️⃣  বাংলা (Bengali)\n` +
    `7️⃣  ગુજરાતી (Gujarati)\n` +
    `8️⃣  ಕನ್ನಡ (Kannada)\n\n` +
    `Reply with *1-8* or type the language name`
  );
}


// ─── Audio voice note handler (Gemini 2.5 Flash transcription) ───────────────
async function handleAudioMessage(
  session: WhatsAppSession,
  mediaUrl: string,
  mediaType: string
): Promise<string> {
  if (!session.userId) {
    return `Please link your MedVault account first.\n\nSend *hi* to get started.`;
  }

  try {
    const axios = (await import('axios')).default;
    const response = await axios.get<ArrayBuffer>(mediaUrl, {
      responseType: 'arraybuffer',
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID!,
        password: process.env.TWILIO_AUTH_TOKEN!,
      },
    });

    const audioBuffer = Buffer.from(response.data);

    // Upload to Cloudinary
    let cloudinaryUrl = mediaUrl;
    try {
      const cloudResult = await uploadBufferToCloudinary(audioBuffer, mediaType, 'medvault/whatsapp');
      cloudinaryUrl = cloudResult.url;
    } catch (e) {
      console.warn('Cloudinary audio upload failed:', e);
    }

    // Normalize ogg codec variant for Gemini
    const normalizedMime = mediaType.startsWith('audio/ogg') ? 'audio/ogg' : mediaType;

    // Transcribe with Gemini 2.5 Flash
    const { transcription, detectedLanguage } = await transcribeAudio(
      audioBuffer,
      normalizedMime,
      session.preferredLanguage !== 'English' ? session.preferredLanguage : undefined
    );

    // Save audio message to DB with Cloudinary URL and transcription
    const linkedUser = await UserModel.findOne({ whatsappPhone: session.phoneNumber }).lean();
    await WhatsAppMessageModel.create({
      userId: linkedUser ? (linkedUser._id as string) : null,
      phoneNumber: session.phoneNumber,
      direction: 'in',
      content: `🎤 Voice note: ${transcription}`,
      mediaUrl: cloudinaryUrl,
      mediaType: mediaType,
      timestamp: new Date(),
    });

    // Process transcription as AI query
    const aiResponse = await handleAIQuery(session, transcription);

    const langNote = detectedLanguage && detectedLanguage !== session.preferredLanguage
      ? `\n_(Detected: ${detectedLanguage})_`
      : '';

    return `🎤 *Voice note received*\n📝 "${transcription}"${langNote}\n\n${aiResponse}`;
  } catch (err) {
    console.error('handleAudioMessage error:', err);
    return `❌ Sorry, I couldn't process your voice note. Please try again or type your question.`;
  }
}



// ─── Account linking ──────────────────────────────────────────────────────────
async function handleAccountLinking(
  session: WhatsAppSession,
  phoneNumber: string
): Promise<string> {
  const user = await UserModel.findOne({ whatsappPhone: phoneNumber });
  if (user) {
    session.userId = user._id.toString();
    setImmediate(async () => {
      try { await sendWhatsAppMenu(phoneNumber); } catch { /* ignore */ }
    });
    return `✅ Welcome back, ${user.name.split(' ')[0]}! Here's your menu:`;
  }

  return (
    `👋 Hi! I'm your MedVault health assistant.\n\n` +
    `To link your account:\n` +
    `1. Open MedVault on your phone\n` +
    `2. Go to Emergency → WhatsApp Connect\n` +
    `3. Enter your number: ${phoneNumber}\n\n` +
    `Once linked, you can:\n` +
    `📋 Query your medical history\n` +
    `💊 Check medications & interactions\n` +
    `📄 Upload documents by sending a photo\n` +
    `🆘 Get emergency health card`
  );
}

// ─── Emergency card ───────────────────────────────────────────────────────────
async function handleEmergencyRequest(
  session: WhatsAppSession,
  phoneNumber: string
): Promise<string> {
  if (!session.userId) {
    return (
      `🆘 *EMERGENCY CARD*\n\n` +
      `Your number isn't linked to MedVault.\n\n` +
      `Send *hi* to get started, or call 112 immediately.`
    );
  }

  const user = await UserModel.findById(session.userId);
  if (!user) return 'Account not found. Call 112 immediately.';

  const activePrescriptions = await PrescriptionModel.find({
    userId: session.userId,
    status: 'active',
  }).select('drugName dosage frequency');

  const meds = activePrescriptions.length > 0
    ? activePrescriptions.map((p) => `${p.drugName} ${p.dosage}`).join(', ')
    : 'None on record';

  const contactStr = user.emergencyContacts.length > 0
    ? `${user.emergencyContacts[0].name}: ${user.emergencyContacts[0].phone}`
    : 'None on record';

  const allergies = user.allergies.length > 0 ? user.allergies.join(', ') : 'None known';

  // Try to send the formatted Content Template card; fall back to plain text
  try {
    await sendEmergencyTemplate(
      phoneNumber,
      user.name,
      user.bloodType,
      allergies,
      meds,
      contactStr
    );
    return ''; // template sent separately — return empty so no duplicate TwiML message
  } catch {
    // Fallback to plain text if template fails (e.g. template not approved yet)
    return (
      `🆘 *EMERGENCY CARD — ${user.name.toUpperCase()}*\n\n` +
      `🩸 *Blood Type:* ${user.bloodType}\n` +
      `⚠️ *Allergies:* ${allergies}\n\n` +
      `💊 *Medications:* ${meds}\n\n` +
      `📞 *Emergency Contact:* ${contactStr}\n\n` +
      `🔗 Token: ${user.emergencyToken}`
    );
  }
}

// ─── Document upload (async processing) ──────────────────────────────────────
async function handleDocumentUpload(
  session: WhatsAppSession,
  mediaUrl: string,
  mediaType: string
): Promise<string> {
  if (!session.userId) {
    return `Please link your MedVault account first.\n\nSend *hi* to get started.`;
  }

  processDocumentAsync(session.userId, mediaUrl, mediaType, session.phoneNumber);

  return (
    `📄 Got your document! Processing now...\n\n` +
    `I'll analyse it with AI and send you a summary in ~30 seconds.\n\n` +
    `You can keep chatting while I work on it.`
  );
}

async function processDocumentAsync(
  userId: string,
  mediaUrl: string,
  mediaType: string,
  phoneNumber: string
): Promise<void> {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get<ArrayBuffer>(mediaUrl, {
      responseType: 'arraybuffer',
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID!,
        password: process.env.TWILIO_AUTH_TOKEN!,
      },
    });

    const fileBuffer = Buffer.from(response.data);

    extractDocumentQueued(fileBuffer, mediaType, async (extracted, rawResponse) => {
      if (!extracted) {
        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Sorry, I couldn't read that document. Please try again or upload via the app.`
        );
        return;
      }

      const doc = await DocumentModel.create({
        userId,
        filename: `whatsapp_upload_${Date.now()}`,
        filePath: mediaUrl,
        mimeType: mediaType,
        fileSize: fileBuffer.length,
        status: 'done',
        documentType: extracted.document_type,
        documentDate: extracted.document_date ? new Date(extracted.document_date) : undefined,
        sourceHospital: extracted.source_hospital ?? undefined,
        doctorName: extracted.doctor_name ?? undefined,
        conditionsMentioned: extracted.conditions_mentioned,
        medications: extracted.medications,
        labValues: extracted.lab_values,
        summaryPlain: extracted.summary_plain,
        summaryClinical: extracted.summary_clinical,
        criticalityScore: extracted.criticality_score,
        keyFindings: extracted.key_findings,
        tags: extracted.tags,
        processedAt: new Date(),
        rawGeminiResponse: rawResponse,
      }) as any;

      // Generate and store embedding
      try {
        const embeddingText = [
          extracted.summary_plain,
          extracted.summary_clinical,
          extracted.conditions_mentioned.join(' '),
          extracted.tags.join(' '),
        ].join(' ');
        const embedding = await generateEmbedding(embeddingText);
        await DocumentModel.findByIdAndUpdate(doc._id, { embedding });
      } catch {
        console.warn('WhatsApp doc: embedding generation failed, continuing without it');
      }

      // Auto-save detected medications as prescriptions
      if (extracted.medications?.length) {
        for (const med of extracted.medications) {
          await PrescriptionModel.findOneAndUpdate(
            { userId, drugName: med.name },
            {
              $setOnInsert: {
                userId,
                drugName: med.name,
                dosage: med.dosage || 'see document',
                frequency: med.frequency || 'see document',
                prescribingDoctor: extracted.doctor_name || 'unknown',
                startDate: extracted.document_date
                  ? new Date(extracted.document_date)
                  : new Date(),
                status: 'active',
              },
              $set: { sourceDocumentId: doc._id },
            },
            { upsert: true, new: true }
          );
        }
      }

      const critEmoji =
        extracted.criticality_score >= 7 ? '🔴' :
        extracted.criticality_score >= 4 ? '🟡' : '🟢';

      const lines: string[] = [
        `✅ *Document Processed*`,
        ``,
        `📋 *Type:* ${formatDocType(extracted.document_type)}`,
        `📅 *Date:* ${extracted.document_date ? new Date(extracted.document_date).toLocaleDateString('en-IN') : 'Unknown'}`,
        `🏥 *Source:* ${extracted.source_hospital || 'Unknown'}`,
        `${critEmoji} *Severity:* ${extracted.criticality_score}/10`,
        ``,
        `📝 *Summary:*`,
        extracted.summary_plain,
      ];

      if (extracted.key_findings?.length) {
        lines.push(``, `🔍 *Key Findings:*`);
        extracted.key_findings.forEach((f) => lines.push(`• ${f}`));
      }

      const abnormal = (extracted.lab_values ?? []).filter((l) => l.is_abnormal);
      if (abnormal.length) {
        lines.push(``, `⚠️ *Abnormal Values:*`);
        abnormal.forEach((l) =>
          lines.push(`• ${l.test_name}: ${l.value} ${l.unit} (ref: ${l.reference_range})`)
        );
      }

      if (extracted.medications?.length) {
        lines.push(``, `💊 *Medications detected & saved:*`);
        extracted.medications.forEach((m) => lines.push(`• ${m.name} ${m.dosage}`));
      }

      lines.push(``, `Ask me anything about this document!`);
      await sendWhatsAppMessage(phoneNumber, lines.join('\n'));
    });
  } catch (err) {
    console.error('WhatsApp async document processing failed:', err);
    await sendWhatsAppMessage(
      phoneNumber,
      `❌ Sorry, I couldn't process that document. Please try again or upload via the app.`
    );
  }
}

// --- Menu command router (simplified 4-option) ---
const APP_URL = process.env.APP_URL || 'https://medvault.app';

async function handleMenuCommand(session: WhatsAppSession, body: string): Promise<string> {
  const lower = body.toLowerCase().trim();
  const lang  = session.preferredLanguage;

  // 1 - Daily Health Tip
  if (lower === '1' || lower === 'health tip' || lower === 'daily tip' || lower === 'tip')
    return getHealthTip(session);

  // 2 - Health Summary
  if (lower === '2' || lower === 'health summary')
    return handleHealthSummary(session);

  // 3 - Support
  if (lower === '3' || lower === 'support') {
    const msgs: Record<string, string> = {
      English:  `📞 *MedVault Support*\n\nFor help, visit:\n${APP_URL}/support\n\nEmail: support@medvault.app`,
      Hindi:    `📞 *MedVault सहायता*\n\nसहायता के लिए यहाँ जाएं:\n${APP_URL}/support`,
      Marathi:  `📞 *MedVault सहाय्यता*\n\nमदतीसाठी येथे पहा:\n${APP_URL}/support`,
    };
    return msgs[lang] || msgs['English'];
  }

  if (lower === '1' || lower === 'health summary')     return handleHealthSummary(session);
  if (lower === '2' || lower === 'active medications') return handleMedications(session);
  if (lower === '3' || lower === 'lab results')        return handleLabResults(session);
  if (lower === '4' || lower === 'upload document') {
    session.awaitingUpload = true;
    return `📤 Ready to receive your document!\n\nPlease send a *photo* of any medical report, prescription, or lab result.\n\nI'll extract and save all the details automatically using AI! 🤖`;
  }
  if (lower === 'emergency card') return handleEmergencyRequest(session, session.phoneNumber);
  if (lower === '5' || lower === 'drug interactions') return handleDrugInteractions(session);
  if (lower === '6' || lower === 'tip' || lower === 'tips') return getHealthTip(session);
  if (lower === '7' || lower === 'vitals' || lower === 'bmi') return handleVitalsSummary(session);

  // 4 - Change Language
  if (lower === '4' || lower === 'language' || lower === 'change language') {
    session.awaitingLanguage = true;
    return handleLanguageSelection(session, '');
  }

  // Advanced tasks -> refer to website
  const advanced = ['lab results','upload document','drug interactions','active medications','emergency card','vitals','reports','prescriptions'];
  if (advanced.includes(lower)) {
    const msgs: Record<string, string> = {
      English:  `🌐 For detailed health tasks (reports, medications, uploads), use our full platform:\n\n*${APP_URL}*\n\nWhatsApp is for quick reminders & summaries.`,
      Hindi:    `🌐 विस्तृत कार्यों के लिए वेबसाइट खोलें:\n*${APP_URL}*`,
      Marathi:  `🌐 सखोल कामांसाठी वेबसाइट उघडा:\n*${APP_URL}*`,
    };
    return msgs[lang] || msgs['English'];
  }

  // Default - send simple 4-option text menu
  setImmediate(async () => {
    try {
      const menuText: Record<string, string> = {
        English:  `🏥 *MedVault Assistant*\n\n1️⃣ 💡 Daily Health Tip\n2️⃣ 📊 Health Summary\n3️⃣ 📞 Support\n4️⃣ 🌐 Change Language\n\n_Reply 1–4 or ask anything!_`,
        Hindi:    `🏥 *MedVault असिस्टेंट*\n\n1️⃣ 💡 दैनिक स्वास्थ्य सुझाव\n2️⃣ 📊 स्वास्थ्य सारांश\n3️⃣ 📞 सहायता\n4️⃣ 🌐 भाषा बदलें\n\n_1-4 में से जवाब दें!_`,
        Marathi:  `🏥 *MedVault असिस्टंट*\n\n1️⃣ 💡 दैनंदिन आरोग्य सल्ला\n2️⃣ 📊 आरोग्य सारांश\n3️⃣ 📞 सहाय्यता\n4️⃣ 🌐 भाषा बदला\n\n_1-4 पैकी उत्तर द्या!_`,
      };
      await sendWhatsAppMessage(session.phoneNumber, menuText[session.preferredLanguage] || menuText['English']);
    } catch { /* ignore */ }
  });
  return T('openingMenu', session.preferredLanguage);
}

// ─── Menu sub-handlers ────────────────────────────────────────────────────────
async function handleHealthSummary(session: WhatsAppSession): Promise<string> {
  const docs = await DocumentModel.find({ userId: session.userId! })
    .sort({ documentDate: -1 })
    .limit(5)
    .select('documentType documentDate criticalityScore summaryPlain');
  const lang = session.preferredLanguage;

  if (!docs.length) return T('noDocs', lang);

  const avg = docs.reduce((s, d) => s + (d.criticalityScore || 0), 0) / docs.length;
  const emoji = avg >= 7 ? '🔴' : avg >= 4 ? '🟡' : '🟢';

  const lines = [
    `${emoji} *Your Health Summary*`,
    ``,
    `📊 ${docs.length} records on file`,
    `📈 Overall health index: ${(10 - avg).toFixed(1)}/10`,
    ``,
    `📋 *Recent Records:*`,
  ];

  docs.slice(0, 3).forEach((d) => {
    const date = d.documentDate
      ? new Date(d.documentDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      : 'Unknown date';
    lines.push(`• ${formatDocType(d.documentType)} — ${date}`);
  });

  lines.push(``, `Ask me about any specific record or condition!`);
  return lines.join('\n');
}

async function handleMedications(session: WhatsAppSession): Promise<string> {
  const prescriptions = await PrescriptionModel.find({
    userId: session.userId!,
    status: 'active',
  });
  const lang = session.preferredLanguage;
  if (!prescriptions.length) return T('noMeds', lang);

  const lines = [`💊 *Active Medications (${prescriptions.length})*`, ``];
  prescriptions.forEach((p) => {
    lines.push(`*${p.drugName}*`);
    if (p.dosage) lines.push(`Dose: ${p.dosage}`);
    if (p.frequency) lines.push(`Frequency: ${p.frequency}`);
    if (p.interactionSeverity && p.interactionSeverity !== 'none') {
      lines.push(`⚠️ Interaction: ${p.interactionSeverity}`);
    }
    lines.push(``);
  });

  lines.push(`Send *5* or *interactions* to check for drug interactions.`);
  return lines.join('\n');
}

async function handleLabResults(session: WhatsAppSession): Promise<string> {
  const latestLab = await DocumentModel.findOne({
    userId: session.userId!,
    documentType: 'lab_report',
  }).sort({ documentDate: -1 });
  const lang = session.preferredLanguage;
  if (!latestLab) return T('noLab', lang);

  const date = latestLab.documentDate
    ? new Date(latestLab.documentDate).toLocaleDateString('en-IN')
    : 'Unknown date';

  const lines = [`🧪 *Latest Lab Report* (${date})`, ``];

  if (latestLab.labValues?.length) {
    const abnormal = latestLab.labValues.filter((l) => l.is_abnormal);
    const normalCount = latestLab.labValues.length - abnormal.length;

    if (abnormal.length) {
      lines.push(`⚠️ *Abnormal:*`);
      abnormal.slice(0, 5).forEach((l) => lines.push(`• ${l.test_name}: ${l.value} ${l.unit}`));
      lines.push(``);
    }
    lines.push(`✅ *Normal (${normalCount} values)*`);
  }

  lines.push(``, latestLab.summaryPlain);
  return lines.join('\n');
}

async function handleDrugInteractions(session: WhatsAppSession): Promise<string> {
  const flagged = await PrescriptionModel.find({
    userId: session.userId!,
    status: 'active',
    interactionSeverity: { $ne: 'none' },
  });
  const lang = session.preferredLanguage;
  if (!flagged.length) return T('noInteractions', lang);

  const lines = [`⚠️ *Drug Interaction Alerts*`, ``];
  flagged.forEach((p) => {
    if (p.interactionWarnings?.length) {
      const e =
        p.interactionSeverity === 'severe' ? '🔴' :
        p.interactionSeverity === 'moderate' ? '🟡' : '🟠';
      lines.push(`${e} *${p.drugName}* — ${p.interactionSeverity}`);
      p.interactionWarnings.forEach((w: string) => lines.push(`  ${w}`));
      lines.push(``);
    }
  });

  lines.push(``, T('consultDoctor', session.preferredLanguage));

  return lines.join('\n');
}

// ─── Health tip (AI-generated, fully context-aware) ──────────────────────────
async function getHealthTip(session: WhatsAppSession): Promise<string> {
  if (!session.userId) return `Link your account first to get personalised tips! Send *hi*.`;

  // buildLightContext: profile + active meds — fast and personalised
  const contextBlock = await buildLightContext(session.userId);
  const prompt = assemblePrompt(
    contextBlock,
    `You are a friendly health coach. Based on this specific patient's profile above, give ONE personalised, actionable health tip for today. Keep it under 60 words. No markdown. Be warm and encouraging. If they have active medications or known allergies, factor those in.`
  );

  const tip = await generateContent(prompt);
  return `💡 *Today's Health Tip*\n\n${tip.trim()}\n\n_Send *tip* anytime for a new tip!_`;
}

// ─── Vitals summary from lab reports ─────────────────────────────────────────
async function handleVitalsSummary(session: WhatsAppSession): Promise<string> {
  if (!session.userId) return `Link your account first. Send *hi*.`;

  const labs = await DocumentModel.find({
    userId: session.userId!,
    documentType: 'lab_report',
    'labValues.0': { $exists: true },
  }).sort({ documentDate: -1 }).limit(3);

  if (!labs.length) {
    return `No lab reports with vitals found yet.\n\nSend me a photo of a lab report to get started!`;
  }

  const lines = [`🩺 *Your Recent Vitals*`, ``];

  labs.forEach((lab) => {
    const date = lab.documentDate
      ? new Date(lab.documentDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      : 'Unknown';
    lines.push(`📅 *${date}*`);
    (lab.labValues ?? []).slice(0, 5).forEach((v) => {
      const flag = v.is_abnormal ? ' ⚠️' : ' ✅';
      lines.push(`• ${v.test_name}: ${v.value} ${v.unit}${flag}`);
    });
    lines.push(``);
  });

  lines.push(`_Ask me about any specific value!_`);
  return lines.join('\n');
}

// ─── AI query (context-aware via contextBuilder + Gemini) ─────────────────────
async function handleAIQuery(session: WhatsAppSession, userMessage: string): Promise<string> {
  if (!session.userId) {
    return `Please link your MedVault account first. Send *hi* to get started.`;
  }

  // Full context: profile + active meds + semantically-relevant docs + rising trends
  const ctx = await buildUserContext(session.userId, userMessage);

  const historySnippet = session.conversationHistory
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Patient' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const taskPrompt =
    `You are a helpful medical records assistant for MedVault (WhatsApp).\n` +
    `Rules:\n` +
    `- Answer ONLY based on the patient context above.\n` +
    `- Keep responses concise (under 200 words) — this is WhatsApp.\n` +
    `- Use simple language. No markdown (* or #). Plain text only.\n` +
    `- If the context doesn't answer the question, say so honestly.\n` +
    `- Never diagnose. Always recommend consulting a doctor.\n` +
    (historySnippet ? `\nConversation history:\n${historySnippet}` : '') +
    `\n\nPatient asks: ${userMessage}`;

  const fullPrompt = assemblePrompt(ctx.block, taskPrompt);
  const result = await generateContent(fullPrompt);
  return result.replace(/\*\*/g, '').replace(/#{1,3} /g, '').trim();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDocType(type: string): string {
  const map: Record<string, string> = {
    lab_report: 'Lab Report',
    discharge_summary: 'Discharge Summary',
    prescription: 'Prescription',
    imaging: 'Imaging Report',
    vaccination: 'Vaccination Record',
    consultation: 'Consultation Note',
    other: 'Medical Document',
  };
  return map[type] ?? 'Medical Document';
}

// ─── REST: get persisted WhatsApp messages for the logged-in user ─────────────
export async function getWhatsAppMessages(req: Request, res: Response): Promise<void> {
  try {
    const user = await UserModel.findById(req.user!.uid).lean();
    if (!user || !user.whatsappPhone) {
      res.json({ success: true, data: [], connected: false });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await WhatsAppMessageModel.find({ phoneNumber: user.whatsappPhone })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: messages.reverse(), connected: true, phone: user.whatsappPhone });
  } catch (err) {
    console.error('getWhatsAppMessages error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── REST: WhatsApp connection status ─────────────────────────────────────────
export async function getWhatsAppStatus(req: Request, res: Response): Promise<void> {
  try {
    const user = await UserModel.findById(req.user!.uid, { whatsappPhone: 1 }).lean();
    const connected = !!(user?.whatsappPhone);
    res.json({ success: true, data: { connected, phone: user?.whatsappPhone || null } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── REST: WhatsApp usage stats ───────────────────────────────────────────────
export async function getWhatsAppStats(req: Request, res: Response): Promise<void> {
  try {
    const user = await UserModel.findById(req.user!.uid, { whatsappPhone: 1 }).lean();
    if (!user?.whatsappPhone) {
      res.json({ success: true, data: { sentToday: 0, total: 0, connected: false } });
      return;
    }

    const phone = user.whatsappPhone;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [sentToday, total] = await Promise.all([
      WhatsAppMessageModel.countDocuments({ phoneNumber: phone, direction: 'out', timestamp: { $gte: todayStart } }),
      WhatsAppMessageModel.countDocuments({ phoneNumber: phone }),
    ]);

    res.json({ success: true, data: { sentToday, total, connected: true, phone } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}


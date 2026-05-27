import type { AppLocale } from "@/lib/i18n/config";
import type { Category, Product, Vendor } from "@/types";

export type LocalizedText = Partial<Record<AppLocale, string>>;

export const categoryLocalization: Record<string, { name: LocalizedText; description: LocalizedText; aliases: string[] }> = {
  "fresh-produce": {
    name: { ta: "காய்கறி மற்றும் பழங்கள்", hi: "फल और सब्ज़ी" },
    description: { ta: "இன்றைய சமையலுக்கு காய்கறி, கீரை, பழங்கள்.", hi: "आज की cooking के लिए vegetables, greens, और fruits." },
    aliases: ["vegetables", "fruits", "காய்கறி", "பழம்", "सब्ज़ी", "फल", "tamatar", "தக்காளி", "टमाटर"],
  },
  "bakery-breakfast": {
    name: { ta: "பேக்கரி மற்றும் காலை உணவு", hi: "Bakery और breakfast" },
    description: { ta: "பிரெட், batter, breakfast பொருட்கள்.", hi: "Bread, batter, और breakfast items." },
    aliases: ["bakery", "breakfast", "idli", "dosa", "இட்லி", "தோசை", "नाश्ता"],
  },
  "home-essentials": {
    name: { ta: "வீட்டு அத்தியாவசியங்கள்", hi: "घर के essentials" },
    description: { ta: "சுத்தம், pantry, வீட்டு பயன்பாட்டு பொருட்கள்.", hi: "Cleaning, pantry, और household supplies." },
    aliases: ["cleaner", "home", "floor", "சுத்தம்", "வீடு", "घर", "सफाई"],
  },
  "personal-care": {
    name: { ta: "பராமரிப்பு", hi: "Personal care" },
    description: { ta: "தினசரி care மற்றும் wellness பொருட்கள்.", hi: "Daily care और wellness basics." },
    aliases: ["care", "baby", "pharmacy", "மருந்தகம்", "குழந்தை", "baby care", "दवा", "बच्चा"],
  },
  "ready-meals": {
    name: { ta: "தயார் உணவு", hi: "Ready meals" },
    description: { ta: "snacks, meal kits, உள்ளூர் kitchen favorites.", hi: "Snacks, meal kits, और local kitchen favorites." },
    aliases: ["snacks", "samosa", "chips", "சிப்ஸ்", "சமோசா", "नाश्ता", "समोसा", "चिप्स"],
  },
  electronics: {
    name: { ta: "எலக்ட்ரானிக்ஸ்", hi: "Electronics" },
    description: { ta: "மொபைல் accessories, audio, work-from-home பொருட்கள்.", hi: "Mobile accessories, audio, और work-from-home essentials." },
    aliases: ["mobile", "phone", "cover", "headphones", "மொபைல்", "கவர்", "मोबाइल", "कवर", "हेडफोन"],
  },
  lifestyle: {
    name: { ta: "வாழ்க்கை முறை", hi: "Lifestyle" },
    description: { ta: "செருப்பு, chair, daily-use lifestyle பொருட்கள்.", hi: "Footwear, chair, और daily-use products." },
    aliases: ["chair", "shoes", "sneakers", "நாற்காலி", "செருப்பு", "कुर्सी", "जूते"],
  },
};

export const productLocalization: Record<string, { name: LocalizedText; description: LocalizedText; aliases: string[] }> = {
  "kx-tomato-pack": {
    name: { ta: "தக்காளி பாக்கெட் 1 கிலோ", hi: "टमाटर पैक 1 किलो" },
    description: { ta: "ரசம், chutney, salad, தினசரி சமையலுக்கு தேர்ந்தெடுக்கப்பட்ட தக்காளி.", hi: "Rasam, chutney, salad, और daily cooking के लिए selected tomatoes." },
    aliases: ["tomato", "tomatoes", "தக்காளி", "टमाटर", "tamatar"],
  },
  "kx-paneer-puffs": {
    name: { ta: "பனீர் பஃப் 4 பீஸ்", hi: "Paneer puff 4 pcs" },
    description: { ta: "மாலை tea-time க்கு சூடாக pack செய்யப்படும் பனீர் பஃப்.", hi: "Tea-time के लिए warm packed paneer puffs." },
    aliases: ["puff", "paneer", "snack", "பஃப்", "பனீர்", "नाश्ता", "पनीर"],
  },
  "kx-idli-batter": {
    name: { ta: "இட்லி தோசை மாவு 1 கிலோ", hi: "Idli dosa batter 1 किलो" },
    description: { ta: "மென்மையான இட்லி, தோசைக்கு கல் அரைத்த புளித்த மாவு.", hi: "Soft idli और dosa के लिए stone-ground fermented batter." },
    aliases: ["idli", "dosa", "batter", "இட்லி", "தோசை", "மாவு", "इडली", "डोसा"],
  },
  "kx-wireless-headphones": {
    name: { ta: "வயர்லெஸ் ஹெட்போன்", hi: "Wireless headphones" },
    description: { ta: "பாடல், calls, online class க்கு Bluetooth headphones.", hi: "Music, calls, और online classes के लिए Bluetooth headphones." },
    aliases: ["headphones", "bluetooth", "wireless", "ஹெட்போன்", "ब्लूटूथ", "हेडफोन"],
  },
  "kx-office-chair": {
    name: { ta: "ஆபிஸ் நாற்காலி", hi: "Office chair" },
    description: { ta: "நீண்ட நேர வேலைக்கு lumbar support உடன் adjustable chair.", hi: "Long work sessions के लिए lumbar support वाली adjustable chair." },
    aliases: ["chair", "office chair", "நாற்காலி", "ऑफिस चेयर", "कुर्सी"],
  },
  "kx-makhana-snack": {
    name: { ta: "வறுத்த மக்கானா ஸ்நாக்", hi: "Roasted makhana snack" },
    description: { ta: "குறைந்த எண்ணெய் evening snack.", hi: "Low-oil evening snack." },
    aliases: ["snacks", "makhana", "healthy snack", "சிப்ஸ்", "ஸ்நாக்", "मखाना", "नाश्ता"],
  },
  "kx-phone-tripod": {
    name: { ta: "மொபைல் ட்ரைப்பாட் ஸ்டாண்ட்", hi: "Mobile tripod stand" },
    description: { ta: "video call, cooking video, content recording க்கு மொபைல் stand.", hi: "Video calls और content recording के लिए mobile stand." },
    aliases: ["mobile stand", "tripod", "phone stand", "மொபைல்", "ஸ்டாண்ட்", "मोबाइल स्टैंड"],
  },
};

export const vendorLocalization: Record<string, { name: LocalizedText; coverageNote: LocalizedText; aliases: string[] }> = {
  "vendor-morning-basket": {
    name: { ta: "டி.நகர் மோர்னிங் பாஸ்கெட்", hi: "T. Nagar Morning Basket" },
    coverageNote: { ta: "டி.நகர், நந்தனம், வெஸ்ட் மாம்பலம் பகுதிகளில் kirana மற்றும் fresh produce coverage.", hi: "T. Nagar, Nandanam, और West Mambalam में kirana और fresh produce coverage." },
    aliases: ["kirana", "கடை", "किराना"],
  },
  "vendor-koramangala-tech": {
    name: { ta: "வேளச்சேரி டெக் கார்னர்", hi: "Velachery Tech Corner" },
    coverageNote: { ta: "வேளச்சேரி மற்றும் கிண்டி பகுதிகளில் electronics coverage.", hi: "Velachery और Guindy corridors में electronics coverage." },
    aliases: ["mobile shop", "electronics", "மொபைல் கடை", "मोबाइल दुकान"],
  },
};

export function localizeCategory(category: Category, locale: AppLocale): Category {
  const item = categoryLocalization[category.slug];
  if (!item) return category;
  return {
    ...category,
    name: item.name[locale] ?? category.name,
    description: item.description[locale] ?? category.description,
  };
}

export function localizeVendor(vendor: Vendor, locale: AppLocale): Vendor {
  const item = vendorLocalization[vendor.id];
  if (!item) return vendor;
  return {
    ...vendor,
    name: item.name[locale] ?? vendor.name,
    coverageNote: item.coverageNote[locale] ?? vendor.coverageNote,
  };
}

export function localizeProduct(product: Product, locale: AppLocale): Product {
  const item = productLocalization[product.id];
  return {
    ...product,
    name: item?.name[locale] ?? product.name,
    description: item?.description[locale] ?? product.description,
    category: localizeCategory(product.category, locale),
    vendor: localizeVendor(product.vendor, locale),
  };
}

export function getSearchAliases(product: Product) {
  return [
    ...(productLocalization[product.id]?.aliases ?? []),
    ...(categoryLocalization[product.category.slug]?.aliases ?? []),
    ...(vendorLocalization[product.vendor.id]?.aliases ?? []),
  ];
}

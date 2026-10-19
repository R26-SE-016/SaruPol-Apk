export interface SoilDeficiencyGuideItem {
  id: string;
  name: string;
  name_si?: string;
  name_ta?: string;
  chemicalSymbol: string;
  criticalRange: string;
  criticalRange_si?: string;
  criticalRange_ta?: string;
  themeColor: string;
  overview: string;
  overview_si?: string;
  overview_ta?: string;
  symptoms: string[];
  symptoms_si?: string[];
  symptoms_ta?: string[];
  causes: string[];
  causes_si?: string[];
  causes_ta?: string[];
  correctiveMeasures: string[];
  correctiveMeasures_si?: string[];
  correctiveMeasures_ta?: string[];
  vernacularAdvice?: string;
  vernacularAdvice_si?: string;
  vernacularAdvice_ta?: string;
}

export const SOIL_DEFICIENCIES_GUIDE: SoilDeficiencyGuideItem[] = [
  {
    id: "nitrogen",
    name: "Nitrogen Deficiency (N)",
    name_si: "නයිට්‍රජන් ඌනතාව (N)",
    name_ta: "நைட்ரஜன் குறைபாடு (N)",
    chemicalSymbol: "N",
    criticalRange: "1.80% - 2.00% in 14th Frond",
    criticalRange_si: "14 වන පත්‍රයේ 1.80% - 2.00%",
    criticalRange_ta: "14-வது ஓலையில் 1.80% - 2.00%",
    themeColor: "#00E5FF",
    overview: "Nitrogen is the fundamental driver of vegetative canopy vigor, chlorophyll synthesis, and frond elongation in coconut palms. When deficient, the palm cannot photosynthesize efficiently, leading to reduced vigor and stunted crown growth.",
    overview_si: "නයිට්‍රජන් යනු පොල් ගසේ වියන් ශක්තිය, ක්ලෝරෝෆිල් සංශ්ලේෂණය සහ පිති දිගුවීමේ මූලික එන්ජිමයි. නයිට්‍රජන් ඌන වූ විට, ගසට කාර්යක්ෂමව ප්‍රභාසංශ්ලේෂණය කළ නොහැකි අතර, එමඟින් වර්ධන වේගය අඩාල වී ගසේ කරටිය කුරු වේ.",
    overview_ta: "நைட்ரஜன் என்பது தென்னை மரங்களின் இலைத்தொகுதி வளர்ச்சி, பச்சைய உருவாக்கம் மற்றும் ஓலை நீட்சிக்கு அடிப்படையான ஊட்டச்சத்தாகும். இதன் குறைபாடு ஏற்படும் போது, மரத்தால் வினைத்திறனாக ஒளிச்சேர்க்கை செய்ய முடியாமல் போய், வளர்ச்சி குன்றி மகுடம் சுருங்கிவிடும்.",
    symptoms: [
      "General uniform chlorosis (pale green to golden yellow) of older lower fronds first.",
      "Frond production rate slows down; newly emerged fronds are visibly shorter.",
      "Crown becomes sparse, thin, and takes on a compressed 'feather duster' shape.",
      "Nut retention drops drastically; remaining nuts have thin husks and low copra weight.",
    ],
    symptoms_si: [
      "පළමුව පහළින් පිහිටි පැරණි පිතිවල ඒකාකාරී ලා කොළ සිට රන්වන් කහ පැහැයක් (ක්ලෝරෝසිස්) ඇතිවීම.",
      "නව පිති හටගැනීමේ වේගය අඩුවීම; අලුතින් මතුවන පිති කැපී පෙනෙන ලෙස කෙටි වීම.",
      "ගසේ කරටිය සිහින් වී, කුඩා 'කොස්සක' (feather duster) හැඩයක් ගැනීම.",
      "ගෙඩි රඳවා ගැනීම දැඩි ලෙස පහත වැටීම; ඉතිරි වන ගෙඩිවල ලෙල්ල තුනී වී කොප්පරා බර අඩුවීම.",
    ],
    symptoms_ta: [
      "முதலில் அடிமட்டத்திலுள்ள முதிர்ந்த ஓலைகளில் சீரான வெளிர் பச்சை முதல் பொன்னிற மஞ்சள் நிறமாதல்.",
      "புதிய ஓலைகள் உருவாகும் வீதம் குறைவடைதல்; புதிதாக தோன்றும் ஓலைகள் குறிப்பிடத்தக்க அளவு குறுகியதாக இருத்தல்.",
      "மரத்தின் மகுடப் பகுதி மெலிந்து, இறகு தூரிகை போன்ற சுருங்கிய அமைப்பைப் பெறுதல்.",
      "காய் பிடிப்புத் திறன் வெகுவாகக் குறைதல்; எஞ்சிய காய்களில் மட்டை மெலிந்து கொப்பரை எடை குறைதல்.",
    ],
    causes: [
      "Acidic soil conditions (pH < 5.0) which restrict nitrogen mineralization.",
      "Severe leaching in sandy or gravelly soils during heavy monsoon rains.",
      "Low soil organic matter and insufficient organic recycling in the manure circle.",
    ],
    causes_si: [
      "නයිට්‍රජන් ඛනිජකරණය සීමා කරන අධික ආම්ලික පස (pH < 5.0).",
      "අධික මෝසම් වර්ෂාවකදී වැලි සහිත හෝ බොරළු සහිත පස්වල නයිට්‍රජන් පහසුවෙන් සේදී යාම (Leaching).",
      "පසේ කාබනික ද්‍රව්‍ය අඩුවීම සහ පොහොර වළල්ල තුළ ප්‍රමාණවත් පරිදි කාබනික අපද්‍රව්‍ය ප්‍රතිචක්‍රීකරණය නොවීම.",
    ],
    causes_ta: [
      "நைட்ரஜன் கனிமமயமாக்கலைத் தடுக்கும் அமில மண் நிலைமைகள் (pH < 5.0).",
      "கனமழை காலங்களில் மணற்பாங்கான அல்லது சரளை நிலங்களில் நைட்ரஜன் எளிதில் அடித்துச் செல்லப்படுதல்.",
      "மண்ணில் குறைந்த கரிமப்பொருள் மற்றும் உர வலயத்தில் போதுமான கரிம மீள்சுழற்சி இன்மை.",
    ],
    correctiveMeasures: [
      "Apply recommended differential dosage of Urea (46% N) split into 2 seasonal applications (Yala/Maha).",
      "Incorporate 25-50kg of well-cured compost or cattle manure into the 1.8m circular trench.",
      "Establish nitrogen-fixing legume cover crops (e.g. Mucuna bracteata or Pueraria phaseoloides) in inter-row spaces.",
      "Mulch the 1.8m base with 2-3 layers of coconut husks (convex side up) to suppress weeds and retain soil moisture.",
    ],
    correctiveMeasures_si: [
      "යල/මහ කන්න 2කට බෙදා නිර්දේශිත යූරියා (Urea - 46% N) මාත්‍රාව ගසට යෙදීම.",
      "ගසේ මීටර් 1.8 කවාකාර කානුවට හොඳින් දිරූ කොම්පෝස්ට් හෝ ගව පොහොර කිලෝග්‍රෑම් 25-50ක් එකතු කිරීම.",
      "පේළි අතර අවකාශයේ නයිට්‍රජන් තිරකරන බෝග (උදා. මුකුණා හෝ පියුරාරියා) වගා කිරීම.",
      "වල් මර්දනයට හා පාංශු තෙතමනය රැකගැනීමට ගසේ මීටර් 1.8 පාදය වටා පොල් ලෙලි ස්ථර 2-3ක් (උඩුකුරු වන සේ) ඇතිරීම.",
    ],
    correctiveMeasures_ta: [
      "பரிந்துரைக்கப்பட்ட யூரியா (46% N) அளவை இரண்டு பருவங்களாகப் பிரித்து (யால/மஹா) இடுதல்.",
      "மரத்தைச் சுற்றியுள்ள 1.8 மீ அகழி வலயத்தில் 25-50 கிகி மக்கிய உரம் அல்லது மாட்டுச் சாணம் இடுதல்.",
      "மரவரிசைகளுக்கு இடையில் நைட்ரஜனை நிலைநிறுத்தும் பயறு வகைப் பயிர்களை (Mucuna / Pueraria) வளர்த்தல்.",
      "களைகளைக் கட்டுப்படுத்தவும் ஈரப்பதத்தைப் பாதுகாக்கவும் 1.8 மீ வட்டப் பகுதியில் 2-3 அடுக்கு தென்னை மட்டைகளை அடுக்குதல்.",
    ],
    vernacularAdvice: "Urea should always be applied when the soil is moist. Avoid applying immediately before heavy torrential rains to prevent leaching.",
    vernacularAdvice_si: "යූරියා සෑම විටම යෙදිය යුත්තේ පසෙහි තෙතමනය ඇති අවස්ථාවේදීය. පොහොර සේදී යාම වැළැක්වීම සඳහා ධාරානිපාත වර්ෂාවට පෙර යෙදීමෙන් වළකින්න.",
    vernacularAdvice_ta: "மண்ணில் ஈரப்பதம் இருக்கும் போது மட்டுமே யூரியா இடப்பட வேண்டும். உரச் சத்து வீணாவதைத் தடுக்க பலத்த மழைக்கு சற்று முன் இடுவதைத் தவிர்க்கவும்.",
  },
  {
    id: "potassium",
    name: "Potassium Deficiency (K)",
    name_si: "පොටෑසියම් ඌනතාව (K)",
    name_ta: "பொட்டாசியம் குறைபாடு (K)",
    chemicalSymbol: "K",
    criticalRange: "1.20% - 1.50% in 14th Frond",
    criticalRange_si: "14 වන පත්‍රයේ 1.20% - 1.50%",
    criticalRange_ta: "14-வது ஓலையில் 1.20% - 1.50%",
    themeColor: "#E6AF2E",
    overview: "Potassium is the most heavily extracted nutrient by mature coconut palms. It governs stomatal regulation, drought tolerance, enzyme activation, carbohydrate translocation, and directly dictates nut volume and copra thickness.",
    overview_si: "පැසුණු පොල් ගස් මඟින් වැඩිම ප්‍රමාණයක් උරාගන්නා පෝෂකය පොටෑසියම් වේ. එය පත්‍ර පූටිකා පාලනය, නියඟයට ඔරොත්තු දීම, එන්සයිම සක්‍රිය කිරීම, කාබෝහයිඩ්‍රේට් පරිවහනය සහ ගෙඩියේ විශාලත්වය හා කොප්පරා ඝනකම සෘජුවම තීරණය කරයි.",
    overview_ta: "முதிர்ந்த தென்னை மரங்களால் அதிகளவில் உறிஞ்சப்படும் ஊட்டச்சத்து பொட்டாசியம் ஆகும். இது இலைத்துளை கட்டுப்பாடு, வறட்சி தாங்கும் திறன், நொதி இயக்கம் மற்றும் காயின் அளவு, கொப்பரை தடிமன் ஆகியவற்றை நேரடியாகத் தீர்மானிக்கிறது.",
    symptoms: [
      "Translucent orange-yellow chlorotic spots develop on older fronds.",
      "Leaflet margins and tips exhibit severe marginal necrosis (scorched/burnt appearance) advancing inwards.",
      "Frond petioles weaken and break prematurely, causing fronds to hang down along the trunk (aproning).",
      "Nut size diminishes rapidly; nuts become elongated, lightweight, with poorly developed kernel meat.",
    ],
    symptoms_si: [
      "පැරණි පිතිවල පාරභාසක තැඹිලි-කහ පැහැති පැල්ලම් හටගැනීම.",
      "පත්‍රිකා දාර සහ අගිසි දැඩි ලෙස පිළිස්සුණු ස්වභාවයක් ගෙන අභ්‍යන්තරයට වියළී යාම.",
      "පිති නැටි දුර්වල වී නොමේරූ ලෙස කැඩී බඳ දිගේ පහළට එල්ලී වැටීම (Aproning).",
      "ගෙඩිවල විශාලත්වය වේගයෙන් අඩුවීම; ගෙඩි දිගටි වී, බර අඩුවී, මදයේ ඝනකම අඩුවීම.",
    ],
    symptoms_ta: [
      "முதிர்ந்த ஓலைகளில் ஒளிபுகும் செம்மஞ்சள்-மஞ்சள் நிறப் புள்ளிகள் தோன்றுதல்.",
      "ஓலை விளிம்புகளும் நுனிகளும் கருகிய தோற்றத்துடன் உள்நோக்கி காய்ந்து போதல்.",
      "மட்டை காம்புகள் பலவீனமடைந்து முறிந்து தண்டோடு தொங்குதல் (Aproning).",
      "காய்களின் அளவு குறைந்து, நீள்வடிவமாகவும் குறைந்த எடையுடனும் கொப்பரை தடிமன் குறைந்து காணப்படுதல்.",
    ],
    causes: [
      "Coarse sandy soils (Regosols) and highly leached gravelly soils with low Cation Exchange Capacity (CEC).",
      "Continuous commercial harvesting without returning coconut husks or MOP fertilizer.",
      "Imbalanced high magnesium or calcium fertilization which antagonizes potassium absorption.",
    ],
    causes_si: [
      "ක්‍යාටායන හුවමාරු ධාරිතාව (CEC) අඩු රෙගොසෝල් සහ අධික ලෙස සේදී ගිය බොරළු සහිත වැලි පස්.",
      "පොල් ලෙලි හෝ MOP පොහොර නැවත පසට එක් නොකර අඛණ්ඩව වාණිජ අස්වනු නෙළීම.",
      "පොටෑසියම් උරාගැනීමට බාධා කරන අසමතුලිත අධික මැග්නීසියම් හෝ කැල්සියම් යෙදීම.",
    ],
    causes_ta: [
      "குறைந்த ஊட்டச்சத்து பிடிப்புத் திறன் (CEC) கொண்ட மணற்பாங்கான ரெகோசோல் மற்றும் சரளை மண்.",
      "தென்னை மட்டைகள் அல்லது MOP உரங்களை மீண்டும் மண்ணுக்கு இடாமல் தொடர்ச்சியாக அறுவடை செய்தல்.",
      "பொட்டாசியம் உறிஞ்சுதலுக்கு தடையாக அமையும் அதிகப்படியான மெக்னீசியம் அல்லது கல்சியம் இடல்.",
    ],
    correctiveMeasures: [
      "Apply Muriate of Potash (MOP - 60% K2O) according to CRI DFR guidelines (up to 2.5kg/palm/year for acute deficiency).",
      "Practice circular or trench husk burial (200-300 husks/palm) in between palm rows. Husks are rich in natural potassium.",
      "Apply coconut frond ash or recycled biomass mulch around the root zone.",
    ],
    correctiveMeasures_si: [
      "CRI DFR උපදෙස් අනුව මියුරියේට් ඔෆ් පොටෑෂ් (MOP - 60% K2O) යෙදීම (උග්‍ර ඌනතා සඳහා ගසකට වසරකට කි.ග්‍රෑ. 2.5 දක්වා).",
      "පොල් පේළි අතර වළවල් හෝ කානු කපා පොල් ලෙලි වැළලීම (ගසකට ලෙලි 200-300). ලෙලි ස්වභාවික පොටෑසියම් වලින් පොහොසත්ය.",
      "මුල් ප්‍රදේශය වටා පොල් පිති අළු හෝ කාබනික ශාක අපද්‍රව්‍ය වසුන් ලෙස යෙදීම.",
    ],
    correctiveMeasures_ta: [
      "CRI வழிகாட்டலின்படி மியூரியேட் ஒப் பொட்டாஷ் (MOP - 60% K2O) இடுதல் (கடுமையான குறைபாட்டிற்கு மரம் ஒன்றுக்கு ஆண்டுக்கு 2.5 கிகி வரை).",
      "தென்னை வரிசைகளுக்கு இடையில் தென்னை மட்டைகளை புதைத்தல் (ஒரு மரத்திற்கு 200-300 மட்டைகள்). மட்டைகளில் இயற்கை பொட்டாசியம் நிறைந்துள்ளது.",
      "வேர் வலயத்தைச் சுற்றி தென்னை ஓலை சாம்பல் அல்லது உக்கக்கூடிய உயிரியல் கழிவுகளைப் பரப்புதல்.",
    ],
    vernacularAdvice: "Potassium is critical for nut yield. Never skip MOP application during drought recovery periods.",
    vernacularAdvice_si: "පොල් අස්වැන්න සඳහා පොටෑසියම් අත්‍යවශ්‍ය වේ. නියඟයෙන් පසු යථා තත්ත්වයට පත්වන කාලවලදී කිසිවිටෙක MOP යෙදීම මඟ නොහරින්න.",
    vernacularAdvice_ta: "தேங்காய் விளைச்சலுக்கு பொட்டாசியம் மிக முக்கியமானது. வறட்சிக்குப் பிந்தைய காலங்களில் ஒருபோதும் MOP இடுவதைத் தவிர்க்க வேண்டாம்.",
  },
  {
    id: "magnesium",
    name: "Magnesium Deficiency (Mg)",
    name_si: "මැග්නීසියම් ඌනතාව (Mg)",
    name_ta: "மெக்னீசியம் குறைபாடு (Mg)",
    chemicalSymbol: "Mg",
    criticalRange: "0.20% - 0.35% in 14th Frond",
    criticalRange_si: "14 වන පත්‍රයේ 0.20% - 0.35%",
    criticalRange_ta: "14-வது ஓலையில் 0.20% - 0.35%",
    themeColor: "#A78BFA",
    overview: "Magnesium is the central atom in the chlorophyll molecule and an essential activator for energy transfer enzymes. Magnesium deficiency is widespread across the Wet and Intermediate zones of Sri Lanka on acidic sandy soils.",
    overview_si: "මැග්නීසියම් යනු ක්ලෝරෝෆිල් අණුවේ කේන්ද්‍රීය පරමාණුව වන අතර ශක්ති හුවමාරු එන්සයිම වල අත්‍යවශ්‍ය සක්‍රියකාරකයකි. ශ්‍රී ලංකාවේ තෙත් සහ අතරමැදි කලාපවල ආම්ලික වැලි පස්වල මැග්නීසියම් ඌනතාව බහුලව දක්නට ලැබේ.",
    overview_ta: "மெக்னீசியம் என்பது பச்சைய மூலக்கூறின் மைய அணுவாகும் மற்றும் ஆற்றல் பரிமாற்ற நொதிகளுக்கு அவசியமானது. இலங்கையின் ஈர மற்றும் இடைக்கால வலயங்களில் உள்ள அமில மணல் நிலங்களில் மெக்னீசியம் குறைபாடு பரவலாகக் காணப்படுகிறது.",
    symptoms: [
      "Distinctive 'V-shaped' golden yellowing on older fronds, where leaflet tips and margins turn bright yellow while the midrib area remains green.",
      "Leaflets exposed to direct sunlight show intense yellowing; shaded fronds remain greener.",
      "Severe necrosis and premature leaflet senescence from the tip backwards.",
      "Center spear fronds remain green while lower crown fronds form a brilliant golden yellow skirt.",
    ],
    symptoms_si: [
      "පැරණි පිතිවල පැහැදිලි 'V' හැඩැති රන්වන් කහ පැහැවීම; පත්‍රිකා දාර කහ පැහැයට හැරෙන අතර මැද නාරටිය ආශ්‍රිත ප්‍රදේශය කොළ පැහැයෙන් පැවතීම.",
      "සෘජු හිරු එළියට නිරාවරණය වන පත්‍රිකා තද කහ පැහැයක් පෙන්වන අතර සෙවණ සහිත පිති කොළ පැහැයෙන් පැවතීම.",
      "පත්‍රිකා අගිසිවල සිට ඇතුළට වේගයෙන් පිළිස්සී නොමේරූ ලෙස වියළී වැටීම.",
      "මැද ගොබ පිති කොළ පැහැයෙන් තිබියදී පහළ පිති දීප්තිමත් රන්වන් කහ පැහැති සායක් (Skirt) ආකාරයෙන් දිස්වීම.",
    ],
    symptoms_ta: [
      "முதிர்ந்த ஓலைகளில் தனித்துவமான 'V' வடிவ பொன்னிற மஞ்சள் நிறமாதல்; ஓலை விளிம்புகள் மஞ்சளாக மாறும் போது நடு நரம்புப் பகுதி பச்சையாக இருத்தல்.",
      "நேரடி சூரிய ஒளியில் உள்ள ஓலைகள் தீவிர மஞ்சள் நிறத்தையும், நிழலில் உள்ளவை பச்சை நிறத்தையும் கொண்டிருத்தல்.",
      "நுனியிலிருந்து உட்புறமாக ஓலைகள் காய்ந்து முதிர்வுக்கு முன் உதிர்ந்து போதல்.",
      "மத்திய குருத்து ஓலைகள் பச்சையாக இருக்க, கீழ் மட்டத்து ஓலைகள் பிரகாசமான மஞ்சள் நிற ஆடை போன்று காட்சியளித்தல்.",
    ],
    causes: [
      "Strongly acidic soils (pH < 5.2) where magnesium is leached into subsoil horizons.",
      "Excessive high-dose potassium (MOP) fertilization without corresponding magnesium balancing.",
      "Coarse sandy soils with minimal clay content.",
    ],
    causes_si: [
      "මැග්නීසියම් යටි පස් ස්ථරවලට සේදී යන දැඩි ආම්ලික පස් (pH < 5.2).",
      "මැග්නීසියම් සමතුලිතතාවකින් තොරව අධික මාත්‍රාවලින් පොටෑසියම් (MOP) පොහොර අඛණ්ඩව යෙදීම.",
      "මැටි ප්‍රතිශතය ඉතා අඩු රළු වැලි පස්.",
    ],
    causes_ta: [
      "மெக்னீசியம் ஆழமான மண் அடுக்குகளுக்கு அடித்துச் செல்லப்படும் கடுமையான அமில மண் (pH < 5.2).",
      "மெக்னீசியத்தை சமநிலைப்படுத்தாமல் அதிகளவில் பொட்டாசியம் (MOP) உரங்களை தொடர்ந்து இடுதல்.",
      "மிகக் குறைந்த களிமண் கொண்ட மணற்பாங்கான நிலங்கள்.",
    ],
    correctiveMeasures: [
      "Broadcast 1.0 - 2.0kg of Agricultural Dolomite (CaCO3.MgCO3, min 18% MgO) over the 1.8m circular basin.",
      "Apply 500g of Kieserite (MgSO4) for rapid soluble magnesium uptake in severe cases.",
      "Maintain soil pH between 5.8 and 6.5 to maximize magnesium availability.",
    ],
    correctiveMeasures_si: [
      "ගසේ මීටර් 1.8 කවාකාර පාදමට කෘෂිකාර්මික ඩොලමයිට් (Dolomite - අවම 18% MgO) කි.ග්‍රෑ. 1.0 - 2.0ක් විසුරුවා හැරීම.",
      "උග්‍ර ඌනතා තත්ත්වයන් සඳහා කඩිනමින් උරාගන්නා කයිසරයිට් (Kieserite - MgSO4) ග්‍රෑම් 500ක් යෙදීම.",
      "මැග්නීසියම් කාර්යක්ෂමව උරාගැනීම සඳහා පාංශු pH අගය 5.8 ත් 6.5 ත් අතර පවත්වා ගැනීම.",
    ],
    correctiveMeasures_ta: [
      "மரத்தைச் சுற்றியுள்ள 1.8 மீ வட்டப் பகுதியில் 1.0 - 2.0 கிகி விவசாய டோலமைட் (குறைந்தது 18% MgO) தூவுதல்.",
      "கடுமையான நிலைகளில் துரித உறிஞ்சுதலுக்கு 500 கிராம் கீசரைட் (Kieserite - MgSO4) இடுதல்.",
      "மெக்னீசியம் உறிஞ்சுதலை அதிகரிக்க மண்ணின் pH அளவை 5.8 முதல் 6.5 வரை பேணுதல்.",
    ],
    vernacularAdvice: "Apply Dolomite at least 4-6 weeks separately from Urea to prevent nitrogen loss through gaseous ammonia volatilization.",
    vernacularAdvice_si: "ඇමෝනියා වායුව ලෙස නයිට්‍රජන් හානිවීම වැළැක්වීම සඳහා ඩොලමයිට් යෙදීම යූරියා යෙදීමට අවම වශයෙන් සති 4-6කට පෙර හෝ පසුව සිදුකරන්න.",
    vernacularAdvice_ta: "நைட்ரஜன் ஆவியாகி வீணாவதைத் தவிர்க்க யூரியா இடுவதற்கு குறைந்தது 4-6 வாரங்களுக்கு முன்னரோ அல்லது பின்னரோ டோலமைட் இடவும்.",
  },
  {
    id: "phosphorus",
    name: "Phosphorus Deficiency (P)",
    name_si: "පොස්පරස් ඌනතාව (P)",
    name_ta: "பாஸ்பரஸ் குறைபாடு (P)",
    chemicalSymbol: "P",
    criticalRange: "0.12% - 0.15% in 14th Frond",
    criticalRange_si: "14 වන පත්‍රයේ 0.12% - 0.15%",
    criticalRange_ta: "14-வது ஓலையில் 0.12% - 0.15%",
    themeColor: "#FF4C4C",
    overview: "Phosphorus is vital for root development, flowering, energy transfer (ATP), and bunch initiation in young and bearing palms.",
    overview_si: "පොස්පරස් යනු මුල් වර්ධනය, මල් හටගැනීම, සෛලීය ශක්ති හුවමාරුව (ATP) සහ ලපටි හා ඵලදරන ගස්වල මල් කොපු හටගැනීම සඳහා අත්‍යවශ්‍ය පෝෂකයකි.",
    overview_ta: "இளம் மற்றும் முதிர்ந்த தென்னை மரங்களின் வேர் வளர்ச்சி, பூத்தல், ஆற்றல் பரிமாற்றம் (ATP) மற்றும் குலை உருவாக்கம் ஆகியவற்றிற்கு பாஸ்பரஸ் இன்றியமையாதது.",
    symptoms: [
      "Overall stunted root growth and reduced root volume in the top 0-50cm root zone.",
      "Older fronds take on a dull, dark bluish-green or purplish luster.",
      "Female flower (button) production decreases, leading to fewer nuts per inflorescence bunch.",
      "Trunk diameter tapers prematurely (pencil point trunk) over successive seasons.",
    ],
    symptoms_si: [
      "මුල් පද්ධතියේ වර්ධනය අඩාල වීම සහ ඉහළ සෙ.මී. 0-50 මුල් කලාපයේ මුල් ප්‍රමාණය අඩුවීම.",
      "පැරණි පිති අඳුරු, නිල්-කොළ හෝ දම් පැහැයට හුරු දීප්තියක් ගැනීම.",
      "ගැහැනු මල් හටගැනීම අඩුවීම නිසා මල් කොපුවක හටගන්නා ගෙඩි සංඛ්‍යාව පහත වැටීම.",
      "කාලයත් සමඟ ගසේ කඳේ විෂ්කම්භය ක්‍රමයෙන් සිහින් වී පැන්සල් තුඩක හැඩයක් (Pencil point) ගැනීම.",
    ],
    symptoms_ta: [
      "மேல் 0-50 செ.மீ வேர் வலயத்தில் வேர் வளர்ச்சி குன்றி வேர் அளவு குறைதல்.",
      "முதிர்ந்த ஓலைகள் மந்தமான, கருநீல-பச்சை அல்லது ஊதா நிற மினுமினுப்பைப் பெறுதல்.",
      "பெண் பூக்கள் உருவாக்கம் குறைவதால் ஒரு குலையிலுள்ள காய்களின் எண்ணிக்கை குறைதல்.",
      "தொடர்ச்சியான பருவங்களில் மரத்தின் தண்டு மெலிந்து பென்சில் முனை போன்ற வடிவம் பெறுதல்.",
    ],
    causes: [
      "High phosphorus fixation in iron- and aluminum-rich Lateritic soils (Ultisols).",
      "Low soil biological activity and poor mycorrhizal association.",
    ],
    causes_si: [
      "යකඩ සහ ඇලුමිනියම් බහුල ලැටරයිට් (Lateritic) පස්වල පොස්පරස් තදින් බැඳී තිබීම (Fixation).",
      "පසේ ක්ෂුද්‍රජීවී ක්‍රියාකාරිත්වය අඩුවීම සහ මයිකොරයිසා දිලීර සහජීවනය දුර්වල වීම.",
    ],
    causes_ta: [
      "இரும்பு மற்றும் அலுமினியம் நிறைந்த செம்பொறை நிலங்களில் பாஸ்பரஸ் உறிஞ்சப்பட முடியாதவாறு பிணைக்கப்படுதல்.",
      "மண்ணின் நுண்ணுயிர் தொழிற்பாடு குறைவு மற்றும் மைக்கோரைசா பூஞ்சை தொடர்பு இன்மை.",
    ],
    correctiveMeasures: [
      "Apply Eppawala Rock Phosphate (ERP - 28% P2O5) in acidic soils (pH < 6.0) at 600 - 1000g/palm/year.",
      "Use Triple Superphosphate (TSP - 46% P2O5) in alkaline coastal sands (pH > 7.0).",
      "Incorporate bio-fertilizers or mycorrhizal inoculants to enhance phosphorus solubilization.",
    ],
    correctiveMeasures_si: [
      "ආම්ලික පස් සඳහා (pH < 6.0) එප්පාවල රොක් පොස්පේට් (ERP - 28% P2O5) ගසකට වසරකට ග්‍රෑම් 600 - 1000ක් යෙදීම.",
      "ක්ෂාරීය වෙරළබඩ වැලි පස් සඳහා (pH > 7.0) ට්‍රිපල් සුපර්පොස්පේට් (TSP - 46% P2O5) භාවිතා කිරීම.",
      "පොස්පරස් දියවීම වේගවත් කිරීම සඳහා ජෛව පොහොර හෝ මයිකොරයිසා භාවිතය ප්‍රවර්ධනය කිරීම.",
    ],
    correctiveMeasures_ta: [
      "அமில மண்ணிற்கு (pH < 6.0) எப்பாவல பாறை பாஸ்பேட் (ERP - 28% P2O5) ஆண்டுக்கு மரம் ஒன்றுக்கு 600 - 1000 கிராம் இடுதல்.",
      "காரத்தன்மை கொண்ட கடற்கரை மணலுக்கு (pH > 7.0) டிரிபிள் சூப்பர் பாஸ்பேட் (TSP - 46% P2O5) பயன்படுத்துதல்.",
      "பாஸ்பரஸ் கரையும் தன்மையை அதிகரிக்க நுண்ணுயிர் உரங்களைப் பயன்படுத்துதல்.",
    ],
    vernacularAdvice: "Rock Phosphate is slow-release and requires an acidic root environment to dissolve effectively.",
    vernacularAdvice_si: "රොක් පොස්පේට් යනු සෙමින් මුදාහැරෙන පොහොරක් වන අතර එය හොඳින් දියවීම සඳහා මුල් කලාපයේ ආම්ලික පරිසරයක් අවශ්‍ය වේ.",
    vernacularAdvice_ta: "பாறை பாஸ்பேட் மெதுவாக கரையும் உரமாகும், இது வினைத்திறனாக கரைய வேர் வலயத்தில் அமிலச் சூழல் அவசியமாகும்.",
  },
  {
    id: "boron",
    name: "Boron Micronutrient Deficiency (B)",
    name_si: "බෝරෝන් ක්ෂුද්‍ර පෝෂක ඌනතාව (B)",
    name_ta: "போரான் நுண் ஊட்டச்சத்துக் குறைபாடு (B)",
    chemicalSymbol: "B",
    criticalRange: "10 - 25 ppm in 14th Frond",
    criticalRange_si: "14 වන පත්‍රයේ 10 - 25 ppm",
    criticalRange_ta: "14-வது ஓலையில் 10 - 25 ppm",
    themeColor: "#F472B6",
    overview: "Boron is an indispensable micronutrient responsible for cell wall synthesis, pollen tube germination, and bunch fruit set.",
    overview_si: "බෝරෝන් යනු සෛල බිත්ති සංශ්ලේෂණය, පරාග නාල ප්‍රරෝහණය සහ මල් කොපුවල ගෙඩි පිහිටීම සඳහා වගකියන අත්‍යවශ්‍ය ක්ෂුද්‍ර පෝෂකයකි.",
    overview_ta: "போரான் என்பது செல் சுவர் உருவாக்கம், மகரந்தக் குழாய் முளைப்பு மற்றும் காய்கள் உருவாவதற்குப் பொறுப்பான இன்றியமையாத நுண் ஊட்டச்சத்தாகும்.",
    symptoms: [
      "Young emergent fronds show crumpled, deformed, or zigzag leaflet shapes (accordion leaf).",
      "Hooked frond tips ('little leaf' symptom) and fused leaflets.",
      "Extensive premature button nut shedding shortly after inflorescence opening.",
      "Nuts develop internal gum pockets, longitudinal cracks, and deformed shell shapes.",
    ],
    symptoms_si: [
      "අලුතින් මතුවන ලපටි පිති රැළි වැටුණු, විකෘති වූ හෝ සිග්සැග් හැඩයක් ගැනීම (Accordion leaf).",
      "කොකු හැඩැති පිති අගිසි ('Little leaf' ලක්ෂණය) සහ එකිනෙක ඇලුණු පත්‍රිකා.",
      "මල් කොපුව පිපී කෙටි කලකින් නොමේරූ කුඩා පොල් ගැට (කුරුම්බා) විශාල වශයෙන් හැලී යාම.",
      "ගෙඩි තුළ මැලියම් කුහර හටගැනීම, දිගටි ඉරිතැලීම් සහ විකෘති වූ කටු හැඩයන් ඇතිවීම.",
    ],
    symptoms_ta: [
      "புதிதாகத் தோன்றும் இளம் ஓலைகள் சுருங்கி, சிதைந்து அல்லது நெளிவடிவில் காணப்படுதல் (Accordion leaf).",
      "கொக்கி போன்ற ஓலை நுனிகள் ('Little leaf' அறிகுறி) மற்றும் ஒன்றோடொன்று ஒட்டிய ஓலைகள்.",
      "பாளை வெடித்த சிறிது காலத்திலேயே இளம் பிஞ்சுகள் அதிகளவில் கொட்டுதல்.",
      "தேங்காய்களுக்குள் பிசின் கட்டிகள் உருவாதல், நீளவாட்டு வெடிப்புகள் மற்றும் சிதைந்த வடிவம் தோன்றுதல்.",
    ],
    causes: [
      "Alkaline coastal soils (pH > 7.5) or over-limed soils with low boron solubility.",
      "Prolonged dry weather followed by abrupt heavy rainfall flushes.",
    ],
    causes_si: [
      "බෝරෝන් ද්‍රාව්‍යතාව අඩු ක්ෂාරීය වෙරළබඩ පස් (pH > 7.5) හෝ අධික ලෙස හුණු යෙදූ පස්.",
      "දීර්ඝ නියං කාලගුණයෙන් පසු හදිසියේ ඇතිවන අධික වර්ෂාපතන තත්ත්වයන්.",
    ],
    causes_ta: [
      "குறைந்த போரான் கரைதிறன் கொண்ட காரத்தன்மை கடற்கரை மண் (pH > 7.5) அல்லது அதிக சுண்ணாம்பு இடப்பட்ட மண்.",
      "நீண்ட வறண்ட காலநிலையைத் தொடர்ந்து திடீரென பெய்யும் கனமழை.",
    ],
    correctiveMeasures: [
      "Apply 50 - 100g of Commercial Borax (11% B) or Solubor per palm in the manure circle.",
      "For acute inflorescence abortion, apply a 0.2% Solubor foliar spray during spadix emergence.",
    ],
    correctiveMeasures_si: [
      "පොහොර වළල්ලට වාණිජ බොරැක්ස් (Borax - 11% B) හෝ සොලුබෝර් (Solubor) ග්‍රෑම් 50 - 100ක් ගසකට යෙදීම.",
      "මල් කොපු හැලී යාම වළක්වා ගැනීමට මල් කොපු මතු වන අවස්ථාවේදී 0.2% සොලුබෝර් ද්‍රාවණයක් පත්‍ර මතට ඉසීම.",
    ],
    correctiveMeasures_ta: [
      "உர வலயத்தில் மரத்திற்கு 50 - 100 கிராம் விவசாய போராக்ஸ் (11% B) அல்லது சொலுபோர் இடுதல்.",
      "பூங்கொத்து உதிர்வதைத் தடுக்க, பாளை தோன்றும் போது 0.2% சொலுபோர் கரைசலை தெளித்தல்.",
    ],
    vernacularAdvice: "Boron is a micronutrient with a narrow safety margin. Never exceed 100g per palm per year to prevent boron phytotoxicity.",
    vernacularAdvice_si: "බෝරෝන් යනු ඉතා පටු ආරක්ෂිත පරාසයක් ඇති ක්ෂුද්‍ර පෝෂකයකි. ශාක විෂවීම් වැළැක්වීම සඳහා කිසිවිටෙකත් වසරකට ගසකට ග්‍රෑම් 100 නොඉක්මවන්න.",
    vernacularAdvice_ta: "போரான் மிகக் குறைந்த நச்சு வரம்பைக் கொண்ட ஒரு நுண் ஊட்டச்சத்து. தாவர நச்சுத்தன்மையைத் தடுக்க ஒரு மரத்திற்கு ஆண்டுக்கு 100 கிராமுக்கு மேல் இடவேண்டாம்.",
  },
  {
    id: "zinc",
    name: "Zinc & Iron Deficiency (Zn / Fe)",
    name_si: "සින්ක් සහ යකඩ ඌනතාව (Zn / Fe)",
    name_ta: "துத்தநாகம் & இரும்பு குறைபாடு (Zn / Fe)",
    chemicalSymbol: "Zn",
    criticalRange: "15 - 30 ppm in 14th Frond",
    criticalRange_si: "14 වන පත්‍රයේ 15 - 30 ppm",
    criticalRange_ta: "14-வது ஓலையில் 15 - 30 ppm",
    themeColor: "#34D399",
    overview: "Zinc functions as a catalytic component in auxin (growth hormone) synthesis and carbohydrate metabolism.",
    overview_si: "ඔක්සින් (වර්ධක හෝමෝන) සංශ්ලේෂණය සහ කාබෝහයිඩ්‍රේට් පරිවෘත්තිය සඳහා සින්ක් උත්ප්‍රේරක සංඝටකයක් ලෙස ක්‍රියා කරයි.",
    overview_ta: "வளர்ச்சி ஹார்மோன் (ஆக்சின்) உருவாக்கம் மற்றும் காபோவைதரேற்று வளர்சிதை மாற்றத்தில் துத்தநாகம் முக்கிய வினையூக்கியாகச் செயல்படுகிறது.",
    symptoms: [
      "Interveinal chlorosis on younger emerging fronds.",
      "Reduction in leaflet length and narrow frond symmetry (rosetting).",
      "Inflorescence necrosis and poor pollen viability.",
    ],
    symptoms_si: [
      "අලුතින් මතුවන ලපටි පිතිවල නාරටි අතර කහ පැහැවීම (Interveinal chlorosis).",
      "පත්‍රිකා වල දිග අඩුවීම සහ පිති කුඩා වී රොසෙටා ආකාරයක් ගැනීම.",
      "මල් කොපු කුණුවීම සහ පරාග වල සරුභාවය දුර්වල වීම.",
    ],
    symptoms_ta: [
      "இளம் ஓலைகளில் நரம்புகளுக்கு இடையே மஞ்சள் நிறமாதல் (Interveinal chlorosis).",
      "ஓலை நீளம் குறைந்து குறுக்கடைந்து ரோசெட் வடிவம் பெறுதல்.",
      "பூங்கொத்து அழுகல் மற்றும் மகரந்த வீரியம் குறைவடைதல்.",
    ],
    causes: [
      "High soil pH (> 7.2) and calcareous coral sands.",
      "Waterlogged soils with restricted aerobic root respiration.",
    ],
    causes_si: [
      "අධික පාංශු pH අගය (> 7.2) සහ හුණුගල් බහුල කොරල් වැලි පස්.",
      "මුල් වල වායු සංසරණය සීමා කරන ජලයෙන් යටවූ පස්.",
    ],
    causes_ta: [
      "அதிக மண் pH (> 7.2) மற்றும் சுண்ணாம்புக் கல் பவள மணல் நிலங்கள்.",
      "வேர் சுவாசத்தைத் தடுக்கும் நீர் தேங்கிய நிலங்கள்.",
    ],
    correctiveMeasures: [
      "Apply 100 - 150g of Zinc Sulfate (ZnSO4) around the manure circle.",
      "Improve soil drainage and aerate compacted soils around the trunk.",
    ],
    correctiveMeasures_si: [
      "පොහොර වළල්ල වටා සින්ක් සල්ෆේට් (ZnSO4) ග්‍රෑම් 100 - 150ක් යෙදීම.",
      "පාංශු ජලාපවහනය වැඩිදියුණු කර කඳ වටා තද වූ පස බුරුල් කර වාතනය කිරීම.",
    ],
    correctiveMeasures_ta: [
      "உர வலயத்தைச் சுற்றி 100 - 150 கிராம் துத்தநாக சல்பேட் (ZnSO4) இடுதல்.",
      "வடிகால் அமைப்பை மேம்படுத்தி மரத்தைச் சுற்றியுள்ள நிலத்தை காற்றோட்டமுடையதாக மாற்றுதல்.",
    ],
    vernacularAdvice: "Zinc deficiency is common in poorly drained coastal soils. Ensure adequate soil aeration before fertilizing.",
    vernacularAdvice_si: "ජලාපවහනය දුර්වල වෙරළබඩ පස්වල සින්ක් ඌනතාව බහුලව දක්නට ලැබේ. පොහොර යෙදීමට පෙර පසෙහි ප්‍රමාණවත් වාතනය තහවුරු කරන්න.",
    vernacularAdvice_ta: "மோசமான வடிகால் கொண்ட கடலோர நிலங்களில் துத்தநாகக் குறைபாடு பொதுவானது. உரம் இடுவதற்கு முன் மண்ணின் காற்றோட்டத்தை உறுதிப்படுத்தவும்.",
  },
];

export function getLocalizedDeficiency(item: SoilDeficiencyGuideItem, language: string) {
  return {
    ...item,
    name: language === 'si' ? (item.name_si || item.name) : language === 'ta' ? (item.name_ta || item.name) : item.name,
    criticalRange: language === 'si' ? (item.criticalRange_si || item.criticalRange) : language === 'ta' ? (item.criticalRange_ta || item.criticalRange) : item.criticalRange,
    overview: language === 'si' ? (item.overview_si || item.overview) : language === 'ta' ? (item.overview_ta || item.overview) : item.overview,
    symptoms: language === 'si' ? (item.symptoms_si || item.symptoms) : language === 'ta' ? (item.symptoms_ta || item.symptoms) : item.symptoms,
    causes: language === 'si' ? (item.causes_si || item.causes) : language === 'ta' ? (item.causes_ta || item.causes) : item.causes,
    correctiveMeasures: language === 'si' ? (item.correctiveMeasures_si || item.correctiveMeasures) : language === 'ta' ? (item.correctiveMeasures_ta || item.correctiveMeasures) : item.correctiveMeasures,
    vernacularAdvice: language === 'si' ? (item.vernacularAdvice_si || item.vernacularAdvice) : language === 'ta' ? (item.vernacularAdvice_ta || item.vernacularAdvice) : item.vernacularAdvice,
  };
}

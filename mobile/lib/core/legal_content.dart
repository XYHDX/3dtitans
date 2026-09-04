/// Static content for the Privacy Policy, Terms of Service and FAQ screens.
///
/// The website currently shows placeholder text for these pages, so this is a
/// first proper draft written for a 3D-model & print-on-demand marketplace.
/// It is NOT legal advice — review it (or have a lawyer review it) before
/// publishing, and keep it in sync with the website.
library;

class LegalSection {
  const LegalSection(this.title, this.body);

  final String title;
  final String body;
}

class LegalDoc {
  const LegalDoc({required this.title, required this.intro, required this.updated, required this.sections});

  final String title;
  final String intro;
  final String updated;
  final List<LegalSection> sections;
}

class FaqItem {
  const FaqItem(this.question, this.answer);

  final String question;
  final String answer;
}

class LegalContent {
  LegalContent._();

  static const String supportEmail = 'support@3dtitans.com';
  static const String _updated = '2026-09-03';

  static LegalDoc privacy(bool arabic) => arabic ? _privacyAr : _privacyEn;

  static LegalDoc terms(bool arabic) => arabic ? _termsAr : _termsEn;

  static List<FaqItem> faq(bool arabic) => arabic ? _faqAr : _faqEn;

  // ------------------------------------------------------------------ privacy

  static const _privacyEn = LegalDoc(
    title: 'Privacy Policy',
    updated: _updated,
    intro:
        '3D Titans ("we") runs the 3dtitans.org marketplace and this app. This policy explains what we collect, why, and the choices you have.',
    sections: [
      LegalSection(
        '1. What we collect',
        'Account details you give us (name, email, password stored as a hash, optional profile image when you sign in with Google). Order details (shipping name and address, phone number, notes, the items you buy). Files you upload for printing (.STL models) and payment proofs you attach. Reviews and messages you send us. Basic technical data such as device type, app version and error logs.',
      ),
      LegalSection(
        '2. How we use it',
        'To create and secure your account, process and deliver your orders, print the models you upload, confirm payments, answer support requests, prevent fraud and abuse, and improve the app and the website.',
      ),
      LegalSection(
        '3. Sharing',
        'Orders are shared with the store or printer that fulfils them (name, address, phone, items). Card payments are handled by Stripe — we never see or store your card number. Our infrastructure providers (Vercel hosting, Supabase database & file storage) process data on our behalf. We do not sell your personal information.',
      ),
      LegalSection(
        '4. Cookies & sessions',
        'The app stores a login session token on your device so you stay signed in, plus your language and appearance preferences and, while logged out, your cart and wishlist. You can clear these by logging out or deleting the app.',
      ),
      LegalSection(
        '5. Retention',
        'We keep account and order records for as long as your account exists and as required for accounting and legal obligations. Uploaded models are kept until the print job is completed and for a limited period afterwards for reprints and support.',
      ),
      LegalSection(
        '6. Your rights',
        'You can view and update your details from your account, and ask us to correct or delete your data or close your account by contacting $supportEmail. Some records (such as completed orders) may be retained where the law requires it.',
      ),
      LegalSection(
        '7. Children',
        '3D Titans is not directed at children under 13, and we do not knowingly collect their data.',
      ),
      LegalSection(
        '8. Changes & contact',
        'We may update this policy; the date above shows the latest version. Questions: $supportEmail.',
      ),
    ],
  );

  static const _privacyAr = LegalDoc(
    title: 'سياسة الخصوصية',
    updated: _updated,
    intro:
        'تدير 3D Titans («نحن») سوق 3dtitans.org وهذا التطبيق. توضح هذه السياسة ما نجمعه من بيانات، ولماذا، وما هي خياراتك.',
    sections: [
      LegalSection(
        '١. ما نجمعه',
        'بيانات الحساب التي تقدمها (الاسم، البريد الإلكتروني، كلمة المرور المخزنة بشكل مشفر، وصورة الملف الشخصي عند الدخول عبر Google). بيانات الطلبات (اسم وعنوان الشحن، رقم الهاتف، الملاحظات، المنتجات التي تشتريها). الملفات التي ترفعها للطباعة (نماذج ‎.STL) وإثباتات الدفع التي ترفقها. المراجعات والرسائل التي ترسلها. بيانات تقنية أساسية مثل نوع الجهاز وإصدار التطبيق وسجلات الأخطاء.',
      ),
      LegalSection(
        '٢. كيف نستخدمها',
        'لإنشاء حسابك وتأمينه، ومعالجة طلباتك وتوصيلها، وطباعة النماذج التي ترفعها، وتأكيد الدفعات، والرد على طلبات الدعم، ومنع الاحتيال وسوء الاستخدام، وتحسين التطبيق والموقع.',
      ),
      LegalSection(
        '٣. المشاركة',
        'تُشارك الطلبات مع المتجر أو الطابعة التي تنفذها (الاسم، العنوان، الهاتف، المنتجات). تتم مدفوعات البطاقات عبر Stripe — ولا نرى أو نخزن رقم بطاقتك أبداً. يعالج مزودو البنية التحتية لدينا (Vercel للاستضافة، وSupabase لقاعدة البيانات وتخزين الملفات) البيانات نيابةً عنا. نحن لا نبيع معلوماتك الشخصية.',
      ),
      LegalSection(
        '٤. الكوكيز والجلسات',
        'يخزن التطبيق على جهازك رمز جلسة الدخول لتبقى مسجلاً، إضافة إلى تفضيلات اللغة والمظهر، وسلتك وقائمة المفضلة أثناء تصفحك كزائر. يمكنك مسحها بتسجيل الخروج أو حذف التطبيق.',
      ),
      LegalSection(
        '٥. مدة الاحتفاظ',
        'نحتفظ بسجلات الحساب والطلبات طوال فترة وجود حسابك وبحسب ما تتطلبه الالتزامات المحاسبية والقانونية. تُحفظ النماذج المرفوعة حتى إتمام الطباعة ولفترة محدودة بعدها لإعادة الطباعة والدعم.',
      ),
      LegalSection(
        '٦. حقوقك',
        'يمكنك عرض بياناتك وتحديثها من حسابك، وطلب تصحيحها أو حذفها أو إغلاق حسابك عبر التواصل معنا على $supportEmail. قد نحتفظ ببعض السجلات (مثل الطلبات المنجزة) عندما يفرض القانون ذلك.',
      ),
      LegalSection(
        '٧. الأطفال',
        '3D Titans غير موجه للأطفال دون 13 عاماً، ولا نجمع بياناتهم عن قصد.',
      ),
      LegalSection(
        '٨. التغييرات والتواصل',
        'قد نحدّث هذه السياسة، ويوضح التاريخ أعلاه آخر إصدار. للاستفسارات: $supportEmail.',
      ),
    ],
  );

  // -------------------------------------------------------------------- terms

  static const _termsEn = LegalDoc(
    title: 'Terms of Service',
    updated: _updated,
    intro:
        'These terms govern your use of 3dtitans.org and the 3D Titans app. By creating an account or placing an order you agree to them.',
    sections: [
      LegalSection(
        '1. Accounts',
        'You must provide accurate information and keep your password safe. You are responsible for activity on your account. We may suspend accounts that break these terms.',
      ),
      LegalSection(
        '2. Orders & prices',
        'Prices are shown in US dollars unless stated otherwise and are set by the store selling the item. An order is a request to purchase; it is confirmed when a store accepts it. Because items are printed on demand, production and delivery times are estimates.',
      ),
      LegalSection(
        '3. Payment',
        'You can pay cash on delivery, by bank transfer, Sham Cash, Syriatel Cash, or by card through Stripe where available. For transfers and wallets, attach your payment proof so we can confirm it. Orders that remain unpaid may be cancelled.',
      ),
      LegalSection(
        '4. Printed products',
        '3D-printed items can show small layer lines and colour or size differences of a few millimetres; these are normal characteristics of the process, not defects. If an item arrives damaged or clearly different from its listing, contact us within 7 days of delivery.',
      ),
      LegalSection(
        '5. Cancellations',
        'You can request a cancellation from your orders screen before printing starts. Once printing has begun, custom items generally cannot be cancelled or refunded.',
      ),
      LegalSection(
        '6. Files you upload',
        'You keep all rights to models you upload. You grant 3D Titans and the fulfilling printer a licence to store, view and print them solely to complete your request. You confirm you have the right to print the model and that it does not infringe anyone else\'s rights or contain illegal, dangerous or hateful content.',
      ),
      LegalSection(
        '7. Sellers',
        'Stores are responsible for their listings, prices, and the quality of what they ship. 3D Titans provides the marketplace and may remove listings or stores that break these terms.',
      ),
      LegalSection(
        '8. Liability & changes',
        'The service is provided "as is". To the extent permitted by law, 3D Titans is not liable for indirect losses. We may update these terms; continued use after a change means you accept the new terms. Contact: $supportEmail.',
      ),
    ],
  );

  static const _termsAr = LegalDoc(
    title: 'شروط الاستخدام',
    updated: _updated,
    intro:
        'تنظم هذه الشروط استخدامك لموقع 3dtitans.org وتطبيق 3D Titans. بإنشاء حساب أو تقديم طلب فإنك توافق عليها.',
    sections: [
      LegalSection(
        '١. الحسابات',
        'يجب أن تقدم معلومات صحيحة وتحافظ على سرية كلمة المرور. أنت مسؤول عن النشاط الذي يتم عبر حسابك. قد نوقف الحسابات التي تخالف هذه الشروط.',
      ),
      LegalSection(
        '٢. الطلبات والأسعار',
        'تُعرض الأسعار بالدولار الأمريكي ما لم يُذكر غير ذلك، ويحددها المتجر البائع. الطلب هو طلب شراء يُؤكد عندما يقبله المتجر. ولأن المنتجات تُطبع حسب الطلب، فإن مدد الإنتاج والتسليم تقديرية.',
      ),
      LegalSection(
        '٣. الدفع',
        'يمكنك الدفع عند الاستلام، أو بحوالة بنكية، أو شام كاش، أو سيريتل كاش، أو بالبطاقة عبر Stripe حيث يتوفر. للحوالات والمحافظ، أرفق إثبات الدفع لنتمكن من تأكيده. قد تُلغى الطلبات التي تبقى غير مدفوعة.',
      ),
      LegalSection(
        '٤. المنتجات المطبوعة',
        'قد تظهر على المنتجات المطبوعة ثلاثياً خطوط طبقات دقيقة وفروق بسيطة في اللون أو المقاس ببضعة مليمترات؛ وهي خصائص طبيعية لعملية الطباعة وليست عيوباً. إذا وصل المنتج متضرراً أو مختلفاً بشكل واضح عن وصفه، تواصل معنا خلال 7 أيام من التسليم.',
      ),
      LegalSection(
        '٥. الإلغاء',
        'يمكنك طلب إلغاء الطلب من شاشة طلباتك قبل بدء الطباعة. بعد بدء الطباعة لا يمكن عادةً إلغاء المنتجات المخصصة أو استرداد قيمتها.',
      ),
      LegalSection(
        '٦. الملفات التي ترفعها',
        'تحتفظ بجميع حقوق النماذج التي ترفعها. وتمنح 3D Titans والطابعة المنفذة ترخيصاً لتخزينها وعرضها وطباعتها فقط لإتمام طلبك. وتؤكد أن لديك الحق في طباعة النموذج وأنه لا ينتهك حقوق غيرك ولا يتضمن محتوى غير قانوني أو خطراً أو مسيئاً.',
      ),
      LegalSection(
        '٧. البائعون',
        'المتاجر مسؤولة عن منتجاتها وأسعارها وجودة ما تشحنه. توفر 3D Titans السوق ويجوز لها إزالة المنتجات أو المتاجر التي تخالف هذه الشروط.',
      ),
      LegalSection(
        '٨. المسؤولية والتغييرات',
        'تُقدَّم الخدمة «كما هي». وبالحد الذي يسمح به القانون، لا تتحمل 3D Titans المسؤولية عن الأضرار غير المباشرة. قد نحدّث هذه الشروط، ويعني استمرار الاستخدام بعد التغيير قبولك للشروط الجديدة. للتواصل: $supportEmail.',
      ),
    ],
  );

  // ---------------------------------------------------------------------- faq

  static const _faqEn = [
    FaqItem(
      'How do I order a model?',
      'Add it to your cart, open the cart and tap Checkout. Enter your shipping details, choose a payment method and place the order. You will see it under Account → My orders.',
    ),
    FaqItem(
      'Which payment methods do you accept?',
      'Cash on delivery, bank transfer, Sham Cash, Syriatel Cash and, for international customers, card payments through Stripe. Available methods are shown at checkout.',
    ),
    FaqItem(
      'How long does printing take?',
      'Most items are printed within a few days after the store accepts your order. Larger or multi-part models take longer. The store may show an expected finish date on your order.',
    ),
    FaqItem(
      'Can I print my own model?',
      'Yes — use Upload for print, choose your .STL file (up to 25 MB), add your notes and phone number, and we will contact you with a quote.',
    ),
    FaqItem(
      'Can I cancel an order?',
      'You can request a cancellation from the order page as long as printing has not started. The store confirms the cancellation.',
    ),
    FaqItem(
      'Do you sell the STL files?',
      'Listings are printed products. If you want the digital file, contact the store owner through their store page.',
    ),
  ];

  static const _faqAr = [
    FaqItem(
      'كيف أطلب نموذجاً؟',
      'أضفه إلى السلة، ثم افتح السلة واضغط «إتمام الشراء». أدخل بيانات الشحن، واختر طريقة الدفع، وأكد الطلب. ستجده في الحساب ← طلباتي.',
    ),
    FaqItem(
      'ما طرق الدفع المتاحة؟',
      'الدفع عند الاستلام، الحوالة البنكية، شام كاش، سيريتل كاش، وللعملاء خارج سوريا الدفع بالبطاقة عبر Stripe. تظهر الطرق المتاحة عند إتمام الشراء.',
    ),
    FaqItem(
      'كم تستغرق الطباعة؟',
      'تُطبع أغلب المنتجات خلال بضعة أيام بعد قبول المتجر للطلب. تحتاج النماذج الكبيرة أو متعددة الأجزاء وقتاً أطول. قد يعرض المتجر موعد إنجاز متوقعاً في طلبك.',
    ),
    FaqItem(
      'هل يمكنني طباعة نموذجي الخاص؟',
      'نعم — استخدم «رفع نموذج للطباعة»، واختر ملف ‎.STL (حتى 25 ميغابايت)، وأضف ملاحظاتك ورقم هاتفك، وسنتواصل معك بعرض السعر.',
    ),
    FaqItem(
      'هل يمكنني إلغاء الطلب؟',
      'يمكنك طلب الإلغاء من صفحة الطلب ما دامت الطباعة لم تبدأ. يقوم المتجر بتأكيد الإلغاء.',
    ),
    FaqItem(
      'هل تبيعون ملفات STL؟',
      'المنتجات المعروضة مطبوعة. إن أردت الملف الرقمي، تواصل مع صاحب المتجر عبر صفحة متجره.',
    ),
  ];
}

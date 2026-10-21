// DRAFT — must be reviewed and approved by 3D Titans before launch
import type { Locale } from '@/lib/i18n';
import type { ContentDoc } from './types';

/** ISO date shown as "Last updated". Change it whenever the text changes. */
export const PRIVACY_UPDATED = '2026-10-20';

export const privacyContent: Record<Locale, ContentDoc> = {
  en: {
    title: 'Privacy Policy',
    description:
      'What personal data 3D Titans collects when you shop or order a custom 3D print, why we use it, who sees it and how long we keep it.',
    intro:
      '3D Titans ("we", "us") is a 3D-printing studio and online shop based in Syria, operating the website 3dtitans.org. This policy explains what personal data we collect when you use the site, place an order or ask for a custom print, how we use it, who can see it, how long we keep it and the choices you have.',
    sections: [
      {
        heading: '1. What we collect',
        bullets: [
          'Account details: your name, email address and password (stored only as a secure hash, never in plain text). If you sign in with Google, we also receive your Google name, email and profile picture.',
          'Order details: your full name, phone number, delivery address and city, order notes, the products you buy and your order history.',
          'Payment details: the payment method you choose and its status. If you pay by manual transfer (ShamCash, Syriatel Cash or bank transfer), the payment screenshot you upload. If you pay with ShamCash online payment, the transaction reference and status that ShamCash sends us. We never see your ShamCash login or transfer code, and we never see or store card numbers.',
          'Custom print requests: the 3D files you upload (for example STL files), the model name, your notes and the phone number you give us for the quote.',
          'Messages and reviews: what you send us through the contact form, WhatsApp, phone or email, and the reviews you post.',
          'Newsletter: your email address, if you subscribe.',
          'Technical and analytics data: cookies and similar storage that keep you signed in and remember your cart, language and theme; and, when enabled, analytics tools (Google Analytics, Meta Pixel, Vercel Analytics) that record pages visited, device and browser type, approximate location and the advertising campaign that brought you to the site.',
        ],
      },
      {
        heading: '2. How we use it',
        bullets: [
          'To create and secure your account.',
          'To process your order, print it, deliver it and keep you updated, including calling or messaging you on WhatsApp about your order.',
          'To verify payments and handle refunds.',
          'To prepare quotes for custom prints and print the files you send us.',
          'To answer your questions and support requests.',
          'To prevent fraud and abuse of the site.',
          'To understand which pages and campaigns work so we can improve the site and our advertising.',
          'To send you our newsletter, only if you subscribed. You can unsubscribe at any time.',
        ],
      },
      {
        heading: '3. Who can see your data',
        bullets: [
          'Our staff, who handle orders, payments and support.',
          'The store owner (maker) who fulfils your order. They see your name, phone number, delivery address, the items you ordered and your notes, only so they can make and deliver your order. Payment screenshots are visible to 3D Titans staff only.',
          'The delivery company or courier, who receives only what is needed to deliver your order (name, phone number and address).',
          'Payment processors: ShamCash for online ShamCash payments and Stripe for card payments, where offered. They process your payment under their own privacy policies.',
          'Service providers that run the site for us: hosting (Vercel), database and file storage (Supabase), email delivery (Resend) and the analytics tools listed above. They process data only on our instructions.',
          'Authorities, when the law requires it.',
        ],
        after: ['We do not sell your personal data.'],
      },
      {
        heading: '4. How long we keep it',
        bullets: [
          'Account details: for as long as your account is open. When you ask us to close your account, we delete or anonymise your details, except for what we must keep for orders.',
          'Orders and payment records: for as long as we need them for accounting, tax and legal reasons.',
          'Payment screenshots: stored privately and kept for up to 12 months after the order is completed, in case of a dispute, then deleted.',
          'Uploaded 3D files: kept for up to 6 months after your print is delivered, so we can reprint it if needed, then deleted. Ask us and we will delete them sooner.',
          'Newsletter email: until you unsubscribe.',
          'Analytics data: according to each analytics provider’s retention settings (for example up to 14 months for Google Analytics).',
        ],
      },
      {
        heading: '5. Cookies and local storage',
        paragraphs: [
          'We use a few cookies and similar storage that the site needs to work: your login session, your cart, your language choice (the "3dt-locale" cookie) and your light/dark theme. If you arrive from an ad, a "3dt_utm" cookie remembers the campaign for 30 days so we can tell which ads lead to orders.',
          'When analytics are enabled, Google Analytics and the Meta Pixel also set their own cookies. You can block or delete cookies in your browser settings; the shop will still work, but you may need to sign in again and your cart may be emptied.',
        ],
      },
      {
        heading: '6. How we protect it',
        paragraphs: [
          'The site uses HTTPS encryption. Passwords are stored only as secure hashes. Payment screenshots are kept in private storage that only authorised staff can open. Only people who need your data to handle your order can access it.',
        ],
      },
      {
        heading: '7. Your rights',
        paragraphs: [
          'You can see and update your details from your account at any time. You can also ask us to give you a copy of your data, correct it, delete it, delete your uploaded files or close your account, and you can unsubscribe from the newsletter. Contact us through the channels on our [Support page](/support); we reply within 30 days. We may keep records we are legally required to keep, such as completed orders.',
        ],
      },
      {
        heading: '8. Children',
        paragraphs: [
          '3D Titans is not intended for children under 13 and we do not knowingly collect their data. Customers under 18 should order with the permission of a parent or guardian.',
        ],
      },
      {
        heading: '9. Changes and contact',
        paragraphs: [
          'We may update this policy when our services change. The date at the top shows the latest version. For any privacy question, contact us through our [Support page](/support).',
        ],
      },
    ],
  },
  ar: {
    title: 'سياسة الخصوصية',
    description:
      'ما البيانات الشخصية التي تجمعها 3D Titans عند التسوق أو طلب طباعة مخصّصة، ولماذا نستخدمها، ومن يطّلع عليها، وكم نحتفظ بها.',
    intro:
      '‏3D Titans («نحن») استوديو ومتجر إلكتروني للطباعة ثلاثية الأبعاد مقرّه سوريا، ويدير موقع 3dtitans.org. توضّح هذه السياسة البيانات الشخصية التي نجمعها عند استخدامك للموقع أو تقديمك طلباً أو طلبك طباعة مخصّصة، وكيف نستخدمها، ومن يمكنه الاطلاع عليها، ومدة احتفاظنا بها، والخيارات المتاحة لك.',
    sections: [
      {
        heading: '١. البيانات التي نجمعها',
        bullets: [
          'بيانات الحساب: اسمك وبريدك الإلكتروني وكلمة المرور (تُخزَّن مشفّرة بطريقة آمنة ولا تُحفظ كنص عادي أبداً). وإذا سجّلت الدخول عبر Google نتلقى أيضاً اسمك وبريدك وصورة ملفك الشخصي في Google.',
          'بيانات الطلب: اسمك الكامل ورقم هاتفك وعنوان التوصيل والمدينة وملاحظات الطلب والمنتجات التي تشتريها وسجل طلباتك.',
          'بيانات الدفع: طريقة الدفع التي تختارها وحالتها. وإذا دفعت بتحويل يدوي (شام كاش أو سيريتل كاش أو حوالة بنكية) فلقطة شاشة الدفع التي ترفعها. وإذا دفعت عبر الدفع الإلكتروني في شام كاش فرقم العملية وحالتها كما يرسلها لنا شام كاش. لا نطّلع أبداً على بيانات دخولك إلى شام كاش أو رمز التحويل، ولا نرى أرقام البطاقات ولا نخزّنها.',
          'طلبات الطباعة المخصّصة: الملفات ثلاثية الأبعاد التي ترفعها (مثل ملفات STL) واسم النموذج وملاحظاتك ورقم الهاتف الذي تعطينا إياه لعرض السعر.',
          'الرسائل والتقييمات: ما ترسله لنا عبر نموذج التواصل أو واتساب أو الهاتف أو البريد الإلكتروني، والتقييمات التي تنشرها.',
          'النشرة البريدية: بريدك الإلكتروني إذا اشتركت فيها.',
          'البيانات التقنية والتحليلية: ملفات تعريف الارتباط (الكوكيز) ووسائل التخزين المشابهة التي تُبقيك مسجّلاً وتتذكر سلتك ولغتك ومظهر الموقع؛ وعند تفعيلها، أدوات التحليل (Google Analytics وMeta Pixel وVercel Analytics) التي تسجّل الصفحات التي تزورها ونوع جهازك ومتصفحك وموقعك التقريبي والحملة الإعلانية التي أوصلتك إلى الموقع.',
        ],
      },
      {
        heading: '٢. كيف نستخدمها',
        bullets: [
          'لإنشاء حسابك وحمايته.',
          'لمعالجة طلبك وطباعته وتوصيله وإبلاغك بمستجداته، بما في ذلك الاتصال بك أو مراسلتك عبر واتساب بخصوص طلبك.',
          'للتحقق من الدفعات ومعالجة المبالغ المستردة.',
          'لإعداد عروض أسعار الطباعة المخصّصة وطباعة الملفات التي ترسلها.',
          'للرد على أسئلتك وطلبات الدعم.',
          'لمنع الاحتيال وإساءة استخدام الموقع.',
          'لمعرفة الصفحات والحملات الناجحة كي نحسّن الموقع وإعلاناتنا.',
          'لإرسال نشرتنا البريدية إن كنت مشتركاً فقط، ويمكنك إلغاء الاشتراك في أي وقت.',
        ],
      },
      {
        heading: '٣. من يطّلع على بياناتك',
        bullets: [
          'فريق عملنا الذي يتولى الطلبات والدفعات والدعم.',
          'صاحب المتجر (الصانع) الذي ينفّذ طلبك؛ يرى اسمك ورقم هاتفك وعنوان التوصيل والمنتجات المطلوبة وملاحظاتك، وذلك فقط ليصنع طلبك ويوصله. أما لقطات شاشة الدفع فلا يطّلع عليها إلا فريق 3D Titans.',
          'شركة التوصيل أو المندوب، ويحصل فقط على ما يلزم لتوصيل طلبك (الاسم ورقم الهاتف والعنوان).',
          'مزوّدو خدمات الدفع: شام كاش للدفع الإلكتروني عبره، وStripe للدفع بالبطاقة حيث يتوفر، ويعالجون دفعتك وفق سياسات الخصوصية الخاصة بهم.',
          'مزوّدو الخدمات الذين يشغّلون الموقع لصالحنا: الاستضافة (Vercel)، وقاعدة البيانات وتخزين الملفات (Supabase)، وإرسال البريد الإلكتروني (Resend)، وأدوات التحليل المذكورة أعلاه، ولا يعالجون البيانات إلا وفق تعليماتنا.',
          'الجهات الرسمية عندما يفرض القانون ذلك.',
        ],
        after: ['نحن لا نبيع بياناتك الشخصية.'],
      },
      {
        heading: '٤. مدة الاحتفاظ بالبيانات',
        bullets: [
          'بيانات الحساب: ما دام حسابك مفتوحاً. وعندما تطلب إغلاق حسابك نحذف بياناتك أو نُخفي هويتها، باستثناء ما يلزمنا الاحتفاظ به من سجلات الطلبات.',
          'سجلات الطلبات والدفعات: طوال المدة التي نحتاجها لأغراض المحاسبة والضرائب والالتزامات القانونية.',
          'لقطات شاشة الدفع: تُحفظ بشكل خاص لمدة تصل إلى 12 شهراً بعد إتمام الطلب تحسّباً لأي خلاف، ثم تُحذف.',
          'الملفات ثلاثية الأبعاد المرفوعة: تُحفظ لمدة تصل إلى 6 أشهر بعد تسليم طلبك لنتمكن من إعادة طباعتها عند الحاجة، ثم تُحذف. ويمكنك أن تطلب منا حذفها قبل ذلك.',
          'بريد النشرة البريدية: حتى تلغي اشتراكك.',
          'بيانات التحليل: وفق إعدادات الاحتفاظ لدى كل مزوّد (مثلاً حتى 14 شهراً في Google Analytics).',
        ],
      },
      {
        heading: '٥. الكوكيز والتخزين المحلي',
        paragraphs: [
          'نستخدم عدداً قليلاً من الكوكيز ووسائل التخزين المشابهة التي يحتاجها الموقع ليعمل: جلسة تسجيل الدخول، وسلة التسوق، واختيار اللغة (ملف «3dt-locale»)، ومظهر الموقع الفاتح أو الداكن. وإذا وصلت عبر إعلان، يتذكر ملف «3dt_utm» الحملة لمدة 30 يوماً لنعرف أي الإعلانات تؤدي إلى طلبات.',
          'عند تفعيل أدوات التحليل، تضع Google Analytics وMeta Pixel كوكيز خاصة بها أيضاً. يمكنك حظر الكوكيز أو حذفها من إعدادات متصفحك؛ وسيبقى المتجر يعمل، لكن قد تحتاج إلى تسجيل الدخول مجدداً وقد تُفرَّغ سلتك.',
        ],
      },
      {
        heading: '٦. كيف نحمي بياناتك',
        paragraphs: [
          'يستخدم الموقع تشفير HTTPS، وتُخزَّن كلمات المرور مشفّرة بطريقة آمنة فقط، وتُحفظ لقطات شاشة الدفع في مساحة تخزين خاصة لا يفتحها إلا الموظفون المخوّلون، ولا يصل إلى بياناتك إلا من يحتاجها لمعالجة طلبك.',
        ],
      },
      {
        heading: '٧. حقوقك',
        paragraphs: [
          'يمكنك الاطلاع على بياناتك وتحديثها من حسابك في أي وقت. ويمكنك أيضاً أن تطلب منا نسخة من بياناتك، أو تصحيحها، أو حذفها، أو حذف ملفاتك المرفوعة، أو إغلاق حسابك، كما يمكنك إلغاء الاشتراك في النشرة البريدية. تواصل معنا عبر القنوات الموجودة في [صفحة الدعم](/support)، وسنرد خلال 30 يوماً. قد نحتفظ بالسجلات التي يُلزمنا القانون بحفظها، مثل الطلبات المكتملة.',
        ],
      },
      {
        heading: '٨. الأطفال',
        paragraphs: [
          'موقع 3D Titans غير موجّه للأطفال دون 13 عاماً، ولا نجمع بياناتهم عن قصد. وعلى العملاء دون 18 عاماً تقديم الطلبات بإذن أحد الوالدين أو الوصي.',
        ],
      },
      {
        heading: '٩. التعديلات والتواصل',
        paragraphs: [
          'قد نحدّث هذه السياسة عند تغيّر خدماتنا، ويوضّح التاريخ في أعلى الصفحة آخر إصدار. لأي سؤال يتعلق بالخصوصية، تواصل معنا عبر [صفحة الدعم](/support).',
        ],
      },
    ],
  },
};

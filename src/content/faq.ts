// DRAFT — must be reviewed and approved by 3D Titans before launch
import type { Locale } from '@/lib/i18n';
import type { FaqDoc } from './types';

export const faqContent: Record<Locale, FaqDoc> = {
  en: {
    title: 'Frequently Asked Questions',
    description:
      'How ordering works at 3D Titans, payment by cash on delivery or ShamCash, delivery across Syria, custom 3D print requests, file formats and timelines.',
    groups: [
      {
        heading: 'Ordering',
        items: [
          {
            q: 'How do I place an order?',
            a: 'Browse the [products](/products), add what you like to your cart and open the cart to check out. Sign in (or create a free account), enter your delivery details, choose a payment method and place the order. You get an order reference such as 3DT-AB12CD34 and can follow the order under "My orders".',
          },
          {
            q: 'Do I need an account?',
            a: 'Yes. A free account lets us send you order updates and lets you follow your orders and saved addresses. It takes less than a minute.',
          },
          {
            q: 'Can I change or cancel my order?',
            a: 'Yes, as long as printing has not started. Ask to cancel from "My orders" or message us on WhatsApp with your order reference. Once printing has started, a made-to-order item cannot normally be cancelled.',
          },
        ],
      },
      {
        heading: 'Payment',
        items: [
          {
            q: 'Which payment methods do you accept?',
            a: 'Cash on delivery and ShamCash online payment. Depending on what is enabled, you may also see manual transfer by ShamCash, Syriatel Cash or bank transfer (you upload a screenshot of the transfer). The methods available to you are shown at checkout.',
          },
          {
            q: 'How does ShamCash online payment work?',
            a: 'After you place your order, tap "Pay with ShamCash". The ShamCash app or website opens and you confirm the payment with your transfer code. Our page updates on its own as soon as ShamCash confirms it. The payment link is valid for 10 minutes; if it expires, no money is taken and you can try again.',
          },
          {
            q: 'What currency are the prices in?',
            a: 'Prices are in US dollars (USD), exactly as shown on the product page and at checkout. The delivery fee is confirmed with you separately before we ship.',
          },
          {
            q: 'Is my payment screenshot safe?',
            a: 'Yes. Payment screenshots are stored privately and only our staff can see them, to verify your payment. See our [Privacy Policy](/privacy).',
          },
        ],
      },
      {
        heading: 'Delivery',
        items: [
          {
            q: 'Where do you deliver?',
            a: 'Across Syria. After you order, we confirm your address, the delivery fee and the expected delivery date with you by phone or WhatsApp. See [Shipping & delivery](/shipping).',
          },
          {
            q: 'How long will my order take?',
            a: 'Most small items are printed and packed within 2–5 working days, then handed to the courier. Large, multi-part or custom prints take longer. We give you an estimate when we confirm the order.',
          },
          {
            q: 'How much is delivery?',
            a: 'It depends on your governorate and the size of the order. We tell you the fee before we ship, and you only pay it once you have agreed to it.',
          },
        ],
      },
      {
        heading: 'Custom prints',
        items: [
          {
            q: 'Can you print my own model?',
            a: 'Yes. Go to [Custom Print](/upload), upload your 3D file and add notes such as size, colour and quantity. We reply with a price and an estimated time, and we only start printing after you accept the quote.',
          },
          {
            q: 'Which file formats do you accept?',
            a: 'STL files. Most 3D tools (Blender, Fusion 360, Tinkercad, SketchUp and others) can export STL. If your model is in another format such as OBJ, 3MF or STEP, export it as STL or message us on WhatsApp.',
          },
          {
            q: 'I have an idea but no 3D file. Can you help?',
            a: 'Send us a photo or a sketch with the size you need on WhatsApp and we will tell you whether we can help.',
          },
          {
            q: 'How long does a custom print take?',
            a: 'It depends on the size and detail of the model. Small parts are usually ready within 2–5 working days after you accept the quote; we tell you the exact estimate in the quote.',
          },
          {
            q: 'Can I choose the colour?',
            a: 'Yes. Write the colour you want in the notes and we will confirm what is available when we send the quote.',
          },
        ],
      },
      {
        heading: 'Returns & help',
        items: [
          {
            q: 'Can I return an item?',
            a: 'Products are printed to order, so we cannot take them back for a change of mind. If an item arrives defective, damaged or wrong, report it within 48 hours with photos and we will reprint, replace or refund it. See [Returns & refunds](/returns).',
          },
          {
            q: 'How can I contact you?',
            a: 'WhatsApp is the fastest. You can also call, email or use the contact form. All channels and our working hours are on the [Support page](/support).',
          },
        ],
      },
    ],
  },
  ar: {
    title: 'الأسئلة الشائعة',
    description:
      'كيف تطلب من 3D Titans، والدفع عند الاستلام أو عبر شام كاش، والتوصيل في سوريا، وطلبات الطباعة المخصّصة، وصيغ الملفات والمدد.',
    groups: [
      {
        heading: 'الطلب',
        items: [
          {
            q: 'كيف أقدّم طلباً؟',
            a: 'تصفّح [المنتجات](/products)، وأضف ما يعجبك إلى السلة، ثم افتح السلة لإتمام الشراء. سجّل الدخول (أو أنشئ حساباً مجانياً)، وأدخل بيانات التوصيل، واختر طريقة الدفع، ثم أكّد الطلب. ستحصل على رقم مرجعي للطلب مثل 3DT-AB12CD34، ويمكنك متابعته من «طلباتي».',
          },
          {
            q: 'هل أحتاج إلى حساب؟',
            a: 'نعم. يتيح لنا الحساب المجاني إرسال تحديثات طلبك، ويتيح لك متابعة طلباتك وعناوينك المحفوظة. إنشاؤه يستغرق أقل من دقيقة.',
          },
          {
            q: 'هل يمكنني تعديل طلبي أو إلغاؤه؟',
            a: 'نعم، ما دامت الطباعة لم تبدأ. اطلب الإلغاء من «طلباتي» أو راسلنا عبر واتساب مع رقم الطلب المرجعي. وبعد بدء الطباعة لا يمكن عادةً إلغاء المنتجات المصنوعة حسب الطلب.',
          },
        ],
      },
      {
        heading: 'الدفع',
        items: [
          {
            q: 'ما طرق الدفع المتاحة؟',
            a: 'الدفع نقداً عند الاستلام، والدفع الإلكتروني عبر شام كاش. وقد ترى أيضاً، بحسب المتاح، التحويل اليدوي عبر شام كاش أو سيريتل كاش أو الحوالة البنكية (ترفع فيها لقطة شاشة للتحويل). تظهر لك الطرق المتاحة عند إتمام الشراء.',
          },
          {
            q: 'كيف يعمل الدفع الإلكتروني عبر شام كاش؟',
            a: 'بعد تقديم طلبك اضغط زر «ادفع عبر شام كاش»، فيُفتح تطبيق شام كاش أو موقعه وتؤكد الدفع برمز التحويل الخاص بك. تتحدّث صفحتنا تلقائياً فور تأكيد شام كاش للدفع. رابط الدفع صالح لمدة 10 دقائق، وإذا انتهت صلاحيته فلن يُخصم أي مبلغ ويمكنك المحاولة مجدداً.',
          },
          {
            q: 'ما عملة الأسعار؟',
            a: 'الأسعار بالدولار الأمريكي (USD) كما تظهر تماماً في صفحة المنتج وعند إتمام الشراء. ونؤكد معك رسوم التوصيل بشكل منفصل قبل الشحن.',
          },
          {
            q: 'هل لقطة شاشة الدفع آمنة؟',
            a: 'نعم. تُحفظ لقطات شاشة الدفع بشكل خاص، ولا يطّلع عليها إلا فريقنا للتحقق من دفعتك. اطّلع على [سياسة الخصوصية](/privacy).',
          },
        ],
      },
      {
        heading: 'التوصيل',
        items: [
          {
            q: 'إلى أين توصلون؟',
            a: 'إلى مختلف المحافظات السورية. بعد طلبك نؤكد معك العنوان ورسوم التوصيل وموعد التسليم المتوقع عبر الهاتف أو واتساب. اطّلع على [الشحن والتوصيل](/shipping).',
          },
          {
            q: 'كم يستغرق طلبي؟',
            a: 'تُطبع أغلب القطع الصغيرة وتُغلَّف خلال 2–5 أيام عمل، ثم تُسلَّم لمندوب التوصيل. وتحتاج القطع الكبيرة أو متعددة الأجزاء أو المخصّصة وقتاً أطول. نعطيك مدة تقديرية عند تأكيد الطلب.',
          },
          {
            q: 'كم تبلغ رسوم التوصيل؟',
            a: 'تعتمد على محافظتك وحجم الطلب. نخبرك بالرسوم قبل الشحن، ولا تدفعها إلا بعد موافقتك عليها.',
          },
        ],
      },
      {
        heading: 'الطباعة المخصّصة',
        items: [
          {
            q: 'هل يمكنكم طباعة نموذجي الخاص؟',
            a: 'نعم. ادخل إلى [الطباعة المخصّصة](/upload)، وارفع ملفك ثلاثي الأبعاد، وأضف ملاحظات مثل المقاس واللون والكمية. نرد عليك بالسعر والمدة التقديرية، ولا نبدأ الطباعة إلا بعد موافقتك على العرض.',
          },
          {
            q: 'ما صيغ الملفات التي تقبلونها؟',
            a: 'ملفات STL. معظم برامج التصميم ثلاثي الأبعاد (مثل Blender وFusion 360 وTinkercad وSketchUp) تستطيع التصدير بصيغة STL. وإذا كان نموذجك بصيغة أخرى مثل OBJ أو 3MF أو STEP، فصدّره بصيغة STL أو راسلنا عبر واتساب.',
          },
          {
            q: 'لدي فكرة لكن لا أملك ملفاً ثلاثي الأبعاد، هل تساعدونني؟',
            a: 'أرسل لنا عبر واتساب صورة أو رسماً مع المقاس الذي تحتاجه، وسنخبرك إن كنا نستطيع المساعدة.',
          },
          {
            q: 'كم تستغرق الطباعة المخصّصة؟',
            a: 'يعتمد ذلك على حجم النموذج ودقة تفاصيله. تجهز القطع الصغيرة عادةً خلال 2–5 أيام عمل بعد موافقتك على عرض السعر، ونذكر لك المدة الدقيقة في العرض.',
          },
          {
            q: 'هل يمكنني اختيار اللون؟',
            a: 'نعم. اكتب اللون الذي تريده في الملاحظات، وسنؤكد لك الألوان المتاحة عند إرسال عرض السعر.',
          },
        ],
      },
      {
        heading: 'الإرجاع والمساعدة',
        items: [
          {
            q: 'هل يمكنني إرجاع منتج؟',
            a: 'تُطبع المنتجات حسب الطلب، لذا لا يمكننا استرجاعها لمجرد تغيير الرأي. أما إذا وصلك منتج معيب أو متضرر أو خاطئ، فأبلغنا خلال 48 ساعة مع صور، وسنعيد طباعته أو نستبدله أو نعيد ثمنه. اطّلع على [الإرجاع والاسترداد](/returns).',
          },
          {
            q: 'كيف أتواصل معكم؟',
            a: 'واتساب هو الأسرع، ويمكنك أيضاً الاتصال أو مراسلتنا بالبريد الإلكتروني أو عبر نموذج التواصل. تجد جميع القنوات وأوقات عملنا في [صفحة الدعم](/support).',
          },
        ],
      },
    ],
  },
};

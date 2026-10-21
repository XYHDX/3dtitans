// DRAFT — must be reviewed and approved by 3D Titans before launch
import type { Locale } from '@/lib/i18n';
import type { ContentDoc } from './types';

/** ISO date shown as "Last updated". Change it whenever the text changes. */
export const SHIPPING_UPDATED = '2026-10-20';

export const shippingContent: Record<Locale, ContentDoc> = {
  en: {
    title: 'Shipping & Delivery',
    description:
      'How 3D Titans delivers across Syria: preparation times, delivery fees confirmed by phone or WhatsApp, and the rules for cash on delivery.',
    intro:
      'We print your order, pack it and deliver it to you across Syria. Here is how it works, what it costs and what to expect when you pay cash on delivery.',
    sections: [
      {
        heading: 'Where we deliver',
        paragraphs: [
          'We deliver to the Syrian governorates. If your area is hard for our couriers to reach, we will tell you when we confirm the order and agree on another option with you, or cancel the order with a full refund. At the moment we only deliver inside Syria.',
        ],
      },
      {
        heading: 'Preparation time',
        paragraphs: [
          'Most products are printed after you order. Small items are usually printed, checked and packed within 2–5 working days; large, multi-part or custom prints take longer. We give you an estimate when we confirm your order, and you can follow its status under "My orders".',
        ],
      },
      {
        heading: 'Delivery fee and time',
        paragraphs: [
          'The delivery fee and time depend on your governorate and the size of the order. After you place your order, we call you or message you on WhatsApp to confirm your address, the delivery fee and the expected delivery date before we ship. If the fee is not shown in your checkout total, it is added only after you agree to it.',
        ],
      },
      {
        heading: 'Before delivery',
        bullets: [
          'Make sure your phone number is correct and reachable; the courier will call you to arrange the handover.',
          'Write clear directions (area, street, nearby landmark) in the address or the order notes.',
          'If we cannot reach you after several attempts, we may hold or cancel the order.',
        ],
      },
      {
        heading: 'Cash on delivery',
        bullets: [
          'Pay the courier in cash when you receive the order: the order total plus the delivery fee we confirmed with you. The amount to pay, and the currency you can pay in, is confirmed with you when we confirm the order.',
          'Please have the exact amount ready if you can.',
          'You may check that the package is intact before paying. If it is visibly damaged, tell the courier and contact us straight away.',
          'Please only order with cash on delivery if you intend to accept the order. If a cash-on-delivery order is refused without a valid reason (for example, the item matches your order and is undamaged), we may ask you to pay in advance for future orders.',
        ],
      },
      {
        heading: 'When your order arrives',
        paragraphs: [
          'Check your order as soon as you receive it. If anything is damaged in transit, missing or wrong, report it within 48 hours with photos of the item and the packaging, as explained in our [Returns & refunds policy](/returns).',
        ],
      },
      {
        heading: 'Questions',
        paragraphs: [
          'Message us on WhatsApp or use the other channels on our [Support page](/support), and include your order reference (for example 3DT-AB12CD34).',
        ],
      },
    ],
  },
  ar: {
    title: 'الشحن والتوصيل',
    description:
      'كيف توصل 3D Titans طلباتك في سوريا: مدة التجهيز، ورسوم التوصيل التي نؤكدها عبر الهاتف أو واتساب، وقواعد الدفع عند الاستلام.',
    intro:
      'نطبع طلبك ونغلّفه ونوصله إليك في مختلف المحافظات السورية. إليك كيف تتم العملية، وما تكلفتها، وما الذي تتوقعه عند الدفع نقداً عند الاستلام.',
    sections: [
      {
        heading: 'مناطق التوصيل',
        paragraphs: [
          'نوصل إلى المحافظات السورية. وإذا كانت منطقتك صعبة الوصول على مندوبينا، نخبرك بذلك عند تأكيد الطلب ونتفق معك على بديل آخر، أو نلغي الطلب ونعيد إليك كامل المبلغ. حالياً نوصل داخل سوريا فقط.',
        ],
      },
      {
        heading: 'مدة التجهيز',
        paragraphs: [
          'تُطبع أغلب المنتجات بعد طلبها. تُطبع القطع الصغيرة عادةً وتُفحص وتُغلَّف خلال 2–5 أيام عمل، بينما تحتاج القطع الكبيرة أو متعددة الأجزاء أو الطباعة المخصّصة وقتاً أطول. نعطيك مدة تقديرية عند تأكيد طلبك، ويمكنك متابعة حالته من «طلباتي».',
        ],
      },
      {
        heading: 'رسوم التوصيل ومدته',
        paragraphs: [
          'تعتمد رسوم التوصيل ومدته على محافظتك وحجم الطلب. بعد تقديم طلبك نتصل بك أو نراسلك عبر واتساب لتأكيد عنوانك ورسوم التوصيل وموعد التسليم المتوقع قبل الشحن. وإذا لم تظهر الرسوم في إجمالي طلبك، فلا تُضاف إلا بعد موافقتك عليها.',
        ],
      },
      {
        heading: 'قبل التوصيل',
        bullets: [
          'تأكد من صحة رقم هاتفك وأنه متاح، فالمندوب سيتصل بك لترتيب التسليم.',
          'اكتب وصفاً واضحاً للعنوان (المنطقة، الشارع، أقرب معلم) في حقل العنوان أو في ملاحظات الطلب.',
          'إذا تعذّر الوصول إليك بعد عدة محاولات، قد نؤجل الطلب أو نلغيه.',
        ],
      },
      {
        heading: 'الدفع عند الاستلام',
        bullets: [
          'ادفع للمندوب نقداً عند استلام الطلب: إجمالي الطلب مضافاً إليه رسوم التوصيل التي أكدناها معك. نؤكد معك المبلغ المطلوب والعملة التي يمكنك الدفع بها عند تأكيد الطلب.',
          'يُفضّل تجهيز المبلغ المطلوب تماماً إن أمكن.',
          'يمكنك التأكد من سلامة الطرد قبل الدفع، وإذا كان متضرراً بشكل واضح فأخبر المندوب وتواصل معنا فوراً.',
          'يرجى اختيار الدفع عند الاستلام فقط إذا كنت تنوي استلام الطلب. وإذا رُفض طلب مدفوع عند الاستلام دون سبب مقبول (مثلاً كان المنتج مطابقاً لطلبك وسليماً)، فقد نطلب منك الدفع المسبق في الطلبات القادمة.',
        ],
      },
      {
        heading: 'عند وصول طلبك',
        paragraphs: [
          'افحص طلبك فور استلامه. وإذا تضرر شيء أثناء النقل أو كان ناقصاً أو خاطئاً، فأبلغنا خلال 48 ساعة مع صور للمنتج والتغليف، كما توضح [سياسة الإرجاع والاسترداد](/returns).',
        ],
      },
      {
        heading: 'أسئلة؟',
        paragraphs: [
          'راسلنا عبر واتساب أو استخدم القنوات الأخرى في [صفحة الدعم](/support)، واذكر رقم طلبك المرجعي (مثل 3DT-AB12CD34).',
        ],
      },
    ],
  },
};

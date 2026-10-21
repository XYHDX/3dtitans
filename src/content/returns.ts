// DRAFT — must be reviewed and approved by 3D Titans before launch
import type { Locale } from '@/lib/i18n';
import type { ContentDoc } from './types';

/** ISO date shown as "Last updated". Change it whenever the text changes. */
export const RETURNS_UPDATED = '2026-10-20';

export const returnsContent: Record<Locale, ContentDoc> = {
  en: {
    title: 'Returns & Refunds',
    description:
      'Custom 3D prints are made to order. What to do if an item arrives defective or damaged (report within 48 hours with photos) and how refunds work, including ShamCash.',
    intro:
      'Every 3D Titans product is printed for you after you order it. That is why we cannot take items back because you changed your mind, but we will always put it right if something is wrong with your order.',
    sections: [
      {
        heading: 'What we cannot return',
        bullets: [
          'Items you no longer want, or ordered in the wrong size or colour.',
          'Custom prints made from a file you sent us, when they match the approved file and quote.',
          'Normal features of 3D printing: fine layer lines, small colour differences and small size differences.',
        ],
      },
      {
        heading: 'When we will fix it',
        bullets: [
          'The item is defective (for example a failed print, a broken or missing part).',
          'The item was damaged in transit.',
          'You received the wrong item, or it is clearly different from the product page or the approved quote.',
        ],
      },
      {
        heading: 'How to report a problem (within 48 hours)',
        bullets: [
          'Contact us within 48 hours of receiving your order, by WhatsApp or through our [Support page](/support).',
          'Send your order reference (for example 3DT-AB12CD34) and clear photos of the item and of the packaging.',
          'Keep the item and the packaging until we have reviewed your report.',
        ],
        after: [
          'We may ask you to send the item back; if the problem is our fault, we cover the delivery cost.',
        ],
      },
      {
        heading: 'What happens next',
        paragraphs: [
          'Once we confirm the problem, we reprint or replace the item at no cost to you. If that is not possible, or you prefer, we refund the item (in full, or in part for a partly damaged order). When the problem is our fault, we also refund the delivery fee.',
        ],
      },
      {
        heading: 'Cancellations',
        paragraphs: [
          'You can cancel for a full refund before printing starts, from "My orders" or by contacting us. Once printing has started an order cannot normally be cancelled.',
        ],
      },
      {
        heading: 'How refunds are paid',
        bullets: [
          'ShamCash (online or manual transfer): refunded to the ShamCash account you paid from.',
          'Syriatel Cash or bank transfer: refunded to the same wallet or account, or another method we agree with you.',
          'Card (Stripe): refunded to the card you paid with.',
          'Cash on delivery: refunded by ShamCash transfer or another method we agree with you.',
        ],
        after: [
          'We send the refund within 3 working days of approving it. How long it then takes to reach you depends on the payment provider.',
        ],
      },
      {
        heading: 'Refused cash-on-delivery orders',
        paragraphs: [
          'If you refuse a cash-on-delivery order that matches what you ordered and is undamaged, see the rules in our [Shipping & delivery policy](/shipping).',
        ],
      },
    ],
  },
  ar: {
    title: 'الإرجاع والاسترداد',
    description:
      'منتجات الطباعة المخصّصة تُصنع حسب الطلب. ماذا تفعل إذا وصلك منتج معيب أو متضرر (أبلغنا خلال 48 ساعة مع صور) وكيف يتم استرداد المبالغ، بما في ذلك عبر شام كاش.',
    intro:
      'كل منتج من 3D Titans يُطبع خصيصاً لك بعد طلبه، ولهذا لا يمكننا استرجاع المنتجات لمجرد تغيير رأيك، لكننا سنصلح الأمر دائماً إذا كان هناك خطأ في طلبك.',
    sections: [
      {
        heading: 'ما لا يمكن إرجاعه',
        bullets: [
          'المنتجات التي لم تعد ترغب بها، أو التي طلبتها بمقاس أو لون خاطئ.',
          'الطباعة المخصّصة المصنوعة من ملف أرسلته لنا، إذا كانت مطابقة للملف وعرض السعر الذي وافقت عليه.',
          'السمات الطبيعية للطباعة ثلاثية الأبعاد: خطوط الطبقات الدقيقة، والفروق البسيطة في اللون أو المقاس.',
        ],
      },
      {
        heading: 'متى نصلح المشكلة',
        bullets: [
          'إذا كان المنتج معيباً (مثلاً طباعة فاشلة، أو قطعة مكسورة أو ناقصة).',
          'إذا تضرر المنتج أثناء النقل.',
          'إذا استلمت منتجاً خاطئاً، أو مختلفاً بوضوح عن صفحة المنتج أو عن عرض السعر الذي وافقت عليه.',
        ],
      },
      {
        heading: 'كيف تبلّغ عن مشكلة (خلال 48 ساعة)',
        bullets: [
          'تواصل معنا خلال 48 ساعة من استلام طلبك، عبر واتساب أو من خلال [صفحة الدعم](/support).',
          'أرسل رقم طلبك المرجعي (مثل 3DT-AB12CD34) وصوراً واضحة للمنتج وللتغليف.',
          'احتفظ بالمنتج والتغليف حتى ننتهي من مراجعة بلاغك.',
        ],
        after: [
          'قد نطلب منك إعادة المنتج إلينا، وإذا كانت المشكلة من جهتنا فنحن نتحمل تكلفة التوصيل.',
        ],
      },
      {
        heading: 'ماذا يحدث بعد ذلك',
        paragraphs: [
          'بعد تأكدنا من المشكلة، نعيد طباعة المنتج أو نستبدله دون أي تكلفة عليك. وإذا تعذّر ذلك أو فضّلت الاسترداد، نعيد إليك ثمن المنتج (كاملاً، أو جزئياً إذا تضرر جزء من الطلب). وعندما تكون المشكلة من جهتنا، نعيد إليك رسوم التوصيل أيضاً.',
        ],
      },
      {
        heading: 'الإلغاء',
        paragraphs: [
          'يمكنك إلغاء الطلب واسترداد كامل المبلغ قبل بدء الطباعة، من «طلباتي» أو بالتواصل معنا. وبعد بدء الطباعة لا يمكن عادةً إلغاء الطلب.',
        ],
      },
      {
        heading: 'طريقة استرداد المبالغ',
        bullets: [
          'شام كاش (دفع إلكتروني أو تحويل يدوي): يُعاد المبلغ إلى حساب شام كاش الذي دفعت منه.',
          'سيريتل كاش أو الحوالة البنكية: يُعاد المبلغ إلى المحفظة أو الحساب نفسه، أو بطريقة أخرى نتفق عليها معك.',
          'البطاقة (Stripe): يُعاد المبلغ إلى البطاقة التي دفعت بها.',
          'الدفع عند الاستلام: يُعاد المبلغ بتحويل عبر شام كاش أو بطريقة أخرى نتفق عليها معك.',
        ],
        after: [
          'نرسل المبلغ المسترد خلال 3 أيام عمل من الموافقة عليه، وتعتمد مدة وصوله إليك بعد ذلك على مزوّد خدمة الدفع.',
        ],
      },
      {
        heading: 'رفض الطلبات المدفوعة عند الاستلام',
        paragraphs: [
          'إذا رفضت استلام طلب مدفوع عند الاستلام وكان مطابقاً لما طلبته وسليماً، فاطّلع على القواعد في [سياسة الشحن والتوصيل](/shipping).',
        ],
      },
    ],
  },
};

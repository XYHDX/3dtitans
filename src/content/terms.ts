// DRAFT — must be reviewed and approved by 3D Titans before launch
import type { Locale } from '@/lib/i18n';
import type { ContentDoc } from './types';

/** ISO date shown as "Last updated". Change it whenever the text changes. */
export const TERMS_UPDATED = '2026-10-20';

export const termsContent: Record<Locale, ContentDoc> = {
  en: {
    title: 'Terms of Service',
    description:
      'The terms for buying 3D-printed products and ordering custom prints from 3D Titans: accounts, prices in USD, payment methods, cancellations and Syrian law.',
    intro:
      'These terms apply when you use 3dtitans.org, create an account, buy a product or ask us to print your own model. The site is run by 3D Titans in Syria. By creating an account or placing an order you agree to these terms, so please read them together with our [Shipping & delivery](/shipping), [Returns & refunds](/returns) and [Privacy](/privacy) policies.',
    sections: [
      {
        heading: '1. Accounts',
        bullets: [
          'You need a free account to place an order. Give us accurate details, especially your name, phone number and delivery address.',
          'Keep your password private. You are responsible for what happens on your account.',
          'Store owner accounts are for selling and cannot be used to place orders.',
          'We may suspend or close accounts that break these terms or are used for fraud.',
        ],
      },
      {
        heading: '2. The shop and maker stores',
        paragraphs: [
          'Products on 3D Titans are made by our own studio and by independent maker stores listed on the site. 3D Titans takes your order and payment and coordinates printing and delivery with the store that makes your item. Each store is responsible for the accuracy of its listings and the quality of what it makes; we may remove listings or stores that break these terms.',
          'Product photos show the actual product or a close sample. Because every item is printed, colours and small details may differ slightly from the photos.',
        ],
      },
      {
        heading: '3. Prices',
        bullets: [
          'Prices are in US dollars (USD) and are the prices shown on the product page and at checkout when you place the order.',
          'The delivery fee depends on your governorate and is not included in the checkout total unless it is shown there. We confirm it with you by phone or WhatsApp before we ship.',
          'If a price is clearly wrong because of a mistake, we will contact you before processing the order; you can then accept the correct price or cancel for a full refund.',
        ],
      },
      {
        heading: '4. Orders',
        paragraphs: [
          'When you place an order you send us an offer to buy. The order is confirmed when we accept it, and you can follow its status under "My orders". We may decline or cancel an order, for example if an item cannot be printed, if we cannot reach you on the phone number you gave, or if payment is not received; any amount you paid is then refunded in full.',
        ],
      },
      {
        heading: '5. Payment',
        bullets: [
          'Cash on delivery: you pay the courier in cash when the order arrives. See our [Shipping & delivery policy](/shipping) for the rules.',
          'ShamCash online payment: you confirm the payment in the ShamCash app or website with your transfer code, and the order is marked as paid automatically.',
          'Manual transfer (ShamCash, Syriatel Cash or bank transfer, where offered): you send the amount with your order reference and upload a screenshot; we verify it before we process the order.',
          'Card payment through Stripe, where offered.',
        ],
        after: [
          'The methods available to you are shown at checkout. Orders paid by transfer are processed once the payment is verified. Orders that stay unpaid may be cancelled.',
        ],
      },
      {
        heading: '6. Custom print orders',
        bullets: [
          'When you upload your own 3D model we review it and send you a quote (price and estimated time). Printing starts only after you accept the quote.',
          'You confirm that you own the model or have the right to have it printed, and that it does not infringe anyone else’s rights.',
          'We do not print weapons or weapon parts, illegal items or offensive content, and we may refuse any model without giving a reason.',
          'You keep all rights to your files. You allow us and the maker printing your order to store, view and print them only to complete your request.',
        ],
      },
      {
        heading: '7. Printed products',
        paragraphs: [
          '3D-printed items can show fine layer lines and small differences in colour or size; these are normal features of the process, not defects. If an item arrives defective, damaged or different from what you ordered, follow our [Returns & refunds policy](/returns).',
        ],
      },
      {
        heading: '8. Cancellations',
        paragraphs: [
          'You can ask to cancel an order from "My orders" or by contacting us before printing starts, and you will get a full refund of anything you paid. Because products are made to order, an order cannot normally be cancelled once printing has started.',
        ],
      },
      {
        heading: '9. Delivery, returns and refunds',
        paragraphs: [
          'Delivery is covered by our [Shipping & delivery policy](/shipping), and returns and refunds by our [Returns & refunds policy](/returns). Both are part of these terms.',
        ],
      },
      {
        heading: '10. Intellectual property',
        paragraphs: [
          'The 3D Titans name, logo and site content belong to 3D Titans. Product designs belong to their makers. You may not copy, resell or reproduce designs or content from the site without permission.',
        ],
      },
      {
        heading: '11. Acceptable use',
        paragraphs: [
          'Do not use the site for fraud, to upload harmful files, to post misleading or abusive reviews, or to interfere with the site or other customers.',
        ],
      },
      {
        heading: '12. Liability',
        paragraphs: [
          'We work hard to keep the site available and our products well made. To the extent allowed by law, our liability for an order is limited to the amount you paid for it, and we are not liable for indirect losses. Nothing in these terms limits rights you have under applicable consumer protection law.',
        ],
      },
      {
        heading: '13. Governing law and disputes',
        paragraphs: [
          'These terms are governed by the laws of the Syrian Arab Republic. If something goes wrong, please contact us first and we will try to solve it quickly and fairly. If we cannot agree, the competent courts of the Syrian Arab Republic have jurisdiction.',
        ],
      },
      {
        heading: '14. Changes and contact',
        paragraphs: [
          'We may update these terms; the date at the top shows the latest version, and the terms in force when you placed an order apply to that order. Questions? Contact us through our [Support page](/support).',
        ],
      },
    ],
  },
  ar: {
    title: 'شروط الاستخدام',
    description:
      'شروط شراء المنتجات المطبوعة ثلاثياً وطلب الطباعة المخصّصة من 3D Titans: الحسابات، والأسعار بالدولار، وطرق الدفع، والإلغاء، والقانون السوري.',
    intro:
      'تنطبق هذه الشروط عند استخدامك لموقع 3dtitans.org أو إنشائك حساباً أو شرائك منتجاً أو طلبك طباعة نموذجك الخاص. يدير الموقعَ فريق 3D Titans في سوريا. بإنشائك حساباً أو تقديمك طلباً فإنك توافق على هذه الشروط، لذا يرجى قراءتها مع [سياسة الشحن والتوصيل](/shipping) و[سياسة الإرجاع والاسترداد](/returns) و[سياسة الخصوصية](/privacy).',
    sections: [
      {
        heading: '١. الحسابات',
        bullets: [
          'تحتاج إلى حساب مجاني لتقديم الطلبات. قدّم لنا بيانات صحيحة، خاصة اسمك ورقم هاتفك وعنوان التوصيل.',
          'حافظ على سرية كلمة المرور، فأنت مسؤول عما يجري عبر حسابك.',
          'حسابات أصحاب المتاجر مخصّصة للبيع ولا يمكن استخدامها لتقديم الطلبات.',
          'يحق لنا إيقاف الحسابات التي تخالف هذه الشروط أو تُستخدم للاحتيال أو إغلاقها.',
        ],
      },
      {
        heading: '٢. المتجر ومتاجر الصنّاع',
        paragraphs: [
          'المنتجات على 3D Titans يصنعها الاستوديو الخاص بنا ومتاجر صنّاع مستقلين معروضة على الموقع. تستلم 3D Titans طلبك ودفعتك وتنسّق الطباعة والتوصيل مع المتجر الذي يصنع منتجك. كل متجر مسؤول عن دقة منتجاته المعروضة وجودة ما يصنعه، ويحق لنا إزالة المنتجات أو المتاجر التي تخالف هذه الشروط.',
          'تُظهر صور المنتجات المنتج الفعلي أو عينة قريبة منه. ولأن كل قطعة تُطبع طباعةً، قد تختلف الألوان والتفاصيل الصغيرة قليلاً عن الصور.',
        ],
      },
      {
        heading: '٣. الأسعار',
        bullets: [
          'الأسعار بالدولار الأمريكي (USD)، وهي الأسعار المعروضة في صفحة المنتج وعند إتمام الشراء لحظة تقديم الطلب.',
          'تعتمد رسوم التوصيل على محافظتك، ولا تدخل في إجمالي الطلب إلا إذا ظهرت فيه. نؤكدها معك عبر الهاتف أو واتساب قبل الشحن.',
          'إذا كان السعر خاطئاً بشكل واضح بسبب خطأ ما، فسنتواصل معك قبل معالجة الطلب، ويمكنك حينها قبول السعر الصحيح أو الإلغاء واسترداد كامل المبلغ.',
        ],
      },
      {
        heading: '٤. الطلبات',
        paragraphs: [
          'عندما تقدّم طلباً فأنت ترسل لنا عرضاً للشراء، ويتأكد الطلب عندما نقبله، ويمكنك متابعة حالته من «طلباتي». قد نرفض طلباً أو نلغيه، مثلاً إذا تعذّرت طباعة منتج، أو لم نتمكن من الوصول إليك على رقم الهاتف الذي قدّمته، أو لم يصلنا الدفع؛ وفي هذه الحالة نعيد إليك كامل ما دفعته.',
        ],
      },
      {
        heading: '٥. الدفع',
        bullets: [
          'الدفع عند الاستلام: تدفع للمندوب نقداً عند وصول الطلب. اطّلع على [سياسة الشحن والتوصيل](/shipping) لمعرفة القواعد.',
          'الدفع الإلكتروني عبر شام كاش: تؤكد الدفع في تطبيق شام كاش أو موقعه برمز التحويل الخاص بك، ويُسجَّل الطلب مدفوعاً تلقائياً.',
          'التحويل اليدوي (شام كاش أو سيريتل كاش أو حوالة بنكية، حسب المتاح): ترسل المبلغ مع رقم طلبك المرجعي وترفع لقطة شاشة، ونتحقق منها قبل معالجة الطلب.',
          'الدفع بالبطاقة عبر Stripe، حيث يتوفر.',
        ],
        after: [
          'تظهر لك طرق الدفع المتاحة عند إتمام الشراء. تُعالَج الطلبات المدفوعة بالتحويل بعد التحقق من الدفعة، وقد تُلغى الطلبات التي تبقى غير مدفوعة.',
        ],
      },
      {
        heading: '٦. طلبات الطباعة المخصّصة',
        bullets: [
          'عندما ترفع نموذجك ثلاثي الأبعاد نراجعه ونرسل لك عرض سعر (السعر والمدة التقديرية)، ولا تبدأ الطباعة إلا بعد موافقتك على العرض.',
          'تؤكد أنك تملك النموذج أو يحق لك طباعته، وأنه لا ينتهك حقوق أي شخص آخر.',
          'لا نطبع الأسلحة أو قطعها، ولا المواد المخالفة للقانون، ولا المحتوى المسيء، ويحق لنا رفض أي نموذج دون إبداء الأسباب.',
          'تحتفظ بجميع حقوقك في ملفاتك، وتسمح لنا وللصانع الذي يطبع طلبك بتخزينها وعرضها وطباعتها فقط لإتمام طلبك.',
        ],
      },
      {
        heading: '٧. المنتجات المطبوعة',
        paragraphs: [
          'قد تظهر على المنتجات المطبوعة ثلاثياً خطوط طبقات دقيقة وفروق بسيطة في اللون أو المقاس، وهي سمات طبيعية لعملية الطباعة وليست عيوباً. وإذا وصلك منتج معيب أو متضرر أو مختلف عما طلبته، فاتبع [سياسة الإرجاع والاسترداد](/returns).',
        ],
      },
      {
        heading: '٨. الإلغاء',
        paragraphs: [
          'يمكنك طلب إلغاء الطلب من «طلباتي» أو بالتواصل معنا قبل بدء الطباعة، وتسترد كامل ما دفعته. ولأن المنتجات تُصنع حسب الطلب، لا يمكن عادةً إلغاء الطلب بعد بدء الطباعة.',
        ],
      },
      {
        heading: '٩. التوصيل والإرجاع والاسترداد',
        paragraphs: [
          'تنظّم [سياسة الشحن والتوصيل](/shipping) عملية التوصيل، وتنظّم [سياسة الإرجاع والاسترداد](/returns) الإرجاع واسترداد المبالغ، وكلتاهما جزء من هذه الشروط.',
        ],
      },
      {
        heading: '١٠. الملكية الفكرية',
        paragraphs: [
          'اسم 3D Titans وشعارها ومحتوى الموقع ملك لـ 3D Titans، وتصاميم المنتجات ملك لصنّاعها. لا يجوز نسخ التصاميم أو المحتوى من الموقع أو إعادة بيعها أو إنتاجها دون إذن.',
        ],
      },
      {
        heading: '١١. الاستخدام المقبول',
        paragraphs: [
          'لا تستخدم الموقع للاحتيال، أو لرفع ملفات ضارة، أو لنشر تقييمات مضللة أو مسيئة، أو للتأثير على عمل الموقع أو على العملاء الآخرين.',
        ],
      },
      {
        heading: '١٢. المسؤولية',
        paragraphs: [
          'نحرص على أن يبقى الموقع متاحاً وأن تكون منتجاتنا متقنة الصنع. وفي الحدود التي يسمح بها القانون، تقتصر مسؤوليتنا عن أي طلب على المبلغ الذي دفعته مقابله، ولا نتحمل مسؤولية الأضرار غير المباشرة. ولا يحدّ أي شيء في هذه الشروط من حقوقك بموجب قوانين حماية المستهلك المعمول بها.',
        ],
      },
      {
        heading: '١٣. القانون الواجب التطبيق والنزاعات',
        paragraphs: [
          'تخضع هذه الشروط لقوانين الجمهورية العربية السورية. إذا حدثت أي مشكلة، يرجى التواصل معنا أولاً وسنسعى إلى حلها بسرعة وإنصاف. وإن تعذّر الاتفاق، تختص المحاكم المختصة في الجمهورية العربية السورية بالنظر في النزاع.',
        ],
      },
      {
        heading: '١٤. التعديلات والتواصل',
        paragraphs: [
          'قد نحدّث هذه الشروط، ويوضّح التاريخ في أعلى الصفحة آخر إصدار، وتسري على كل طلب الشروطُ النافذة وقت تقديمه. لديك سؤال؟ تواصل معنا عبر [صفحة الدعم](/support).',
        ],
      },
    ],
  },
};

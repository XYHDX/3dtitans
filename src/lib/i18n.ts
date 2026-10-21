// No 'use client' here on purpose: this module is plain data + pure helpers, so
// server components (root layout, metadata, policy pages) can translate too.
// Part files in ./i18n-parts must stay plain data as well (no 'use client').
import { conversionStrings } from './i18n-parts/conversion';
import { catalogStrings } from './i18n-parts/catalog';
import { backendStrings } from './i18n-parts/backend';
import { uploadsStrings } from './i18n-parts/uploads';
import { pagesStrings } from './i18n-parts/pages';

export type Locale = 'en' | 'ar';

/** Arabic first: the shop sells in Syria. English is the alternative. */
export const defaultLocale: Locale = 'ar';

/** Cookie that carries the visitor's language choice (read on the server). */
export const LOCALE_COOKIE = '3dt-locale';

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'ar';
}

export const localeSettings: Record<Locale, { label: string; dir: 'ltr' | 'rtl' }> = {
  en: { label: 'English', dir: 'ltr' },
  ar: { label: 'العربية', dir: 'rtl' },
};

const baseTranslations: Record<Locale, Record<string, string>> = {
  en: {
    'nav.products': 'Products',
    'nav.stores': 'Stores',
    'nav.upload': 'Custom Print',
    'nav.about': 'About',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    'nav.admin': 'Admin Dashboard',
    'nav.store': 'Store Dashboard',
    'nav.logout': 'Log out',
    'nav.openCart': 'Open Cart',
    'nav.checkout': 'Checkout',
    'nav.loginToCheckout': 'Login to checkout',

    'auth.loginToBuyTitle': 'Login Required',
    'auth.loginToBuyDesc': 'Please log in to add items to your cart.',
    'auth.storeOwnerBlockedTitle': 'Store owner account',
    'auth.storeOwnerBlockedDesc': 'Store owner accounts cannot place orders or uploads. Please use a customer login.',

    'hero.title': 'PRINTED IN 3D,\nMADE IN SYRIA',
    'hero.subtitle': 'Ready-made 3D-printed keychains, vases, organizers, décor and gifts, plus custom printing from your own model. Delivered across Syria. Pay cash on delivery or with ShamCash.',
    'hero.ctaPrimary': 'Shop products',
    'hero.ctaSecondary': 'Print your design',

    'featured.title': 'Featured Products',
    'featured.subtitle': 'A hand-picked selection of our 3D-printed products.',
    'featured.viewAll': 'View All',
    'featured.empty': 'No featured products available at the moment.',

    'print.title': 'Print your own design',
    'print.subtitle': 'Your model, printed for you in Syria',
    'print.body': "Have a 3D model? Upload the STL file and tell us the size, colour and quantity you want. We'll reply with the price and delivery time before we start printing.",
    'print.cta': 'Upload your model',

    'choose.title': 'Why 3D Titans',
    'choose.subtitle': 'Printed locally, checked by hand and delivered to you.',
    'choose.feature1.title': 'Made in Syria',
    'choose.feature1.desc': 'Every piece is 3D-printed here in Syria by local makers and checked before it is packed.',
    'choose.feature2.title': 'Custom prints',
    'choose.feature2.desc': 'Upload your own 3D model (STL file) and get a price before anything is printed.',
    'choose.feature3.title': 'Delivery across Syria',
    'choose.feature3.desc': 'We deliver across the Syrian governorates. We confirm the delivery fee and time with you by phone or WhatsApp.',
    'choose.feature4.title': 'Pay your way',
    'choose.feature4.desc': 'Pay cash on delivery or with ShamCash, no card needed. Questions? Message us on WhatsApp.',

    'products.title': 'All Products',
    'products.subtitle': 'Browse all our 3D-printed products.',
    'products.empty': 'No products have been added yet.',

    'productCard.preview': '3D Preview',
    'productCard.reviews': '{count} reviews',
    'productCard.addedTitle': 'Added to Cart',
    'productCard.addedDescription': '{name} has been added to your cart.',
    'productCard.addSr': 'Add to cart',

    'cart.title': 'Shopping Cart',
    'cart.total': 'Total:',
    'cart.checkout': 'Proceed to Checkout',
    'cart.checkoutGuest': 'Login to Checkout',
    'cart.clear': 'Clear Cart',
    'cart.emptyTitle': 'Your cart is empty',
    'cart.emptySubtitle': 'Add some products to get started.',
    'cart.explore': 'Browse products',

    'checkout.formTitle': 'Shipping & Contact Information',
    'checkout.formSubtitle': 'Enter your details to complete the order.',
    'checkout.summaryTitle': 'Order Summary',
    'checkout.summarySubtitle': 'Review your items before placing the order.',
    'checkout.emptyTitle': 'Your cart is empty.',
    'checkout.emptyCta': 'Continue Shopping',
    'checkout.placeOrder': 'Place Order',
    'checkout.placing': 'Placing Order...',
    'checkout.toastEmptyTitle': 'Empty Cart',
    'checkout.toastEmptyDesc': 'Cannot place an order with an empty cart.',
    'checkout.toastSuccessTitle': 'Order Placed!',
    'checkout.toastErrorTitle': 'Order Failed',
    'checkout.toastErrorDesc': 'An unexpected error occurred.',
    'checkout.loginRequiredTitle': 'Login Required',
    'checkout.loginRequiredDesc': 'Please log in to complete your purchase.',
    'checkout.loginCta': 'Login',
    'checkout.storeOwnerBlockedTitle': 'Checkout unavailable',
    'checkout.storeOwnerBlockedDesc': 'Store owner accounts cannot place orders. Please use a customer account.',
    'checkout.labels.fullName': 'Full Name',
    'checkout.labels.email': 'Email Address',
    'checkout.labels.phone': 'Phone Number',
    'checkout.labels.address': 'Address',
    'checkout.labels.city': 'City',
    'checkout.labels.postalCode': 'Postal Code',
    'checkout.labels.country': 'Country',
    'checkout.errors.fullName': 'Full name is required.',
    'checkout.errors.email': 'A valid email address is required.',
    'checkout.errors.phone': 'A valid phone number is required.',
    'checkout.errors.address': 'Address is required.',
    'checkout.errors.city': 'City is required.',
    'checkout.errors.postalCode': 'Postal code is required.',
    'checkout.errors.country': 'Country is required.',
    'checkout.errors.notesMax': 'Notes must be 500 characters or fewer.',
    'checkout.notesLabel': 'Add notes (QR, dimensions, links)',
    'checkout.notesPlaceholder': 'Share QR code URL, sizing, or a reference link for this order.',

    'payment.methods.cod.label': 'Cash on Delivery',
    'payment.methods.cod.blurb': 'Pay in cash when the order arrives at your door.',
    'payment.methods.bank_transfer.label': 'Bank Transfer',
    'payment.methods.bank_transfer.blurb': 'Transfer to our bank account. We confirm and ship.',
    'payment.methods.sham_cash.label': 'Sham Cash (manual transfer)',
    'payment.methods.sham_cash.blurb': 'Send the amount to our Sham Cash wallet, then upload a screenshot. We confirm it manually.',
    'payment.methods.sham_cash_epay.label': 'ShamCash — pay online',
    'payment.methods.sham_cash_epay.blurb': "You'll be taken to the ShamCash app or website to confirm the payment with your transfer code. Confirmed instantly.",
    'payment.methods.syriatel_cash.label': 'Syriatel Cash',
    'payment.methods.syriatel_cash.blurb': 'Pay via Syriatel Cash wallet, then upload a screenshot.',
    'payment.methods.stripe.label': 'Card payment',
    'payment.methods.stripe.blurb': 'Pay with Visa / Mastercard via Stripe (international).',
    'payment.methods.loading': 'Loading payment methods',
    'payment.methods.aria': 'Payment method',

    'checkout.shamcashStartFailedTitle': 'ShamCash payment not started',
    'checkout.shamcashStartFailedDesc': 'Your order was saved. You can start the ShamCash payment again from the next page.',

    'shamcashEpay.title': 'Pay with ShamCash',
    'shamcashEpay.amount': 'Amount to pay',
    'shamcashEpay.intro': "You'll be taken to the ShamCash app (or the ShamCash website) to confirm the payment with your transfer code. The payment link is valid for 10 minutes.",
    'shamcashEpay.payButton': 'Pay {amount} with ShamCash',
    'shamcashEpay.redirecting': 'Opening ShamCash…',
    'shamcashEpay.waitingTitle': 'Waiting for ShamCash confirmation…',
    'shamcashEpay.waitingDesc': 'Keep this page open — it updates automatically as soon as ShamCash confirms your payment.',
    'shamcashEpay.reopen': 'Open the ShamCash payment page again',
    'shamcashEpay.paidTitle': 'Payment received',
    'shamcashEpay.paidDesc': "ShamCash confirmed your payment. We'll start processing your order shortly.",
    'shamcashEpay.expiredTitle': 'The payment link expired',
    'shamcashEpay.expiredDesc': 'ShamCash payment links are valid for 10 minutes and this one was not paid, so no money was taken. You can try again.',
    'shamcashEpay.failedTitle': "We couldn't start the ShamCash payment",
    'shamcashEpay.failedDesc': 'No money was taken. Please try again; if it keeps failing, contact us.',
    'shamcashEpay.tryAgain': 'Try again',
    'shamcashEpay.slowTitle': "We're still waiting for ShamCash",
    'shamcashEpay.checkAgain': 'Check again',
    'shamcashEpay.checking': 'Checking…',
    'shamcashEpay.errorGeneric': 'Something went wrong. Please try again in a moment.',
    'shamcashEpay.errorUnavailable': 'ShamCash payment is not available right now. Please try again later or contact us.',
    'shamcashEpay.errorTooMany': 'Too many attempts. Please wait a few minutes and try again.',
    'shamcashEpay.cancelled': 'This order was cancelled, so it can no longer be paid.',
    'shamcashEpay.reference': 'Order reference',
    'shamcashEpay.reviewTitle': 'Payment received — under review',

    'productDetail.rating': '{rating} ({count} reviews)',
    'productDetail.noReviews': 'No reviews yet',
    'productDetail.stlContactEmail': 'To buy the STL file, contact the store owner at {email}.',
    'productDetail.stlContactStore': 'To buy the STL file, contact the store owner ({store}) through their store page.',
    'productDetail.tags': 'Tags:',
    'productDetail.addToCart': 'Add to Cart',
    'productDetail.inCart': 'You have {count} of this item in your cart.',
    'productDetail.close': 'Close product',
    'productDetail.noDescription': 'No description provided.',

    'upload.storeOwnerBlockedTitle': 'Uploads unavailable for store owners',
    'upload.storeOwnerBlockedDesc': 'Use a customer account to request prints.',

    'orders.customerNotes': 'Customer notes',
    'orders.noCustomerNotes': 'No customer notes provided.',

    'about.defaultHeroTitle': 'About 3D Titans',
    'about.defaultHeroSubtitle': 'A Syrian 3D-printing studio and shop.',
    'about.defaultMissionTitle': 'What we do',
    'about.defaultMission': 'We 3D-print useful and fun products in Syria, from keychains and organizers to vases and décor, and we print custom models for people and businesses. Our aim is simple: well-made pieces at fair prices, delivered across Syria, with payment options that work here.',
    'about.defaultContactTitle': 'Get in Touch',
    'about.defaultContact': "Have a question or a custom print in mind? Send us a message below or reach us on WhatsApp. We'd love to hear from you.",
    'about.defaultContactCard': 'Contact Us',

    'footer.blurbDefault': '3D-printed products made in Syria, custom prints from your own model, and delivery across Syria.',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
    'footer.debug': 'Debug',
    'footer.copyright': 'All rights reserved.',

    'brand.title': '3D Titans',

    'stores.title': 'Store Directory',
    'stores.subtitle': "Browse our makers' stores and discover their products.",
    'stores.viewAll': 'View all stores',
    'stores.viewStore': 'View store',
    'stores.empty': 'No stores are live yet.',
    'stores.ownerCta': 'Become a store owner',
    'stores.noBio': 'This store has not added a bio yet.',
    'stores.productsCount': '{count} products',
    'stores.published': 'Published',
    'stores.draft': 'Draft',
    'stores.notFound': 'Store not found.',
    'stores.back': 'Back to stores',
    'stores.visitSite': 'Visit website',
    'stores.bioHeading': 'About this store',
    'stores.atAGlance': 'At a glance',
    'stores.status': 'Status',
    'stores.productsLabel': 'Products',
    'stores.productsHeading': 'Products from this store',
    'stores.noProducts': 'No products added yet.',
    'stores.website': 'Website',
  },
  ar: {
    'nav.products': 'المنتجات',
    'nav.stores': 'المتاجر',
    'nav.upload': 'طباعة مخصّصة',
    'nav.about': 'من نحن',
    'nav.login': 'تسجيل الدخول',
    'nav.signup': 'إنشاء حساب',
    'nav.admin': 'لوحة التحكم',
    'nav.store': 'لوحة المتجر',
    'nav.logout': 'تسجيل الخروج',
    'nav.openCart': 'فتح السلة',
    'nav.checkout': 'إتمام الشراء',
    'nav.loginToCheckout': 'سجّل الدخول لإتمام الشراء',

    'auth.loginToBuyTitle': 'يلزم تسجيل الدخول',
    'auth.loginToBuyDesc': 'يرجى تسجيل الدخول لإضافة المنتجات إلى السلة.',
    'auth.storeOwnerBlockedTitle': 'حساب مالك متجر',
    'auth.storeOwnerBlockedDesc': 'لا يمكن لحسابات مالكي المتاجر تقديم طلبات أو رفع ملفات. يرجى استخدام حساب عميل.',

    'hero.title': 'طباعة ثلاثية الأبعاد\nبأيدٍ سورية',
    'hero.subtitle': 'ميداليات ومزهريات ومنظّمات وقطع ديكور وهدايا جاهزة مطبوعة بتقنية ثلاثية الأبعاد، إضافة إلى طباعة مخصّصة لتصميمك الخاص. نوصل إلى مختلف المحافظات السورية، والدفع نقداً عند الاستلام أو عبر شام كاش.',
    'hero.ctaPrimary': 'تسوّق المنتجات',
    'hero.ctaSecondary': 'اطبع تصميمك',

    'featured.title': 'منتجات مميّزة',
    'featured.subtitle': 'تشكيلة مختارة بعناية من منتجاتنا المطبوعة بتقنية ثلاثية الأبعاد.',
    'featured.viewAll': 'عرض الكل',
    'featured.empty': 'لا توجد منتجات مميزة حالياً.',

    'print.title': 'اطبع تصميمك الخاص',
    'print.subtitle': 'نموذجك، نطبعه لك في سوريا',
    'print.body': 'لديك نموذج ثلاثي الأبعاد؟ ارفع ملف STL وأخبرنا بالمقاس واللون والكمية التي تريدها، وسنرد عليك بالسعر وموعد التسليم قبل أن نبدأ الطباعة.',
    'print.cta': 'ارفع نموذجك',

    'choose.title': 'لماذا 3D Titans؟',
    'choose.subtitle': 'نطبع محلياً، ونفحص كل قطعة يدوياً، ونوصلها إليك.',
    'choose.feature1.title': 'صُنع في سوريا',
    'choose.feature1.desc': 'كل قطعة تُطبع هنا في سوريا على أيدي صنّاع محليين، وتُفحص قبل تغليفها.',
    'choose.feature2.title': 'طباعة حسب الطلب',
    'choose.feature2.desc': 'ارفع نموذجك ثلاثي الأبعاد (ملف STL) واحصل على السعر قبل أن نطبع أي شيء.',
    'choose.feature3.title': 'توصيل في كل سوريا',
    'choose.feature3.desc': 'نوصل إلى مختلف المحافظات السورية، ونؤكد معك رسوم التوصيل وموعده عبر الهاتف أو واتساب.',
    'choose.feature4.title': 'ادفع بالطريقة التي تناسبك',
    'choose.feature4.desc': 'الدفع نقداً عند الاستلام أو عبر شام كاش، دون الحاجة إلى بطاقة. لديك سؤال؟ راسلنا على واتساب.',

    'products.title': 'جميع المنتجات',
    'products.subtitle': 'تصفّح جميع منتجاتنا المطبوعة بتقنية ثلاثية الأبعاد.',
    'products.empty': 'لا توجد منتجات مضافة بعد.',

    'productCard.preview': 'معاينة ثلاثية الأبعاد',
    'productCard.reviews': '{count} مراجعة',
    'productCard.addedTitle': 'تمت الإضافة إلى السلة',
    'productCard.addedDescription': 'أُضيف "{name}" إلى سلتك.',
    'productCard.addSr': 'أضف إلى السلة',

    'cart.title': 'سلة التسوق',
    'cart.total': 'الإجمالي:',
    'cart.checkout': 'إتمام الشراء',
    'cart.checkoutGuest': 'سجّل الدخول لإتمام الشراء',
    'cart.clear': 'إفراغ السلة',
    'cart.emptyTitle': 'سلتك فارغة',
    'cart.emptySubtitle': 'أضف بعض المنتجات لتبدأ.',
    'cart.explore': 'تصفّح المنتجات',

    'checkout.formTitle': 'معلومات الشحن والتواصل',
    'checkout.formSubtitle': 'أدخل بياناتك لإتمام الطلب.',
    'checkout.summaryTitle': 'ملخص الطلب',
    'checkout.summarySubtitle': 'راجع المنتجات قبل تأكيد الطلب.',
    'checkout.emptyTitle': 'سلتك فارغة.',
    'checkout.emptyCta': 'متابعة التسوق',
    'checkout.placeOrder': 'تأكيد الطلب',
    'checkout.placing': 'جارٍ تأكيد الطلب…',
    'checkout.toastEmptyTitle': 'سلة فارغة',
    'checkout.toastEmptyDesc': 'لا يمكن إتمام طلب بسلة فارغة.',
    'checkout.toastSuccessTitle': 'تم استلام طلبك!',
    'checkout.toastErrorTitle': 'فشل الطلب',
    'checkout.toastErrorDesc': 'حدث خطأ غير متوقع.',
    'checkout.loginRequiredTitle': 'يلزم تسجيل الدخول',
    'checkout.loginRequiredDesc': 'يرجى تسجيل الدخول لإكمال عملية الشراء.',
    'checkout.loginCta': 'تسجيل الدخول',
    'checkout.storeOwnerBlockedTitle': 'إتمام الشراء غير متاح',
    'checkout.storeOwnerBlockedDesc': 'لا يمكن لحسابات مالكي المتاجر تقديم طلبات. يرجى استخدام حساب عميل.',
    'checkout.labels.fullName': 'الاسم الكامل',
    'checkout.labels.email': 'البريد الإلكتروني',
    'checkout.labels.phone': 'رقم الهاتف',
    'checkout.labels.address': 'العنوان',
    'checkout.labels.city': 'المدينة',
    'checkout.labels.postalCode': 'الرمز البريدي',
    'checkout.labels.country': 'البلد',
    'checkout.errors.fullName': 'الاسم الكامل مطلوب.',
    'checkout.errors.email': 'يرجى إدخال بريد إلكتروني صحيح.',
    'checkout.errors.phone': 'يرجى إدخال رقم هاتف صحيح.',
    'checkout.errors.address': 'العنوان مطلوب.',
    'checkout.errors.city': 'المدينة مطلوبة.',
    'checkout.errors.postalCode': 'الرمز البريدي مطلوب.',
    'checkout.errors.country': 'البلد مطلوب.',
    'checkout.errors.notesMax': 'الملاحظات يجب ألا تتجاوز 500 حرف.',
    'checkout.notesLabel': 'أضف ملاحظات (رمز QR أو الأبعاد أو الروابط)',
    'checkout.notesPlaceholder': 'شارك رابط رمز QR أو المقاسات أو رابط مرجعي لهذا الطلب.',

    'payment.methods.cod.label': 'الدفع عند الاستلام',
    'payment.methods.cod.blurb': 'ادفع نقداً عند وصول الطلب إلى بابك.',
    'payment.methods.bank_transfer.label': 'حوالة بنكية',
    'payment.methods.bank_transfer.blurb': 'حوّل المبلغ إلى حسابنا البنكي، ثم نؤكد الطلب ونشحنه.',
    'payment.methods.sham_cash.label': 'شام كاش (تحويل يدوي)',
    'payment.methods.sham_cash.blurb': 'أرسل المبلغ إلى محفظة شام كاش الخاصة بنا، ثم ارفع لقطة شاشة. نؤكد الدفع يدوياً.',
    'payment.methods.sham_cash_epay.label': 'شام كاش — دفع إلكتروني',
    'payment.methods.sham_cash_epay.blurb': 'سيتم تحويلك إلى تطبيق شام كاش أو موقعه لتأكيد الدفع برمز التحويل الخاص بك. يتم التأكيد فوراً.',
    'payment.methods.syriatel_cash.label': 'سيريتل كاش',
    'payment.methods.syriatel_cash.blurb': 'ادفع عبر محفظة سيريتل كاش، ثم ارفع لقطة شاشة.',
    'payment.methods.stripe.label': 'الدفع بالبطاقة',
    'payment.methods.stripe.blurb': 'ادفع ببطاقة فيزا أو ماستركارد عبر Stripe (دولي).',
    'payment.methods.loading': 'جارٍ تحميل طرق الدفع',
    'payment.methods.aria': 'طريقة الدفع',

    'checkout.shamcashStartFailedTitle': 'لم يبدأ الدفع عبر شام كاش',
    'checkout.shamcashStartFailedDesc': 'تم حفظ طلبك. يمكنك بدء الدفع عبر شام كاش مجدداً من الصفحة التالية.',

    'shamcashEpay.title': 'الدفع عبر شام كاش',
    'shamcashEpay.amount': 'المبلغ المطلوب',
    'shamcashEpay.intro': 'سيتم تحويلك إلى تطبيق شام كاش (أو موقع شام كاش) لتأكيد الدفع برمز التحويل الخاص بك. رابط الدفع صالح لمدة 10 دقائق.',
    'shamcashEpay.payButton': 'ادفع {amount} عبر شام كاش',
    'shamcashEpay.redirecting': 'جارٍ فتح شام كاش…',
    'shamcashEpay.waitingTitle': 'بانتظار تأكيد شام كاش…',
    'shamcashEpay.waitingDesc': 'أبقِ هذه الصفحة مفتوحة — سيتم تحديثها تلقائياً فور تأكيد شام كاش لعملية الدفع.',
    'shamcashEpay.reopen': 'افتح صفحة الدفع في شام كاش مجدداً',
    'shamcashEpay.paidTitle': 'تم استلام الدفعة',
    'shamcashEpay.paidDesc': 'أكدت شام كاش عملية الدفع. سنبدأ بتجهيز طلبك قريباً.',
    'shamcashEpay.expiredTitle': 'انتهت صلاحية رابط الدفع',
    'shamcashEpay.expiredDesc': 'روابط الدفع في شام كاش صالحة لمدة 10 دقائق ولم يتم الدفع عبر هذا الرابط، لذلك لم يُخصم أي مبلغ. يمكنك المحاولة مجدداً.',
    'shamcashEpay.failedTitle': 'تعذّر بدء الدفع عبر شام كاش',
    'shamcashEpay.failedDesc': 'لم يُخصم أي مبلغ. يرجى المحاولة مجدداً، وإذا تكررت المشكلة تواصل معنا.',
    'shamcashEpay.tryAgain': 'حاول مجدداً',
    'shamcashEpay.slowTitle': 'ما زلنا بانتظار شام كاش',
    'shamcashEpay.checkAgain': 'تحقق مجدداً',
    'shamcashEpay.checking': 'جارٍ التحقق…',
    'shamcashEpay.errorGeneric': 'حدث خطأ ما. يرجى المحاولة بعد قليل.',
    'shamcashEpay.errorUnavailable': 'الدفع عبر شام كاش غير متاح حالياً. يرجى المحاولة لاحقاً أو التواصل معنا.',
    'shamcashEpay.errorTooMany': 'محاولات كثيرة. يرجى الانتظار بضع دقائق ثم المحاولة مجدداً.',
    'shamcashEpay.cancelled': 'تم إلغاء هذا الطلب، لذلك لم يعد بالإمكان دفعه.',
    'shamcashEpay.reference': 'رقم الطلب المرجعي',
    'shamcashEpay.reviewTitle': 'تم استلام الدفعة — قيد المراجعة',

    'productDetail.rating': '{rating} ({count} مراجعة)',
    'productDetail.noReviews': 'لا توجد مراجعات بعد',
    'productDetail.stlContactEmail': 'لشراء ملف STL، تواصل مع صاحب المتجر عبر {email}.',
    'productDetail.stlContactStore': 'لشراء ملف STL، تواصل مع صاحب المتجر ({store}) من خلال صفحة المتجر.',
    'productDetail.tags': 'الوسوم:',
    'productDetail.addToCart': 'أضف إلى السلة',
    'productDetail.inCart': 'لديك {count} من هذا المنتج في السلة.',
    'productDetail.close': 'إغلاق المنتج',
    'productDetail.noDescription': 'لا يوجد وصف متاح.',

    'upload.storeOwnerBlockedTitle': 'رفع الملفات غير متاح لأصحاب المتاجر',
    'upload.storeOwnerBlockedDesc': 'استخدم حساب عميل لطلب الطباعة.',

    'orders.customerNotes': 'ملاحظات العميل',
    'orders.noCustomerNotes': 'لا توجد ملاحظات من العميل.',

    'about.defaultHeroTitle': 'تعرّف على 3D Titans',
    'about.defaultHeroSubtitle': 'استوديو ومتجر سوري للطباعة ثلاثية الأبعاد.',
    'about.defaultMissionTitle': 'ماذا نفعل',
    'about.defaultMission': 'نطبع في سوريا منتجات مفيدة وممتعة بتقنية ثلاثية الأبعاد، من الميداليات والمنظّمات إلى المزهريات وقطع الديكور، ونطبع النماذج المخصّصة للأفراد والشركات. هدفنا بسيط: قطع متقنة بأسعار عادلة، توصيل إلى مختلف المحافظات السورية، وطرق دفع تناسب السوق المحلي.',
    'about.defaultContactTitle': 'تواصل معنا',
    'about.defaultContact': 'لديك سؤال أو فكرة لطباعة مخصّصة؟ أرسل لنا رسالة من النموذج أدناه أو تواصل معنا عبر واتساب. يسعدنا سماعك.',
    'about.defaultContactCard': 'أرسل لنا رسالة',

    'footer.blurbDefault': 'منتجات مطبوعة بتقنية ثلاثية الأبعاد صُنعت في سوريا، وطباعة مخصّصة لتصاميمك، مع توصيل إلى مختلف المحافظات السورية.',
    'footer.privacy': 'سياسة الخصوصية',
    'footer.terms': 'شروط الاستخدام',
    'footer.debug': 'تصحيح',
    'footer.copyright': 'جميع الحقوق محفوظة.',

    'brand.title': '3D Titans',

    'stores.title': 'دليل المتاجر',
    'stores.subtitle': 'تصفّح متاجر صنّاعنا واكتشف منتجاتهم.',
    'stores.viewAll': 'عرض كل المتاجر',
    'stores.viewStore': 'عرض المتجر',
    'stores.empty': 'لا توجد متاجر متاحة بعد.',
    'stores.ownerCta': 'كن صاحب متجر',
    'stores.noBio': 'لم يضف المتجر نبذة بعد.',
    'stores.productsCount': '{count} منتج',
    'stores.published': 'منشور',
    'stores.draft': 'مسودة',
    'stores.notFound': 'المتجر غير موجود.',
    'stores.back': 'العودة إلى المتاجر',
    'stores.visitSite': 'زيارة الموقع',
    'stores.bioHeading': 'عن المتجر',
    'stores.atAGlance': 'نظرة سريعة',
    'stores.status': 'الحالة',
    'stores.productsLabel': 'المنتجات',
    'stores.productsHeading': 'منتجات المتجر',
    'stores.noProducts': 'لا توجد منتجات بعد.',
    'stores.website': 'الموقع',
  },
};

/**
 * Look up `key` for `locale` (falls back to English, then `fallback`, then the
 * key itself) and fill `{var}` placeholders. Shared by the client provider and
 * server components (see src/lib/i18n-server.ts).
 */
export function translate(
  locale: Locale,
  key: string,
  fallback?: string,
  vars?: Record<string, string | number>
): string {
  const template = translations[locale]?.[key] ?? translations.en[key] ?? fallback ?? key;
  return template.replace(/\{(\w+)\}/g, (_, token) => {
    if (vars && token in vars) return String(vars[token]);
    return `{${token}}`;
  });
}

/**
 * Strings are split by area (src/lib/i18n-parts/*) and merged here; later
 * parts override earlier keys. Every part must define the same keys in `en`
 * and `ar`.
 */
const PARTS: Array<Record<Locale, Record<string, string>>> = [
  conversionStrings,
  catalogStrings,
  backendStrings,
  uploadsStrings,
  pagesStrings,
];

export const translations: Record<Locale, Record<string, string>> = {
  en: Object.assign({}, baseTranslations.en, ...PARTS.map((p) => p.en)),
  ar: Object.assign({}, baseTranslations.ar, ...PARTS.map((p) => p.ar)),
};

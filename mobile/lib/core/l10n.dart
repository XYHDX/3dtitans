import 'package:flutter/material.dart';

/// App strings. Every string is an abstract member, so the analyzer guarantees
/// that both languages define all of them (a missing translation is a
/// compile-time error instead of a runtime blank).
abstract class AppStrings {
  const AppStrings();

  Locale get locale;
  bool get isRtl => locale.languageCode == 'ar';

  // Navigation
  String get home;
  String get shop;
  String get stores;
  String get cart;
  String get account;
  String get wishlist;
  String get settings;

  // Home
  String get tagline;
  String get heroSubtitle;
  String get newDropLiveNow;
  String get browseModels;
  String get learnMore;
  String get newArrivals;
  String get storeDirectory;
  String get storeDirectorySubtitle;
  String get viewAll;
  String get seeAllStores;
  String get printOnDemand;
  String get printOnDemandKicker;
  String get printOnDemandBody;
  String get uploadYourModel;
  String get creatorsChoice;
  String get creatorsChoiceSubtitle;
  String get curatedQuality;
  String get curatedQualityBody;
  String get commercialLicense;
  String get commercialLicenseBody;
  String get community;
  String get communityBody;
  String get instantAccess;
  String get instantAccessBody;

  // Products
  String get allModels;
  String get allModelsSubtitle;
  String get searchHint;
  String get allCategories;
  String get noProducts;
  String productsCount(int n);
  String get addToCart;
  String addedToCart(String name);
  String get noReviewsYet;
  String reviewsCount(int n);
  String get preview3d;
  String get store;
  String byStore(String name);
  String get tags;
  String get description;
  String get noDescription;
  String get quantity;
  String inCart(int n);
  String stlContact(String store);
  String get reviews;
  String get signInToReview;
  String get writeReview;
  String get yourRating;
  String get reviewTitle;
  String get reviewBody;
  String get submit;
  String get reviewSaved;
  String get verifiedPurchase;
  String get featured;
  String get noReviewsBody;
  String get sortBy;
  String get sortNewest;
  String get sortPriceLow;
  String get sortPriceHigh;
  String get sortName;

  // Stores
  String get noStores;
  String get storeNoBio;
  String get aboutThisStore;
  String get productsFromStore;
  String get visitWebsite;
  String get atAGlance;
  String get published;
  String get storeStatus;
  String get products;

  // Cart
  String get cartTitle;
  String get cartEmpty;
  String get cartEmptyBody;
  String get subtotal;
  String itemsCount(int n);
  String get checkoutOnWebsite;
  String get checkoutNote;
  String get guestCartNote;
  String get syncedWithAccount;
  String get remove;
  String get clearCart;
  String get clearCartConfirm;
  String get cancel;
  String get continueShopping;

  // Wishlist
  String get wishlistEmpty;
  String get wishlistEmptyBody;
  String get addedToWishlist;
  String get removedFromWishlist;

  // Account / auth
  String get welcomeBack;
  String get signInSubtitle;
  String get email;
  String get password;
  String get name;
  String get login;
  String get logout;
  String get signUp;
  String get createAccount;
  String get noAccount;
  String get haveAccount;
  String get forgotPassword;
  String get orContinueWith;
  String get googleSignInHint;
  String get loginFailed;
  String get signupFailed;
  String get networkError;
  String get retry;
  String get invalidEmail;
  String get passwordTooShort;
  String get required;
  String get myAccount;
  String get myOrders;
  String get openOnWebsite;
  String get uploadForPrint;
  String get roleAdmin;
  String get roleStoreOwner;
  String get roleUser;
  String get loginRequired;
  String get loginRequiredBody;

  // Settings / about
  String get language;
  String get english;
  String get arabic;
  String get appearance;
  String get themeSystem;
  String get themeLight;
  String get themeDark;
  String get about;
  String get version;
  String get privacyPolicy;
  String get termsOfService;
  String get support;
  String get contactUs;
  String get mission;
  String get website;

  // Checkout
  String get checkout;
  String get checkoutTitle;
  String get shippingDetails;
  String get savedAddresses;
  String get useThisAddress;
  String get fullName;
  String get phoneNumber;
  String get addressLine;
  String get city;
  String get postalCode;
  String get country;
  String get orderNotes;
  String get orderNotesHint;
  String get saveAddressForNextTime;
  String get paymentMethod;
  String get noPaymentMethods;
  String get payCod;
  String get payCodBody;
  String get payBank;
  String get payBankBody;
  String get payShamCash;
  String get payShamCashBody;
  String get paySyriatelCash;
  String get paySyriatelCashBody;
  String get payStripe;
  String get payStripeBody;
  String get bankName;
  String get accountNumber;
  String get iban;
  String get accountHolder;
  String get walletNumber;
  String get orderSummary;
  String get placeOrder;
  String get placingOrder;
  String get loginToCheckout;
  String get storeOwnersCannotOrder;
  String get orderPlaced;
  String orderPlacedBody(String id);
  String get payNowWithCard;
  String get paymentProof;
  String get paymentProofBody;
  String get transferReference;
  String get uploadScreenshot;
  String get changeScreenshot;
  String get sendProof;
  String get proofSent;
  String get viewMyOrders;
  String get backToShop;

  // Orders
  String get ordersEmpty;
  String get ordersEmptyBody;
  String orderNumber(String id);
  String get orderDetails;
  String get orderStatus;
  String get statusAwaitingAcceptance;
  String get statusPending;
  String get statusPrinting;
  String get statusFinished;
  String get statusPooled;
  String get statusCancellationRequested;
  String get statusCancelled;
  String get requestCancellation;
  String get requestCancellationConfirm;
  String get cancellationRequested;
  String get expectedFinish;
  String get shippingTo;
  String get orderedOn;

  // Upload for print
  String get uploadTitle;
  String get uploadSubtitle;
  String get modelName;
  String get chooseStlFile;
  String get changeFile;
  String uploadFileHint(int mb);
  String get uploadNotesHint;
  String get sendForQuote;
  String get uploading;
  String get uploadSuccess;
  String get onlyStlFiles;
  String fileTooLarge(int mb);
  String get myUploads;
  String get noUploadsYet;
  String get uploadStatusNew;
  String get uploadStatusAssigned;
  String get uploadStatusPrinting;
  String get uploadStatusDone;

  // Support
  String get supportTitle;
  String get supportSubtitle;
  String get faq;
  String get contactForm;
  String get subject;
  String get message;
  String get sendMessage;
  String get messageSent;
  String get emailUs;
  String get lastUpdated;

  // General
  String get loading;
  String get somethingWentWrong;
  String get ok;
  String get couldNotOpenLink;
  String get total;
}

class _En extends AppStrings {
  const _En();

  @override
  Locale get locale => const Locale('en');

  @override
  String get home => 'Home';
  @override
  String get shop => 'Shop';
  @override
  String get stores => 'Stores';
  @override
  String get cart => 'Cart';
  @override
  String get account => 'Account';
  @override
  String get wishlist => 'Wishlist';
  @override
  String get settings => 'Settings';

  @override
  String get tagline => 'Build Worlds, Create Legends.';
  @override
  String get heroSubtitle =>
      'Discover high-quality 3D models and print-ready designs from creators around the world.';
  @override
  String get newDropLiveNow => 'NEW DROP · LIVE NOW';
  @override
  String get browseModels => 'Browse models';
  @override
  String get learnMore => 'Learn more';
  @override
  String get newArrivals => 'New arrivals';
  @override
  String get storeDirectory => 'Store directory';
  @override
  String get storeDirectorySubtitle =>
      'Browse every creator storefront and discover their products.';
  @override
  String get viewAll => 'View all';
  @override
  String get seeAllStores => 'See all stores';
  @override
  String get printOnDemand => 'Print on demand';
  @override
  String get printOnDemandKicker => 'Your designs, our expertise';
  @override
  String get printOnDemandBody =>
      'Have a custom model you want printed? Upload your STL file and get a quote.';
  @override
  String get uploadYourModel => 'Upload your model';
  @override
  String get creatorsChoice => "Creators' choice";
  @override
  String get creatorsChoiceSubtitle =>
      "We're building the best marketplace for 3D designers, with features that help you succeed.";
  @override
  String get curatedQuality => 'Curated quality';
  @override
  String get curatedQualityBody => 'Every model is reviewed before it goes live.';
  @override
  String get commercialLicense => 'Worry-free licensing';
  @override
  String get commercialLicenseBody => 'Clear commercial licensing on every purchase.';
  @override
  String get community => 'Community';
  @override
  String get communityBody => 'Follow creators and discover new drops.';
  @override
  String get instantAccess => 'Instant access';
  @override
  String get instantAccessBody => 'Digital files and print orders in a few taps.';

  @override
  String get allModels => 'All models';
  @override
  String get allModelsSubtitle => 'Browse our full collection of high-quality 3D assets.';
  @override
  String get searchHint => 'Search products by name or category';
  @override
  String get allCategories => 'All';
  @override
  String get noProducts => 'No products found.';
  @override
  String productsCount(int n) => n == 1 ? '1 product' : '$n products';
  @override
  String get addToCart => 'Add to cart';
  @override
  String addedToCart(String name) => '$name added to your cart.';
  @override
  String get noReviewsYet => 'No reviews yet';
  @override
  String reviewsCount(int n) => n == 1 ? '1 review' : '$n reviews';
  @override
  String get preview3d => '3D preview';
  @override
  String get store => 'Store';
  @override
  String byStore(String name) => 'by $name';
  @override
  String get tags => 'Tags';
  @override
  String get description => 'Description';
  @override
  String get noDescription => 'No description provided.';
  @override
  String get quantity => 'Quantity';
  @override
  String inCart(int n) => 'You have $n of this item in your cart.';
  @override
  String stlContact(String store) =>
      'To buy the STL file, contact the store owner ($store) through their store page.';
  @override
  String get reviews => 'Reviews';
  @override
  String get signInToReview => 'Sign in to leave a review for this model.';
  @override
  String get writeReview => 'Write a review';
  @override
  String get yourRating => 'Your rating';
  @override
  String get reviewTitle => 'Title (optional)';
  @override
  String get reviewBody => 'Share your experience';
  @override
  String get submit => 'Submit';
  @override
  String get reviewSaved => 'Thanks! Your review was saved.';
  @override
  String get verifiedPurchase => 'Verified purchase';
  @override
  String get featured => 'Featured';
  @override
  String get noReviewsBody => 'No reviews yet. Be the first to share your experience.';
  @override
  String get sortBy => 'Sort by';
  @override
  String get sortNewest => 'Newest';
  @override
  String get sortPriceLow => 'Price: low to high';
  @override
  String get sortPriceHigh => 'Price: high to low';
  @override
  String get sortName => 'Name';

  @override
  String get noStores => 'No stores yet.';
  @override
  String get storeNoBio => 'This store has not added a bio yet.';
  @override
  String get aboutThisStore => 'About this store';
  @override
  String get productsFromStore => 'Products from this store';
  @override
  String get visitWebsite => 'Visit website';
  @override
  String get atAGlance => 'At a glance';
  @override
  String get published => 'Published';
  @override
  String get storeStatus => 'Status';
  @override
  String get products => 'Products';

  @override
  String get cartTitle => 'Your cart';
  @override
  String get cartEmpty => 'Your cart is empty.';
  @override
  String get cartEmptyBody => 'Add some models and they will show up here.';
  @override
  String get subtotal => 'Subtotal';
  @override
  String itemsCount(int n) => n == 1 ? '1 item' : '$n items';
  @override
  String get checkoutOnWebsite => 'Checkout on 3dtitans.org';
  @override
  String get checkoutNote =>
      'Your cart is synced with your 3D Titans account — you can continue on the website too.';
  @override
  String get guestCartNote =>
      'You are browsing as a guest — this cart is saved on your device and merged into your account when you log in.';
  @override
  String get syncedWithAccount => 'Synced with your account';
  @override
  String get remove => 'Remove';
  @override
  String get clearCart => 'Clear cart';
  @override
  String get clearCartConfirm => 'Remove all items from your cart?';
  @override
  String get cancel => 'Cancel';
  @override
  String get continueShopping => 'Continue shopping';

  @override
  String get wishlistEmpty => 'Nothing saved yet.';
  @override
  String get wishlistEmptyBody => 'Tap the heart on any model to save it here.';
  @override
  String get addedToWishlist => 'Saved to your wishlist.';
  @override
  String get removedFromWishlist => 'Removed from your wishlist.';

  @override
  String get welcomeBack => 'Welcome back';
  @override
  String get signInSubtitle => 'Sign in to your 3D Titans account';
  @override
  String get email => 'Email';
  @override
  String get password => 'Password';
  @override
  String get name => 'Name';
  @override
  String get login => 'Log in';
  @override
  String get logout => 'Log out';
  @override
  String get signUp => 'Sign up';
  @override
  String get createAccount => 'Create your account';
  @override
  String get noAccount => "Don't have an account?";
  @override
  String get haveAccount => 'Already have an account?';
  @override
  String get forgotPassword => 'Forgot password?';
  @override
  String get orContinueWith => 'Or continue with';
  @override
  String get googleSignInHint => 'Google sign-in (opens 3dtitans.org)';
  @override
  String get loginFailed => 'Login failed. Check your email and password.';
  @override
  String get signupFailed => 'Could not create the account.';
  @override
  String get networkError =>
      'Could not reach 3dtitans.org. Check your connection and try again.';
  @override
  String get retry => 'Retry';
  @override
  String get invalidEmail => 'Enter a valid email address.';
  @override
  String get passwordTooShort => 'Password must be at least 6 characters.';
  @override
  String get required => 'Required';
  @override
  String get myAccount => 'My account';
  @override
  String get myOrders => 'My orders';
  @override
  String get openOnWebsite => 'Opens on 3dtitans.org';
  @override
  String get uploadForPrint => 'Upload for print';
  @override
  String get roleAdmin => 'Admin';
  @override
  String get roleStoreOwner => 'Store owner';
  @override
  String get roleUser => 'Member';
  @override
  String get loginRequired => 'Login required';
  @override
  String get loginRequiredBody => 'Please log in to continue.';

  @override
  String get language => 'Language';
  @override
  String get english => 'English';
  @override
  String get arabic => 'العربية';
  @override
  String get appearance => 'Appearance';
  @override
  String get themeSystem => 'System';
  @override
  String get themeLight => 'Light';
  @override
  String get themeDark => 'Dark';
  @override
  String get about => 'About 3D Titans';
  @override
  String get version => 'Version';
  @override
  String get privacyPolicy => 'Privacy policy';
  @override
  String get termsOfService => 'Terms of service';
  @override
  String get support => 'Support';
  @override
  String get contactUs => 'Contact us';
  @override
  String get mission => 'Mission';
  @override
  String get website => 'Website';

  @override
  String get checkout => 'Checkout';
  @override
  String get checkoutTitle => 'Checkout';
  @override
  String get shippingDetails => 'Shipping details';
  @override
  String get savedAddresses => 'Saved addresses';
  @override
  String get useThisAddress => 'Use';
  @override
  String get fullName => 'Full name';
  @override
  String get phoneNumber => 'Phone number';
  @override
  String get addressLine => 'Street address';
  @override
  String get city => 'City';
  @override
  String get postalCode => 'Postal code';
  @override
  String get country => 'Country';
  @override
  String get orderNotes => 'Notes (optional)';
  @override
  String get orderNotesHint => 'Colour, size, a reference link, delivery instructions…';
  @override
  String get saveAddressForNextTime => 'Save this address for next time';
  @override
  String get paymentMethod => 'Payment method';
  @override
  String get noPaymentMethods => 'No payment methods are enabled right now. Please try again later.';
  @override
  String get payCod => 'Cash on delivery';
  @override
  String get payCodBody => 'Pay in cash when the order arrives at your door.';
  @override
  String get payBank => 'Bank transfer';
  @override
  String get payBankBody => 'Transfer to our bank account, then send the receipt.';
  @override
  String get payShamCash => 'Sham Cash';
  @override
  String get payShamCashBody => 'Pay with your Sham Cash wallet, then send a screenshot.';
  @override
  String get paySyriatelCash => 'Syriatel Cash';
  @override
  String get paySyriatelCashBody => 'Pay with Syriatel Cash, then send a screenshot.';
  @override
  String get payStripe => 'Card payment';
  @override
  String get payStripeBody => 'Visa / Mastercard via Stripe (international).';
  @override
  String get bankName => 'Bank';
  @override
  String get accountNumber => 'Account number';
  @override
  String get iban => 'IBAN';
  @override
  String get accountHolder => 'Account holder';
  @override
  String get walletNumber => 'Wallet number';
  @override
  String get orderSummary => 'Order summary';
  @override
  String get placeOrder => 'Place order';
  @override
  String get placingOrder => 'Placing your order…';
  @override
  String get loginToCheckout => 'Log in to complete your order. Your cart will be kept.';
  @override
  String get storeOwnersCannotOrder => 'Store owner accounts cannot place orders.';
  @override
  String get orderPlaced => 'Order placed!';
  @override
  String orderPlacedBody(String id) =>
      'Thank you! Your order #$id is now awaiting acceptance. We will contact you on your phone number.';
  @override
  String get payNowWithCard => 'Pay now with card';
  @override
  String get paymentProof => 'Payment proof';
  @override
  String get paymentProofBody =>
      'After you transfer the amount, attach a screenshot or the transfer reference so we can confirm your payment faster.';
  @override
  String get transferReference => 'Transfer reference (optional)';
  @override
  String get uploadScreenshot => 'Attach screenshot';
  @override
  String get changeScreenshot => 'Change screenshot';
  @override
  String get sendProof => 'Send proof';
  @override
  String get proofSent => 'Thanks — your payment proof was sent.';
  @override
  String get viewMyOrders => 'View my orders';
  @override
  String get backToShop => 'Back to shop';

  @override
  String get ordersEmpty => 'No orders yet.';
  @override
  String get ordersEmptyBody => 'Your orders will appear here after checkout.';
  @override
  String orderNumber(String id) => 'Order #$id';
  @override
  String get orderDetails => 'Order details';
  @override
  String get orderStatus => 'Status';
  @override
  String get statusAwaitingAcceptance => 'Awaiting acceptance';
  @override
  String get statusPending => 'Accepted';
  @override
  String get statusPrinting => 'Printing';
  @override
  String get statusFinished => 'Finished';
  @override
  String get statusPooled => 'Looking for a printer';
  @override
  String get statusCancellationRequested => 'Cancellation requested';
  @override
  String get statusCancelled => 'Cancelled';
  @override
  String get requestCancellation => 'Request cancellation';
  @override
  String get requestCancellationConfirm => 'Ask the store to cancel this order?';
  @override
  String get cancellationRequested => 'Cancellation requested. The store will confirm shortly.';
  @override
  String get expectedFinish => 'Expected finish';
  @override
  String get shippingTo => 'Shipping to';
  @override
  String get orderedOn => 'Ordered on';

  @override
  String get uploadTitle => 'Upload for print';
  @override
  String get uploadSubtitle => 'Have a 3D model you want us to print? Upload it here — .STL files only.';
  @override
  String get modelName => 'Model name';
  @override
  String get chooseStlFile => 'Choose .STL file';
  @override
  String get changeFile => 'Change file';
  @override
  String uploadFileHint(int mb) => '.STL files up to $mb MB';
  @override
  String get uploadNotesHint => 'Material, colour, size, quantity, deadline…';
  @override
  String get sendForQuote => 'Send for a quote';
  @override
  String get uploading => 'Uploading…';
  @override
  String get uploadSuccess => 'Your model was uploaded. We will contact you with a quote.';
  @override
  String get onlyStlFiles => 'Only .STL files are accepted.';
  @override
  String fileTooLarge(int mb) => 'The file is larger than $mb MB.';
  @override
  String get myUploads => 'My uploads';
  @override
  String get noUploadsYet => 'No uploads yet.';
  @override
  String get uploadStatusNew => 'Received';
  @override
  String get uploadStatusAssigned => 'Assigned to a printer';
  @override
  String get uploadStatusPrinting => 'Printing';
  @override
  String get uploadStatusDone => 'Done';

  @override
  String get supportTitle => 'Support';
  @override
  String get supportSubtitle => "We're here to help.";
  @override
  String get faq => 'Frequently asked questions';
  @override
  String get contactForm => 'Send us a message';
  @override
  String get subject => 'Subject';
  @override
  String get message => 'Message';
  @override
  String get sendMessage => 'Send message';
  @override
  String get messageSent => 'Thanks! We received your message and will reply by email.';
  @override
  String get emailUs => 'Email us';
  @override
  String get lastUpdated => 'Last updated';

  @override
  String get loading => 'Loading…';
  @override
  String get somethingWentWrong => 'Something went wrong.';
  @override
  String get ok => 'OK';
  @override
  String get couldNotOpenLink => 'Could not open the link.';
  @override
  String get total => 'Total';
}

class _Ar extends AppStrings {
  const _Ar();

  @override
  Locale get locale => const Locale('ar');

  @override
  String get home => 'الرئيسية';
  @override
  String get shop => 'المنتجات';
  @override
  String get stores => 'المتاجر';
  @override
  String get cart => 'السلة';
  @override
  String get account => 'الحساب';
  @override
  String get wishlist => 'المفضلة';
  @override
  String get settings => 'الإعدادات';

  @override
  String get tagline => 'ابنِ العوالم، واصنع الأساطير.';
  @override
  String get heroSubtitle =>
      'اكتشف نماذج ثلاثية الأبعاد عالية الجودة وتصاميم جاهزة للطباعة من مبدعين حول العالم.';
  @override
  String get newDropLiveNow => 'إصدار جديد · متاح الآن';
  @override
  String get browseModels => 'تصفح النماذج';
  @override
  String get learnMore => 'اعرف المزيد';
  @override
  String get newArrivals => 'وصل حديثاً';
  @override
  String get storeDirectory => 'دليل المتاجر';
  @override
  String get storeDirectorySubtitle => 'تصفح جميع المتاجر واكتشف منتجاتهم.';
  @override
  String get viewAll => 'عرض الكل';
  @override
  String get seeAllStores => 'عرض كل المتاجر';
  @override
  String get printOnDemand => 'الطباعة حسب الطلب';
  @override
  String get printOnDemandKicker => 'تصاميمك، خبرتنا';
  @override
  String get printOnDemandBody =>
      'هل لديك نموذج مخصص تريد طباعته؟ ارفع ملف STL واحصل على عرض سعر.';
  @override
  String get uploadYourModel => 'ارفع نموذجك';
  @override
  String get creatorsChoice => 'خيار المبدعين';
  @override
  String get creatorsChoiceSubtitle =>
      'نبني أفضل سوق للمصممين ثلاثيي الأبعاد، مع ميزات تساعدك على النجاح.';
  @override
  String get curatedQuality => 'جودة منتقاة';
  @override
  String get curatedQualityBody => 'تتم مراجعة كل نموذج قبل نشره.';
  @override
  String get commercialLicense => 'ترخيص بلا قلق';
  @override
  String get commercialLicenseBody => 'ترخيص تجاري واضح مع كل عملية شراء.';
  @override
  String get community => 'مجتمع';
  @override
  String get communityBody => 'تابع المبدعين واكتشف الإصدارات الجديدة.';
  @override
  String get instantAccess => 'وصول فوري';
  @override
  String get instantAccessBody => 'ملفات رقمية وطلبات طباعة بضع نقرات.';

  @override
  String get allModels => 'جميع النماذج';
  @override
  String get allModelsSubtitle =>
      'تصفح مجموعتنا الكاملة من الأصول ثلاثية الأبعاد عالية الجودة.';
  @override
  String get searchHint => 'ابحث عن المنتجات بالاسم أو الفئة';
  @override
  String get allCategories => 'الكل';
  @override
  String get noProducts => 'لم يتم العثور على منتجات.';
  @override
  String productsCount(int n) => '$n منتج';
  @override
  String get addToCart => 'أضف إلى السلة';
  @override
  String addedToCart(String name) => 'تمت إضافة $name إلى سلتك.';
  @override
  String get noReviewsYet => 'لا توجد مراجعات بعد';
  @override
  String reviewsCount(int n) => '$n مراجعة';
  @override
  String get preview3d => 'معاينة ثلاثية الأبعاد';
  @override
  String get store => 'المتجر';
  @override
  String byStore(String name) => 'من $name';
  @override
  String get tags => 'الوسوم';
  @override
  String get description => 'الوصف';
  @override
  String get noDescription => 'لا يوجد وصف متاح.';
  @override
  String get quantity => 'الكمية';
  @override
  String inCart(int n) => 'لديك $n من هذا المنتج في السلة.';
  @override
  String stlContact(String store) =>
      'لشراء ملف STL، تواصل مع صاحب المتجر ($store) من خلال صفحة المتجر.';
  @override
  String get reviews => 'المراجعات';
  @override
  String get signInToReview => 'سجّل الدخول لكتابة مراجعة لهذا النموذج.';
  @override
  String get writeReview => 'اكتب مراجعة';
  @override
  String get yourRating => 'تقييمك';
  @override
  String get reviewTitle => 'العنوان (اختياري)';
  @override
  String get reviewBody => 'شارك تجربتك';
  @override
  String get submit => 'إرسال';
  @override
  String get reviewSaved => 'شكراً! تم حفظ مراجعتك.';
  @override
  String get verifiedPurchase => 'عملية شراء موثقة';
  @override
  String get featured => 'مميز';
  @override
  String get noReviewsBody => 'لا توجد مراجعات بعد. كن أول من يشارك تجربته.';
  @override
  String get sortBy => 'ترتيب حسب';
  @override
  String get sortNewest => 'الأحدث';
  @override
  String get sortPriceLow => 'السعر: من الأقل إلى الأعلى';
  @override
  String get sortPriceHigh => 'السعر: من الأعلى إلى الأقل';
  @override
  String get sortName => 'الاسم';

  @override
  String get noStores => 'لا توجد متاجر بعد.';
  @override
  String get storeNoBio => 'لم يضف المتجر نبذة بعد.';
  @override
  String get aboutThisStore => 'عن هذا المتجر';
  @override
  String get productsFromStore => 'منتجات من هذا المتجر';
  @override
  String get visitWebsite => 'زيارة الموقع';
  @override
  String get atAGlance => 'لمحة سريعة';
  @override
  String get published => 'منشور';
  @override
  String get storeStatus => 'الحالة';
  @override
  String get products => 'المنتجات';

  @override
  String get cartTitle => 'سلتك';
  @override
  String get cartEmpty => 'سلتك فارغة.';
  @override
  String get cartEmptyBody => 'أضف بعض النماذج وستظهر هنا.';
  @override
  String get subtotal => 'المجموع الفرعي';
  @override
  String itemsCount(int n) => n == 1 ? 'عنصر واحد' : '$n عناصر';
  @override
  String get checkoutOnWebsite => 'إتمام الشراء على 3dtitans.org';
  @override
  String get checkoutNote =>
      'سلتك متزامنة مع حسابك في 3D Titans — ويمكنك المتابعة من الموقع أيضاً.';
  @override
  String get guestCartNote =>
      'أنت تتصفح كزائر — تُحفظ هذه السلة على جهازك وتُدمج مع حسابك عند تسجيل الدخول.';
  @override
  String get syncedWithAccount => 'متزامنة مع حسابك';
  @override
  String get remove => 'إزالة';
  @override
  String get clearCart => 'تفريغ السلة';
  @override
  String get clearCartConfirm => 'هل تريد إزالة كل العناصر من سلتك؟';
  @override
  String get cancel => 'إلغاء';
  @override
  String get continueShopping => 'متابعة التسوق';

  @override
  String get wishlistEmpty => 'لا يوجد شيء محفوظ بعد.';
  @override
  String get wishlistEmptyBody => 'اضغط على القلب في أي نموذج لحفظه هنا.';
  @override
  String get addedToWishlist => 'تم الحفظ في المفضلة.';
  @override
  String get removedFromWishlist => 'تمت الإزالة من المفضلة.';

  @override
  String get welcomeBack => 'مرحباً بعودتك';
  @override
  String get signInSubtitle => 'سجّل الدخول إلى حسابك في 3D Titans';
  @override
  String get email => 'البريد الإلكتروني';
  @override
  String get password => 'كلمة المرور';
  @override
  String get name => 'الاسم';
  @override
  String get login => 'تسجيل الدخول';
  @override
  String get logout => 'تسجيل الخروج';
  @override
  String get signUp => 'إنشاء حساب';
  @override
  String get createAccount => 'أنشئ حسابك';
  @override
  String get noAccount => 'ليس لديك حساب؟';
  @override
  String get haveAccount => 'لديك حساب بالفعل؟';
  @override
  String get forgotPassword => 'هل نسيت كلمة المرور؟';
  @override
  String get orContinueWith => 'أو تابع باستخدام';
  @override
  String get googleSignInHint => 'تسجيل الدخول عبر Google (يفتح 3dtitans.org)';
  @override
  String get loginFailed => 'فشل تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.';
  @override
  String get signupFailed => 'تعذر إنشاء الحساب.';
  @override
  String get networkError => 'تعذر الوصول إلى 3dtitans.org. تحقق من اتصالك وحاول مجدداً.';
  @override
  String get retry => 'إعادة المحاولة';
  @override
  String get invalidEmail => 'أدخل بريداً إلكترونياً صالحاً.';
  @override
  String get passwordTooShort => 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.';
  @override
  String get required => 'مطلوب';
  @override
  String get myAccount => 'حسابي';
  @override
  String get myOrders => 'طلباتي';
  @override
  String get openOnWebsite => 'يفتح على 3dtitans.org';
  @override
  String get uploadForPrint => 'رفع نموذج للطباعة';
  @override
  String get roleAdmin => 'مسؤول';
  @override
  String get roleStoreOwner => 'صاحب متجر';
  @override
  String get roleUser => 'عضو';
  @override
  String get loginRequired => 'تسجيل الدخول مطلوب';
  @override
  String get loginRequiredBody => 'يرجى تسجيل الدخول للمتابعة.';

  @override
  String get language => 'اللغة';
  @override
  String get english => 'English';
  @override
  String get arabic => 'العربية';
  @override
  String get appearance => 'المظهر';
  @override
  String get themeSystem => 'النظام';
  @override
  String get themeLight => 'فاتح';
  @override
  String get themeDark => 'داكن';
  @override
  String get about => 'عن 3D Titans';
  @override
  String get version => 'الإصدار';
  @override
  String get privacyPolicy => 'سياسة الخصوصية';
  @override
  String get termsOfService => 'شروط الاستخدام';
  @override
  String get support => 'الدعم';
  @override
  String get contactUs => 'تواصل معنا';
  @override
  String get mission => 'مهمتنا';
  @override
  String get website => 'الموقع الإلكتروني';

  @override
  String get checkout => 'إتمام الشراء';
  @override
  String get checkoutTitle => 'إتمام الشراء';
  @override
  String get shippingDetails => 'بيانات الشحن';
  @override
  String get savedAddresses => 'العناوين المحفوظة';
  @override
  String get useThisAddress => 'استخدام';
  @override
  String get fullName => 'الاسم الكامل';
  @override
  String get phoneNumber => 'رقم الهاتف';
  @override
  String get addressLine => 'العنوان';
  @override
  String get city => 'المدينة';
  @override
  String get postalCode => 'الرمز البريدي';
  @override
  String get country => 'الدولة';
  @override
  String get orderNotes => 'ملاحظات (اختياري)';
  @override
  String get orderNotesHint => 'اللون، المقاس، رابط مرجعي، تعليمات التسليم…';
  @override
  String get saveAddressForNextTime => 'احفظ هذا العنوان للمرة القادمة';
  @override
  String get paymentMethod => 'طريقة الدفع';
  @override
  String get noPaymentMethods => 'لا توجد طرق دفع مفعّلة حالياً. يرجى المحاولة لاحقاً.';
  @override
  String get payCod => 'الدفع عند الاستلام';
  @override
  String get payCodBody => 'ادفع نقداً عند وصول الطلب إلى باب منزلك.';
  @override
  String get payBank => 'حوالة بنكية';
  @override
  String get payBankBody => 'حوّل إلى حسابنا البنكي ثم أرسل صورة الإيصال.';
  @override
  String get payShamCash => 'شام كاش';
  @override
  String get payShamCashBody => 'ادفع عبر محفظة شام كاش ثم أرسل لقطة شاشة.';
  @override
  String get paySyriatelCash => 'سيريتل كاش';
  @override
  String get paySyriatelCashBody => 'ادفع عبر سيريتل كاش ثم أرسل لقطة شاشة.';
  @override
  String get payStripe => 'الدفع بالبطاقة';
  @override
  String get payStripeBody => 'فيزا / ماستركارد عبر Stripe (دولي).';
  @override
  String get bankName => 'البنك';
  @override
  String get accountNumber => 'رقم الحساب';
  @override
  String get iban => 'IBAN';
  @override
  String get accountHolder => 'صاحب الحساب';
  @override
  String get walletNumber => 'رقم المحفظة';
  @override
  String get orderSummary => 'ملخص الطلب';
  @override
  String get placeOrder => 'تأكيد الطلب';
  @override
  String get placingOrder => 'جارٍ إرسال طلبك…';
  @override
  String get loginToCheckout => 'سجّل الدخول لإتمام طلبك. ستبقى سلتك محفوظة.';
  @override
  String get storeOwnersCannotOrder => 'حسابات أصحاب المتاجر لا يمكنها إنشاء طلبات.';
  @override
  String get orderPlaced => 'تم إرسال طلبك!';
  @override
  String orderPlacedBody(String id) =>
      'شكراً لك! طلبك رقم #$id بانتظار القبول الآن. سنتواصل معك على رقم هاتفك.';
  @override
  String get payNowWithCard => 'ادفع الآن بالبطاقة';
  @override
  String get paymentProof => 'إثبات الدفع';
  @override
  String get paymentProofBody =>
      'بعد تحويل المبلغ، أرفق لقطة شاشة أو رقم الحوالة لنتمكن من تأكيد دفعتك بسرعة.';
  @override
  String get transferReference => 'رقم الحوالة (اختياري)';
  @override
  String get uploadScreenshot => 'إرفاق لقطة شاشة';
  @override
  String get changeScreenshot => 'تغيير لقطة الشاشة';
  @override
  String get sendProof => 'إرسال الإثبات';
  @override
  String get proofSent => 'شكراً — تم إرسال إثبات الدفع.';
  @override
  String get viewMyOrders => 'عرض طلباتي';
  @override
  String get backToShop => 'العودة إلى المتجر';

  @override
  String get ordersEmpty => 'لا توجد طلبات بعد.';
  @override
  String get ordersEmptyBody => 'ستظهر طلباتك هنا بعد إتمام الشراء.';
  @override
  String orderNumber(String id) => 'طلب #$id';
  @override
  String get orderDetails => 'تفاصيل الطلب';
  @override
  String get orderStatus => 'الحالة';
  @override
  String get statusAwaitingAcceptance => 'بانتظار القبول';
  @override
  String get statusPending => 'مقبول';
  @override
  String get statusPrinting => 'قيد الطباعة';
  @override
  String get statusFinished => 'منجز';
  @override
  String get statusPooled => 'بحث عن طابعة';
  @override
  String get statusCancellationRequested => 'طلب إلغاء';
  @override
  String get statusCancelled => 'ملغى';
  @override
  String get requestCancellation => 'طلب إلغاء';
  @override
  String get requestCancellationConfirm => 'هل تريد طلب إلغاء هذا الطلب من المتجر؟';
  @override
  String get cancellationRequested => 'تم إرسال طلب الإلغاء. سيؤكد المتجر قريباً.';
  @override
  String get expectedFinish => 'موعد الإنجاز المتوقع';
  @override
  String get shippingTo => 'الشحن إلى';
  @override
  String get orderedOn => 'تاريخ الطلب';

  @override
  String get uploadTitle => 'رفع نموذج للطباعة';
  @override
  String get uploadSubtitle => 'هل لديك نموذج ثلاثي الأبعاد تريد طباعته؟ ارفعه هنا — ملفات .STL فقط.';
  @override
  String get modelName => 'اسم النموذج';
  @override
  String get chooseStlFile => 'اختر ملف .STL';
  @override
  String get changeFile => 'تغيير الملف';
  @override
  String uploadFileHint(int mb) => 'ملفات .STL حتى $mb ميغابايت';
  @override
  String get uploadNotesHint => 'المادة، اللون، المقاس، الكمية، الموعد…';
  @override
  String get sendForQuote => 'إرسال لطلب عرض سعر';
  @override
  String get uploading => 'جارٍ الرفع…';
  @override
  String get uploadSuccess => 'تم رفع نموذجك. سنتواصل معك بعرض السعر.';
  @override
  String get onlyStlFiles => 'يُقبل فقط ملفات .STL.';
  @override
  String fileTooLarge(int mb) => 'حجم الملف أكبر من $mb ميغابايت.';
  @override
  String get myUploads => 'ملفاتي المرفوعة';
  @override
  String get noUploadsYet => 'لا توجد ملفات مرفوعة بعد.';
  @override
  String get uploadStatusNew => 'تم الاستلام';
  @override
  String get uploadStatusAssigned => 'أُسند إلى طابعة';
  @override
  String get uploadStatusPrinting => 'قيد الطباعة';
  @override
  String get uploadStatusDone => 'منجز';

  @override
  String get supportTitle => 'الدعم';
  @override
  String get supportSubtitle => 'نحن هنا لمساعدتك.';
  @override
  String get faq => 'الأسئلة الشائعة';
  @override
  String get contactForm => 'أرسل لنا رسالة';
  @override
  String get subject => 'الموضوع';
  @override
  String get message => 'الرسالة';
  @override
  String get sendMessage => 'إرسال الرسالة';
  @override
  String get messageSent => 'شكراً! استلمنا رسالتك وسنرد عليك عبر البريد الإلكتروني.';
  @override
  String get emailUs => 'راسلنا بالبريد';
  @override
  String get lastUpdated => 'آخر تحديث';

  @override
  String get loading => 'جارٍ التحميل…';
  @override
  String get somethingWentWrong => 'حدث خطأ ما.';
  @override
  String get ok => 'حسناً';
  @override
  String get couldNotOpenLink => 'تعذر فتح الرابط.';
  @override
  String get total => 'المجموع';
}

/// Hooks [AppStrings] into the Flutter localization system.
class AppLocalizations {
  AppLocalizations._();

  static const supportedLocales = [Locale('en'), Locale('ar')];

  static const LocalizationsDelegate<AppStrings> delegate = _AppStringsDelegate();

  static AppStrings forLocale(Locale locale) =>
      locale.languageCode == 'ar' ? const _Ar() : const _En();

  static AppStrings of(BuildContext context) =>
      Localizations.of<AppStrings>(context, AppStrings) ?? const _En();
}

class _AppStringsDelegate extends LocalizationsDelegate<AppStrings> {
  const _AppStringsDelegate();

  @override
  bool isSupported(Locale locale) => locale.languageCode == 'en' || locale.languageCode == 'ar';

  @override
  Future<AppStrings> load(Locale locale) async => AppLocalizations.forLocale(locale);

  @override
  bool shouldReload(covariant LocalizationsDelegate<AppStrings> old) => false;
}

/// `context.t.addToCart` instead of `AppLocalizations.of(context).addToCart`.
extension AppStringsX on BuildContext {
  AppStrings get t => AppLocalizations.of(this);
}

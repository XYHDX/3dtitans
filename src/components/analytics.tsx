'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { captureUtm } from '@/lib/analytics';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

// IDs are inlined at build time; validate their shape before they reach a script tag.
const gaOk = /^G-[A-Z0-9]{4,20}$/.test(GA_ID);
const pixelOk = /^\d{6,20}$/.test(PIXEL_ID);

/**
 * Loads Google Analytics 4 and the Meta Pixel when their IDs are configured,
 * records campaign UTMs, and reports client-side page changes to the Pixel
 * (GA4's enhanced measurement already tracks history changes).
 */
export function Analytics() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    captureUtm(window.location.search);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false; // initial PageView is sent by the Pixel snippet itself
      return;
    }
    window.fbq?.('track', 'PageView');
  }, [pathname]);

  return (
    <>
      {gaOk && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}
      {pixelOk && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}

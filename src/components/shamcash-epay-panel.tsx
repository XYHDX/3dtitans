'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/components/language-provider';
import { formatMoney, orderReference } from '@/lib/payments/common';

type StatusResponse = {
  orderPaymentStatus: string;
  attempt: { status: string; billNo: string; expiresAt: string; paymentUrl?: string } | null;
};

type Phase = 'loading' | 'idle' | 'starting' | 'waiting' | 'slow' | 'paid' | 'review' | 'expired' | 'failed' | 'cancelled';

const POLL_INTERVAL_MS = 3000;
const POLL_WINDOW_MS = 2 * 60 * 1000;

/**
 * ShamCash online payment (e-pay) panel on /checkout/success.
 *
 * - Unpaid: shows the amount and "Pay with ShamCash" (POST /api/payments/shamcash/create,
 *   then a normal top-level navigation to the ShamCash paymentUrl — never an iframe).
 * - Back from ShamCash (?shamcash=return) or a bill is pending: polls our own
 *   status endpoint every 3 s for up to 2 minutes. That endpoint reads our DB
 *   (updated by the ShamCash webhook); it doesn't hammer ShamCash.
 */
export function ShamCashEpayPanel({
  orderId,
  totalAmount,
  currency,
  paymentStatus,
  orderStatus,
  returning,
  onStatusChange,
}: {
  orderId: string;
  totalAmount: number;
  currency: string;
  paymentStatus: string;
  orderStatus: string;
  returning: boolean;
  onStatusChange: (status: string) => void;
}) {
  const { t } = useTranslation();
  const amount = formatMoney(totalAmount, currency);
  const initialPhase: Phase =
    paymentStatus === 'paid' ? 'paid' : paymentStatus === 'verifying' ? 'review' : orderStatus === 'Cancelled' ? 'cancelled' : 'loading';
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  const poll = useRef<{ timer: ReturnType<typeof setTimeout> | null; active: boolean }>({ timer: null, active: false });

  const fetchStatus = useCallback(async (): Promise<StatusResponse | null> => {
    try {
      const res = await fetch(`/api/payments/shamcash/status?orderId=${encodeURIComponent(orderId)}`, { cache: 'no-store' });
      if (!res.ok) return null;
      return (await res.json()) as StatusResponse;
    } catch {
      return null;
    }
  }, [orderId]);

  /** Apply a status response. 'final' = stop polling; 'pending' = keep waiting; 'none' = nothing in progress. */
  const applyStatus = useCallback((data: StatusResponse): 'final' | 'pending' | 'none' => {
    if (data.orderPaymentStatus === 'paid') {
      setPhase('paid');
      onStatusChangeRef.current('paid');
      return 'final';
    }
    if (data.orderPaymentStatus === 'verifying') {
      setPhase('review');
      onStatusChangeRef.current('verifying');
      return 'final';
    }
    if (data.orderPaymentStatus === 'refunded') {
      onStatusChangeRef.current('refunded');
      return 'final';
    }
    const a = data.attempt;
    if (!a) return 'none';
    if (a.status === 'pending') return 'pending';
    if (a.status === 'expired') {
      setPhase('expired');
      return 'final';
    }
    if (a.status === 'failed') {
      setPhase('failed');
      return 'final';
    }
    return 'none';
  }, []);

  const stopPolling = useCallback(() => {
    poll.current.active = false;
    if (poll.current.timer) clearTimeout(poll.current.timer);
    poll.current.timer = null;
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    setPhase('waiting');
    const deadline = Date.now() + POLL_WINDOW_MS;
    poll.current.active = true;
    const tick = async () => {
      if (!poll.current.active) return;
      const data = await fetchStatus();
      if (!poll.current.active) return;
      const result = data ? applyStatus(data) : 'pending';
      if (result === 'final') return stopPolling();
      if (result === 'none') {
        stopPolling();
        setPhase('idle');
        return;
      }
      if (Date.now() >= deadline) {
        stopPolling();
        setPhase('slow');
        return;
      }
      poll.current.timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    void tick();
  }, [applyStatus, fetchStatus, stopPolling]);

  // First load: decide between "pay" and "waiting".
  useEffect(() => {
    if (initialPhase !== 'loading') return;
    let cancelled = false;
    if (returning) {
      startPolling();
    } else {
      (async () => {
        const data = await fetchStatus();
        if (cancelled) return;
        const result = data ? applyStatus(data) : 'none';
        if (result === 'pending') startPolling();
        else if (result === 'none') setPhase('idle');
      })();
    }
    return () => {
      cancelled = true;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pay() {
    setError('');
    setPhase('starting');
    try {
      const res = await fetch('/api/payments/shamcash/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data?.paymentUrl === 'string' && data.paymentUrl) {
        // Normal navigation in the default browser — the ShamCash link opens the app when installed.
        window.location.assign(data.paymentUrl);
        return;
      }
      if (data?.code === 'already_paid') {
        const status = await fetchStatus();
        if (status) applyStatus(status);
        return;
      }
      if (data?.code === 'cancelled') {
        setPhase('cancelled');
        return;
      }
      const byCode: Record<string, string> = {
        payment_in_progress: t('shamcashEpay.errorInProgress'),
        previous_bill_open: t('shamcashEpay.errorPreviousOpen'),
        previous_bill_unconfirmed: t('shamcashEpay.errorConfirming'),
      };
      if (typeof data?.code === 'string' && byCode[data.code]) {
        setError(byCode[data.code]);
        setPhase('idle');
        return;
      }
      setError(
        res.status === 429
          ? t('shamcashEpay.errorTooMany')
          : res.status === 503
          ? t('shamcashEpay.errorUnavailable')
          : t('shamcashEpay.errorGeneric')
      );
      setPhase('idle');
    } catch {
      setError(t('shamcashEpay.errorGeneric'));
      setPhase('idle');
    }
  }

  async function checkAgain() {
    setChecking(true);
    try {
      const data = await fetchStatus();
      if (data) {
        const result = applyStatus(data);
        if (result === 'none') setPhase('idle');
      }
    } finally {
      setChecking(false);
    }
  }

  const payButton = (label: string, variant: 'default' | 'outline' = 'default') => (
    <Button onClick={pay} disabled={phase === 'starting'} variant={variant} className="w-full sm:w-auto">
      {phase === 'starting' ? (
        t('shamcashEpay.redirecting')
      ) : (
        <>
          <ExternalLink className="h-4 w-4 me-2 rtl:-scale-x-100" aria-hidden="true" />
          {label}
        </>
      )}
    </Button>
  );

  const header = (
    <CardHeader>
      <CardTitle className="text-xl font-headline flex items-center gap-3">
        <Zap className="h-5 w-5" aria-hidden="true" /> <h2>{t('shamcashEpay.title')}</h2>
      </CardTitle>
      <CardDescription>
        {t('shamcashEpay.reference')}: <span className="font-mono" dir="ltr">{orderReference(orderId)}</span>
      </CardDescription>
    </CardHeader>
  );

  const statusBox = (icon: React.ReactNode, title: string, desc: string, tone: 'ok' | 'wait' | 'bad') => (
    <div
      className={
        'border-[3px] p-4 ' +
        (tone === 'bad'
          ? 'border-destructive'
          : 'border-foreground shadow-[4px_4px_0_0_hsl(var(--accent))]')
      }
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <strong className="font-headline text-sm">{title}</strong>
      </div>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );

  let body: React.ReactNode;
  switch (phase) {
    case 'loading':
      body = <div className="h-24 border-[3px] border-foreground/20 animate-pulse" aria-busy="true" />;
      break;
    case 'paid':
      body = statusBox(<CheckCircle2 className="h-5 w-5 text-[hsl(var(--pixel-green))]" />, t('shamcashEpay.paidTitle'), t('shamcashEpay.paidDesc'), 'ok');
      break;
    case 'review':
      body = statusBox(<Clock className="h-5 w-5" />, t('shamcashEpay.reviewTitle'), t('shamcashEpay.reviewDescOrders', "We received your ShamCash payment and our team is reviewing it. You'll see it confirmed here and in \"My orders\"."), 'ok');
      break;
    case 'cancelled':
      body = <p className="text-sm">{t('shamcashEpay.cancelled')}</p>;
      break;
    case 'waiting':
      body = (
        <div className="space-y-3">
          {statusBox(<RefreshCw className="h-5 w-5 animate-spin" />, t('shamcashEpay.waitingTitle'), t('shamcashEpay.waitingDesc'), 'wait')}
          {payButton(t('shamcashEpay.reopen'), 'outline')}
        </div>
      );
      break;
    case 'slow':
      body = (
        <div className="space-y-3">
          {statusBox(<Clock className="h-5 w-5" />, t('shamcashEpay.slowTitle'), t('shamcashEpay.slowDescOrders', "If you completed the payment, we'll confirm it automatically as soon as ShamCash notifies us — you can close this page and check \"My orders\" later."), 'wait')}
          <div className="flex flex-wrap gap-2">
            <Button onClick={checkAgain} disabled={checking} variant="default" className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 me-2" />
              {checking ? t('shamcashEpay.checking') : t('shamcashEpay.checkAgain')}
            </Button>
            {payButton(t('shamcashEpay.reopen'), 'outline')}
          </div>
        </div>
      );
      break;
    case 'expired':
    case 'failed':
      body = (
        <div className="space-y-3">
          {statusBox(
            <AlertTriangle className="h-5 w-5 text-destructive" />,
            t(phase === 'expired' ? 'shamcashEpay.expiredTitle' : 'shamcashEpay.failedTitle'),
            t(phase === 'expired' ? 'shamcashEpay.expiredDesc' : 'shamcashEpay.failedDesc'),
            'bad'
          )}
          {payButton(t('shamcashEpay.tryAgain'))}
        </div>
      );
      break;
    default: // idle / starting
      body = (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 border-[2px] border-foreground bg-background px-3 py-2">
            <span className="text-[10px] font-headline uppercase tracking-wider text-muted-foreground">{t('shamcashEpay.amount')}</span>
            <span className="font-mono text-base font-bold" dir="ltr">{amount}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t('shamcashEpay.intro')}</p>
          {payButton(t('shamcashEpay.payButton', undefined, { amount }))}
        </div>
      );
  }

  return (
    <Card>
      {header}
      <CardContent className="text-sm space-y-3">
        {body}
        {error && <p className="text-xs text-destructive border-[2px] border-destructive p-2" role="alert">{error}</p>}
      </CardContent>
    </Card>
  );
}

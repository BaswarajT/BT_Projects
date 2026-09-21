import { useEffect, useState, type FormEvent } from "react";

import Modal from "./Modal";
import { confirmOtp, requestOtp, type VerificationPurpose } from "../services/profileService";

interface OtpModalProps {
  purpose: VerificationPurpose;
  target: string;
  onClose: () => void;
  onVerified: () => void;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: Record<string, string[] | string> } })?.response?.data;
  if (!data) return fallback;
  return Object.values(data).flat().join(" ") || fallback;
}

export default function OtpModal({ purpose, target, onClose, onVerified }: OtpModalProps) {
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const label = purpose === "email" ? "email address" : "phone number";

  async function sendCode() {
    setIsSending(true);
    setError(null);
    setInfo(null);
    try {
      const res = await requestOtp(purpose);
      setInfo(res.detail);
      setDevCode(res.dev_code ?? null);
      setCooldown(60);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not send a verification code."));
    } finally {
      setIsSending(false);
    }
  }

  useEffect(() => {
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsVerifying(true);
    setError(null);
    try {
      await confirmOtp(purpose, code);
      onVerified();
    } catch (err) {
      setError(extractErrorMessage(err, "Invalid or expired code."));
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <Modal title={`Verify your ${label}`} onClose={onClose}>
      <p className="text-sm text-gray-600 mb-4">
        We sent a 6-digit code to <span className="font-medium text-gray-800">{target}</span>.
        {purpose === "phone" && " (No SMS provider is configured in this environment, so the code is logged on the server instead of texted.)"}
      </p>

      {devCode && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          Dev mode: your code is <span className="font-mono font-semibold">{devCode}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm tracking-widest text-center font-mono"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            autoFocus
            required
          />
        </div>

        {info && !error && <p className="text-sm text-green-600">{info}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={sendCode}
            disabled={isSending || cooldown > 0}
            className="text-sm text-indigo-600 hover:text-indigo-700 disabled:text-gray-400"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : isSending ? "Sending..." : "Resend code"}
          </button>
          <button
            type="submit"
            disabled={isVerifying || code.length !== 6}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isVerifying ? "Verifying..." : "Verify"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
